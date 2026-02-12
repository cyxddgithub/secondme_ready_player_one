import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isKimiAvailable } from "@/lib/kimi";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  const agent = await prisma.agent.findUnique({ where: { userId: user.id } });

  // 当前活跃赛季
  const activeSeason = await prisma.nbaSeason.findFirst({
    where: { status: "active" },
    orderBy: { seasonNum: "desc" },
  });

  // 总球员数
  const totalAgents = await prisma.agent.count({ where: { status: "active" } });
  const humanAgents = await prisma.agent.count({ where: { isNpc: false } });

  // Agent 的 Token 总消耗和总收入
  const tokenStats = agent
    ? {
        totalSpent: agent.totalSpent,
        totalEarned: agent.totalEarned,
        balance: agent.tokenBalance,
      }
    : null;

  return NextResponse.json({
    code: 0,
    data: {
      worldModelActive: isKimiAvailable(),
      worldModelEngine: isKimiAvailable() ? "Kimi (moonshot-v1-8k)" : "本地引擎",
      activeSeason: activeSeason
        ? {
            seasonNum: activeSeason.seasonNum,
            gamesPlayed: activeSeason.gamesPlayed,
            totalGames: activeSeason.totalGames,
            status: activeSeason.status,
          }
        : null,
      totalAgents,
      humanAgents,
      tokenStats,
    },
  });
}
