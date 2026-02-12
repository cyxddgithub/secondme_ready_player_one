/**
 * NBA 赛季模拟器
 * 负责创建赛季、生成赛程、模拟比赛、结算薪资
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
  }

  return season.id;
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

    const result = simulateGame(homeAttrs, awayAttrs, home.nickname, away.nickname);

    // 创建比赛记录
    const game = await prisma.nbaGame.create({
      data: {
        seasonId,
        gameNum: currentGameNum + i + 1,
        homeAgentId: home.id,
        awayAgentId: away.id,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        status: "completed",
        narrative: result.narrative,
      },
    });

    // 记录个人数据
    await prisma.nbaGameStats.create({
      data: { gameId: game.id, agentId: home.id, ...result.homeStats },
    });
    await prisma.nbaGameStats.create({
      data: { gameId: game.id, agentId: away.id, ...result.awayStats },
    });

    // 更新胜负
    const homeWon = result.homeScore > result.awayScore;
    await prisma.agent.update({
      where: { id: homeWon ? home.id : away.id },
      data: { wins: { increment: 1 } },
    });
    await prisma.agent.update({
      where: { id: homeWon ? away.id : home.id },
      data: { losses: { increment: 1 } },
    });

    // 更新赛季统计
    for (const [agent, stats, won] of [
      [home, result.homeStats, homeWon] as const,
      [away, result.awayStats, !homeWon] as const,
    ]) {
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
          avgRating: stats.rating, // 简化：用最新一场的评分
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

      // 非 NPC 的 Agent 写活动日志
      if (!agent.isNpc) {
        await prisma.activityLog.create({
          data: {
            agentId: agent.id,
            type: "game",
            title: `第 ${currentGameNum + i + 1} 场比赛 ${won ? "胜利" : "失败"}`,
            content: `${home.teamName} ${result.homeScore} : ${result.awayScore} ${away.teamName}\n你的数据：${stats.points}分 ${stats.rebounds}篮板 ${stats.assists}助攻\n${result.narrative}`,
            tokenChange: 0,
          },
        });
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

  // 如果赛季结束，发放薪资
  if (newGamesPlayed >= season.totalGames) {
    await settleSeasonSalary(seasonId);
  }

  return gamesSimulated;
}

/** 赛季结束结算薪资 */
async function settleSeasonSalary(seasonId: string): Promise<void> {
  const seasonStats = await prisma.nbaSeasonStats.findMany({
    where: { seasonId },
    include: { agent: true },
  });

  for (const stat of seasonStats) {
    if (stat.agent.isNpc) continue;

    const salary = stat.salaryCurrent;
    // 绩效奖金：胜率 > 60% 额外 50%
    const winRate = stat.gamesPlayed > 0 ? stat.gamesWon / stat.gamesPlayed : 0;
    const bonus = winRate > 0.6 ? Math.round(salary * 0.5) : 0;
    const totalEarning = salary + bonus;

    // 发放薪资
    await prisma.agent.update({
      where: { id: stat.agentId },
      data: {
        tokenBalance: { increment: totalEarning },
        totalEarned: { increment: totalEarning },
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
        description: `赛季薪资 ${salary} Token` + (bonus > 0 ? ` + 绩效奖金 ${bonus} Token` : ""),
        referenceId: seasonId,
      },
    });

    // 活动日志
    await prisma.activityLog.create({
      data: {
        agentId: stat.agentId,
        type: "salary",
        title: "赛季薪资结算",
        content: `本赛季 ${stat.gamesPlayed} 场比赛，${stat.gamesWon} 胜 ${stat.gamesPlayed - stat.gamesWon} 负。\n场均 ${(stat.totalPoints / Math.max(1, stat.gamesPlayed)).toFixed(1)} 分 ${(stat.totalRebounds / Math.max(1, stat.gamesPlayed)).toFixed(1)} 篮板 ${(stat.totalAssists / Math.max(1, stat.gamesPlayed)).toFixed(1)} 助攻。\n获得薪资 ${salary} Token${bonus > 0 ? `，绩效奖金 ${bonus} Token` : ""}。`,
        tokenChange: totalEarning,
      },
    });
  }
}
