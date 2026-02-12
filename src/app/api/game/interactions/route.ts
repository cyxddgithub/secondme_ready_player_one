import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** 获取某场比赛的互动消息 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  const gameId = req.nextUrl.searchParams.get("gameId");
  if (!gameId) {
    return NextResponse.json({ code: 400, message: "缺少 gameId" }, { status: 400 });
  }

  const interactions = await prisma.gameInteraction.findMany({
    where: { gameId },
    include: {
      agent: { select: { id: true, nickname: true, teamName: true, avatar: true } },
      reactions: {
        include: {
          fromAgent: { select: { id: true, nickname: true, avatar: true } },
          toAgent: { select: { id: true, nickname: true, avatar: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ code: 0, data: interactions });
}
