/**
 * NBA 篮球人生模拟引擎
 * 处理比赛模拟、数据生成、赛季管理
 */

// NBA 球队
export const NBA_TEAMS = [
  "龙城闪电", "星辰勇士", "烈焰雄狮", "寒冰之狼",
  "雷霆战鹰", "暗影刺客", "金甲巨人", "风暴海盗",
] as const;

// 位置中文映射
export const POSITION_NAMES: Record<string, string> = {
  PG: "控球后卫",
  SG: "得分后卫",
  SF: "小前锋",
  PF: "大前锋",
  C: "中锋",
};

// 位置属性权重（决定各属性对不同位置的重要性）
const POSITION_WEIGHTS: Record<string, Record<string, number>> = {
  PG: { shooting: 0.8, defense: 0.6, speed: 1.2, stamina: 0.8, basketballIQ: 1.3, passing: 1.5, rebound: 0.3 },
  SG: { shooting: 1.5, defense: 0.7, speed: 1.0, stamina: 0.9, basketballIQ: 0.9, passing: 0.8, rebound: 0.4 },
  SF: { shooting: 1.0, defense: 1.0, speed: 0.9, stamina: 1.0, basketballIQ: 1.0, passing: 0.8, rebound: 0.8 },
  PF: { shooting: 0.7, defense: 1.2, speed: 0.7, stamina: 1.1, basketballIQ: 0.8, passing: 0.5, rebound: 1.3 },
  C:  { shooting: 0.4, defense: 1.4, speed: 0.5, stamina: 1.2, basketballIQ: 0.7, passing: 0.4, rebound: 1.5 },
};

interface AgentAttributes {
  shooting: number;
  defense: number;
  speed: number;
  stamina: number;
  basketballIQ: number;
  passing: number;
  rebound: number;
  position: string;
  luckValue: number;
  cognitiveScore: number;
}

interface GameStats {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  minutes: number;
  rating: number;
}

/** 计算 Agent 综合能力值（OVR） */
export function calculateOVR(attrs: AgentAttributes): number {
  const weights = POSITION_WEIGHTS[attrs.position] || POSITION_WEIGHTS.SF;
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

  const weighted =
    attrs.shooting * weights.shooting +
    attrs.defense * weights.defense +
    attrs.speed * weights.speed +
    attrs.stamina * weights.stamina +
    attrs.basketballIQ * weights.basketballIQ +
    attrs.passing * weights.passing +
    attrs.rebound * weights.rebound;

  return Math.round(weighted / totalWeight);
}

/** 基于认知测试和运气值生成初始属性 */
export function generateAttributes(
  cognitiveScore: number,
  luckValue: number,
  position: string
): Omit<AgentAttributes, "position" | "luckValue" | "cognitiveScore"> {
  // 基础值 = 40 + 认知分数影响 (0-20)
  const base = 40 + Math.floor(cognitiveScore / 5);

  // 运气值影响随机波动范围
  const luckFactor = luckValue / 100;

  function genStat(positionWeight: number): number {
    const random = Math.random() * 20 - 10; // -10 ~ +10
    const luck = (Math.random() * 15) * luckFactor;
    const value = Math.round(base + random + luck + (positionWeight - 1) * 8);
    return Math.max(30, Math.min(95, value));
  }

  const weights = POSITION_WEIGHTS[position] || POSITION_WEIGHTS.SF;

  return {
    shooting: genStat(weights.shooting),
    defense: genStat(weights.defense),
    speed: genStat(weights.speed),
    stamina: genStat(weights.stamina),
    basketballIQ: genStat(weights.basketballIQ),
    passing: genStat(weights.passing),
    rebound: genStat(weights.rebound),
  };
}

/** 计算赛季薪资（基于 OVR） */
export function calculateSalary(ovr: number): number {
  if (ovr >= 90) return 300;  // 超级巨星
  if (ovr >= 80) return 200;  // 全明星
  if (ovr >= 70) return 120;  // 首发
  if (ovr >= 60) return 80;   // 轮换
  if (ovr >= 50) return 50;   // 替补
  return 30;                   // 底薪
}

