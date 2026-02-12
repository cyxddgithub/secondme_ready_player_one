"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Agent {
  id: string;
  nickname: string;
  teamName: string;
  position: string;
  shooting: number;
  defense: number;
  speed: number;
  stamina: number;
  basketballIQ: number;
  passing: number;
  rebound: number;
  salary: number;
  tokenBalance: number;
  totalEarned: number;
  totalSpent: number;
  wins: number;
  losses: number;
  luckValue: number;
  cognitiveScore: number;
  ovr: number;
  level: number;
  seasonStats?: {
    gamesPlayed: number;
    gamesWon: number;
    totalPoints: number;
    totalRebounds: number;
    totalAssists: number;
    season: { seasonNum: number; status: string };
  }[];
}

interface InteractionMsg {
  id: string;
  agentId: string;
  phase: string;
  message: string;
  source: string;
  createdAt: string;
}

interface ReactionData {
  id: string;
  fromAgentId: string;
  fromAgent?: { id: string; nickname: string };
  toAgentId: string;
  toAgent?: { id: string; nickname: string };
  type: string;
  message?: string;
  source: string;
  createdAt: string;
}

interface GameRecord {
  id: string;
  gameNum: number;
  homeAgent: { id: string; nickname: string; teamName: string };
  awayAgent: { id: string; nickname: string; teamName: string };
  homeScore: number;
  awayScore: number;
  narrative: string;
  stats: { points: number; rebounds: number; assists: number; steals: number; blocks: number; rating: number }[];
  season: { seasonNum: number };
  interactions?: InteractionMsg[];
  _count?: { interactions: number };
}

interface ActivityLog {
  id: string;
  type: string;
  title: string;
  content: string;
  tokenChange: number;
  createdAt: string;
}

interface WorldStatus {
  worldModelActive: boolean;
  worldModelEngine: string;
  activeSeason: { seasonNum: number; gamesPlayed: number; totalGames: number } | null;
  totalAgents: number;
  humanAgents: number;
}

type Tab = "overview" | "games" | "logs" | "reflect";

