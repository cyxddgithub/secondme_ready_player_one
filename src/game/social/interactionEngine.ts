/**
 * 赛事互动引擎
 *
 * 为每场比赛生成 Agent 之间的互动对话：
 * - 赛前叫嚣（pre_game）
 * - 赛中垃圾话（in_game）
 * - 赛后感言（post_game）
 *
 * 优先调用 Second Me Chat API（保留用户人格），
 * 降级到 Kimi，最终回退到本地模板。
 */

import { prisma } from "@/lib/prisma";
import { chatStream } from "@/lib/secondme";
import { kimiChat, isKimiAvailable } from "@/lib/kimi";
import { POSITION_NAMES } from "@/game/nba/nbaEngine";
import type { InteractionPhase, InteractionSource } from "@/types";

/** Agent 简化信息 */
interface InteractionAgent {
  id: string;
  userId: string;
  nickname: string;
  position: string;
  teamName: string;
  isNpc: boolean;
  wins: number;
  losses: number;
  tokenBalance: number;
  lifeVision?: string | null;
  shooting: number;
  defense: number;
  speed: number;
  stamina: number;
  basketballIQ: number;
  passing: number;
  rebound: number;
}

/** 比赛上下文 */
interface GameContext {
  gameId: string;
  gameNum: number;
  seasonNum: number;
  homeScore?: number;
  awayScore?: number;
  homeStats?: { points: number; rebounds: number; assists: number };
  awayStats?: { points: number; rebounds: number; assists: number };
  narrative?: string;
}

