import { NextRequest, NextResponse } from "next/server";
import {
  shouldCreateTournament,
  createAutoTournament,
  advanceTournament,
} from "@/game/tournament/tournamentEngine";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * 锦标赛 Cron 端点
 *
 * Vercel Cron 每 5 分钟调用一次
 * 也可手动调用: GET /api/cron/tournament?secret=xxx
 */
export async function GET(req: NextRequest) {
  // 验证授权
  const authHeader = req.headers.get("authorization");
  const secret = req.nextUrl.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const isVercelCron = authHeader === `Bearer ${cronSecret}`;
    const isManual = secret === cronSecret;
    if (!isVercelCron && !isManual) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }
  }

  try {
    const actions: string[] = [];

    // 1. 检查是否有活跃锦标赛需要推进
    const activeTournament = await prisma.tournament.findFirst({
      where: {
        status: { in: ["registering", "in_progress", "settling"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (activeTournament) {
      const result = await advanceTournament(activeTournament.id);
      actions.push(`[${activeTournament.name}] ${result.action}: ${result.detail}`);
    } else {
      // 2. 无活跃锦标赛，检查是否应该创建新的
      const shouldCreate = await shouldCreateTournament();
      if (shouldCreate) {
        const tournamentId = await createAutoTournament();
        const tournament = await prisma.tournament.findUnique({
          where: { id: tournamentId },
          include: { participants: true },
        });
        actions.push(
          `创建新锦标赛「${tournament?.name}」，${tournament?.participants.length} 名选手报名`
        );
      } else {
        actions.push("暂无需要处理的锦标赛");
      }
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      actions,
    });
  } catch (error) {
    console.error("锦标赛 Cron 执行失败:", error);
    return NextResponse.json(
      { error: "锦标赛处理失败", detail: String(error) },
      { status: 500 }
    );
  }
}
