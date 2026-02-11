'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import GameHUD from '@/components/3d/GameHUD'

// 动态导入 3D 场景（禁用 SSR）
const GameScene = dynamic(() => import('@/components/3d/GameScene'), {
  ssr: false,
  loading: () => <LoadingScreen />,
})

function LoadingScreen() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval)
          return 95
        }
        return prev + Math.random() * 15
      })
    }, 200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center">
      <div className="text-center">
        {/* 乐高风格 Loading 动画 */}
        <div className="flex gap-2 mb-8 justify-center">
          {['#E74C3C', '#F39C12', '#2ECC71', '#3498DB', '#9B59B6'].map(
            (color, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-sm"
                style={{
                  backgroundColor: color,
                  animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            )
          )}
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">头号玩家</h2>
        <p className="text-gray-400 mb-6">正在构建世界...</p>
        {/* 进度条 */}
        <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="text-gray-500 text-sm mt-2">{Math.floor(progress)}%</p>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-16px); }
        }
      `}</style>
    </div>
  )
}

export default function LobbyPage() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // 短暂延迟确保 loading 界面显示
    const timer = setTimeout(() => setIsReady(true), 500)
    return () => clearTimeout(timer)
  }, [])

  const handleBack = () => {
    window.location.href = '/dashboard'
  }

  return (
    <div className="w-full h-screen overflow-hidden bg-black relative">
      {/* 3D 场景 */}
      <GameScene playerColor="#E74C3C" />

      {/* HUD 覆盖层 */}
      <GameHUD tokenBalance={1000} nickname="玩家" onBack={handleBack} />
    </div>
  )
}
