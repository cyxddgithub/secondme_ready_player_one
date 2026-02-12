import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { advanceTournament } from "@/game/tournament/tournamentEngine";

export const dynamic = "force-dynamic";

/**
 * GET /api/tournament/current
 * 获取当前/最近的锦标赛信息（附带惰性推进）
 */
export async function GET() {
  try {
    // 惰性推进：检查是否有锦标赛需要推进
    const activeTournament = await prisma.tournament.findFirst({
      where: {
        status: { in: ["registering", "in_progress", "settling"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (activeTournament) {
      // 检查是否到了该推进的时间
      const now = new Date();
      if (
        (activeTournament.status === "registering" &&
          activeTournament.registrationEnd &&
          now >= activeTournament.registrationEnd) ||
        activeTournament.status === "in_progress" ||
        activeTournament.status === "settling"
      ) {
        await advanceTournament(activeTournament.id);
      }
    }

    // 获取当前或最近的锦标赛
    const tournament = await prisma.tournament.findFirst({
      orderBy: { createdAt: "desc" },
      include: {
        participants: {
          include: {
            agent: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
                teamName: true,
                level: true,
                isNpc: true,
              },
            },
          },
          orderBy: { totalScore: "desc" },
        },
        matches: {
          orderBy: [{ round: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ tournament: null, message: "暂无锦标赛" });
    }

    return NextResponse.json({ tournament });
  } catch (error) {
    console.error("获取当前锦标赛失败:", error);
    return NextResponse.json(
      { error: "获取锦标赛信息失败" },
      { status: 500 }
    );
  }
}
