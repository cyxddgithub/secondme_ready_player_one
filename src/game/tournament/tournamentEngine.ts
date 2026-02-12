/**
 * 锦标赛引擎
 *
 * 管理锦标赛完整生命周期：
 * registering → in_progress → settling → completed
 *
 * 使用瑞士赛制（Swiss-system）：
 * - 所有参与者都能打完全部轮次
 * - 按积分从高到低配对
 * - 胜=3分, 平=1分, 负=0分
 */

import { prisma } from "@/lib/prisma";
import { TOURNAMENT_CONFIG } from "../economy/tokenManager";
import { simulateTournamentMatch } from "./tournamentMatch";
import type { AgentPlayer } from "@/types";

// ===== 锦标赛调度 =====

/** 检查是否应该创建新锦标赛 */
export async function shouldCreateTournament(): Promise<boolean> {
  // 检查是否有活跃锦标赛
  const active = await prisma.tournament.findFirst({
    where: {
      status: { in: ["registering", "in_progress", "settling"] },
    },
  });

  if (active) return false;

  // 检查距上次完成是否超过间隔
  const lastCompleted = await prisma.tournament.findFirst({
    where: { status: { in: ["completed", "cancelled"] } },
    orderBy: { completedAt: "desc" },
  });

  if (!lastCompleted?.completedAt) return true;

  const elapsed = Date.now() - lastCompleted.completedAt.getTime();
  return elapsed >= TOURNAMENT_CONFIG.TOURNAMENT_INTERVAL_MS;
}

/** 创建自动锦标赛并报名符合条件的 Agent */
export async function createAutoTournament(): Promise<string> {
  // 生成名称
  const count = await prisma.tournament.count();
  const template = TOURNAMENT_CONFIG.NAME_TEMPLATES[count % TOURNAMENT_CONFIG.NAME_TEMPLATES.length];
  const name = `第${count + 1}届${template}`;

  const registrationEnd = new Date(Date.now() + TOURNAMENT_CONFIG.REGISTRATION_DURATION_MS);

  // 创建锦标赛
  const tournament = await prisma.tournament.create({
    data: {
      name,
      format: "swiss",
      status: "registering",
      entryFee: TOURNAMENT_CONFIG.ENTRY_FEE,
      systemSubsidy: TOURNAMENT_CONFIG.SYSTEM_SUBSIDY,
      totalRounds: TOURNAMENT_CONFIG.DEFAULT_ROUNDS,
      currentRound: 0,
      minParticipants: TOURNAMENT_CONFIG.MIN_PARTICIPANTS,
      maxParticipants: TOURNAMENT_CONFIG.MAX_PARTICIPANTS,
      registrationEnd,
      triggerType: "auto",
    },
  });

  // 查找所有符合条件的真人 Agent
  const eligibleAgents = await prisma.agent.findMany({
    where: {
      status: "active",
      isNpc: false,
      tokenBalance: { gte: TOURNAMENT_CONFIG.MIN_TOKEN_TO_ENTER },
    },
    take: TOURNAMENT_CONFIG.MAX_PARTICIPANTS,
  });

  let prizePool = TOURNAMENT_CONFIG.SYSTEM_SUBSIDY;

  // 报名真人 Agent
  for (const agent of eligibleAgents) {
    await prisma.$transaction([
      // 扣报名费
      prisma.agent.update({
        where: { id: agent.id },
        data: {
          tokenBalance: { decrement: TOURNAMENT_CONFIG.ENTRY_FEE },
          totalSpent: { increment: TOURNAMENT_CONFIG.ENTRY_FEE },
        },
      }),
      // 创建参与者记录
      prisma.tournamentParticipant.create({
        data: {
          tournamentId: tournament.id,
          agentId: agent.id,
          isNpc: false,
        },
      }),
      // 记录交易
      prisma.tokenTransaction.create({
        data: {
          agentId: agent.id,
          type: "spend",
          amount: TOURNAMENT_CONFIG.ENTRY_FEE,
          balance: agent.tokenBalance - TOURNAMENT_CONFIG.ENTRY_FEE,
          description: `报名「${name}」`,
          referenceId: tournament.id,
        },
      }),
      // 活动日志
      prisma.activityLog.create({
        data: {
          agentId: agent.id,
          type: "tournament",
          title: "报名锦标赛",
          content: `自动报名参加「${name}」，缴纳报名费 ${TOURNAMENT_CONFIG.ENTRY_FEE} Token`,
          tokenChange: -TOURNAMENT_CONFIG.ENTRY_FEE,
        },
      }),
    ]);

    prizePool += TOURNAMENT_CONFIG.ENTRY_FEE;
  }

  // NPC 补位
  const currentCount = eligibleAgents.length;
  if (currentCount < TOURNAMENT_CONFIG.MIN_PARTICIPANTS) {
    const npcNeeded = TOURNAMENT_CONFIG.MIN_PARTICIPANTS - currentCount;
    const npcs = await prisma.agent.findMany({
      where: { isNpc: true },
      take: npcNeeded,
    });

    for (const npc of npcs) {
      await prisma.tournamentParticipant.create({
        data: {
          tournamentId: tournament.id,
          agentId: npc.id,
          isNpc: true,
        },
      });
    }
  }

  // 更新奖池
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { prizePool },
  });

  return tournament.id;
}

