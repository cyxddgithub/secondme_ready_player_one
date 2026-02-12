import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  const agent = await prisma.agent.findUnique({ where: { userId: user.id } });
  if (!agent) {
    return NextResponse.json({ code: 404, message: "未创建 Agent" }, { status: 404 });
  }

  const seasonId = req.nextUrl.searchParams.get("seasonId");

  const where = seasonId
    ? {
        seasonId,
        OR: [{ homeAgentId: agent.id }, { awayAgentId: agent.id }],
        status: "completed",
      }
    : {
        OR: [{ homeAgentId: agent.id }, { awayAgentId: agent.id }],
        status: "completed",
      };

  const games = await prisma.nbaGame.findMany({
    where,
    include: {
      homeAgent: { select: { id: true, nickname: true, teamName: true } },
      awayAgent: { select: { id: true, nickname: true, teamName: true } },
      stats: { where: { agentId: agent.id } },
      season: { select: { seasonNum: true } },
      interactions: {
        select: { id: true, agentId: true, phase: true, message: true, source: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { interactions: true } },
    },
    orderBy: { playedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ code: 0, data: games });
}
