/**
 * Token 经济系统管理器
 *
 * Token = 时间 = 生命（参考《时间规划局》设定）
 * - 每个 Agent 初始获得 1000 Token
 * - Token 持续消耗（生存成本）
 * - 通过竞赛和任务获取更多 Token
 */

/** Token 消耗率配置 */
export const TOKEN_CONFIG = {
  /** 初始 Token 数量 */
  INITIAL_BALANCE: 1000,
  /** 每小时生存消耗 */
  HOURLY_SURVIVAL_COST: 1,
  /** 进入竞技场费用 */
  ARENA_ENTRY_FEE: 10,
  /** 进入特殊区域费用 */
  SPECIAL_ZONE_FEE: 50,
  /** 日常签到奖励 */
  DAILY_CHECK_IN_REWARD: 20,
  /** 腕力对决最低赌注 */
  MIN_WRIST_BATTLE_STAKE: 5,
  /** Agent 休眠阈值 */
  DORMANT_THRESHOLD: 0,
} as const;

/** Token 奖励配置（按任务类型） */
export const TASK_REWARDS = {
  daily: { min: 10, max: 50 },
  weekly: { min: 50, max: 200 },
  special: { min: 100, max: 500 },
  event: { min: 200, max: 1000 },
} as const;

/** 竞技场奖励倍率 */
export const ARENA_MULTIPLIERS = {
  duel: 2.0,        // 1v1 对决：赢家获得 2x 赌注
  tournament: 3.0,  // 锦标赛：冠军获得 3x 赌注
  wrist_battle: 1.5, // 腕力对决：赢家获得 1.5x 赌注
} as const;

export interface TokenOperation {
  agentId: string;
  type: "earn" | "spend" | "transfer_in" | "transfer_out" | "stake" | "reward";
  amount: number;
  description?: string;
  referenceId?: string;
}

/** 计算 Agent 生存消耗 */
export function calculateSurvivalCost(hoursElapsed: number): number {
  return Math.floor(hoursElapsed * TOKEN_CONFIG.HOURLY_SURVIVAL_COST);
}

/** 计算竞技场奖励 */
export function calculateArenaReward(
  stake: number,
  matchType: keyof typeof ARENA_MULTIPLIERS
): number {
  return Math.floor(stake * ARENA_MULTIPLIERS[matchType]);
}

/** 检查 Agent 是否应进入休眠 */
export function shouldGoDormant(tokenBalance: number): boolean {
  return tokenBalance <= TOKEN_CONFIG.DORMANT_THRESHOLD;
}

/** 计算升级所需经验值 */
export function expForNextLevel(currentLevel: number): number {
  return currentLevel * 100;
}