// ===== 锦标赛推进 =====

export interface AdvanceResult {
  action: string;
  detail: string;
}

/** 推进锦标赛到下一阶段（状态机核心） */
export async function advanceTournament(tournamentId: string): Promise<AdvanceResult> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      participants: { include: { agent: true } },
      matches: true,
    },
  });

  if (!tournament) {
    return { action: "error", detail: "锦标赛不存在" };
  }

  switch (tournament.status) {
    case "registering": {
      // 检查报名是否截止
      if (tournament.registrationEnd && new Date() >= tournament.registrationEnd) {
        return await startTournament(tournamentId);
      }
      return { action: "waiting", detail: "等待报名截止" };
    }

    case "in_progress": {
      // 检查当前轮次是否有未完成的对战
      const pendingMatches = tournament.matches.filter(
        (m) => m.round === tournament.currentRound && m.status === "pending"
      );

      if (pendingMatches.length > 0) {
        // 执行当前轮次
        const completed = await executeCurrentRound(tournamentId);
        return { action: "round_executed", detail: `第${tournament.currentRound}轮完成，执行 ${completed} 场对战` };
      }

      // 当前轮次已完成，检查是否还有更多轮次
      if (tournament.currentRound < tournament.totalRounds) {
        // 生成下一轮配对
        const nextRound = tournament.currentRound + 1;
        await generateRoundPairings(tournamentId, nextRound);
        await prisma.tournament.update({
          where: { id: tournamentId },
          data: { currentRound: nextRound },
        });
        return { action: "round_generated", detail: `第${nextRound}轮配对已生成` };
      }

      // 所有轮次完成，进入结算
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: "settling" },
      });
      return { action: "settling", detail: "所有轮次完成，进入结算阶段" };
    }

    case "settling": {
      await settleTournament(tournamentId);
      return { action: "completed", detail: "锦标赛结算完成" };
    }

    default:
      return { action: "no_action", detail: `锦标赛状态为 ${tournament.status}，无需操作` };
  }
}

/** 开始锦标赛：registering → in_progress */
async function startTournament(tournamentId: string): Promise<AdvanceResult> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { participants: { include: { agent: true } } },
  });

  if (!tournament) {
    return { action: "error", detail: "锦标赛不存在" };
  }

  // 检查参赛人数
  if (tournament.participants.length < tournament.minParticipants) {
    // 取消并退费
    await cancelAndRefund(tournamentId);
    return { action: "cancelled", detail: `参赛人数不足（${tournament.participants.length}/${tournament.minParticipants}），锦标赛已取消` };
  }

  // 生成第一轮配对
  await generateRoundPairings(tournamentId, 1);

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      status: "in_progress",
      currentRound: 1,
      startedAt: new Date(),
    },
  });

  return { action: "started", detail: `锦标赛开始，${tournament.participants.length} 名选手参赛` };
}

/** 取消锦标赛并退还报名费 */
async function cancelAndRefund(tournamentId: string): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { participants: { include: { agent: true } } },
  });

  if (!tournament) return;

  // 退还非 NPC 参与者的报名费
  for (const participant of tournament.participants) {
    if (participant.isNpc) continue;

    await prisma.$transaction([
      prisma.agent.update({
        where: { id: participant.agentId },
        data: {
          tokenBalance: { increment: tournament.entryFee },
          totalSpent: { decrement: tournament.entryFee },
        },
      }),
      prisma.tokenTransaction.create({
        data: {
          agentId: participant.agentId,
          type: "earn",
          amount: tournament.entryFee,
          balance: participant.agent.tokenBalance + tournament.entryFee,
          description: `「${tournament.name}」取消退款`,
          referenceId: tournamentId,
        },
      }),
      prisma.activityLog.create({
        data: {
          agentId: participant.agentId,
          type: "tournament",
          title: "锦标赛取消",
          content: `「${tournament.name}」因参赛人数不足取消，报名费 ${tournament.entryFee} Token 已退还`,
          tokenChange: tournament.entryFee,
        },
      }),
    ]);
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      status: "cancelled",
      completedAt: new Date(),
    },
  });
}

// ===== 瑞士赛配对 =====

interface PairingAgent {
  agentId: string;
  totalScore: number;
  previousOpponents: string[];
}

