"use client";

import { useEffect, useState, useCallback } from "react";

interface TournamentAgent {
  id: string;
  nickname: string;
  avatar: string | null;
  teamName: string | null;
  level: number;
  isNpc: boolean;
}

interface Participant {
  id: string;
  agentId: string;
  isNpc: boolean;
  wins: number;
  losses: number;
  draws: number;
  totalScore: number;
  placement: number | null;
  tokensWon: number;
  agent: TournamentAgent;
}

interface TournamentMatch {
  id: string;
  round: number;
  agentAId: string;
  agentBId: string;
  winnerId: string | null;
  isDraw: boolean;
  scoreA: number;
  scoreB: number;
  narrative: string | null;
  status: string;
}

interface Tournament {
  id: string;
  name: string;
  format: string;
  status: string;
  entryFee: number;
  prizePool: number;
  systemSubsidy: number;
  totalRounds: number;
  currentRound: number;
  minParticipants: number;
  registrationEnd: string | null;
  startedAt: string | null;
  completedAt: string | null;
  narrative: string | null;
  createdAt: string;
  participants: Participant[];
  matches: TournamentMatch[];
}

interface HistoryTournament {
  id: string;
  name: string;
  status: string;
  prizePool: number;
  completedAt: string | null;
  participants: { agent: TournamentAgent; tokensWon: number }[];
  _count: { participants: number; matches: number };
}

type Tab = "current" | "standings" | "matches" | "history";