/** 模拟单场比赛的个人数据 */
export function simulatePlayerGameStats(attrs: AgentAttributes): GameStats {
  const luck = (Math.random() * 0.4 + 0.8); // 0.8 ~ 1.2
  const luckBoost = attrs.luckValue / 200; // 0 ~ 0.5

  const minutes = Math.round(24 + Math.random() * 16); // 24-40 分钟

  const shootingChances = Math.round((attrs.shooting / 100) * minutes * 0.6 * luck);
  const points = Math.round(shootingChances * (attrs.shooting / 100 + luckBoost) * 2.2);

  const rebounds = Math.round(
    (attrs.rebound / 100) * minutes * 0.35 * luck + Math.random() * 3
  );

  const assists = Math.round(
    (attrs.passing / 100) * (attrs.basketballIQ / 100) * minutes * 0.3 * luck + Math.random() * 2
  );

  const steals = Math.round(
    (attrs.defense / 100) * (attrs.speed / 100) * minutes * 0.08 * luck
  );

  const blocks = Math.round(
    (attrs.defense / 100) * (attrs.rebound / 100) * minutes * 0.06 * luck
  );

  const turnovers = Math.max(0, Math.round(
    3 - (attrs.basketballIQ / 50) + Math.random() * 3
  ));

  // 综合评分 = 正面贡献 - 负面
  const rating = Math.min(99, Math.max(1,
    Math.round(
      (points * 1.0 + rebounds * 1.2 + assists * 1.5 + steals * 2 + blocks * 2 - turnovers * 1.5)
      / (minutes / 10) * 10
    )
  ));

  return {
    points: Math.max(0, points),
    rebounds: Math.max(0, rebounds),
    assists: Math.max(0, assists),
    steals: Math.max(0, steals),
    blocks: Math.max(0, blocks),
    turnovers: Math.max(0, turnovers),
    minutes,
    rating,
  };
}

/** 模拟一场比赛并返回比分和叙事 */
export function simulateGame(
  homeAttrs: AgentAttributes,
  awayAttrs: AgentAttributes,
  homeNickname: string,
  awayNickname: string
): {
  homeStats: GameStats;
  awayStats: GameStats;
  homeScore: number;
  awayScore: number;
  narrative: string;
} {
  const homeStats = simulatePlayerGameStats(homeAttrs);
  const awayStats = simulatePlayerGameStats(awayAttrs);

  // 团队得分 = 个人得分 + 队友贡献（NPC模拟）
  const homeTeamBonus = Math.round(60 + Math.random() * 30);
  const awayTeamBonus = Math.round(60 + Math.random() * 30);
  const homeScore = homeStats.points + homeTeamBonus;
  const awayScore = awayStats.points + awayTeamBonus;

  // 生成叙事
  const narratives: string[] = [];

  if (homeStats.points >= 30) narratives.push(`${homeNickname} 大爆发，砍下 ${homeStats.points} 分！`);
  else if (homeStats.points >= 20) narratives.push(`${homeNickname} 贡献 ${homeStats.points} 分的稳定输出。`);

  if (awayStats.points >= 30) narratives.push(`${awayNickname} 火力全开，拿下 ${awayStats.points} 分！`);
  else if (awayStats.points >= 20) narratives.push(`${awayNickname} 得到 ${awayStats.points} 分。`);

  if (homeStats.assists >= 8) narratives.push(`${homeNickname} 送出 ${homeStats.assists} 次助攻，串联全队。`);
  if (awayStats.assists >= 8) narratives.push(`${awayNickname} ${awayStats.assists} 次助攻展现大局观。`);
  if (homeStats.rebounds >= 10) narratives.push(`${homeNickname} 抢下 ${homeStats.rebounds} 个篮板统治内线。`);
  if (awayStats.rebounds >= 10) narratives.push(`${awayNickname} ${awayStats.rebounds} 个篮板控制篮板区。`);

  const scoreDiff = Math.abs(homeScore - awayScore);
  if (scoreDiff <= 3) {
    narratives.push("比赛悬念保持到最后一刻，双方拼尽全力！");
  } else if (scoreDiff >= 20) {
    const winner = homeScore > awayScore ? homeNickname : awayNickname;
    narratives.push(`${winner} 所在球队以 ${scoreDiff} 分大胜，展现统治力。`);
  }

  const finalNarrative = narratives.length > 0
    ? narratives.join(" ")
    : `常规对决，最终比分 ${homeScore}:${awayScore}。`;

  return {
    homeStats,
    awayStats,
    homeScore,
    awayScore,
    narrative: finalNarrative,
  };
}

