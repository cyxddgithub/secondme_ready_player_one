import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  // 基于反思内容提升属性（简化版）
  const attrNames: Record<string, string> = {
    shooting: "投篮",
    defense: "防守",
    speed: "速度",
    stamina: "体力",
    basketballIQ: "篮球智商",
    passing: "传球",
    rebound: "篮板",
  };
  const validAttrs = Object.keys(attrNames);
  let targetAttr: string;
  let boostAmount: number;
  let summary = "";

  if (focusAttribute && validAttrs.includes(focusAttribute)) {
    targetAttr = focusAttribute;
    boostAmount = Math.round(1 + Math.random() * 3); // 1-4 点
    summary = `通过反思和训练，${attrNames[targetAttr]}能力提升了 ${boostAmount} 点。`;
  } else {
    targetAttr = validAttrs[Math.floor(Math.random() * validAttrs.length)];
    boostAmount = Math.round(1 + Math.random() * 2); // 1-3 点
    summary = `通过全面反思，${attrNames[targetAttr]}获得了提升。`;
  }

  // 认知分数也有少量提升
  const cognitiveBoost = Math.round(Math.random() * 3);

  // 计算新值（确保不超过 99）
  const currentVal = (agent as Record<string, unknown>)[targetAttr] as number || 50;
  const newVal = Math.min(99, currentVal + boostAmount);
  const newCognitive = Math.min(100, agent.cognitiveScore + cognitiveBoost);

  // 更新 Agent 属性
  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      [targetAttr]: newVal,
      cognitiveScore: newCognitive,
    },
  });

  // 保存反思记录
  const reflection = await prisma.reflection.create({
    data: {
      agentId: agent.id,
      content,
      strategyChange: focusAttribute ? JSON.stringify({ focus: focusAttribute }) : null,
      aiSummary: summary + (cognitiveBoost > 0 ? ` 认知能力提升 ${cognitiveBoost} 点。` : ""),
    },
  });

  // 活动日志
  await prisma.activityLog.create({
    data: {
      agentId: agent.id,
      type: "reflection",
      title: "反思与提升",
      content: `${content}\n\n${summary}`,
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
