/**
 * NBA 赛季模拟器
 * 负责创建赛季、生成赛程、模拟比赛、结算薪资
 * 由 Kimi 世界模型驱动裁决和叙事
 */

import { prisma } from "@/lib/prisma";
import {
  simulateGame,
  calculateOVR,
  calculateSalary,
  generateNpcAttributes,
  generateNpcName,
  NBA_TEAMS,
} from "./nbaEngine";
import {
  judgeGame,
  settleSeasonByWorldModel,
  generateWorldEvent,
  type GameVerdict,
} from "@/game/world/worldModel";
import { generateGameInteractions } from "@/game/social/interactionEngine";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];

/** 确保有足够的 NPC Agent 填充球队 */
async function ensureNpcAgents(): Promise<void> {
  const npcCount = await prisma.agent.count({ where: { isNpc: true } });
  const needed = 30 - npcCount; // 至少需要 30 个 NPC（填充到各球队）

  if (needed <= 0) return;

  const npcs = [];
  for (let i = 0; i < needed; i++) {
    const position = POSITIONS[i % 5];
    const teamIndex = Math.floor(i / 5) % NBA_TEAMS.length;
    const attrs = generateNpcAttributes(position);

    npcs.push({
      nickname: generateNpcName(),
      userId: `npc_${Date.now()}_${i}`,
      isNpc: true,
      position,
      teamName: NBA_TEAMS[teamIndex],
      ...attrs,
      luckValue: Math.round(30 + Math.random() * 40),
      cognitiveScore: Math.round(40 + Math.random() * 30),
      tokenBalance: 500,
      bio: "NPC 球员",
    });
  }

  // 逐个创建 NPC（因为 SQLite 不支持 createMany）
  for (const npc of npcs) {
    await prisma.agent.create({ data: npc });
  }
}

/** 给未分配球队的 Agent 分配球队 */
async function assignTeams(): Promise<void> {
  const unassigned = await prisma.agent.findMany({
    where: { teamName: null, isNpc: false },
  });

  for (const agent of unassigned) {
    // 找人数最少的球队
    const teamCounts = await Promise.all(
      NBA_TEAMS.map(async (team) => ({
        team,
        count: await prisma.agent.count({ where: { teamName: team } }),
      }))
    );
    teamCounts.sort((a, b) => a.count - b.count);
    await prisma.agent.update({
      where: { id: agent.id },
      data: { teamName: teamCounts[0].team },
    });
  }
}

/** 创建新赛季 */
export async function createSeason(): Promise<string> {
  // 确保有足够 NPC
  await ensureNpcAgents();
  await assignTeams();

  // 获取最新赛季号
  const lastSeason = await prisma.nbaSeason.findFirst({
    orderBy: { seasonNum: "desc" },
  });
  const seasonNum = (lastSeason?.seasonNum || 0) + 1;

  const season = await prisma.nbaSeason.create({
    data: { seasonNum, totalGames: 30 },
  });

  // 为所有活跃 Agent 创建赛季统计
  const agents = await prisma.agent.findMany({
    where: { status: "active", position: { not: null } },
  });

  for (const agent of agents) {
    const ovr = calculateOVR({
      shooting: agent.shooting,
      defense: agent.defense,
      speed: agent.speed,
      stamina: agent.stamina,
      basketballIQ: agent.basketballIQ,
      passing: agent.passing,
      rebound: agent.rebound,
      position: agent.position!,
      luckValue: agent.luckValue,
      cognitiveScore: agent.cognitiveScore,
    });
    const salary = calculateSalary(ovr);

    await prisma.nbaSeasonStats.create({
      data: {
        seasonId: season.id,
        agentId: agent.id,
        salaryCurrent: salary,
      },
    });

    // 更新 Agent 薪资
    await prisma.agent.update({
      where: { id: agent.id },
      data: { salary },
    });

    // 赛季开始事件
    if (!agent.isNpc) {
      const worldEvent = await generateWorldEvent({
        nickname: agent.nickname,
        position: agent.position!,
        teamName: agent.teamName!,
        shooting: agent.shooting,
        defense: agent.defense,
        speed: agent.speed,
        stamina: agent.stamina,
        basketballIQ: agent.basketballIQ,
        passing: agent.passing,
        rebound: agent.rebound,
        luckValue: agent.luckValue,
        cognitiveScore: agent.cognitiveScore,
        wins: agent.wins,
        losses: agent.losses,
        tokenBalance: agent.tokenBalance,
        lifeVision: agent.lifeVision,
      });

      await prisma.activityLog.create({
        data: {
          agentId: agent.id,
          type: "event",
          title: `第 ${seasonNum} 赛季开始`,
          content: `新赛季开幕！年薪 ${salary} Token。\n${worldEvent}`,
          tokenChange: 0,
        },
      });
    }
  }

  return season.id;
}

