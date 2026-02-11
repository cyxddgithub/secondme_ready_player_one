'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { setTouchMove, setTouchJump } from './inputStore'

const JOYSTICK_SIZE = 140
const KNOB_SIZE = 56
const MAX_DISTANCE = (JOYSTICK_SIZE - KNOB_SIZE) / 2

export default function TouchControls() {
  const joystickRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const activeTouchId = useRef<number | null>(null)
  const centerRef = useRef({ x: 0, y: 0 })
  const [jumpActive, setJumpActive] = useState(false)

  // 计算摇杆中心坐标
  const updateCenter = useCallback(() => {
    if (!joystickRef.current) return
    const rect = joystickRef.current.getBoundingClientRect()
    centerRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }
  }, [])

  // 更新摇杆位置和输入
  const updateKnob = useCallback((clientX: number, clientY: number) => {
    const dx = clientX - centerRef.current.x
    const dy = clientY - centerRef.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const clampedDist = Math.min(distance, MAX_DISTANCE)
    const angle = Math.atan2(dy, dx)

    const knobX = Math.cos(angle) * clampedDist
    const knobY = Math.sin(angle) * clampedDist

    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${knobX}px, ${knobY}px)`
    }

    // 归一化输入 (-1 ~ 1)
    const normalizedX = clampedDist > 5 ? (knobX / MAX_DISTANCE) : 0
    const normalizedZ = clampedDist > 5 ? (-knobY / MAX_DISTANCE) : 0 // Y 轴翻转：上=前

    setTouchMove(normalizedX, normalizedZ)
  }, [])

  const resetKnob = useCallback(() => {
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(0px, 0px)'
    }
    setTouchMove(0, 0)
    activeTouchId.current = null
  }, [])

  // === 摇杆触摸事件 ===

  const onJoystickTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (activeTouchId.current !== null) return
    const touch = e.changedTouches[0]
    activeTouchId.current = touch.identifier
    updateCenter()
    updateKnob(touch.clientX, touch.clientY)
  }, [updateCenter, updateKnob])

  const onJoystickTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (touch.identifier === activeTouchId.current) {
        updateKnob(touch.clientX, touch.clientY)
        break
      }
    }
  }, [updateKnob])

  const onJoystickTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId.current) {
        resetKnob()
        break
      }
    }
  }, [resetKnob])

  // === 跳跃按钮 ===

  const onJumpStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setJumpActive(true)
    setTouchJump(true)
    // 短按跳跃：150ms 后自动松开
    setTimeout(() => {
      setJumpActive(false)
      setTouchJump(false)
    }, 150)
  }, [])

  // 防止页面滚动
  useEffect(() => {
    const prevent = (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest?.('[data-touch-control]')) {
        e.preventDefault()
      }
    }
    document.addEventListener('touchmove', prevent, { passive: false })
    return () => document.removeEventListener('touchmove', prevent)
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none z-20" data-touch-control>
      {/* 虚拟摇杆 - 左下角 */}
      <div
        ref={joystickRef}
        className="pointer-events-auto absolute bottom-8 left-8"
        style={{ width: JOYSTICK_SIZE, height: JOYSTICK_SIZE }}
        onTouchStart={onJoystickTouchStart}
        onTouchMove={onJoystickTouchMove}
        onTouchEnd={onJoystickTouchEnd}
        onTouchCancel={onJoystickTouchEnd}
        data-touch-control
      >
        {/* 底盘 */}
        <div
          className="absolute inset-0 rounded-full border-2 border-white/20 bg-white/5 backdrop-blur-sm"
        />
        {/* 方向指示十字线 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute w-px h-[60%] bg-white/10" />
          <div className="absolute h-px w-[60%] bg-white/10" />
        </div>
        {/* 摇杆手柄 */}
        <div
          ref={knobRef}
          className="absolute rounded-full bg-white/30 border-2 border-white/50 backdrop-blur-md shadow-lg"
          style={{
            width: KNOB_SIZE,
            height: KNOB_SIZE,
            left: (JOYSTICK_SIZE - KNOB_SIZE) / 2,
            top: (JOYSTICK_SIZE - KNOB_SIZE) / 2,
            transition: activeTouchId.current !== null ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-b from-white/40 to-white/10" />
        </div>
      </div>

      {/* 跳跃按钮 - 右下角 */}
      <div
        className="pointer-events-auto absolute bottom-8 right-8"
        onTouchStart={onJumpStart}
        data-touch-control
      >
        <div
          className={`
            w-20 h-20 rounded-full flex items-center justify-center
            border-2 backdrop-blur-sm shadow-lg
            transition-all duration-100 active:scale-95
            ${jumpActive
              ? 'bg-yellow-400/40 border-yellow-400/80 scale-95'
              : 'bg-white/10 border-white/30'
            }
          `}
        >
          <div className="text-center">
            <svg
              className={`w-8 h-8 mx-auto ${jumpActive ? 'text-yellow-300' : 'text-white/70'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
            <span className={`text-xs ${jumpActive ? 'text-yellow-300' : 'text-white/50'}`}>
              跳跃
            </span>
          </div>
        </div>
      </div>

      {/* 移动端操作提示（首次显示） */}
      <MobileTip />
    </div>
  )
}

function MobileTip() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  if (!show) return null

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
      <div
        className="bg-black/70 backdrop-blur-sm rounded-2xl px-6 py-4 text-center"
        onClick={() => setShow(false)}
      >
        <p className="text-white/90 text-sm mb-2">左侧摇杆移动，右侧按钮跳跃</p>
        <p className="text-white/40 text-xs">点击任意处关闭</p>
      </div>
    </div>
  )
}
