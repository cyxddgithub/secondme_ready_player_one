'use client'

import { useState, useEffect } from 'react'

interface GameHUDProps {
  tokenBalance?: number
  nickname?: string
  onBack?: () => void
}

export default function GameHUD({
  tokenBalance = 1000,
  nickname = '玩家',
  onBack,
}: GameHUDProps) {
  const [showControls, setShowControls] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowControls(false), 8000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between p-4">
        {/* 返回按钮 */}
        <button
          onClick={onBack}
          className="pointer-events-auto px-4 py-2 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm text-sm transition-colors"
        >
          ← 返回
        </button>

        {/* Token 显示 */}
        <div className="pointer-events-auto flex items-center gap-3 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-bold text-yellow-900">
              T
            </div>
            <span className="text-yellow-400 font-mono font-bold text-lg">
              {tokenBalance.toLocaleString()}
            </span>
          </div>
          <div className="w-px h-6 bg-white/20" />
          <span className="text-white/80 text-sm">{nickname}</span>
        </div>
      </div>

      {/* 小地图 */}
      <div className="absolute top-20 right-4 pointer-events-auto">
        <div className="w-36 h-36 bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 p-2">
          <div className="relative w-full h-full bg-green-900/30 rounded">
            {/* 建筑标记 */}
            <div className="absolute w-2.5 h-2.5 bg-red-500 rounded-sm" style={{ left: '15%', top: '15%' }} title="竞技场" />
            <div className="absolute w-2.5 h-2.5 bg-blue-500 rounded-sm" style={{ right: '15%', top: '15%' }} title="任务大厅" />
            <div className="absolute w-2.5 h-2.5 bg-yellow-500 rounded-sm" style={{ right: '15%', bottom: '15%' }} title="市场" />
            <div className="absolute w-2.5 h-2.5 bg-purple-500 rounded-sm" style={{ left: '15%', bottom: '15%' }} title="社交广场" />
            <div className="absolute w-2.5 h-2.5 bg-gray-800 rounded-sm" style={{ left: '45%', top: '8%' }} title="时间金库" />
            {/* 玩家位置 */}
            <div className="absolute w-2 h-2 bg-white rounded-full animate-pulse" style={{ left: '47%', top: '62%' }} />
            {/* 中央喷泉 */}
            <div className="absolute w-3 h-3 bg-cyan-400/50 rounded-full" style={{ left: '44%', top: '44%' }} />
          </div>
          <div className="text-white/50 text-[10px] text-center mt-1">世界大厅</div>
        </div>
      </div>

      {/* 操作提示 */}
      {showControls && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
          <div className="bg-black/60 backdrop-blur-sm rounded-xl px-6 py-4 text-center">
            <div className="text-white/90 text-sm mb-3 font-medium">操作指南</div>
            <div className="flex gap-6 text-white/70 text-xs">
              <div className="flex flex-col items-center gap-1">
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 bg-white/10 rounded text-white border border-white/20">W</kbd>
                </div>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 bg-white/10 rounded text-white border border-white/20">A</kbd>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-white border border-white/20">S</kbd>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-white border border-white/20">D</kbd>
                </div>
                <span className="mt-1">移动</span>
              </div>
              <div className="flex flex-col items-center gap-1 justify-end">
                <kbd className="px-4 py-1 bg-white/10 rounded text-white border border-white/20">Space</kbd>
                <span className="mt-1">跳跃</span>
              </div>
              <div className="flex flex-col items-center gap-1 justify-end">
                <kbd className="px-2 py-1 bg-white/10 rounded text-white border border-white/20">↑↓←→</kbd>
                <span className="mt-1">方向键</span>
              </div>
            </div>
            <button
              onClick={() => setShowControls(false)}
              className="text-white/40 text-xs mt-3 hover:text-white/60 transition-colors"
            >
              点击关闭
            </button>
          </div>
        </div>
      )}

      {/* 区域提示 */}
      <div className="absolute bottom-4 left-4">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5">
          <span className="text-green-400 text-xs">● 在线</span>
          <span className="text-white/40 text-xs ml-2">世界大厅</span>
        </div>
      </div>
    </div>
  )
}