/** 将 Agent 数据转为世界模型格式 */
function toWorldAgent(agent: {
  nickname: string;
  position: string | null;
  teamName: string | null;
  shooting: number;
  defense: number;
  speed: number;
  stamina: number;
  basketballIQ: number;
  passing: number;
  rebound: number;
  luckValue: number;
  cognitiveScore: number;
  wins: number;
  losses: number;
  tokenBalance: number;
  lifeVision: string | null;
}) {
  return {
    nickname: agent.nickname,
    position: agent.position || "SF",
    teamName: agent.teamName || "自由球员",
    shooting: agent.shooting,
    defense: agent.defense,
    speed: agent.speed,
    stamina: agent.stamina,
    basketballIQ: agent.basketballIQ,
    passing: agent.passing,
    rebound: agent.rebound,
    luckValue: agent.luckValue,
    cognitiveScore: agent.cognitiveScore,
    wins: agent.wins,
    losses: agent.losses,
    tokenBalance: agent.tokenBalance,
    lifeVision: agent.lifeVision,
  };
}

/** 模拟赛季中的下一批比赛（每次模拟 5 场） */
export async function simulateNextGames(seasonId: string, count: number = 5): Promise<number> {
  const season = await prisma.nbaSeason.findUnique({ where: { id: seasonId } });
  if (!season || season.status === "completed") return 0;

  // 获取所有有球队的 Agent
  const agents = await prisma.agent.findMany({
    where: { position: { not: null }, teamName: { not: null }, status: "active" },
  });

  if (agents.length < 2) return 0;

  let gamesSimulated = 0;
  const currentGameNum = season.gamesPlayed;

  for (let i = 0; i < count && (currentGameNum + i) < season.totalGames; i++) {
    // 随机选两个不同球队的 Agent 对战
    const shuffled = [...agents].sort(() => Math.random() - 0.5);
    const home = shuffled[0];
    let away = shuffled.find((a) => a.teamName !== home.teamName);
    if (!away) away = shuffled[1]; // 如果只有一个球队就选第二个

    const homeAttrs = {
      shooting: home.shooting,
      defense: home.defense,
      speed: home.speed,
      stamina: home.stamina,
      basketballIQ: home.basketballIQ,
      passing: home.passing,
      rebound: home.rebound,
      position: home.position!,
      luckValue: home.luckValue,
      cognitiveScore: home.cognitiveScore,
    };

    const awayAttrs = {
      shooting: away.shooting,
      defense: away.defense,
      speed: away.speed,
      stamina: away.stamina,
      basketballIQ: away.basketballIQ,
      passing: away.passing,
      rebound: away.rebound,
      position: away.position!,
      luckValue: away.luckValue,
      cognitiveScore: away.cognitiveScore,
    };

    // 1. 先用引擎生成基础数据
    const baseResult = simulateGame(homeAttrs, awayAttrs, home.nickname, away.nickname);

    // 2. 世界模型裁决（Kimi AI）
    let verdict: GameVerdict;
    // 只对真人玩家对局调用世界模型（节约 API）
    const hasHumanPlayer = !home.isNpc || !away.isNpc;
    if (hasHumanPlayer) {
      verdict = await judgeGame(
        toWorldAgent(home),
        toWorldAgent(away),
        { seasonNum: season.seasonNum, gameNum: currentGameNum + i + 1, totalGames: season.totalGames }
      );
    } else {
      verdict = {
        homeScoreAdjust: 0,
        awayScoreAdjust: 0,
        homeStatBonus: null,
        awayStatBonus: null,
        narrative: baseResult.narrative,
        mvp: baseResult.homeScore > baseResult.awayScore ? "home" : "away",
        eventType: "normal",
        tokenAdjust: { home: -3, away: -3 },
      };
    }

    // 3. 合并引擎数据 + 世界模型裁决
    const finalHomeScore = baseResult.homeScore + verdict.homeScoreAdjust;
    const finalAwayScore = baseResult.awayScore + verdict.awayScoreAdjust;
    const finalNarrative = hasHumanPlayer ? verdict.narrative : baseResult.narrative;

    // 创建比赛记录
    const game = await prisma.nbaGame.create({
      data: {
        seasonId,
        gameNum: currentGameNum + i + 1,
        homeAgentId: home.id,
        awayAgentId: away.id,
        homeScore: finalHomeScore,
        awayScore: finalAwayScore,
        status: "completed",
        narrative: finalNarrative,
      },
    });

    // 记录个人数据
    await prisma.nbaGameStats.create({
      data: { gameId: game.id, agentId: home.id, ...baseResult.homeStats },
    });
    await prisma.nbaGameStats.create({
      data: { gameId: game.id, agentId: away.id, ...baseResult.awayStats },
    });

    // 更新胜负
    const homeWon = finalHomeScore > finalAwayScore;
    await prisma.agent.update({
      where: { id: homeWon ? home.id : away.id },
      data: { wins: { increment: 1 } },
    });
    await prisma.agent.update({
      where: { id: homeWon ? away.id : home.id },
      data: { losses: { increment: 1 } },
    });

    // 4. 世界模型 Token 结算 - 扣除行动消耗 + 分配奖励
    for (const [agent, stats, won, tokenChange, statBonus] of [
      [home, baseResult.homeStats, homeWon, verdict.tokenAdjust.home, verdict.homeStatBonus] as const,
      [away, baseResult.awayStats, !homeWon, verdict.tokenAdjust.away, verdict.awayStatBonus] as const,
    ]) {
      // 更新赛季统计
      await prisma.nbaSeasonStats.upsert({
        where: { seasonId_agentId: { seasonId, agentId: agent.id } },
        update: {
          gamesPlayed: { increment: 1 },
          gamesWon: { increment: won ? 1 : 0 },
          totalPoints: { increment: stats.points },
          totalRebounds: { increment: stats.rebounds },
          totalAssists: { increment: stats.assists },
          totalSteals: { increment: stats.steals },
          totalBlocks: { increment: stats.blocks },
          avgRating: stats.rating,
        },
        create: {
          seasonId,
          agentId: agent.id,
          gamesPlayed: 1,
          gamesWon: won ? 1 : 0,
          totalPoints: stats.points,
          totalRebounds: stats.rebounds,
          totalAssists: stats.assists,
          totalSteals: stats.steals,
          totalBlocks: stats.blocks,
          avgRating: stats.rating,
        },
      });

      // Token 结算（行动消耗 + 奖惩）
      if (!agent.isNpc && tokenChange !== 0) {
        await prisma.agent.update({
          where: { id: agent.id },
          data: {
            tokenBalance: { increment: tokenChange },
            totalEarned: tokenChange > 0 ? { increment: tokenChange } : undefined,
            totalSpent: tokenChange < 0 ? { increment: Math.abs(tokenChange) } : undefined,
          },
        });

        // 记录交易
        const updatedAgent = await prisma.agent.findUnique({ where: { id: agent.id } });
        await prisma.tokenTransaction.create({
          data: {
            agentId: agent.id,
            type: tokenChange > 0 ? "reward" : "spend",
            amount: Math.abs(tokenChange),
            balance: updatedAgent?.tokenBalance || 0,
            description: tokenChange > 0
              ? `比赛奖励 +${tokenChange} Token（${won ? "胜利" : "表现"}）`
              : `行动消耗 ${tokenChange} Token`,
            referenceId: game.id,
          },
        });
      }

      // 世界模型属性加成
      if (!agent.isNpc && statBonus) {
        const validAttrs = ["shooting", "defense", "speed", "stamina", "basketballIQ", "passing", "rebound"];
        if (validAttrs.includes(statBonus.attr)) {
          const currentVal = (agent as Record<string, unknown>)[statBonus.attr] as number || 50;
          const newVal = Math.min(99, currentVal + statBonus.amount);
          await prisma.agent.update({
            where: { id: agent.id },
            data: { [statBonus.attr]: newVal },
          });
        }
      }

      // 非 NPC 的 Agent 写活动日志
      if (!agent.isNpc) {
        const eventTag = verdict.eventType !== "normal" ? ` [${eventTypeLabel(verdict.eventType)}]` : "";
        const tokenInfo = tokenChange !== 0 ? `\nToken: ${tokenChange > 0 ? "+" : ""}${tokenChange}` : "";
        const mvpTag = verdict.mvp === (agent.id === home.id ? "home" : "away") ? " ★MVP" : "";

        await prisma.activityLog.create({
          data: {
            agentId: agent.id,
            type: "game",
            title: `第 ${currentGameNum + i + 1} 场比赛 ${won ? "胜利" : "失败"}${mvpTag}${eventTag}`,
            content: `${home.teamName} ${finalHomeScore} : ${finalAwayScore} ${away.teamName}\n你的数据：${stats.points}分 ${stats.rebounds}篮板 ${stats.assists}助攻\n${finalNarrative}${tokenInfo}`,
            tokenChange: tokenChange,
          },
        });
      }
    }

    // 5. 生成赛事互动对话（赛前叫嚣 + 赛中垃圾话 + 赛后感言）
    const hasHumanForInteraction = !home.isNpc || !away.isNpc;
    if (hasHumanForInteraction) {
      try {
        await generateGameInteractions(
          {
            id: home.id, userId: home.userId, nickname: home.nickname,
            position: home.position!, teamName: home.teamName!,
            isNpc: home.isNpc, wins: home.wins, losses: home.losses,
            tokenBalance: home.tokenBalance, lifeVision: home.lifeVision,
            shooting: home.shooting, defense: home.defense, speed: home.speed,
            stamina: home.stamina, basketballIQ: home.basketballIQ,
            passing: home.passing, rebound: home.rebound,
          },
          {
            id: away.id, userId: away.userId, nickname: away.nickname,
            position: away.position!, teamName: away.teamName!,
            isNpc: away.isNpc, wins: away.wins, losses: away.losses,
            tokenBalance: away.tokenBalance, lifeVision: away.lifeVision,
            shooting: away.shooting, defense: away.defense, speed: away.speed,
            stamina: away.stamina, basketballIQ: away.basketballIQ,
            passing: away.passing, rebound: away.rebound,
          },
          {
            gameId: game.id,
            gameNum: currentGameNum + i + 1,
            seasonNum: season.seasonNum,
            homeScore: finalHomeScore,
            awayScore: finalAwayScore,
            homeStats: baseResult.homeStats,
            awayStats: baseResult.awayStats,
            narrative: finalNarrative,
          }
        );
      } catch (error) {
        console.error("[互动引擎] 生成互动失败，不影响比赛结果:", error);
      }
    }

    gamesSimulated++;
  }

  // 更新赛季已比赛场次
  const newGamesPlayed = currentGameNum + gamesSimulated;
  await prisma.nbaSeason.update({
    where: { id: seasonId },
    data: {
      gamesPlayed: newGamesPlayed,
      status: newGamesPlayed >= season.totalGames ? "completed" : "active",
      completedAt: newGamesPlayed >= season.totalGames ? new Date() : undefined,
    },
  });

  // 如果赛季结束，发放薪资（世界模型结算）
  if (newGamesPlayed >= season.totalGames) {
    await settleSeasonSalary(seasonId);
  }

  return gamesSimulated;
}

