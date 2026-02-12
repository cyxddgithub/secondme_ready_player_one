import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tournament/[id]
 * 获取指定锦标赛详情
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
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
      return NextResponse.json({ error: "锦标赛不存在" }, { status: 404 });
    }

    return NextResponse.json({ tournament });
  } catch (error) {
    console.error("获取锦标赛详情失败:", error);
    return NextResponse.json(
      { error: "获取详情失败" },
      { status: 500 }
    );
  }
}