/** 瑞士赛配对算法 */
export function swissPairing(participants: PairingAgent[]): Array<[string, string]> {
  // 按积分降序排列
  const sorted = [...participants].sort((a, b) => b.totalScore - a.totalScore);
  const paired = new Set<string>();
  const pairs: Array<[string, string]> = [];

  for (let i = 0; i < sorted.length; i++) {
    if (paired.has(sorted[i].agentId)) continue;

    // 找最佳对手：积分相近且未交手过
    let bestMatch = -1;
    for (let j = i + 1; j < sorted.length; j++) {
      if (paired.has(sorted[j].agentId)) continue;

      // 优先选择未交手过的对手
      if (!sorted[i].previousOpponents.includes(sorted[j].agentId)) {
        bestMatch = j;
        break;
      }

      // 如果都交手过，选最近的
      if (bestMatch === -1) {
        bestMatch = j;
      }
    }

    if (bestMatch !== -1) {
      pairs.push([sorted[i].agentId, sorted[bestMatch].agentId]);
      paired.add(sorted[i].agentId);
      paired.add(sorted[bestMatch].agentId);
    }
    // 奇数参赛者，最后一人轮空（自动获胜）
  }

  return pairs;
}

/** 生成某一轮的配对并创建 TournamentMatch 记录 */
async function generateRoundPairings(tournamentId: string, round: number): Promise<void> {
  const participants = await prisma.tournamentParticipant.findMany({
    where: { tournamentId },
  });

  // 获取历史对战记录，用于避免重复配对
  const existingMatches = await prisma.tournamentMatch.findMany({
    where: { tournamentId },
    select: { agentAId: true, agentBId: true },
  });

  const opponentMap = new Map<string, string[]>();
  for (const m of existingMatches) {
    if (!opponentMap.has(m.agentAId)) opponentMap.set(m.agentAId, []);
    if (!opponentMap.has(m.agentBId)) opponentMap.set(m.agentBId, []);
    opponentMap.get(m.agentAId)!.push(m.agentBId);
    opponentMap.get(m.agentBId)!.push(m.agentAId);
  }

  const pairingData: PairingAgent[] = participants.map((p) => ({
    agentId: p.agentId,
    totalScore: p.totalScore,
    previousOpponents: opponentMap.get(p.agentId) || [],
  }));

  const pairs = swissPairing(pairingData);

  // 处理轮空选手（奇数参赛者）
  const pairedAgents = new Set(pairs.flat());
  for (const p of participants) {
    if (!pairedAgents.has(p.agentId)) {
      // 轮空 = 自动 +3 积分
      await prisma.tournamentParticipant.update({
        where: { id: p.id },
        data: {
          wins: { increment: 1 },
          totalScore: { increment: 3 },
        },
      });
    }
  }

  // 创建对战记录
  for (const [agentAId, agentBId] of pairs) {
    await prisma.tournamentMatch.create({
      data: {
        tournamentId,
        round,
        agentAId,
        agentBId,
        status: "pending",
      },
    });
  }
}

// ===== 执行对战 =====

