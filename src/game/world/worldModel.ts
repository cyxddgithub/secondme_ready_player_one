/**
 * 世界模型 - 由 Kimi 大模型驱动
 *
 * 职责：
 * 1. 与 Agent 交互 - 生成比赛叙事、赛季事件
 * 2. 结算收益 - 扣除行动 Token、分配奖励
 * 3. Agent 博弈 - 评估对战结果、影响属性
 */

import { kimiChat, kimiChatJSON, isKimiAvailable } from "@/lib/kimi";
import { POSITION_NAMES } from "@/game/nba/nbaEngine";

/** Agent 信息（传入世界模型的简化结构） */
interface WorldAgent {
  nickname: string;
  position: string;
  teamName: string;
  shooting: number;
  defense: number;
  speed: number;
  stamina: number;
  basketballIQ: number;
  passing: number;
  rebound: number;
  luckValue: number;
  cognitiveScore: number;
  wins: number;
  losses: number;
  tokenBalance: number;
  lifeVision?: string | null;
}

/** 比赛裁决结果 */
export interface GameVerdict {
  homeScoreAdjust: number;  // 主场得分调整 (-10 ~ +10)
  awayScoreAdjust: number;  // 客场得分调整 (-10 ~ +10)
  homeStatBonus: { attr: string; amount: number } | null;
  awayStatBonus: { attr: string; amount: number } | null;
  narrative: string;         // AI 生成的比赛叙事
  mvp: "home" | "away";     // 本场 MVP
  eventType: string;        // 事件类型：normal | upset | blowout | buzzer_beater | injury
  tokenAdjust: {             // Token 调整
    home: number;            // 主场 Token 变化（行动消耗 + 奖惩）
    away: number;            // 客场 Token 变化
  };
}

/** 赛季结算结果 */
export interface SeasonSettlement {
  salaryMultiplier: number;  // 薪资倍率 (0.5 ~ 2.0)
  bonusTokens: number;       // 额外奖励 Token
  narrative: string;         // 赛季总结叙事
  mvpCandidate: boolean;     // 是否 MVP 候选
  tradeRumor: string | null; // 交易传闻
  nextSeasonOutlook: string; // 下赛季展望
}

/** 反思分析结果 */
export interface ReflectionAnalysis {
  summary: string;           // AI 分析总结
  primaryBoost: { attr: string; amount: number }; // 主要提升
  secondaryBoost: { attr: string; amount: number } | null; // 次要提升
  cognitiveBoost: number;    // 认知提升
  advice: string;            // 具体建议
}

const WORLD_SYSTEM_PROMPT = `你是「头号玩家」世界的世界模型 AI。这是一个 NBA 篮球模拟游戏世界。

世界规则：
- 每个 Agent 都是虚拟世界中的 NBA 球员
- Token 是唯一货币，也代表生命（Token=0 则 Agent 休眠）
- 比赛消耗行动 Token，获胜赢得奖励 Token
- Agent 的属性包括：投篮、防守、速度、体力、篮球智商、传球、篮板（1-99）
- 运气值和认知分数也会影响表现

你的职责：
1. 根据双方属性和状态，公正地裁决比赛走向
2. 生成生动有趣的比赛叙事（中文）
3. 决定 Token 的扣除和奖励分配
4. 产生随机事件（受伤、爆发、绝杀等）
5. 确保游戏经济平衡

你必须严格按照指定的 JSON 格式返回结果。`;

