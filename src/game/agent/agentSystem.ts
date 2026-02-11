/**
 * Agent Player 系统
 *
 * 每个用户对应一个 Agent Player
 * Agent 继承用户的 Second Me 个性特征（Shades & Soft Memory）
 */

import type { AgentPlayer, AgentStatus } from "@/types";

/** Agent 创建参数 */
export interface CreateAgentParams {
  userId: string;
  nickname: string;
  avatar?: string;
  bio?: string;
}

/** Agent 个性特征（来自 Second Me） */
export interface AgentPersonality {
  shades: Record<string, unknown>;
  softMemory: Record<string, unknown>;
}

/** Agent 行为决策上下文 */
export interface AgentDecisionContext {
  agent: AgentPlayer;
  personality?: AgentPersonality;
  situation: string;
  options: string[];
}

/** 生成 Agent 系统提示词（用于 Act API） */
export function buildAgentSystemPrompt(
  agent: AgentPlayer,
  personality?: AgentPersonality
): string {
  const statusDesc = {
    active: "活跃状态，正常参与世界活动",
    dormant: "休眠状态，Token 已耗尽",
    competing: "竞技中，正在参加比赛",
  };

  let prompt = `你是「${agent.nickname}」，头号玩家世界中的一名 Agent Player。

## 基本信息
- 等级: ${agent.level}
- Token 余额: ${agent.tokenBalance}
- 状态: ${statusDesc[agent.status]}
- 战绩: ${agent.wins}胜 ${agent.losses}负

## 世界观
你生活在一个 Token 即生命的世界中。Token 持续消耗，你必须通过竞赛和任务来获取更多 Token 维持生存。`;

  if (personality?.shades) {
    prompt += `\n\n## 个性特征\n${JSON.stringify(personality.shades, null, 2)}`;
  }

  if (personality?.softMemory) {
    prompt += `\n\n## 记忆片段\n${JSON.stringify(personality.softMemory, null, 2)}`;
  }

  return prompt;
}

/** 计算 Agent 战力评分 */
export function calculatePowerRating(agent: AgentPlayer): number {
  const levelBonus = agent.level * 10;
  const winRate = agent.wins + agent.losses > 0
    ? agent.wins / (agent.wins + agent.losses)
    : 0.5;
  const experienceBonus = Math.floor(agent.experience / 10);

  return Math.floor(levelBonus + winRate * 50 + experienceBonus);
}

/** 根据 Token 余额获取 Agent 状态描述 */
export function getTokenStatusDisplay(balance: number): {
  label: string;
  color: string;
  urgency: "safe" | "warning" | "danger";
} {
  if (balance > 500) {
    return { label: "充裕", color: "text-token-safe", urgency: "safe" };
  }
  if (balance > 100) {
    return { label: "警告", color: "text-token-gold", urgency: "warning" };
  }
  return { label: "危险", color: "text-token-danger", urgency: "danger" };
}
