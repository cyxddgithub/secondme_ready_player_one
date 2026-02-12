import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeReflection } from "@/game/world/worldModel";

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
  const { content, focusAttribute } = body;

  if (!content) {
    return NextResponse.json({ code: 400, message: "请输入反思内容" }, { status: 400 });
  }

  // 获取最近比赛数据
  const recentGames = await prisma.nbaGame.findMany({
    where: {
      OR: [{ homeAgentId: agent.id }, { awayAgentId: agent.id }],
      status: "completed",
    },
    include: { stats: { where: { agentId: agent.id } } },
    orderBy: { playedAt: "desc" },
    take: 5,
  });

  const recentGameData = recentGames.map((g) => ({
    won: g.homeAgentId === agent.id ? g.homeScore > g.awayScore : g.awayScore > g.homeScore,
    points: g.stats[0]?.points || 0,
    rebounds: g.stats[0]?.rebounds || 0,
    assists: g.stats[0]?.assists || 0,
  }));

  // 世界模型分析反思（Kimi AI 驱动）
  const analysis = await analyzeReflection(
    {
      nickname: agent.nickname,
      position: agent.position || "SF",
      teamName: agent.teamName || "自由球员",
      shooting: agent.shooting,
      defense: agent.defense,
      speed: agent.speed,
      stamina: agent.stamina,
      basketballIQ: agent.basketballIQ,
      passing: agent.passing,
      rebound: agent.rebound,
      luckValue: agent.luckValue,
      cognitiveScore: agent.cognitiveScore,
      wins: agent.wins,
      losses: agent.losses,
      tokenBalance: agent.tokenBalance,
      lifeVision: agent.lifeVision,
    },
    content,
    focusAttribute,
    recentGameData
  );

  // 应用主要属性提升
  const validAttrs = ["shooting", "defense", "speed", "stamina", "basketballIQ", "passing", "rebound"];
  const updateData: Record<string, number> = {};

  if (validAttrs.includes(analysis.primaryBoost.attr)) {
    const currentVal = (agent as Record<string, unknown>)[analysis.primaryBoost.attr] as number || 50;
    updateData[analysis.primaryBoost.attr] = Math.min(99, currentVal + analysis.primaryBoost.amount);
  }

  // 应用次要属性提升
  if (analysis.secondaryBoost && validAttrs.includes(analysis.secondaryBoost.attr)) {
    const currentVal2 = (agent as Record<string, unknown>)[analysis.secondaryBoost.attr] as number || 50;
    updateData[analysis.secondaryBoost.attr] = Math.min(99, currentVal2 + analysis.secondaryBoost.amount);
  }

  // 认知提升
  updateData.cognitiveScore = Math.min(100, agent.cognitiveScore + analysis.cognitiveBoost);

  // 更新 Agent 属性
  await prisma.agent.update({
    where: { id: agent.id },
    data: updateData,
  });

  const attrNames: Record<string, string> = {
    shooting: "投篮", defense: "防守", speed: "速度", stamina: "体力",
    basketballIQ: "篮球智商", passing: "传球", rebound: "篮板",
  };

  // 构建提升摘要
  const boostParts: string[] = [];
  boostParts.push(`${attrNames[analysis.primaryBoost.attr] || analysis.primaryBoost.attr} +${analysis.primaryBoost.amount}`);
  if (analysis.secondaryBoost && analysis.secondaryBoost.amount > 0) {
    boostParts.push(`${attrNames[analysis.secondaryBoost.attr] || analysis.secondaryBoost.attr} +${analysis.secondaryBoost.amount}`);
  }
  if (analysis.cognitiveBoost > 0) {
    boostParts.push(`认知 +${analysis.cognitiveBoost}`);
  }

  const fullSummary = `${analysis.summary}\n\n属性提升：${boostParts.join("、")}\n\n${analysis.advice}`;

  // 保存反思记录
  const reflection = await prisma.reflection.create({
    data: {
      agentId: agent.id,
      content,
      strategyChange: focusAttribute ? JSON.stringify({ focus: focusAttribute }) : null,
      aiSummary: fullSummary,
    },
  });

  // 活动日志
  await prisma.activityLog.create({
    data: {
      agentId: agent.id,
      type: "reflection",
      title: "反思与提升",
      content: `${content}\n\n${fullSummary}`,
      tokenChange: 0,
    },
  });

  return NextResponse.json({
    code: 0,
    data: reflection,
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  const agent = await prisma.agent.findUnique({ where: { userId: user.id } });
  if (!agent) {
    return NextResponse.json({ code: 404, message: "未创建 Agent" }, { status: 404 });
  }

  const reflections = await prisma.reflection.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ code: 0, data: reflections });
}