/** NPC Agent 生成 - 用于填充球队 */
export function generateNpcAttributes(position: string): Omit<AgentAttributes, "position" | "luckValue" | "cognitiveScore"> {
  const base = 45 + Math.round(Math.random() * 20);
  const weights = POSITION_WEIGHTS[position] || POSITION_WEIGHTS.SF;

  function genStat(w: number): number {
    return Math.max(35, Math.min(85, Math.round(base + (w - 1) * 10 + (Math.random() * 16 - 8))));
  }

  return {
    shooting: genStat(weights.shooting),
    defense: genStat(weights.defense),
    speed: genStat(weights.speed),
    stamina: genStat(weights.stamina),
    basketballIQ: genStat(weights.basketballIQ),
    passing: genStat(weights.passing),
    rebound: genStat(weights.rebound),
  };
}

/** NPC 名称生成 */
const NPC_FIRST_NAMES = [
  "影", "风", "雷", "火", "冰", "暗", "光", "星",
  "铁", "金", "银", "翠", "墨", "霜", "烈", "玄",
  "苍", "赤", "白", "紫", "碧", "幽", "傲", "狂",
];
const NPC_LAST_NAMES = [
  "龙", "虎", "鹰", "狼", "豹", "蛇", "熊", "鹤",
  "刃", "拳", "枪", "盾", "弓", "剑", "锤", "斧",
];

export function generateNpcName(): string {
  const first = NPC_FIRST_NAMES[Math.floor(Math.random() * NPC_FIRST_NAMES.length)];
  const last = NPC_LAST_NAMES[Math.floor(Math.random() * NPC_LAST_NAMES.length)];
  return `${first}${last}`;
}

/** 认知测试题目 */
export interface CognitiveQuestion {
  id: number;
  question: string;
  options: { label: string; cognitivePoints: number; riskPoints: number }[];
}

export const COGNITIVE_QUESTIONS: CognitiveQuestion[] = [
  {
    id: 1,
    question: "比赛最后 10 秒，你的球队落后 2 分，你拿到球。你会？",
    options: [
      { label: "突破上篮稳拿 2 分追平", cognitivePoints: 15, riskPoints: 30 },
      { label: "后撤步三分绝杀", cognitivePoints: 10, riskPoints: 90 },
      { label: "传给空位队友", cognitivePoints: 20, riskPoints: 20 },
      { label: "造犯规罚球", cognitivePoints: 18, riskPoints: 50 },
    ],
  },
  {
    id: 2,
    question: "休赛期你有 500 Token 的预算，你会如何分配？",
    options: [
      { label: "全部用于训练提升属性", cognitivePoints: 12, riskPoints: 20 },
      { label: "投资高风险高回报的训练营", cognitivePoints: 8, riskPoints: 85 },
      { label: "一半训练一半储蓄", cognitivePoints: 18, riskPoints: 40 },
      { label: "储蓄应对不确定性", cognitivePoints: 15, riskPoints: 10 },
    ],
  },
  {
    id: 3,
    question: "你的对手比你 OVR 高 10 分，赛前策略？",
    options: [
      { label: "正面硬刚，展示实力", cognitivePoints: 8, riskPoints: 80 },
      { label: "研究对手弱点针对性打击", cognitivePoints: 20, riskPoints: 40 },
      { label: "防守为主，等待机会反击", cognitivePoints: 16, riskPoints: 25 },
      { label: "加快节奏打乱对手节奏", cognitivePoints: 14, riskPoints: 60 },
    ],
  },
  {
    id: 4,
    question: "你连续 5 场比赛表现低迷，你会？",
    options: [
      { label: "继续坚持原有打法", cognitivePoints: 6, riskPoints: 50 },
      { label: "分析数据找出问题调整", cognitivePoints: 20, riskPoints: 30 },
      { label: "向教练和队友寻求建议", cognitivePoints: 16, riskPoints: 20 },
      { label: "加倍训练量突破瓶颈", cognitivePoints: 12, riskPoints: 60 },
    ],
  },
  {
    id: 5,
    question: "有球队用 3 倍薪资挖你但需要你改打替补，你选择？",
    options: [
      { label: "接受，Token 更重要", cognitivePoints: 10, riskPoints: 30 },
      { label: "拒绝，首发位置更有价值", cognitivePoints: 14, riskPoints: 50 },
      { label: "谈判争取更好条件", cognitivePoints: 20, riskPoints: 40 },
      { label: "看球队前景再决定", cognitivePoints: 18, riskPoints: 25 },
    ],
  },
];
