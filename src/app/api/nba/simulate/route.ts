import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSeason, simulateNextGames } from "@/game/nba/seasonSimulator";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  // 检查是否有 Agent
  const agent = await prisma.agent.findUnique({ where: { userId: user.id } });
  if (!agent) {
    return NextResponse.json({ code: 400, message: "请先创建 Agent" }, { status: 400 });
  }

  // 找到当前活跃赛季，没有则创建
  let season = await prisma.nbaSeason.findFirst({
    where: { status: "active" },
    orderBy: { seasonNum: "desc" },
  });

  if (!season) {
    const seasonId = await createSeason();
    season = await prisma.nbaSeason.findUnique({ where: { id: seasonId } });
  }

  if (!season) {
    return NextResponse.json({ code: 500, message: "创建赛季失败" }, { status: 500 });
  }

  // 模拟 5 场比赛
  const gamesSimulated = await simulateNextGames(season.id, 5);

  // 重新获取赛季状态
  const updatedSeason = await prisma.nbaSeason.findUnique({ where: { id: season.id } });

  return NextResponse.json({
    code: 0,
    data: {
      seasonId: season.id,
      seasonNum: season.seasonNum,
      gamesSimulated,
      gamesPlayed: updatedSeason?.gamesPlayed || 0,
      totalGames: updatedSeason?.totalGames || 30,
      status: updatedSeason?.status || "active",
    },
  });
}