/** 执行当前轮次的所有对战 */
async function executeCurrentRound(tournamentId: string): Promise<number> {
  const pendingMatches = await prisma.tournamentMatch.findMany({
    where: { tournamentId, status: "pending" },
  });

  let completedCount = 0;

  for (const match of pendingMatches) {
    // 获取 Agent 数据
    const agentA = await prisma.agent.findUnique({ where: { id: match.agentAId } });
    const agentB = await prisma.agent.findUnique({ where: { id: match.agentBId } });

    if (!agentA || !agentB) continue;

    // 获取锦标赛名称
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { name: true },
    });

    // 转换为 AgentPlayer 接口
    const playerA: AgentPlayer = {
      id: agentA.id,
      userId: agentA.userId,
      nickname: agentA.nickname,
      avatar: agentA.avatar || undefined,
      bio: agentA.bio || undefined,
      tokenBalance: agentA.tokenBalance,
      totalEarned: agentA.totalEarned,
      totalSpent: agentA.totalSpent,
      status: agentA.status as "active" | "dormant" | "competing",
      level: agentA.level,
      experience: agentA.experience,
      wins: agentA.wins,
      losses: agentA.losses,
      lastActiveAt: agentA.lastActiveAt,
    };

    const playerB: AgentPlayer = {
      id: agentB.id,
      userId: agentB.userId,
      nickname: agentB.nickname,
      avatar: agentB.avatar || undefined,
      bio: agentB.bio || undefined,
      tokenBalance: agentB.tokenBalance,
      totalEarned: agentB.totalEarned,
      totalSpent: agentB.totalSpent,
      status: agentB.status as "active" | "dormant" | "competing",
      level: agentB.level,
      experience: agentB.experience,
      wins: agentB.wins,
      losses: agentB.losses,
      lastActiveAt: agentB.lastActiveAt,
    };

    // 模拟对战
    const result = simulateTournamentMatch(playerA, playerB, {
      tournamentName: tournament?.name || "锦标赛",
      round: match.round,
    });

    // 更新对战记录
    await prisma.tournamentMatch.update({
      where: { id: match.id },
      data: {
        winnerId: result.winnerId,
        isDraw: result.isDraw,
        scoreA: result.scoreA,
        scoreB: result.scoreB,
        narrative: result.narrative,
        status: "completed",
        completedAt: new Date(),
      },
    });

    // 更新参与者积分
    const participantA = await prisma.tournamentParticipant.findUnique({
      where: { tournamentId_agentId: { tournamentId, agentId: match.agentAId } },
    });
    const participantB = await prisma.tournamentParticipant.findUnique({
      where: { tournamentId_agentId: { tournamentId, agentId: match.agentBId } },
    });

    if (participantA) {
      const scoreA = result.isDraw ? 1 : result.winnerId === match.agentAId ? 3 : 0;
      await prisma.tournamentParticipant.update({
        where: { id: participantA.id },
        data: {
          wins: result.winnerId === match.agentAId ? { increment: 1 } : undefined,
          losses: result.winnerId === match.agentBId ? { increment: 1 } : undefined,
          draws: result.isDraw ? { increment: 1 } : undefined,
          totalScore: { increment: scoreA },
        },
      });
    }

    if (participantB) {
      const scoreB = result.isDraw ? 1 : result.winnerId === match.agentBId ? 3 : 0;
      await prisma.tournamentParticipant.update({
        where: { id: participantB.id },
        data: {
          wins: result.winnerId === match.agentBId ? { increment: 1 } : undefined,
          losses: result.winnerId === match.agentAId ? { increment: 1 } : undefined,
          draws: result.isDraw ? { increment: 1 } : undefined,
          totalScore: { increment: scoreB },
        },
      });
    }

    completedCount++;
  }

  return completedCount;
}

// ===== 结算 =====

/** 结算锦标赛：排名 → 分配奖金 → 写日志 */
async function settleTournament(tournamentId: string): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      participants: { include: { agent: true }, orderBy: { totalScore: "desc" } },
    },
  });

  if (!tournament) return;

  const prizePool = tournament.prizePool;
  const distribution = TOURNAMENT_CONFIG.PRIZE_DISTRIBUTION;

  // 排名并分配奖金（仅非 NPC）
  let placement = 1;
  for (const participant of tournament.participants) {
    const prizeIndex = placement - 1;
    let prize = 0;

    if (prizeIndex < distribution.length && !participant.isNpc) {
      prize = Math.floor(prizePool * distribution[prizeIndex]);
    }

    await prisma.tournamentParticipant.update({
      where: { id: participant.id },
      data: { placement, tokensWon: prize },
    });

    // 发放奖金给非 NPC
    if (prize > 0 && !participant.isNpc) {
      await prisma.$transaction([
        prisma.agent.update({
          where: { id: participant.agentId },
          data: {
            tokenBalance: { increment: prize },
            totalEarned: { increment: prize },
            wins: { increment: participant.wins },
          },
        }),
        prisma.tokenTransaction.create({
          data: {
            agentId: participant.agentId,
            type: "reward",
            amount: prize,
            balance: participant.agent.tokenBalance + prize,
            description: `「${tournament.name}」第${placement}名奖金`,
            referenceId: tournamentId,
          },
        }),
        prisma.activityLog.create({
          data: {
            agentId: participant.agentId,
            type: "tournament",
            title: `锦标赛第${placement}名`,
            content: `在「${tournament.name}」中获得第${placement}名，赢得 ${prize} Token 奖金！战绩 ${participant.wins}胜${participant.losses}负${participant.draws}平`,
            tokenChange: prize,
          },
        }),
      ]);
    } else if (!participant.isNpc) {
      // 未获奖的真人也记录日志
      await prisma.activityLog.create({
        data: {
          agentId: participant.agentId,
          type: "tournament",
          title: `锦标赛第${placement}名`,
          content: `在「${tournament.name}」中获得第${placement}名。战绩 ${participant.wins}胜${participant.losses}负${participant.draws}平`,
          tokenChange: 0,
        },
      });
    }

    placement++;
  }

  // 生成锦标赛叙事
  const winner = tournament.participants[0];
  const narrative = winner
    ? `「${tournament.name}」圆满结束！${winner.agent.nickname} 以 ${winner.totalScore} 积分夺得冠军，赢取 ${Math.floor(prizePool * distribution[0])} Token 奖金。共 ${tournament.participants.length} 名选手参赛。`
    : `「${tournament.name}」已结束。`;

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      status: "completed",
      completedAt: new Date(),
      narrative,
    },
  });
}
