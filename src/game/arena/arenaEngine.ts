/**
 * 竞技场引擎
 *
 * 支持三种对战模式：
 * - duel: 1v1 决斗
 * - tournament: 锦标赛
 * - wrist_battle: 腕力对决（直接争夺对方 Token，参考时间规划局）
 */

import type { AgentPlayer, MatchType } from "@/types";
import { calculatePowerRating } from "../agent/agentSystem";
import { TOKEN_CONFIG, ARENA_MULTIPLIERS } from "../economy/tokenManager";

/** 对战轮次结果 */
export interface RoundResult {
  round: number;
  challengerAction: string;
  opponentAction: string;
  challengerDamage: number;
  opponentDamage: number;
  narrative: string;
}

/** 对战最终结果 */
export interface MatchResult {
  winnerId: string;
  loserId: string;
  rounds: RoundResult[];
  tokenTransfer: number;
  summary: string;
}

/** 创建新对战 */
export function createMatch(params: {
  challenger: AgentPlayer;
  opponent: AgentPlayer;
  type: MatchType;
  tokenStake: number;
}): { valid: boolean; error?: string } {
  const { challenger, opponent, type, tokenStake } = params;

  // 验证双方状态
  if (challenger.status === "dormant") {
    return { valid: false, error: "挑战者已休眠，无法参加对战" };
  }
  if (opponent.status === "dormant") {
    return { valid: false, error: "对手已休眠，无法接受挑战" };
  }
  if (challenger.status === "competing" || opponent.status === "competing") {
    return { valid: false, error: "对战方正在进行其他比赛" };
  }

  // 验证赌注
  if (type === "wrist_battle" && tokenStake < TOKEN_CONFIG.MIN_WRIST_BATTLE_STAKE) {
    return { valid: false, error: `腕力对决最低赌注为 ${TOKEN_CONFIG.MIN_WRIST_BATTLE_STAKE} Token` };
  }
  if (tokenStake > challenger.tokenBalance || tokenStake > opponent.tokenBalance) {
    return { valid: false, error: "Token 不足以支付赌注" };
  }

  return { valid: true };
}

/** 模拟对战回合（将由 Act API 驱动实际判断） */
export function simulateRound(
  challenger: AgentPlayer,
  opponent: AgentPlayer,
  round: number
): RoundResult {
  const challengerPower = calculatePowerRating(challenger);
  const opponentPower = calculatePowerRating(opponent);

  // 基础模拟逻辑（实际由 Act API 进行 AI 判断）
  const challengerRoll = Math.random() * challengerPower;
  const opponentRoll = Math.random() * opponentPower;

  return {
    round,
    challengerAction: "攻击",
    opponentAction: "防御",
    challengerDamage: Math.floor(challengerRoll),
    opponentDamage: Math.floor(opponentRoll),
    narrative: `第 ${round} 回合：激烈交锋...`,
  };
}

/** 计算对战奖励 */
export function calculateMatchReward(
  type: MatchType,
  tokenStake: number
): number {
  return Math.floor(tokenStake * ARENA_MULTIPLIERS[type]);
}
