"use client";

import { useEffect, useState } from "react";

interface UserInfo {
  id: string;
  name?: string;
  avatar?: string;
  secondmeUserId: string;
}

interface Shade {
  label?: string;
  name?: string;
  content?: string;
}

interface SoftMemory {
  title?: string;
  content?: string;
}

export default function UserProfile() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [shades, setShades] = useState<Shade[]>([]);
  const [memories, setMemories] = useState<SoftMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"info" | "shades" | "memory">("info");

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    try {
      // 加载用户基础信息
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        setLoading(false);
        return;
      }
      const meData = await meRes.json();
      if (meData.code === 0) {
        setUser(meData.data);
      }

      // 并行加载 shades 和 softmemory
      const [shadesRes, memoryRes] = await Promise.all([
        fetch("/api/user/shades"),
        fetch("/api/user/softmemory"),
      ]);

      const shadesData = await shadesRes.json();
      if (shadesData.code === 0 && shadesData.data?.shades) {
        setShades(shadesData.data.shades);
      }

      const memoryData = await memoryRes.json();
      if (memoryData.code === 0 && memoryData.data?.list) {
        setMemories(memoryData.data.list);
      }
    } catch (error) {
      console.error("加载用户数据失败:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
        <span className="ml-3 text-gray-500">加载中...</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 用户头部 */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name || "用户头像"}
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-100"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl text-gray-500">
              {(user.name || "U")[0]}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold">{user.name || "未命名用户"}</h2>
            <p className="text-sm text-gray-500">{user.secondmeUserId}</p>
          </div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex border-b border-gray-100">
        {[
          { key: "info" as const, label: "基础信息" },
          { key: "shades" as const, label: `兴趣标签 (${shades.length})` },
          { key: "memory" as const, label: `软记忆 (${memories.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "text-gray-900 border-b-2 border-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div className="p-6">
        {activeTab === "info" && (
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">用户名</span>
              <span className="font-medium">{user.name || "-"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">SecondMe ID</span>
              <span className="font-medium text-sm">{user.secondmeUserId}</span>
            </div>
          </div>
        )}

        {activeTab === "shades" && (
          <div>
            {shades.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {shades.map((shade, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-gray-100 text-sm text-gray-700"
                  >
                    {shade.label || shade.name || shade.content || `标签 ${i + 1}`}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">暂无兴趣标签</p>
            )}
          </div>
        )}

        {activeTab === "memory" && (
          <div>
            {memories.length > 0 ? (
              <div className="space-y-3">
                {memories.map((memory, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    {memory.title && (
                      <h4 className="font-medium text-sm mb-1">{memory.title}</h4>
                    )}
                    <p className="text-sm text-gray-600">
                      {memory.content || JSON.stringify(memory)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">暂无软记忆</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
