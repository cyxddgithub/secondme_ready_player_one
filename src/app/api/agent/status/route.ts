import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateOVR } from "@/game/nba/nbaEngine";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  const agent = await prisma.agent.findUnique({
    where: { userId: user.id },
    include: {
      seasonStats: {
        include: { season: true },
        orderBy: { season: { seasonNum: "desc" } },
        take: 1,
      },
    },
  });

  if (!agent) {
    return NextResponse.json({ code: 404, message: "未创建 Agent" }, { status: 404 });
  }

  const ovr = calculateOVR({
    shooting: agent.shooting,
    defense: agent.defense,
    speed: agent.speed,
    stamina: agent.stamina,
    basketballIQ: agent.basketballIQ,
    passing: agent.passing,
    rebound: agent.rebound,
    position: agent.position || "SF",
    luckValue: agent.luckValue,
    cognitiveScore: agent.cognitiveScore,
  });

  return NextResponse.json({
    code: 0,
    data: { ...agent, ovr },
  });
}
