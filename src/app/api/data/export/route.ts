import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 导出全部数据库数据为 JSON
 * 将返回的 JSON 保存为 data/db.json 并提交到 repo，
 * 下次部署时 seed 脚本会自动恢复数据。
 *
 * GET /api/data/export
 */
export async function GET() {
  try {
    const [
      users,
      agents,
      nbaSeasons,
      nbaGames,
      nbaGameStats,
      nbaSeasonStats,
      activityLogs,
      reflections,
      chatSessions,
      arenaMatches,
      tokenTransactions,
      worldTasks,
      taskCompletions,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.agent.findMany(),
      prisma.nbaSeason.findMany(),
      prisma.nbaGame.findMany(),
      prisma.nbaGameStats.findMany(),
      prisma.nbaSeasonStats.findMany(),
      prisma.activityLog.findMany(),
      prisma.reflection.findMany(),
      prisma.chatSession.findMany(),
      prisma.arenaMatch.findMany(),
      prisma.tokenTransaction.findMany(),
      prisma.worldTask.findMany(),
      prisma.taskCompletion.findMany(),
    ]);

    const data = {
      users,
      agents,
      nbaSeasons,
      nbaGames,
      nbaGameStats,
      nbaSeasonStats,
      activityLogs,
      reflections,
      chatSessions,
      arenaMatches,
      tokenTransactions,
      worldTasks,
      taskCompletions,
    };

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="db.json"',
      },
    });
  } catch (error) {
    console.error("[Export] Error:", error);
    return NextResponse.json({ error: "导出失败" }, { status: 500 });
  }
}
