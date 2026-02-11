import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import UserProfile from "@/components/UserProfile";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">头号玩家</h1>
            <span className="text-sm text-gray-400">Ready Player One</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                  {(user.name || "U")[0]}
                </div>
              )}
              <span className="text-sm font-medium">{user.name || "用户"}</span>
            </div>
            <a
              href="/api/auth/logout"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              退出登录
            </a>
          </div>
        </div>
      </header>

      {/* 主体内容 */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧 - 用户资料 */}
          <div className="lg:col-span-1">
            <UserProfile />
          </div>

          {/* 右侧 - 游戏世界入口 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 进入 3D 世界 */}
            <a
              href="/lobby"
              className="block bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-all hover:scale-[1.02] group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xl mb-1">进入世界大厅</h3>
                  <p className="text-white/80 text-sm">
                    3D 沙盒世界 - 自由探索、竞技、交易
                  </p>
                </div>
                <div className="text-4xl group-hover:translate-x-1 transition-transform">
                  &#9654;
                </div>
              </div>
            </a>

            {/* Token 状态 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">生命 Token</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-token-gold animate-token-pulse" />
                  <span className="text-2xl font-bold text-token-gold">1,000</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Token = 时间 = 生命。通过竞赛、任务、交易获取更多 Token，保持你的 Agent 存活。
              </p>
            </div>

            {/* 世界区域 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                <div className="text-2xl mb-2">&#9876;</div>
                <h3 className="font-semibold mb-1">竞技场</h3>
                <p className="text-sm text-gray-500">Agent 对战竞技</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                <div className="text-2xl mb-2">&#128220;</div>
                <h3 className="font-semibold mb-1">任务大厅</h3>
                <p className="text-sm text-gray-500">每日挑战任务</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                <div className="text-2xl mb-2">&#127979;</div>
                <h3 className="font-semibold mb-1">交易市场</h3>
                <p className="text-sm text-gray-500">Token 与道具交易</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                <div className="text-2xl mb-2">&#127758;</div>
                <h3 className="font-semibold mb-1">社交广场</h3>
                <p className="text-sm text-gray-500">Agent 自由互动</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