/** 从 SSE 流中读取完整文本 */
async function readSSEStream(response: Response): Promise<string> {
  if (!response.ok || !response.body) {
    throw new Error(`SSE 请求失败: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // SSE 格式: data: {"delta": "xxx", ...}\n\n
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.delta) {
              result += data.delta;
            }
          } catch {
            // 非 JSON 行，跳过
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return result.trim();
}

/** 获取 Agent 对应用户的 access token */
async function getAgentAccessToken(agent: InteractionAgent): Promise<string | null> {
  if (agent.isNpc) return null;
  const user = await prisma.user.findUnique({ where: { id: agent.userId } });
  return user?.accessToken || null;
}

/** 通过 Second Me Chat API 生成互动消息 */
async function generateViaSecondMe(
  accessToken: string,
  systemPrompt: string,
  userMessage: string
): Promise<string | null> {
  try {
    const response = await chatStream(accessToken, {
      message: userMessage,
      systemPrompt,
    });
    const text = await readSSEStream(response);
    return text || null;
  } catch (error) {
    console.error("[互动引擎] Second Me 调用失败:", error);
    return null;
  }
}

/** 通过 Kimi 生成互动消息 */
async function generateViaKimi(
  systemPrompt: string,
  userMessage: string
): Promise<string | null> {
  if (!isKimiAvailable()) return null;
  try {
    const result = await kimiChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      { temperature: 1.0, maxTokens: 150 }
    );
    return result.trim() || null;
  } catch (error) {
    console.error("[互动引擎] Kimi 调用失败:", error);
    return null;
  }
}

/** 构建 Agent 人格 system prompt */
function buildAgentPersonaPrompt(agent: InteractionAgent): string {
  const posName = POSITION_NAMES[agent.position] || agent.position;
  return `你是「${agent.nickname}」，一名虚拟 NBA 球员。
球队：${agent.teamName}，位置：${posName}
战绩：${agent.wins}胜${agent.losses}负，Token余额：${agent.tokenBalance}
${agent.lifeVision ? `人生愿景：${agent.lifeVision}` : ""}

你说话风格要符合一个职业篮球运动员的人设，可以霸气、自信、甚至有点狂妄。
回复必须简短有力（1-2句话，不超过50字），全部用中文。不要使用引号。`;
}

// ===== 赛前叫嚣 =====

function buildPreGamePrompt(self: InteractionAgent, opponent: InteractionAgent): string {
  const oppPos = POSITION_NAMES[opponent.position] || opponent.position;
  return `下一场比赛你要对战 ${opponent.nickname}（${opponent.teamName}·${oppPos}，${opponent.wins}胜${opponent.losses}负）。赛前对他叫嚣几句，展示你的气势！`;
}

const PRE_GAME_TEMPLATES = [
  (self: InteractionAgent, opp: InteractionAgent) =>
    `${self.nickname}：${opp.nickname}？没听说过。今晚让你见识什么叫统治力。`,
  (self: InteractionAgent, opp: InteractionAgent) =>
    `${self.nickname}：${opp.teamName}？准备好被淘汰吧。`,
  (self: InteractionAgent, _opp: InteractionAgent) =>
    `${self.nickname}：管你谁来，都是一个字——赢。`,
  (self: InteractionAgent, opp: InteractionAgent) =>
    `${self.nickname}：${opp.nickname}最近很嚣张啊，今晚就让你安静下来。`,
  (self: InteractionAgent, _opp: InteractionAgent) =>
    `${self.nickname}：我已经准备好了，球场上见真章。`,
];

// ===== 赛中垃圾话 =====

function buildInGamePrompt(
  self: InteractionAgent,
  opponent: InteractionAgent,
  ctx: GameContext,
  isHome: boolean
): string {
  const myScore = isHome ? ctx.homeScore : ctx.awayScore;
  const oppScore = isHome ? ctx.awayScore : ctx.homeScore;
  const myStats = isHome ? ctx.homeStats : ctx.awayStats;
  const leading = (myScore || 0) > (oppScore || 0);

  return `比赛进行中！比分 ${myScore}:${oppScore}，你${leading ? "领先" : "落后"}。` +
    (myStats ? `你的数据：${myStats.points}分${myStats.rebounds}篮板${myStats.assists}助攻。` : "") +
    `对手是${opponent.nickname}。${leading ? "喷他几句垃圾话！" : "喊几句给自己打气！"}`;
}

const IN_GAME_LEADING_TEMPLATES = [
  (self: InteractionAgent, opp: InteractionAgent) =>
    `${self.nickname}：${opp.nickname}就这？我还没发力呢。`,
  (self: InteractionAgent, _opp: InteractionAgent) =>
    `${self.nickname}：今晚这球场属于我！`,
  (self: InteractionAgent, opp: InteractionAgent) =>
    `${self.nickname}：${opp.nickname}，你的防守像纸一样。`,
];

const IN_GAME_TRAILING_TEMPLATES = [
  (self: InteractionAgent, _opp: InteractionAgent) =>
    `${self.nickname}：别得意太早，比赛还没结束！`,
  (self: InteractionAgent, _opp: InteractionAgent) =>
    `${self.nickname}：落后不可怕，我会逆转一切。`,
  (self: InteractionAgent, opp: InteractionAgent) =>
    `${self.nickname}：${opp.nickname}你笑什么？最后笑的人才是赢家。`,
];

// ===== 赛后感言 =====

function buildPostGamePrompt(
  self: InteractionAgent,
  opponent: InteractionAgent,
  ctx: GameContext,
  isHome: boolean
): string {
  const myScore = isHome ? ctx.homeScore : ctx.awayScore;
  const oppScore = isHome ? ctx.awayScore : ctx.homeScore;
  const won = (myScore || 0) > (oppScore || 0);
  const myStats = isHome ? ctx.homeStats : ctx.awayStats;

  return `比赛结束！最终比分 ${myScore}:${oppScore}，你${won ? "赢了" : "输了"}。` +
    (myStats ? `你的数据：${myStats.points}分${myStats.rebounds}篮板${myStats.assists}助攻。` : "") +
    `对手是${opponent.nickname}。${won ? "发表你的获胜感言和壮志雄心！" : "说说你的感想和下次复仇的决心！"}`;
}

const POST_GAME_WIN_TEMPLATES = [
  (self: InteractionAgent, opp: InteractionAgent) =>
    `${self.nickname}：${opp.nickname}打得不错，但冠军只有一个。继续努力。`,
  (self: InteractionAgent, _opp: InteractionAgent) =>
    `${self.nickname}：这只是开始，我的目标是登顶。`,
  (self: InteractionAgent, _opp: InteractionAgent) =>
    `${self.nickname}：赢球的感觉真好！下场我要表现得更好。`,
  (self: InteractionAgent, opp: InteractionAgent) =>
    `${self.nickname}：承让了${opp.nickname}，下次还来！`,
];

const POST_GAME_LOSE_TEMPLATES = [
  (self: InteractionAgent, opp: InteractionAgent) =>
    `${self.nickname}：${opp.nickname}这次你赢了，但我会回来的。`,
  (self: InteractionAgent, _opp: InteractionAgent) =>
    `${self.nickname}：输了一场而已，我的字典里没有放弃。`,
  (self: InteractionAgent, _opp: InteractionAgent) =>
    `${self.nickname}：这场失利让我看清了差距，我会变得更强。`,
  (self: InteractionAgent, opp: InteractionAgent) =>
    `${self.nickname}：${opp.nickname}你记住，下次见面时一切都会不同。`,
];

/** 随机选择本地模板 */
function pickTemplate(
  templates: ((self: InteractionAgent, opp: InteractionAgent) => string)[],
  self: InteractionAgent,
  opp: InteractionAgent
): string {
  const idx = Math.floor(Math.random() * templates.length);
  return templates[idx](self, opp);
}

/** 为单个 Agent 生成一条互动消息 */
async function generateMessage(
  agent: InteractionAgent,
  opponent: InteractionAgent,
  phase: InteractionPhase,
  ctx: GameContext,
  isHome: boolean
): Promise<{ message: string; source: InteractionSource }> {
  const persona = buildAgentPersonaPrompt(agent);
  let userMessage: string;

  switch (phase) {
    case "pre_game":
      userMessage = buildPreGamePrompt(agent, opponent);
      break;
    case "in_game":
      userMessage = buildInGamePrompt(agent, opponent, ctx, isHome);
      break;
    case "post_game":
      userMessage = buildPostGamePrompt(agent, opponent, ctx, isHome);
      break;
  }

  // 1. 尝试 Second Me Chat API（仅真人玩家）
  if (!agent.isNpc) {
    const token = await getAgentAccessToken(agent);
    if (token) {
      const result = await generateViaSecondMe(token, persona, userMessage);
      if (result) {
        return { message: result, source: "secondme" };
      }
    }
  }

  // 2. 降级到 Kimi
  const kimiResult = await generateViaKimi(persona, userMessage);
  if (kimiResult) {
    return { message: kimiResult, source: "kimi" };
  }

  // 3. 本地模板回退
  let localMessage: string;
  switch (phase) {
    case "pre_game":
      localMessage = pickTemplate(PRE_GAME_TEMPLATES, agent, opponent);
      break;
    case "in_game": {
      const myScore = isHome ? ctx.homeScore : ctx.awayScore;
      const oppScore = isHome ? ctx.awayScore : ctx.homeScore;
      const leading = (myScore || 0) > (oppScore || 0);
      localMessage = pickTemplate(
        leading ? IN_GAME_LEADING_TEMPLATES : IN_GAME_TRAILING_TEMPLATES,
        agent, opponent
      );
      break;
    }
    case "post_game": {
      const myFinalScore = isHome ? ctx.homeScore : ctx.awayScore;
      const oppFinalScore = isHome ? ctx.awayScore : ctx.homeScore;
      const won = (myFinalScore || 0) > (oppFinalScore || 0);
      localMessage = pickTemplate(
        won ? POST_GAME_WIN_TEMPLATES : POST_GAME_LOSE_TEMPLATES,
        agent, opponent
      );
      break;
    }
  }

  return { message: localMessage, source: "local" };
}

/** 为一场比赛生成全部互动消息（赛前 + 赛中 + 赛后） */
export async function generateGameInteractions(
  home: InteractionAgent,
  away: InteractionAgent,
  ctx: GameContext
): Promise<void> {
  // 只为有真人参与的比赛生成互动
  if (home.isNpc && away.isNpc) return;

  const phases: InteractionPhase[] = ["pre_game", "in_game", "post_game"];

  for (const phase of phases) {
    // 跳过赛中互动（如果比分数据未提供）
    if (phase === "in_game" && ctx.homeScore === undefined) continue;
    // 跳过赛后互动（如果比赛未结束）
    if (phase === "post_game" && ctx.homeScore === undefined) continue;

    // 双方各生成一条消息
    const [homeMsg, awayMsg] = await Promise.all([
      generateMessage(home, away, phase, ctx, true),
      generateMessage(away, home, phase, ctx, false),
    ]);

    // 写入数据库
    await prisma.gameInteraction.create({
      data: {
        gameId: ctx.gameId,
        agentId: home.id,
        phase,
        message: homeMsg.message,
        source: homeMsg.source,
      },
    });

    await prisma.gameInteraction.create({
      data: {
        gameId: ctx.gameId,
        agentId: away.id,
        phase,
        message: awayMsg.message,
        source: awayMsg.source,
      },
    });
  }
}

/** 生成用户发起的互动反应（点赞/不屑/挑衅/留言） */
export async function generateReactionResponse(
  fromAgent: InteractionAgent,
  toAgent: InteractionAgent,
  reactionType: string,
  originalMessage?: string
): Promise<{ message: string; source: InteractionSource } | null> {
  // 只有挑衅和留言需要生成回复
  if (reactionType !== "provoke" && reactionType !== "comment") return null;

  const persona = buildAgentPersonaPrompt(toAgent);
  let userMessage: string;

  if (reactionType === "provoke") {
    userMessage = `${fromAgent.nickname} 向你发出了挑衅！${originalMessage ? `他说："${originalMessage}"` : ""}用最霸气的方式回击他！`;
  } else {
    userMessage = `${fromAgent.nickname} 给你留言说："${originalMessage || "好球！"}"。简短回复一下。`;
  }

  // 同样的降级链路
  if (!toAgent.isNpc) {
    const token = await getAgentAccessToken(toAgent);
    if (token) {
      const result = await generateViaSecondMe(token, persona, userMessage);
      if (result) return { message: result, source: "secondme" };
    }
  }

  const kimiResult = await generateViaKimi(persona, userMessage);
  if (kimiResult) return { message: kimiResult, source: "kimi" };

  // 本地回退
  const responses = reactionType === "provoke"
    ? [
        `${toAgent.nickname}：${fromAgent.nickname}？不屑回应，球场上说话。`,
        `${toAgent.nickname}：挑衅？我喜欢，来吧。`,
        `${toAgent.nickname}：你不够格挑衅我。`,
      ]
    : [
        `${toAgent.nickname}：谢了，球场见。`,
        `${toAgent.nickname}：哈，有意思。`,
        `${toAgent.nickname}：收到，我们下次较量。`,
      ];

  return {
    message: responses[Math.floor(Math.random() * responses.length)],
    source: "local",
  };
}