/** 世界模型裁决一场比赛 */
export async function judgeGame(
  home: WorldAgent,
  away: WorldAgent,
  gameContext: { seasonNum: number; gameNum: number; totalGames: number }
): Promise<GameVerdict> {
  if (!isKimiAvailable()) {
    return fallbackGameVerdict(home, away);
  }

  try {
    const prompt = `请裁决以下 NBA 比赛并返回 JSON 结果。

## 主场球员
- 昵称: ${home.nickname}
- 球队: ${home.teamName}
- 位置: ${POSITION_NAMES[home.position] || home.position}
- 属性: 投篮${home.shooting} 防守${home.defense} 速度${home.speed} 体力${home.stamina} 球商${home.basketballIQ} 传球${home.passing} 篮板${home.rebound}
- 运气: ${home.luckValue} 认知: ${home.cognitiveScore}
- 战绩: ${home.wins}胜${home.losses}负
- Token余额: ${home.tokenBalance}
${home.lifeVision ? `- 人生愿景: ${home.lifeVision}` : ""}

## 客场球员
- 昵称: ${away.nickname}
- 球队: ${away.teamName}
- 位置: ${POSITION_NAMES[away.position] || away.position}
- 属性: 投篮${away.shooting} 防守${away.defense} 速度${away.speed} 体力${away.stamina} 球商${away.basketballIQ} 传球${away.passing} 篮板${away.rebound}
- 运气: ${away.luckValue} 认知: ${away.cognitiveScore}
- 战绩: ${away.wins}胜${away.losses}负
- Token余额: ${away.tokenBalance}

## 赛季情况
第 ${gameContext.seasonNum} 赛季，第 ${gameContext.gameNum}/${gameContext.totalGames} 场

请根据双方实力差距、运气值、赛季进程来裁决。注意：
- 实力强的一方更可能赢，但要有合理的爆冷概率
- 赛季后期比赛更紧张
- 每场比赛扣除双方 3-5 Token 作为行动消耗
- 胜者获得 5-15 Token 奖励，表现出色可以更多
- 偶尔产生特殊事件（绝杀、受伤等）

返回严格的 JSON 格式：
\`\`\`json
{
  "homeScoreAdjust": 0,
  "awayScoreAdjust": 0,
  "homeStatBonus": null,
  "awayStatBonus": null,
  "narrative": "比赛叙事（2-4句话）",
  "mvp": "home",
  "eventType": "normal",
  "tokenAdjust": { "home": -3, "away": -3 }
}
\`\`\`

homeStatBonus/awayStatBonus 格式：{"attr": "shooting", "amount": 1} 或 null
eventType 可选：normal | upset | blowout | buzzer_beater | injury_minor
tokenAdjust 中：负数=消耗，正数=奖励（胜者应该得到正数净收益）`;

    const verdict = await kimiChatJSON<GameVerdict>(
      [
        { role: "system", content: WORLD_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      { temperature: 0.9 }
    );

    // 安全校验
    verdict.homeScoreAdjust = clamp(verdict.homeScoreAdjust || 0, -15, 15);
    verdict.awayScoreAdjust = clamp(verdict.awayScoreAdjust || 0, -15, 15);
    verdict.tokenAdjust = verdict.tokenAdjust || { home: -3, away: -3 };
    verdict.tokenAdjust.home = clamp(verdict.tokenAdjust.home, -10, 20);
    verdict.tokenAdjust.away = clamp(verdict.tokenAdjust.away, -10, 20);
    verdict.narrative = verdict.narrative || "一场常规比赛。";
    verdict.mvp = verdict.mvp === "away" ? "away" : "home";
    verdict.eventType = verdict.eventType || "normal";

    return verdict;
  } catch (error) {
    console.error("世界模型裁决失败，使用回退方案:", error);
    return fallbackGameVerdict(home, away);
  }
}

/** 世界模型进行赛季结算 */
export async function settleSeasonByWorldModel(
  agent: WorldAgent,
  seasonStats: {
    gamesPlayed: number;
    gamesWon: number;
    totalPoints: number;
    totalRebounds: number;
    totalAssists: number;
    avgRating: number;
    salaryCurrent: number;
  },
  seasonNum: number
): Promise<SeasonSettlement> {
  if (!isKimiAvailable()) {
    return fallbackSeasonSettlement(agent, seasonStats);
  }

  try {
    const winRate = seasonStats.gamesPlayed > 0
      ? (seasonStats.gamesWon / seasonStats.gamesPlayed * 100).toFixed(1)
      : "0";
    const ppg = seasonStats.gamesPlayed > 0
      ? (seasonStats.totalPoints / seasonStats.gamesPlayed).toFixed(1)
      : "0";
    const rpg = seasonStats.gamesPlayed > 0
      ? (seasonStats.totalRebounds / seasonStats.gamesPlayed).toFixed(1)
      : "0";
    const apg = seasonStats.gamesPlayed > 0
      ? (seasonStats.totalAssists / seasonStats.gamesPlayed).toFixed(1)
      : "0";

    const prompt = `请对以下球员的赛季表现进行结算评估，并返回 JSON。

## 球员信息
- 昵称: ${agent.nickname}
- 球队: ${agent.teamName}
- 位置: ${POSITION_NAMES[agent.position] || agent.position}
- 当前薪资: ${seasonStats.salaryCurrent} Token
- Token余额: ${agent.tokenBalance}
${agent.lifeVision ? `- 人生愿景: ${agent.lifeVision}` : ""}

## 第 ${seasonNum} 赛季数据
- 比赛: ${seasonStats.gamesPlayed} 场，${seasonStats.gamesWon} 胜
- 胜率: ${winRate}%
- 场均: ${ppg}分 ${rpg}篮板 ${apg}助攻
- 综合评分: ${seasonStats.avgRating.toFixed(1)}

请综合评估并返回 JSON：
\`\`\`json
{
  "salaryMultiplier": 1.0,
  "bonusTokens": 0,
  "narrative": "赛季总结叙事（3-5句话）",
  "mvpCandidate": false,
  "tradeRumor": null,
  "nextSeasonOutlook": "下赛季展望（1-2句话）"
}
\`\`\`

salaryMultiplier: 0.5（大幅降薪）到 2.0（大幅涨薪），基于表现
bonusTokens: 0-100 的额外奖励
tradeRumor: 交易传闻字符串或 null`;

    const settlement = await kimiChatJSON<SeasonSettlement>(
      [
        { role: "system", content: WORLD_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      { temperature: 0.7 }
    );

    // 安全校验
    settlement.salaryMultiplier = clamp(settlement.salaryMultiplier || 1, 0.5, 2.0);
    settlement.bonusTokens = clamp(settlement.bonusTokens || 0, 0, 200);
    settlement.narrative = settlement.narrative || "一个平凡的赛季。";
    settlement.nextSeasonOutlook = settlement.nextSeasonOutlook || "期待下赛季的表现。";

    return settlement;
  } catch (error) {
    console.error("赛季结算 AI 失败，使用回退方案:", error);
    return fallbackSeasonSettlement(agent, seasonStats);
  }
}

/** 世界模型分析反思 */
export async function analyzeReflection(
  agent: WorldAgent,
  reflectionContent: string,
  focusAttribute: string | undefined,
  recentGames: { won: boolean; points: number; rebounds: number; assists: number }[]
): Promise<ReflectionAnalysis> {
  if (!isKimiAvailable()) {
    return fallbackReflectionAnalysis(focusAttribute);
  }

  try {
    const recentSummary = recentGames.length > 0
      ? recentGames.map((g, i) => `第${i + 1}场: ${g.won ? "胜" : "负"} ${g.points}分${g.rebounds}板${g.assists}助`).join("、")
      : "暂无最近比赛";

    const prompt = `请分析以下球员的反思内容，给出训练建议和属性提升方案，返回 JSON。

## 球员信息
- 昵称: ${agent.nickname}
- 位置: ${POSITION_NAMES[agent.position] || agent.position}
- 属性: 投篮${agent.shooting} 防守${agent.defense} 速度${agent.speed} 体力${agent.stamina} 球商${agent.basketballIQ} 传球${agent.passing} 篮板${agent.rebound}
- 认知: ${agent.cognitiveScore}
${agent.lifeVision ? `- 人生愿景: ${agent.lifeVision}` : ""}

## 最近比赛
${recentSummary}

## 反思内容
"${reflectionContent}"
${focusAttribute ? `\n用户指定训练方向: ${focusAttribute}` : ""}

请给出提升方案，返回 JSON：
\`\`\`json
{
  "summary": "AI分析总结（2-3句话）",
  "primaryBoost": { "attr": "shooting", "amount": 2 },
  "secondaryBoost": { "attr": "defense", "amount": 1 },
  "cognitiveBoost": 1,
  "advice": "具体建议（1-2句话）"
}
\`\`\`

attr 可选: shooting, defense, speed, stamina, basketballIQ, passing, rebound
primaryBoost.amount: 1-4（主要提升）
secondaryBoost.amount: 0-2（次要提升，也可以为null）
cognitiveBoost: 0-3`;

    const analysis = await kimiChatJSON<ReflectionAnalysis>(
      [
        { role: "system", content: WORLD_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      { temperature: 0.7 }
    );

    // 安全校验
    const validAttrs = ["shooting", "defense", "speed", "stamina", "basketballIQ", "passing", "rebound"];
    if (!analysis.primaryBoost || !validAttrs.includes(analysis.primaryBoost.attr)) {
      analysis.primaryBoost = { attr: focusAttribute && validAttrs.includes(focusAttribute) ? focusAttribute : "basketballIQ", amount: 2 };
    }
    analysis.primaryBoost.amount = clamp(analysis.primaryBoost.amount, 1, 4);
    if (analysis.secondaryBoost) {
      if (!validAttrs.includes(analysis.secondaryBoost.attr)) {
        analysis.secondaryBoost = null;
      } else {
        analysis.secondaryBoost.amount = clamp(analysis.secondaryBoost.amount, 0, 2);
      }
    }
    analysis.cognitiveBoost = clamp(analysis.cognitiveBoost || 0, 0, 3);
    analysis.summary = analysis.summary || "通过反思获得了提升。";
    analysis.advice = analysis.advice || "继续努力训练。";

    return analysis;
  } catch (error) {
    console.error("反思分析 AI 失败，使用回退方案:", error);
    return fallbackReflectionAnalysis(focusAttribute);
  }
}

/** 世界模型生成赛季间事件 */
export async function generateWorldEvent(
  agent: WorldAgent
): Promise<string> {
  if (!isKimiAvailable()) {
    const events = [
      `${agent.nickname} 在休赛期进行了高强度训练。`,
      `${agent.teamName} 的管理层对 ${agent.nickname} 表达了信任。`,
      `球迷们期待 ${agent.nickname} 下赛季的表现。`,
    ];
    return events[Math.floor(Math.random() * events.length)];
  }

  try {
    const result = await kimiChat(
      [
        { role: "system", content: WORLD_SYSTEM_PROMPT },
        {
          role: "user",
          content: `为 ${agent.nickname}（${agent.teamName}，${POSITION_NAMES[agent.position] || agent.position}，Token余额${agent.tokenBalance}）生成一条简短的世界事件通知（1-2句话，中文）。可以是训练、媒体报道、球迷互动、交易传闻等。`,
        },
      ],
      { temperature: 1.0, maxTokens: 200 }
    );
    return result.trim();
  } catch {
    return `${agent.nickname} 在世界中继续前行。`;
  }
}

// ===== 回退方案（无 Kimi API 时使用） =====

function fallbackGameVerdict(home: WorldAgent, away: WorldAgent): GameVerdict {
  const homeOvr = (home.shooting + home.defense + home.speed + home.stamina + home.basketballIQ + home.passing + home.rebound) / 7;
  const awayOvr = (away.shooting + away.defense + away.speed + away.stamina + away.basketballIQ + away.passing + away.rebound) / 7;
  const diff = homeOvr - awayOvr;

  const luckSwing = (Math.random() - 0.5) * 10;
  const homeAdj = Math.round(diff / 3 + luckSwing);
  const awayAdj = Math.round(-diff / 3 - luckSwing);

  const homeWins = (homeAdj > awayAdj);
  const actionCost = Math.round(3 + Math.random() * 2);
  const winReward = Math.round(5 + Math.random() * 10);

  return {
    homeScoreAdjust: homeAdj,
    awayScoreAdjust: awayAdj,
    homeStatBonus: null,
    awayStatBonus: null,
    narrative: homeWins
      ? `${home.nickname} 所在的 ${home.teamName} 展现了更强的实力。`
      : `${away.nickname} 带领 ${away.teamName} 客场取胜。`,
    mvp: homeWins ? "home" : "away",
    eventType: Math.abs(homeAdj - awayAdj) > 8 ? "blowout" : "normal",
    tokenAdjust: {
      home: homeWins ? winReward - actionCost : -actionCost,
      away: homeWins ? -actionCost : winReward - actionCost,
    },
  };
}

function fallbackSeasonSettlement(
  agent: WorldAgent,
  stats: { gamesPlayed: number; gamesWon: number; salaryCurrent: number }
): SeasonSettlement {
  const winRate = stats.gamesPlayed > 0 ? stats.gamesWon / stats.gamesPlayed : 0;
  const multiplier = winRate > 0.6 ? 1.3 : winRate > 0.4 ? 1.0 : 0.8;

  return {
    salaryMultiplier: multiplier,
    bonusTokens: winRate > 0.6 ? Math.round(stats.salaryCurrent * 0.3) : 0,
    narrative: `${agent.nickname} 完成了一个${winRate > 0.6 ? "出色" : winRate > 0.4 ? "稳定" : "挣扎"}的赛季。`,
    mvpCandidate: winRate > 0.7,
    tradeRumor: null,
    nextSeasonOutlook: "新赛季即将开始，一切皆有可能。",
  };
}

function fallbackReflectionAnalysis(focusAttribute?: string): ReflectionAnalysis {
  const validAttrs = ["shooting", "defense", "speed", "stamina", "basketballIQ", "passing", "rebound"];
  const primary = focusAttribute && validAttrs.includes(focusAttribute)
    ? focusAttribute
    : validAttrs[Math.floor(Math.random() * validAttrs.length)];

  const attrNames: Record<string, string> = {
    shooting: "投篮", defense: "防守", speed: "速度", stamina: "体力",
    basketballIQ: "篮球智商", passing: "传球", rebound: "篮板",
  };

  return {
    summary: `通过反思和针对性训练，${attrNames[primary]}能力得到了提升。`,
    primaryBoost: { attr: primary, amount: Math.round(1 + Math.random() * 3) },
    secondaryBoost: Math.random() > 0.5
      ? { attr: validAttrs.filter(a => a !== primary)[Math.floor(Math.random() * 6)], amount: 1 }
      : null,
    cognitiveBoost: Math.round(Math.random() * 2),
    advice: "保持训练节奏，关注比赛中的细节。",
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
