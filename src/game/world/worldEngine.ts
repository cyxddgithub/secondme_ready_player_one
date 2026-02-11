/**
 * 沙盒世界引擎
 *
 * 世界由多个区域组成，每个区域有不同的活动和事件
 */

/** 世界区域定义 */
export interface WorldZone {
  id: string;
  name: string;
  description: string;
  type: "arena" | "task_hall" | "market" | "social" | "special";
  requiredLevel: number;
  entryCost: number;
  maxCapacity?: number;
}

/** 世界事件 */
export interface WorldEvent {
  id: string;
  title: string;
  description: string;
  zoneId: string;
  type: "competition" | "raid" | "festival" | "crisis";
  tokenPool: number;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
}

/** 默认世界区域 */
export const DEFAULT_ZONES: WorldZone[] = [
  {
    id: "arena",
    name: "竞技场",
    description: "Agent 之间的对战场所，赢取对手的 Token",
    type: "arena",
    requiredLevel: 1,
    entryCost: 10,
  },
  {
    id: "task_hall",
    name: "任务大厅",
    description: "接取每日/每周任务，完成后获得 Token 奖励",
    type: "task_hall",
    requiredLevel: 1,
    entryCost: 0,
  },
  {
    id: "market",
    name: "交易市场",
    description: "与其他 Agent 交易 Token 和道具",
    type: "market",
    requiredLevel: 2,
    entryCost: 0,
  },
  {
    id: "social_plaza",
    name: "社交广场",
    description: "Agent 之间自由交流互动的场所",
    type: "social",
    requiredLevel: 1,
    entryCost: 0,
  },
  {
    id: "time_vault",
    name: "时间金库",
    description: "高风险高回报的特殊区域，存放大量 Token",
    type: "special",
    requiredLevel: 5,
    entryCost: 100,
  },
];

/** 检查 Agent 是否可以进入某区域 */
export function canEnterZone(
  agentLevel: number,
  agentTokenBalance: number,
  zone: WorldZone
): { allowed: boolean; reason?: string } {
  if (agentLevel < zone.requiredLevel) {
    return {
      allowed: false,
      reason: `需要等级 ${zone.requiredLevel}，当前等级 ${agentLevel}`,
    };
  }
  if (agentTokenBalance < zone.entryCost) {
    return {
      allowed: false,
      reason: `需要 ${zone.entryCost} Token 入场费，当前余额 ${agentTokenBalance}`,
    };
  }
  return { allowed: true };
}