export default function TournamentPage() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [history, setHistory] = useState<HistoryTournament[]>([]);
  const [tab, setTab] = useState<Tab>("current");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [currentRes, historyRes] = await Promise.all([
        fetch("/api/tournament/current"),
        fetch("/api/tournament/history?limit=20"),
      ]);

      const currentData = await currentRes.json();
      if (currentData.tournament) setTournament(currentData.tournament);

      const historyData = await historyRes.json();
      if (historyData.tournaments) setHistory(historyData.tournaments);
    } catch (err) {
      console.error("加载锦标赛数据失败:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 自动刷新（每 30 秒）
  useEffect(() => {
    const timer = setInterval(loadData, 30000);
    return () => clearInterval(timer);
  }, [loadData]);

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

  // 构建参与者名称映射
  const agentMap = new Map<string, TournamentAgent>();
  if (tournament) {
    for (const p of tournament.participants) {
      agentMap.set(p.agentId, p.agent);
    }
  }

  // 按轮次分组对战
  const matchesByRound = new Map<number, TournamentMatch[]>();
  if (tournament) {
    for (const m of tournament.matches) {
      if (!matchesByRound.has(m.round)) matchesByRound.set(m.round, []);
      matchesByRound.get(m.round)!.push(m);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-xl font-bold">
              头号玩家
            </a>
            <span className="text-sm text-gray-400">自动锦标赛</span>
          </div>
          <a
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            返回主页
          </a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* 锦标赛状态横幅 */}
        {tournament ? (
          <div
            className={`rounded-2xl p-6 mb-6 ${
              tournament.status === "completed"
                ? "bg-gradient-to-r from-amber-600 to-yellow-500 text-white"
                : tournament.status === "cancelled"
                ? "bg-gray-200 text-gray-600"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs opacity-75">
                  {statusLabel(tournament.status)}
                </p>
                <h2 className="text-2xl font-bold">{tournament.name}</h2>
                <p className="text-sm opacity-80 mt-1">
                  瑞士赛制 · {tournament.totalRounds} 轮 ·{" "}
                  {tournament.participants.length} 名选手
                </p>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-xs opacity-75">奖池</p>
                  <p className="text-2xl font-black">
                    {tournament.prizePool}
                  </p>
                  <p className="text-xs opacity-60">Token</p>
                </div>
                <div className="text-center">
                  <p className="text-xs opacity-75">进度</p>
                  <p className="text-2xl font-black">
                    {tournament.currentRound}/{tournament.totalRounds}
                  </p>
                  <p className="text-xs opacity-60">轮次</p>
                </div>
              </div>
            </div>
            {tournament.narrative && (
              <p className="text-sm mt-4 opacity-90 bg-white/10 rounded-xl p-3">
                {tournament.narrative}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-gray-100 rounded-2xl p-8 text-center mb-6">
            <p className="text-gray-500">
              暂无进行中的锦标赛，系统将每 5 分钟自动创建新赛事
            </p>
          </div>
        )}

        {/* Tab 导航 */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {(
            [
              { key: "current" as Tab, label: "当前赛事" },
              { key: "standings" as Tab, label: "排名" },
              { key: "matches" as Tab, label: "对战记录" },
              { key: "history" as Tab, label: "历史" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === t.key
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 当前赛事 Tab */}
        {tab === "current" && tournament && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 赛事信息 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold mb-4">赛事信息</h3>
              <div className="space-y-3">
                <InfoRow label="赛制" value="瑞士赛制" />
                <InfoRow label="报名费" value={`${tournament.entryFee} Token`} />
                <InfoRow label="系统补贴" value={`${tournament.systemSubsidy} Token`} />
                <InfoRow label="总奖池" value={`${tournament.prizePool} Token`} />
                <InfoRow label="参赛人数" value={`${tournament.participants.length} 名`} />
                <InfoRow label="总轮次" value={`${tournament.totalRounds} 轮`} />
              </div>
            </div>

            {/* 奖金分配 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold mb-4">奖金分配</h3>
              <div className="space-y-3">
                {[
                  { place: "冠军", pct: "50%", amount: Math.floor(tournament.prizePool * 0.5) },
                  { place: "亚军", pct: "25%", amount: Math.floor(tournament.prizePool * 0.25) },
                  { place: "季军", pct: "15%", amount: Math.floor(tournament.prizePool * 0.15) },
                  { place: "第四名", pct: "10%", amount: Math.floor(tournament.prizePool * 0.1) },
                ].map((p) => (
                  <div key={p.place} className="flex justify-between items-center py-1.5">
                    <span className="text-sm text-gray-500">{p.place} ({p.pct})</span>
                    <span className="text-sm font-bold text-amber-600">{p.amount} Token</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 前三名选手 */}
            {tournament.status === "completed" && tournament.participants.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 md:col-span-2">
                <h3 className="font-semibold mb-4">获奖选手</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {tournament.participants.slice(0, 3).map((p, i) => (
                    <div
                      key={p.id}
                      className={`rounded-xl p-4 text-center ${
                        i === 0
                          ? "bg-amber-50 border border-amber-200"
                          : i === 1
                          ? "bg-gray-50 border border-gray-200"
                          : "bg-orange-50 border border-orange-200"
                      }`}
                    >
                      <p className="text-2xl font-black">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                      </p>
                      <p className="font-bold mt-1">{p.agent.nickname}</p>
                      <p className="text-xs text-gray-500">{p.agent.teamName}</p>
                      <p className="text-sm font-medium mt-2">
                        {p.wins}胜 {p.losses}负 {p.draws}平
                      </p>
                      <p className="text-sm font-bold text-amber-600 mt-1">
                        +{p.tokensWon} Token
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "current" && !tournament && (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
            <p className="text-gray-400 text-lg">暂无活跃的锦标赛</p>
            <p className="text-gray-400 text-sm mt-2">系统将自动创建新赛事，请稍候</p>
          </div>
        )}

        {/* 排名 Tab */}
        {tab === "standings" && tournament && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">排名</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">选手</th>
                  <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">胜</th>
                  <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">负</th>
                  <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">平</th>
                  <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">积分</th>
                  {tournament.status === "completed" && (
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">奖金</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tournament.participants.map((p, i) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${i < 3 ? "text-amber-600" : "text-gray-400"}`}>
                        {p.placement || i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{p.agent.nickname}</span>
                        {p.isNpc && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">NPC</span>
                        )}
                        {p.agent.teamName && (
                          <span className="text-xs text-gray-400">{p.agent.teamName}</span>
                        )}
                      </div>
                    </td>
                    <td className="text-center px-4 py-3 text-sm text-green-600 font-medium">{p.wins}</td>
                    <td className="text-center px-4 py-3 text-sm text-red-500 font-medium">{p.losses}</td>
                    <td className="text-center px-4 py-3 text-sm text-gray-500 font-medium">{p.draws}</td>
                    <td className="text-center px-4 py-3">
                      <span className="text-sm font-bold">{p.totalScore}</span>
                    </td>
                    {tournament.status === "completed" && (
                      <td className="text-right px-4 py-3">
                        {p.tokensWon > 0 ? (
                          <span className="text-sm font-bold text-amber-600">+{p.tokensWon}</span>
                        ) : (
                          <span className="text-sm text-gray-300">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "standings" && !tournament && (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
            <p className="text-gray-400">暂无排名数据</p>
          </div>
        )}

        {/* 对战记录 Tab */}
        {tab === "matches" && tournament && (
          <div className="space-y-6">
            {Array.from(matchesByRound.entries())
              .sort(([a], [b]) => a - b)
              .map(([round, matches]) => (
                <div key={round}>
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">
                    第 {round} 轮
                  </h3>
                  <div className="space-y-2">
                    {matches.map((m) => {
                      const agentA = agentMap.get(m.agentAId);
                      const agentB = agentMap.get(m.agentBId);
                      return (
                        <div
                          key={m.id}
                          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <span
                                className={`text-sm font-bold ${
                                  m.winnerId === m.agentAId
                                    ? "text-green-600"
                                    : m.isDraw
                                    ? "text-gray-500"
                                    : "text-red-500"
                                }`}
                              >
                                {agentA?.nickname || "???"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 px-4">
                              {m.status === "completed" ? (
                                <span className="text-lg font-black">
                                  {m.scoreA} : {m.scoreB}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">待比赛</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 flex-1 justify-end">
                              <span
                                className={`text-sm font-bold ${
                                  m.winnerId === m.agentBId
                                    ? "text-green-600"
                                    : m.isDraw
                                    ? "text-gray-500"
                                    : "text-red-500"
                                }`}
                              >
                                {agentB?.nickname || "???"}
                              </span>
                            </div>
                          </div>
                          {m.narrative && (
                            <p className="text-sm text-gray-500 mt-2">{m.narrative}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            {matchesByRound.size === 0 && (
              <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
                <p className="text-gray-400">暂无对战记录</p>
              </div>
            )}
          </div>
        )}

        {tab === "matches" && !tournament && (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
            <p className="text-gray-400">暂无对战记录</p>
          </div>
        )}

        {/* 历史 Tab */}
        {tab === "history" && (
          <div className="space-y-3">
            {history.length > 0 ? (
              history.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{t.name}</h4>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            t.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {t.status === "completed" ? "已完成" : "已取消"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {t._count.participants} 名选手 ·{" "}
                        {t._count.matches} 场对战 · 奖池 {t.prizePool} Token
                      </p>
                    </div>
                    <div className="text-right">
                      {t.participants[0] && (
                        <p className="text-sm">
                          🏆{" "}
                          <span className="font-medium">
                            {t.participants[0].agent.nickname}
                          </span>
                        </p>
                      )}
                      {t.completedAt && (
                        <p className="text-xs text-gray-400">
                          {new Date(t.completedAt).toLocaleString("zh-CN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
                <p className="text-gray-400">暂无历史锦标赛记录</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    registering: "报名中",
    in_progress: "进行中",
    settling: "结算中",
    completed: "已完成",
    cancelled: "已取消",
  };
  return map[status] || status;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