/** 赛季结束结算薪资 - 世界模型驱动 */
async function settleSeasonSalary(seasonId: string): Promise<void> {
  const season = await prisma.nbaSeason.findUnique({ where: { id: seasonId } });
  if (!season) return;

  const seasonStats = await prisma.nbaSeasonStats.findMany({
    where: { seasonId },
    include: { agent: true },
  });

  for (const stat of seasonStats) {
    if (stat.agent.isNpc) continue;

    // 世界模型进行赛季结算
    const settlement = await settleSeasonByWorldModel(
      toWorldAgent(stat.agent),
      {
        gamesPlayed: stat.gamesPlayed,
        gamesWon: stat.gamesWon,
        totalPoints: stat.totalPoints,
        totalRebounds: stat.totalRebounds,
        totalAssists: stat.totalAssists,
        avgRating: stat.avgRating,
        salaryCurrent: stat.salaryCurrent,
      },
      season.seasonNum
    );

    // 计算最终薪资
    const baseSalary = stat.salaryCurrent;
    const adjustedSalary = Math.round(baseSalary * settlement.salaryMultiplier);
    const totalEarning = adjustedSalary + settlement.bonusTokens;

    // 发放薪资
    await prisma.agent.update({
      where: { id: stat.agentId },
      data: {
        tokenBalance: { increment: totalEarning },
        totalEarned: { increment: totalEarning },
        salary: adjustedSalary, // 更新下赛季薪资
      },
    });

    // 更新赛季统计
    await prisma.nbaSeasonStats.update({
      where: { id: stat.id },
      data: { tokensEarned: totalEarning },
    });

    // 记录薪资交易
    const updatedAgent = await prisma.agent.findUnique({ where: { id: stat.agentId } });
    await prisma.tokenTransaction.create({
      data: {
        agentId: stat.agentId,
        type: "earn",
        amount: totalEarning,
        balance: updatedAgent?.tokenBalance || 0,
        description: `赛季薪资 ${adjustedSalary} Token（${settlement.salaryMultiplier > 1 ? "涨薪" : settlement.salaryMultiplier < 1 ? "降薪" : "维持"}）` +
          (settlement.bonusTokens > 0 ? ` + 奖金 ${settlement.bonusTokens} Token` : ""),
        referenceId: seasonId,
      },
    });

    // 活动日志 - 赛季总结
    await prisma.activityLog.create({
      data: {
        agentId: stat.agentId,
        type: "salary",
        title: `第 ${season.seasonNum} 赛季结算${settlement.mvpCandidate ? " ★MVP候选" : ""}`,
        content: `${settlement.narrative}\n\n` +
          `赛季数据：${stat.gamesPlayed}场 ${stat.gamesWon}胜 场均${(stat.totalPoints / Math.max(1, stat.gamesPlayed)).toFixed(1)}分 ${(stat.totalRebounds / Math.max(1, stat.gamesPlayed)).toFixed(1)}板 ${(stat.totalAssists / Math.max(1, stat.gamesPlayed)).toFixed(1)}助\n` +
          `薪资结算：${adjustedSalary} Token${settlement.bonusTokens > 0 ? ` + 奖金 ${settlement.bonusTokens} Token` : ""}\n` +
          (settlement.tradeRumor ? `\n📰 交易传闻：${settlement.tradeRumor}\n` : "") +
          `\n展望：${settlement.nextSeasonOutlook}`,
        tokenChange: totalEarning,
      },
    });
  }
}

function eventTypeLabel(type: string): string {
  const map: Record<string, string> = {
    upset: "爆冷",
    blowout: "大胜",
    buzzer_beater: "绝杀",
    injury_minor: "轻伤",
    normal: "",
  };
  return map[type] || type;
}
