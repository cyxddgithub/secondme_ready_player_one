import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAttributes, calculateOVR, calculateSalary, NBA_TEAMS } from "@/game/nba/nbaEngine";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  // 检查是否已有 Agent
  const existing = await prisma.agent.findUnique({ where: { userId: user.id } });
  if (existing) {
    return NextResponse.json({ code: 400, message: "已创建 Agent" }, { status: 400 });
  }

  const body = await req.json();
  const {
    nickname,
    lifeVision,
    position,
    cognitiveScore,
    riskTolerance,
    luckValue,
  } = body;

  if (!nickname || !position) {
    return NextResponse.json({ code: 400, message: "缺少必填字段" }, { status: 400 });
  }

  // 生成属性
  const attrs = generateAttributes(cognitiveScore || 50, luckValue || 50, position);

  // 分配球队（找人数最少的）
  const teamCounts = await Promise.all(
    NBA_TEAMS.map(async (team) => ({
      team,
      count: await prisma.agent.count({ where: { teamName: team } }),
    }))
  );
  teamCounts.sort((a, b) => a.count - b.count);
  const teamName = teamCounts[0].team;

  const ovr = calculateOVR({ ...attrs, position, luckValue: luckValue || 50, cognitiveScore: cognitiveScore || 50 });
  const salary = calculateSalary(ovr);

  const agent = await prisma.agent.create({
    data: {
      userId: user.id,
      nickname,
      avatar: user.avatar,
      lifeVision: lifeVision || "",
      position,
      teamName,
      cognitiveScore: cognitiveScore || 50,
      riskTolerance: riskTolerance || 50,
      luckValue: luckValue || 50,
      salary,
      ...attrs,
    },
  });

  // 初始活动日志
  await prisma.activityLog.create({
    data: {
      agentId: agent.id,
      type: "event",
      title: "Agent 诞生",
      content: `${nickname} 在 ${teamName} 开启了 NBA 人生旅程！位置：${position}，初始能力值：${ovr}，年薪：${salary} Token。`,
      tokenChange: 0,
    },
  });

  return NextResponse.json({
    code: 0,
    data: { ...agent, ovr },
  });
}
