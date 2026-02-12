import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tournament/history?page=1&limit=10
 * 获取历史锦标赛列表
 */
export async function GET(req: NextRequest) {
  try {
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const [tournaments, total] = await Promise.all([
      prisma.tournament.findMany({
        where: { status: { in: ["completed", "cancelled"] } },
        orderBy: { completedAt: "desc" },
        skip,
        take: limit,
        include: {
          participants: {
            where: { placement: 1 },
            include: {
              agent: {
                select: { id: true, nickname: true, avatar: true, teamName: true },
              },
            },
          },
          _count: { select: { participants: true, matches: true } },
        },
      }),
      prisma.tournament.count({
        where: { status: { in: ["completed", "cancelled"] } },
      }),
    ]);

    return NextResponse.json({
      tournaments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("获取锦标赛历史失败:", error);
    return NextResponse.json(
      { error: "获取历史记录失败" },
      { status: 500 }
    );
  }
}
