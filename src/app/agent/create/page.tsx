"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { COGNITIVE_QUESTIONS } from "@/game/nba/nbaEngine";

type Step = "vision" | "position" | "cognitive" | "luck" | "result";

interface CognitiveAnswer {
  questionId: number;
  cognitivePoints: number;
  riskPoints: number;
}

export default function CreateAgentPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("vision");
  const [nickname, setNickname] = useState("");
  const [lifeVision, setLifeVision] = useState("");
  const [position, setPosition] = useState("");
  const [answers, setAnswers] = useState<CognitiveAnswer[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [luckValue, setLuckValue] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [authChecking, setAuthChecking] = useState(true);

  // 页面加载时检查登录状态
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.status === 401) {
          router.replace("/api/auth/login");
          return;
        }
      } catch {
        // 网络错误时也跳转到登录
        router.replace("/api/auth/login");
        return;
      }
      setAuthChecking(false);
    }
    checkAuth();
  }, [router]);

  const positions = [
    { key: "PG", name: "控球后卫", desc: "速度快、传球好、掌控节奏", icon: "⚡" },
    { key: "SG", name: "得分后卫", desc: "投篮精准、得分能力强", icon: "🎯" },
    { key: "SF", name: "小前锋", desc: "全面发展、攻守兼备", icon: "🏃" },
    { key: "PF", name: "大前锋", desc: "内线强硬、篮板出色", icon: "💪" },
    { key: "C", name: "中锋", desc: "防守支柱、篮下统治", icon: "🛡️" },
  ];

  // 认知测试得分计算
  const cognitiveScore = answers.length > 0
    ? Math.round(answers.reduce((sum, a) => sum + a.cognitivePoints, 0) / answers.length * 5)
    : 50;
  const riskTolerance = answers.length > 0
    ? Math.round(answers.reduce((sum, a) => sum + a.riskPoints, 0) / answers.length)
    : 50;

  function handleAnswer(option: { cognitivePoints: number; riskPoints: number }) {
    const newAnswers = [
      ...answers,
      {
        questionId: COGNITIVE_QUESTIONS[currentQuestion].id,
        cognitivePoints: option.cognitivePoints,
        riskPoints: option.riskPoints,
      },
    ];
    setAnswers(newAnswers);

    if (currentQuestion < COGNITIVE_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setStep("luck");
    }
  }

  function rollLuck() {
    setIsRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setLuckValue(Math.floor(Math.random() * 100) + 1);
      count++;
      if (count > 20) {
        clearInterval(interval);
        const finalLuck = Math.floor(Math.random() * 100) + 1;
        setLuckValue(finalLuck);
        setIsRolling(false);
      }
    }, 80);
  }

  async function createAgent() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/agent/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          lifeVision,
          position,
          cognitiveScore,
          riskTolerance,
          luckValue,
        }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setResult(data.data);
        setStep("result");
      } else if (res.status === 401) {
        // 登录过期，跳转重新登录
        setError("登录已过期，正在跳转重新登录...");
        setTimeout(() => router.replace("/api/auth/login"), 1500);
      } else {
        setError(data.message || "创建失败，请重试");
      }
    } catch (err) {
      console.error("创建失败:", err);
      setError("网络错误，请检查网络后重试");
    } finally {
      setCreating(false);
    }
  }

  if (authChecking) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-500">加载中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* 错误提示 */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        {/* 进度指示器 */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(["vision", "position", "cognitive", "luck", "result"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                step === s ? "bg-gray-900 text-white scale-110" :
                (["vision", "position", "cognitive", "luck", "result"].indexOf(step) > i
                  ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500")
              }`}>
                {["vision", "position", "cognitive", "luck", "result"].indexOf(step) > i ? "✓" : i + 1}
              </div>
              {i < 4 && <div className="w-6 h-0.5 bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* Step 1: 人生愿景 */}
        {step === "vision" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-2xl font-bold mb-2">创建你的 Agent</h2>
            <p className="text-gray-500 mb-6">告诉我们你想体验怎样的 NBA 人生</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent 昵称</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="给你的 Agent 取个响亮的名字"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all"
                  maxLength={20}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">人生愿景</label>
                <textarea
                  value={lifeVision}
                  onChange={(e) => setLifeVision(e.target.value)}
                  placeholder="描述你理想的 NBA 生涯，例如：成为联盟最佳得分后卫，带队夺冠，退役后成为教练..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all h-32 resize-none"
                  maxLength={300}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{lifeVision.length}/300</p>
              </div>
            </div>

            <button
              onClick={() => setStep("position")}
              disabled={!nickname.trim()}
              className="w-full mt-6 bg-gray-900 text-white rounded-full py-3 font-medium hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              下一步：选择位置
            </button>
          </div>
        )}

        {/* Step 2: 选择位置 */}
        {step === "position" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-2xl font-bold mb-2">选择场上位置</h2>
            <p className="text-gray-500 mb-6">不同位置决定你的属性倾向</p>

            <div className="space-y-3">
              {positions.map((pos) => (
                <button
                  key={pos.key}
                  onClick={() => setPosition(pos.key)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    position === pos.key
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-100 hover:border-gray-300"
                  }`}
                >
                  <span className="text-3xl">{pos.icon}</span>
                  <div>
                    <div className="font-semibold">{pos.name} ({pos.key})</div>
                    <div className="text-sm text-gray-500">{pos.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep("vision")}
                className="flex-1 py-3 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                返回
              </button>
              <button
                onClick={() => setStep("cognitive")}
                disabled={!position}
                className="flex-1 bg-gray-900 text-white rounded-full py-3 font-medium hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                下一步：认知测试
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 认知测试 */}
        {step === "cognitive" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold">认知测试</h2>
              <span className="text-sm text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                {currentQuestion + 1}/{COGNITIVE_QUESTIONS.length}
              </span>
            </div>
            <p className="text-gray-500 mb-6">你的决策方式将影响 Agent 的初始能力</p>

            {/* 进度条 */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full mb-6">
              <div
                className="h-full bg-gray-900 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / COGNITIVE_QUESTIONS.length) * 100}%` }}
              />
            </div>

            <div className="mb-6">
              <p className="text-lg font-medium mb-4">{COGNITIVE_QUESTIONS[currentQuestion].question}</p>
              <div className="space-y-2">
                {COGNITIVE_QUESTIONS[currentQuestion].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(opt)}
                    className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-all"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: 运气值 */}
        {step === "luck" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 text-center">
            <h2 className="text-2xl font-bold mb-2">命运之轮</h2>
            <p className="text-gray-500 mb-4">测试你的运气，运气值将影响你的比赛表现</p>

            {/* 认知测试结果预览 */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-gray-500 mb-2">认知测试结果</p>
              <div className="flex gap-4">
                <div>
                  <span className="text-xs text-gray-400">决策能力</span>
                  <p className="text-lg font-bold">{cognitiveScore}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">风险偏好</span>
                  <p className="text-lg font-bold">{riskTolerance}</p>
                </div>
              </div>
            </div>

            {/* 运气值显示 */}
            <div className="mb-8">
              <div className={`text-8xl font-black tabular-nums ${isRolling ? "text-gray-400" : luckValue > 0 ? "text-gray-900" : "text-gray-300"}`}>
                {luckValue || "?"}
              </div>
              {luckValue > 0 && !isRolling && (
                <p className="text-sm text-gray-500 mt-2">
                  {luckValue >= 80 ? "天选之子！运气爆棚！" :
                   luckValue >= 60 ? "运气不错，前途光明。" :
                   luckValue >= 40 ? "普通运气，靠实力说话。" :
                   luckValue >= 20 ? "运气一般，需要加倍努力。" :
                   "命运多舛，但逆境出英雄！"}
                </p>
              )}
            </div>

            {luckValue === 0 || isRolling ? (
              <button
                onClick={rollLuck}
                disabled={isRolling}
                className="w-full bg-gray-900 text-white rounded-full py-3 font-medium hover:bg-gray-800 disabled:bg-gray-500 transition-colors"
              >
                {isRolling ? "命运之轮旋转中..." : "摇动命运之轮"}
              </button>
            ) : (
              <button
                onClick={createAgent}
                disabled={creating}
                className="w-full bg-gray-900 text-white rounded-full py-3 font-medium hover:bg-gray-800 disabled:bg-gray-500 transition-colors"
              >
                {creating ? "创建中..." : "确认创建 Agent"}
              </button>
            )}
          </div>
        )}

        {/* Step 5: 创建结果 */}
        {step === "result" && result && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🏀</div>
              <h2 className="text-2xl font-bold">欢迎加入 {String(result.teamName)}</h2>
              <p className="text-gray-500">{nickname} 的 NBA 人生正式开始！</p>
            </div>

            {/* Agent 卡片 */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl p-5 text-white mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs text-gray-400">{String(result.teamName)}</p>
                  <h3 className="text-xl font-bold">{nickname}</h3>
                  <p className="text-sm text-gray-300">
                    {positions.find(p => p.key === position)?.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">OVR</p>
                  <p className="text-3xl font-black">{String(result.ovr)}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-white/10 rounded-lg p-2">
                  <p className="text-gray-400">投篮</p>
                  <p className="font-bold text-lg">{String(result.shooting)}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-2">
                  <p className="text-gray-400">防守</p>
                  <p className="font-bold text-lg">{String(result.defense)}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-2">
                  <p className="text-gray-400">速度</p>
                  <p className="font-bold text-lg">{String(result.speed)}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-2">
                  <p className="text-gray-400">体力</p>
                  <p className="font-bold text-lg">{String(result.stamina)}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-2">
                  <p className="text-gray-400">球商</p>
                  <p className="font-bold text-lg">{String(result.basketballIQ)}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-2">
                  <p className="text-gray-400">传球</p>
                  <p className="font-bold text-lg">{String(result.passing)}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-2">
                  <p className="text-gray-400">篮板</p>
                  <p className="font-bold text-lg">{String(result.rebound)}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-2">
                  <p className="text-gray-400">年薪</p>
                  <p className="font-bold text-lg text-token-gold">{String(result.salary)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-amber-50 rounded-xl p-3 mb-6">
              <div className="w-2.5 h-2.5 rounded-full bg-token-gold animate-pulse" />
              <p className="text-sm text-amber-800">
                年薪 <span className="font-bold">{String(result.salary)} Token</span> / 赛季 — 退出后 Agent 自动参加比赛
              </p>
            </div>

            <button
              onClick={() => router.push("/agent/career")}
              className="w-full bg-gray-900 text-white rounded-full py-3 font-medium hover:bg-gray-800 transition-colors"
            >
              进入 NBA 生涯
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
