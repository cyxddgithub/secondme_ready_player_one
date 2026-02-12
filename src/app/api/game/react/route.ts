import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReactionResponse } from "@/game/social/interactionEngine";

/** 对比赛互动进行反应（点赞/不屑/挑衅/留言） */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  const agent = await prisma.agent.findUnique({ where: { userId: user.id } });
  if (!agent) {
    return NextResponse.json({ code: 404, message: "未创建 Agent" }, { status: 404 });
  }

  const body = await req.json();
  const { interactionId, gameId, toAgentId, type, message } = body;

  // 验证反应类型
  const validTypes = ["like", "disdain", "provoke", "comment"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ code: 400, message: "无效的反应类型" }, { status: 400 });
  }

  if (!toAgentId) {
    return NextResponse.json({ code: 400, message: "缺少目标 Agent" }, { status: 400 });
  }

  // 不能对自己反应
  if (toAgentId === agent.id) {
    return NextResponse.json({ code: 400, message: "不能对自己互动" }, { status: 400 });
  }

  const toAgent = await prisma.agent.findUnique({ where: { id: toAgentId } });
  if (!toAgent) {
    return NextResponse.json({ code: 404, message: "目标 Agent 不存在" }, { status: 404 });
  }

  // 创建反应记录
  const reaction = await prisma.agentReaction.create({
    data: {
      interactionId: interactionId || null,
      gameId: gameId || null,
      fromAgentId: agent.id,
      toAgentId,
      type,
      message: message || null,
      source: "user",
    },
    include: {
      fromAgent: { select: { id: true, nickname: true, avatar: true } },
      toAgent: { select: { id: true, nickname: true, avatar: true } },
    },
  });

  // 如果是挑衅或留言，生成对方的自动回复
  let autoReply = null;
  if (type === "provoke" || type === "comment") {
    const fromAgentData = {
      id: agent.id, userId: agent.userId, nickname: agent.nickname,
      position: agent.position || "SF", teamName: agent.teamName || "",
      isNpc: agent.isNpc, wins: agent.wins, losses: agent.losses,
      tokenBalance: agent.tokenBalance, lifeVision: agent.lifeVision,
      shooting: agent.shooting, defense: agent.defense, speed: agent.speed,
      stamina: agent.stamina, basketballIQ: agent.basketballIQ,
      passing: agent.passing, rebound: agent.rebound,
    };
    const toAgentData = {
      id: toAgent.id, userId: toAgent.userId, nickname: toAgent.nickname,
      position: toAgent.position || "SF", teamName: toAgent.teamName || "",
      isNpc: toAgent.isNpc, wins: toAgent.wins, losses: toAgent.losses,
      tokenBalance: toAgent.tokenBalance, lifeVision: toAgent.lifeVision,
      shooting: toAgent.shooting, defense: toAgent.defense, speed: toAgent.speed,
      stamina: toAgent.stamina, basketballIQ: toAgent.basketballIQ,
      passing: toAgent.passing, rebound: toAgent.rebound,
    };

    try {
      const response = await generateReactionResponse(
        fromAgentData, toAgentData, type, message
      );

      if (response) {
        autoReply = await prisma.agentReaction.create({
          data: {
            interactionId: interactionId || null,
            gameId: gameId || null,
            fromAgentId: toAgentId,
            toAgentId: agent.id,
            type: "comment",
            message: response.message,
            source: response.source,
          },
          include: {
            fromAgent: { select: { id: true, nickname: true, avatar: true } },
            toAgent: { select: { id: true, nickname: true, avatar: true } },
          },
        });
      }
    } catch (error) {
      console.error("[互动反应] 生成自动回复失败:", error);
    }
  }

  return NextResponse.json({
    code: 0,
    data: { reaction, autoReply },
  });
}

/** 获取某场比赛的所有反应 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  const gameId = req.nextUrl.searchParams.get("gameId");
  if (!gameId) {
    return NextResponse.json({ code: 400, message: "缺少 gameId" }, { status: 400 });
  }

  // 获取该比赛所有相关互动的反应
  const reactions = await prisma.agentReaction.findMany({
    where: {
      OR: [
        { gameId },
        { interaction: { gameId } },
      ],
    },
    include: {
      fromAgent: { select: { id: true, nickname: true, avatar: true } },
      toAgent: { select: { id: true, nickname: true, avatar: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ code: 0, data: reactions });
}
