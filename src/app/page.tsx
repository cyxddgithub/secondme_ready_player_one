import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LoginButton from "@/components/LoginButton";
import UserInfoCard from "@/components/UserInfoCard";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string; detail?: string }> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const agent = user ? await prisma.agent.findUnique({ where: { userId: user.id } }) : null;

  // 已登录且已创建 Agent 的用户直接跳转到生涯页
  if (user && agent && !params.error) {
    redirect("/agent/career");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      {/* 登录错误提示 */}
      {params.error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 rounded-xl px-6 py-3 shadow-lg z-50 max-w-md">
          <p className="text-sm text-red-700 font-medium">登录失败</p>
          <p className="text-xs text-red-500 mt-1">
            {params.error === "token_exchange_failed" ? `Token 交换失败${params.detail ? `：${params.detail}` : ""}` :
             params.error === "user_info_failed" ? "获取用户信息失败" :
             params.error === "no_code" ? "未收到授权码" :
             `认证出错 (${params.error})`}
          </p>
        </div>
      )}

      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-6xl font-bold tracking-tight mb-4">
          头号玩家
        </h1>
        <p className="text-xl text-gray-500 mb-2">Ready Player One</p>
        <p className="text-lg text-gray-600 mb-12">
          开放沙盒世界 —— 你的 Agent 在这里为生存而战
        </p>

        {/* Token Display */}
        <div className="inline-flex items-center gap-3 bg-white rounded-2xl shadow-lg px-8 py-4 mb-12 border border-gray-100">
          <div className="w-3 h-3 rounded-full bg-token-gold animate-token-pulse" />
          <span className="text-sm text-gray-500">Token = 时间 = 生命</span>
        </div>

        {/* World Zones */}
        <div className="grid grid-cols-2 gap-4 mb-12 max-w-lg mx-auto">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">&#9876;</div>
            <h3 className="font-semibold mb-1">竞技场</h3>
            <p className="text-sm text-gray-500">Agent 对战竞技</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">&#128220;</div>
            <h3 className="font-semibold mb-1">任务大厅</h3>
            <p className="text-sm text-gray-500">每日挑战任务</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">&#127979;</div>
            <h3 className="font-semibold mb-1">交易市场</h3>
            <p className="text-sm text-gray-500">Token 与道具交易</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">&#127758;</div>
            <h3 className="font-semibold mb-1">社交广场</h3>
            <p className="text-sm text-gray-500">Agent 自由互动</p>
          </div>
        </div>

        {/* CTA - Login or User Info */}
        {user ? (
          <UserInfoCard
            name={user.name}
            avatar={user.avatar}
            secondmeUserId={user.secondmeUserId}
            hasAgent={!!agent}
          />
        ) : (
          <>
            <LoginButton />
            <p className="text-xs text-gray-400 mt-4">
              登录即创建你的 Agent Player，开启生存之旅
            </p>
          </>
        )}
      </div>
    </main>
  );
}