export default function CareerPage() {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [games, setGames] = useState<GameRecord[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [worldStatus, setWorldStatus] = useState<WorldStatus | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<string | null>(null);

  // 反思相关
  const [reflectText, setReflectText] = useState("");
  const [focusAttr, setFocusAttr] = useState("");
  const [reflecting, setReflecting] = useState(false);
  const [reflectResult, setReflectResult] = useState<string | null>(null);

  // 互动相关
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [gameReactions, setGameReactions] = useState<Record<string, ReactionData[]>>({});
  const [commentText, setCommentText] = useState("");
  const [reacting, setReacting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [agentRes, gamesRes, logsRes, worldRes] = await Promise.all([
        fetch("/api/agent/status"),
        fetch("/api/nba/games"),
        fetch("/api/agent/logs"),
        fetch("/api/world/status"),
      ]);

      const agentData = await agentRes.json();
      if (agentData.code === 0) setAgent(agentData.data);
      else if (agentData.code === 404) {
        router.push("/agent/create");
        return;
      }

      const gamesData = await gamesRes.json();
      if (gamesData.code === 0) setGames(gamesData.data);

      const logsData = await logsRes.json();
      if (logsData.code === 0) setLogs(logsData.data);

      const worldData = await worldRes.json();
      if (worldData.code === 0) setWorldStatus(worldData.data);
    } catch (err) {
      console.error("加载失败:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSimulate() {
    setSimulating(true);
    setSimResult(null);
    try {
      const res = await fetch("/api/nba/simulate", { method: "POST" });
      const data = await res.json();
      if (data.code === 0) {
        setSimResult(`模拟了 ${data.data.gamesSimulated} 场比赛（${data.data.gamesPlayed}/${data.data.totalGames}）${data.data.status === "completed" ? " 赛季结束！" : ""}`);
        await loadData();
      }
    } catch (err) {
      console.error("模拟失败:", err);
    } finally {
      setSimulating(false);
    }
  }

  async function handleReflect() {
    if (!reflectText.trim()) return;
    setReflecting(true);
    try {
      const res = await fetch("/api/agent/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reflectText, focusAttribute: focusAttr || undefined }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setReflectResult(data.data.aiSummary);
        setReflectText("");
        await loadData();
      }
    } catch (err) {
      console.error("反思提交失败:", err);
    } finally {
      setReflecting(false);
    }
  }

  // 加载某场比赛的反应
  async function loadGameReactions(gameId: string) {
    try {
      const res = await fetch(`/api/game/react?gameId=${gameId}`);
      const data = await res.json();
      if (data.code === 0) {
        setGameReactions(prev => ({ ...prev, [gameId]: data.data }));
      }
    } catch (err) {
      console.error("加载反应失败:", err);
    }
  }

  // 展开/折叠比赛互动
  function toggleGameExpand(gameId: string) {
    if (expandedGame === gameId) {
      setExpandedGame(null);
    } else {
      setExpandedGame(gameId);
      loadGameReactions(gameId);
    }
    setCommentText("");
  }

  // 发送反应
  async function handleReact(gameId: string, toAgentId: string, type: string, interactionId?: string, message?: string) {
    if (!agent) return;
    setReacting(true);
    try {
      const res = await fetch("/api/game/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, toAgentId, type, interactionId, message }),
      });
      const data = await res.json();
      if (data.code === 0) {
        // 刷新反应列表
        await loadGameReactions(gameId);
        setCommentText("");
      }
    } catch (err) {
      console.error("反应失败:", err);
    } finally {
      setReacting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
          <span className="text-gray-500">加载中...</span>
        </div>
      </main>
    );
  }

  if (!agent) return null;

  const seasonStat = agent.seasonStats?.[0];
  const gp = seasonStat?.gamesPlayed || 0;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-xl font-bold">头号玩家</a>
            <span className="text-sm text-gray-400">NBA 生涯</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-token-gold animate-pulse" />
              <span className="text-sm font-bold text-amber-800">{agent.tokenBalance.toLocaleString()}</span>
            </div>
            <a href="/api/auth/logout" className="text-sm text-gray-400 hover:text-gray-600">退出</a>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Agent 信息卡片 */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 text-white mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-400">{agent.teamName}</p>
              <h1 className="text-2xl font-bold">{agent.nickname}</h1>
              <p className="text-sm text-gray-300">
                {positionName(agent.position)} · 年薪 {agent.salary} Token
              </p>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-xs text-gray-400">OVR</p>
                <p className="text-3xl font-black">{agent.ovr}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">战绩</p>
                <p className="text-xl font-bold">{agent.wins}胜{agent.losses}负</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">运气</p>
                <p className="text-xl font-bold">{agent.luckValue}</p>
              </div>
            </div>
          </div>

          {/* 属性条 */}
          <div className="grid grid-cols-7 gap-2 mt-5">
            {[
              { label: "投篮", value: agent.shooting },
              { label: "防守", value: agent.defense },
              { label: "速度", value: agent.speed },
              { label: "体力", value: agent.stamina },
              { label: "球商", value: agent.basketballIQ },
              { label: "传球", value: agent.passing },
              { label: "篮板", value: agent.rebound },
            ].map((attr) => (
              <div key={attr.label} className="text-center">
                <div className="w-full bg-white/10 rounded-full h-1.5 mb-1">
                  <div
                    className="h-full bg-token-gold rounded-full"
                    style={{ width: `${attr.value}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400">{attr.label}</p>
                <p className="text-sm font-bold">{attr.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 世界模型状态 */}
        {worldStatus && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${worldStatus.worldModelActive ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
              <span className="text-xs text-gray-500">世界模型</span>
              <span className="text-xs font-medium">{worldStatus.worldModelEngine}</span>
            </div>
            {worldStatus.activeSeason && (
              <div className="text-xs text-gray-500">
                第 {worldStatus.activeSeason.seasonNum} 赛季 · {worldStatus.activeSeason.gamesPlayed}/{worldStatus.activeSeason.totalGames} 场
              </div>
            )}
            <div className="text-xs text-gray-500">
              {worldStatus.totalAgents} 名球员（{worldStatus.humanAgents} 真人）
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-green-600">+{agent.totalEarned}</span>
              <span className="text-gray-400">/</span>
              <span className="text-red-500">-{agent.totalSpent}</span>
              <span className="text-gray-400">Token</span>
            </div>
          </div>
        )}

        {/* 模拟按钮 */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleSimulate}
            disabled={simulating}
            className="bg-gray-900 text-white px-6 py-2.5 rounded-full font-medium hover:bg-gray-800 disabled:bg-gray-400 transition-colors text-sm"
          >
            {simulating ? "模拟比赛中..." : "模拟比赛（5场）"}
          </button>
          {simResult && (
            <span className="text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-full">{simResult}</span>
          )}
        </div>

        {/* Tab 导航 */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {([
            { key: "overview" as Tab, label: "赛季总览" },
            { key: "games" as Tab, label: "比赛记录" },
            { key: "logs" as Tab, label: "活动日志" },
            { key: "reflect" as Tab, label: "反思提升" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === t.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 赛季总览 */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 赛季数据 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold mb-4">
                {seasonStat ? `第 ${seasonStat.season.seasonNum} 赛季` : "等待赛季开始"}
              </h3>
              {seasonStat ? (
                <div className="space-y-3">
                  <StatRow label="比赛场次" value={`${seasonStat.gamesPlayed}`} />
                  <StatRow label="胜场" value={`${seasonStat.gamesWon}`} />
                  <StatRow label="胜率" value={gp > 0 ? `${(seasonStat.gamesWon / gp * 100).toFixed(1)}%` : "-"} />
                  <StatRow label="场均得分" value={gp > 0 ? (seasonStat.totalPoints / gp).toFixed(1) : "-"} />
                  <StatRow label="场均篮板" value={gp > 0 ? (seasonStat.totalRebounds / gp).toFixed(1) : "-"} />
                  <StatRow label="场均助攻" value={gp > 0 ? (seasonStat.totalAssists / gp).toFixed(1) : "-"} />
                </div>
              ) : (
                <p className="text-gray-400 text-sm">点击"模拟比赛"开始新赛季</p>
              )}
            </div>

            {/* Token 经济 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold mb-4">Token 经济</h3>
              <div className="space-y-3">
                <StatRow label="当前余额" value={`${agent.tokenBalance.toLocaleString()} Token`} highlight />
                <StatRow label="总收入" value={`${agent.totalEarned.toLocaleString()} Token`} />
                <StatRow label="当前年薪" value={`${agent.salary} Token / 赛季`} />
                <StatRow label="认知分数" value={`${agent.cognitiveScore}`} />
              </div>
            </div>

            {/* 最近比赛 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 md:col-span-2">
              <h3 className="font-semibold mb-4">最近比赛</h3>
              {games.length > 0 ? (
                <div className="space-y-2">
                  {games.slice(0, 5).map((game) => (
                    <GameRow key={game.id} game={game} agentId={agent.id} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">暂无比赛记录</p>
              )}
            </div>
          </div>
        )}

        {/* 比赛记录（含互动） */}
        {tab === "games" && (
          <div className="space-y-3">
            {games.length > 0 ? (
              games.map((game) => {
                const isExpanded = expandedGame === game.id;
                const interactionCount = game._count?.interactions || game.interactions?.length || 0;
                const opponentAgent = game.homeAgent.id === agent.id ? game.awayAgent : game.homeAgent;
                const reactions = gameReactions[game.id] || [];

                return (
                  <div key={game.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* 比赛基本信息 */}
                    <div className="p-4">
                      <GameRow game={game} agentId={agent.id} />
                      {game.narrative && (
                        <p className="text-sm text-gray-500 mt-2 ml-1">{game.narrative}</p>
                      )}

                      {/* 展开互动按钮 */}
                      <button
                        onClick={() => toggleGameExpand(game.id)}
                        className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <span>{isExpanded ? "收起互动" : "查看互动"}</span>
                        {interactionCount > 0 && (
                          <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full text-xs font-medium">
                            {interactionCount}
                          </span>
                        )}
                        <svg className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {/* 展开的互动区域 */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50/50">
                        {/* 互动消息时间线 */}
                        {game.interactions && game.interactions.length > 0 ? (
                          <div className="p-4 space-y-3">
                            {(["pre_game", "in_game", "post_game"] as const).map((phase) => {
                              const phaseMessages = game.interactions!.filter(i => i.phase === phase);
                              if (phaseMessages.length === 0) return null;

                              return (
                                <div key={phase}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-medium text-gray-400">
                                      {phaseLabel(phase)}
                                    </span>
                                    <div className="flex-1 h-px bg-gray-200" />
                                  </div>
                                  <div className="space-y-2">
                                    {phaseMessages.map((msg) => {
                                      const isMine = msg.agentId === agent.id;
                                      const agentName = isMine ? agent.nickname : opponentAgent.nickname;

                                      return (
                                        <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                                          <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                                            isMine
                                              ? "bg-gray-900 text-white rounded-br-md"
                                              : "bg-white border border-gray-200 text-gray-800 rounded-bl-md"
                                          }`}>
                                            <p className={`text-xs font-medium mb-0.5 ${isMine ? "text-gray-400" : "text-gray-500"}`}>
                                              {agentName}
                                              {msg.source !== "local" && (
                                                <span className={`ml-1 ${isMine ? "text-gray-500" : "text-gray-400"}`}>
                                                  via {sourceLabel(msg.source)}
                                                </span>
                                              )}
                                            </p>
                                            <p className="text-sm">{msg.message}</p>

                                            {/* 对对方的消息可以反应 */}
                                            {!isMine && (
                                              <div className="flex items-center gap-1 mt-1.5">
                                                <ReactionButton
                                                  label="👍"
                                                  title="点赞"
                                                  disabled={reacting}
                                                  onClick={() => handleReact(game.id, msg.agentId, "like", msg.id)}
                                                />
                                                <ReactionButton
                                                  label="😤"
                                                  title="不屑"
                                                  disabled={reacting}
                                                  onClick={() => handleReact(game.id, msg.agentId, "disdain", msg.id)}
                                                />
                                                <ReactionButton
                                                  label="⚡"
                                                  title="挑衅"
                                                  disabled={reacting}
                                                  onClick={() => handleReact(game.id, msg.agentId, "provoke", msg.id)}
                                                />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-sm text-gray-400">
                            本场比赛暂无互动消息
                          </div>
                        )}

                        {/* 反应列表 */}
                        {reactions.length > 0 && (
                          <div className="px-4 pb-2">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium text-gray-400">赛后互动</span>
                              <div className="flex-1 h-px bg-gray-200" />
                            </div>
                            <div className="space-y-1.5">
                              {reactions.map((r) => (
                                <div key={r.id} className="flex items-start gap-2 text-sm">
                                  <span className="text-xs mt-0.5">{reactionIcon(r.type)}</span>
                                  <span className="text-gray-600">
                                    <span className="font-medium text-gray-800">{r.fromAgent?.nickname}</span>
                                    {" "}
                                    {reactionVerb(r.type)}
                                    {" "}
                                    <span className="font-medium text-gray-800">{r.toAgent?.nickname}</span>
                                    {r.message && (
                                      <span className="text-gray-500">：{r.message}</span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 留言输入框 */}
                        <div className="p-4 pt-2 border-t border-gray-100">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder={`对 ${opponentAgent.nickname} 说点什么...`}
                              className="flex-1 px-3 py-2 text-sm rounded-full border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 outline-none transition-all"
                              maxLength={100}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && commentText.trim()) {
                                  handleReact(game.id, opponentAgent.id, "comment", undefined, commentText.trim());
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                if (commentText.trim()) {
                                  handleReact(game.id, opponentAgent.id, "comment", undefined, commentText.trim());
                                }
                              }}
                              disabled={reacting || !commentText.trim()}
                              className="px-4 py-2 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                              {reacting ? "..." : "留言"}
                            </button>
                            <button
                              onClick={() => handleReact(game.id, opponentAgent.id, "provoke", undefined, commentText.trim() || undefined)}
                              disabled={reacting}
                              className="px-4 py-2 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                              挑衅
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm border border-gray-100">
                暂无比赛记录，点击"模拟比赛"开始
              </div>
            )}
          </div>
        )}

        {/* 活动日志 */}
        {tab === "logs" && (
          <div className="space-y-2">
            {logs.length > 0 ? logs.map((log) => (
              <div key={log.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{logIcon(log.type)}</span>
                    <span className="font-medium text-sm">{log.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.tokenChange !== 0 && (
                      <span className={`text-sm font-medium ${log.tokenChange > 0 ? "text-green-600" : "text-red-500"}`}>
                        {log.tokenChange > 0 ? "+" : ""}{log.tokenChange} Token
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(log.createdAt).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{log.content}</p>
              </div>
            )) : (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm border border-gray-100">
                暂无活动日志
              </div>
            )}
          </div>
        )}

        {/* 反思提升 */}
        {tab === "reflect" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold mb-2">反思与策略调整</h3>
              <p className="text-sm text-gray-500 mb-4">
                回顾比赛表现，总结经验教训。每次反思都有机会提升 Agent 属性。
              </p>

              <textarea
                value={reflectText}
                onChange={(e) => setReflectText(e.target.value)}
                placeholder="写下你对最近比赛的思考，例如：投篮命中率太低需要加强训练、应该减少失误..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all h-28 resize-none mb-3"
                maxLength={500}
              />

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  重点训练方向（可选）
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "shooting", label: "投篮" },
                    { key: "defense", label: "防守" },
                    { key: "speed", label: "速度" },
                    { key: "stamina", label: "体力" },
                    { key: "basketballIQ", label: "篮球智商" },
                    { key: "passing", label: "传球" },
                    { key: "rebound", label: "篮板" },
                  ].map((attr) => (
                    <button
                      key={attr.key}
                      onClick={() => setFocusAttr(focusAttr === attr.key ? "" : attr.key)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        focusAttr === attr.key
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {attr.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleReflect}
                disabled={reflecting || !reflectText.trim()}
                className="w-full bg-gray-900 text-white rounded-full py-2.5 font-medium hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {reflecting ? "分析中..." : "提交反思"}
              </button>

              {reflectResult && (
                <div className="mt-4 bg-green-50 rounded-xl p-4">
                  <p className="text-sm text-green-800">{reflectResult}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ===== 辅助组件和函数 =====

function ReactionButton({ label, title, disabled, onClick }: {
  label: string; title: string; disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-all text-xs disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium ${highlight ? "text-token-gold" : ""}`}>{value}</span>
    </div>
  );
}

function GameRow({ game, agentId }: { game: GameRecord; agentId: string }) {
  const isHome = game.homeAgent.id === agentId;
  const won = isHome ? game.homeScore > game.awayScore : game.awayScore > game.homeScore;
  const myStats = game.stats[0];

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${won ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
          {won ? "胜" : "负"}
        </span>
        <div>
          <p className="text-sm font-medium">
            {game.homeAgent.teamName} {game.homeScore} : {game.awayScore} {game.awayAgent.teamName}
          </p>
          <p className="text-xs text-gray-400">第 {game.season.seasonNum} 赛季 · 第 {game.gameNum} 场</p>
        </div>
      </div>
      {myStats && (
        <div className="text-right text-xs text-gray-500">
          <span className="font-medium text-gray-900">{myStats.points}分</span>
          {" "}{myStats.rebounds}板 {myStats.assists}助
        </div>
      )}
    </div>
  );
}

function positionName(pos: string): string {
  const map: Record<string, string> = {
    PG: "控球后卫", SG: "得分后卫", SF: "小前锋", PF: "大前锋", C: "中锋",
  };
  return map[pos] || pos;
}

function logIcon(type: string): string {
  const map: Record<string, string> = {
    game: "🏀", salary: "💰", training: "💪", event: "🎉", reflection: "🧠",
  };
  return map[type] || "📋";
}

function phaseLabel(phase: string): string {
  const map: Record<string, string> = {
    pre_game: "赛前叫嚣",
    in_game: "赛中垃圾话",
    post_game: "赛后感言",
  };
  return map[phase] || phase;
}

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    secondme: "Second Me",
    kimi: "AI",
    local: "",
  };
  return map[source] || source;
}

function reactionIcon(type: string): string {
  const map: Record<string, string> = {
    like: "👍", disdain: "😤", provoke: "⚡", comment: "💬",
  };
  return map[type] || "💬";
}

function reactionVerb(type: string): string {
  const map: Record<string, string> = {
    like: "给", disdain: "不屑了", provoke: "挑衅了", comment: "对",
  };
  return map[type] || "";
}
