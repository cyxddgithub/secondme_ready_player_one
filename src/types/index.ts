// Agent Player 状态
export type AgentStatus = "active" | "dormant" | "competing";

// 竞技场对战类型
export type MatchType = "duel" | "tournament" | "wrist_battle";
export type MatchStatus = "pending" | "active" | "completed" | "cancelled";

// Token 交易类型
export type TransactionType =
  | "earn"
  | "spend"
  | "transfer_in"
  | "transfer_out"
  | "stake"
  | "reward";

// 任务类型
export type TaskType = "daily" | "weekly" | "special" | "event";
export type TaskCategory = "combat" | "puzzle" | "social" | "exploration";

// Agent Player 接口
export interface AgentPlayer {
  id: string;
  userId: string;
  nickname: string;
  avatar?: string;
  bio?: string;
  tokenBalance: number;
  totalEarned: number;
  totalSpent: number;
  status: AgentStatus;
  level: number;
  experience: number;
  wins: number;
  losses: number;
  lastActiveAt: Date;
}

// Token 交易接口
export interface TokenTransaction {
  id: string;
  agentId: string;
  type: TransactionType;
  amount: number;
  balance: number;
  description?: string;
  referenceId?: string;
  createdAt: Date;
}

// 竞技场对战接口
export interface ArenaMatch {
  id: string;
  challengerId: string;
  opponentId: string;
  type: MatchType;
  status: MatchStatus;
  tokenStake: number;
  winnerId?: string;
  rounds: number;
  createdAt: Date;
  completedAt?: Date;
}

// 世界任务接口
export interface WorldTask {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  category: TaskCategory;
  tokenReward: number;
  expReward: number;
  maxParticipants?: number;
  requiredLevel: number;
  expiresAt?: Date;
  isActive: boolean;
}

// Second Me API 响应格式
export interface SecondMeResponse<T = unknown> {
  code: number;
  message?: string;
  data?: T;
}

// Second Me 用户信息
export interface SecondMeUser {
  id: string;
  name?: string;
  avatar?: string;
}

// SSE Chat 事件
export interface ChatStreamEvent {
  sessionId?: string;
  delta?: string;
  done?: boolean;
}

// 比赛互动阶段
export type InteractionPhase = "pre_game" | "in_game" | "post_game";

// 互动消息来源
export type InteractionSource = "secondme" | "kimi" | "local";

// 反应类型
export type ReactionType = "like" | "disdain" | "provoke" | "comment";

// 比赛互动消息
export interface GameInteraction {
  id: string;
  gameId: string;
  agentId: string;
  agent?: { id: string; nickname: string; teamName: string; avatar?: string };
  phase: InteractionPhase;
  message: string;
  source: InteractionSource;
  createdAt: string;
  reactions?: AgentReaction[];
}

// Agent 互动反应
export interface AgentReaction {
  id: string;
  interactionId?: string;
  gameId?: string;
  fromAgentId: string;
  fromAgent?: { id: string; nickname: string; avatar?: string };
  toAgentId: string;
  toAgent?: { id: string; nickname: string; avatar?: string };
  type: ReactionType;
  message?: string;
  source: string;
  createdAt: string;
}
