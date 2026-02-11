'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface LegoCharacterProps {
  color?: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  isMoving?: boolean
  isJumping?: boolean
  nickname?: string
}

// 乐高人物各部分的颜色配置
interface LegoColors {
  skin: string
  shirt: string
  pants: string
  shoes: string
  hair: string
}

const DEFAULT_COLORS: LegoColors = {
  skin: '#FFCC00',     // 乐高经典黄色皮肤
  shirt: '#E74C3C',    // 红色上衣
  pants: '#2980B9',    // 蓝色裤子
  shoes: '#2C3E50',    // 深色鞋
  hair: '#8B4513',     // 棕色头发
}

// 创建圆角方块几何体（乐高风格的关键）
function createRoundedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number = 0.02
) {
  // 用 BoxGeometry 近似，后续可升级为真正的圆角
  return new THREE.BoxGeometry(width, height, depth)
}

export default function LegoCharacter({
  color,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isMoving = false,
  isJumping = false,
  nickname,
}: LegoCharacterProps) {
  const groupRef = useRef<THREE.Group>(null)
  const leftArmRef = useRef<THREE.Group>(null)
  const rightArmRef = useRef<THREE.Group>(null)
  const leftLegRef = useRef<THREE.Group>(null)
  const rightLegRef = useRef<THREE.Group>(null)

  const colors = useMemo(() => {
    if (color) {
      return { ...DEFAULT_COLORS, shirt: color }
    }
    return DEFAULT_COLORS
  }, [color])

  // 走路和跳跃动画
  useFrame((state) => {
    const time = state.clock.elapsedTime

    if (isMoving) {
      // 手臂摆动
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = Math.sin(time * 8) * 0.6
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = -Math.sin(time * 8) * 0.6
      }
      // 腿部摆动
      if (leftLegRef.current) {
        leftLegRef.current.rotation.x = -Math.sin(time * 8) * 0.5
      }
      if (rightLegRef.current) {
        rightLegRef.current.rotation.x = Math.sin(time * 8) * 0.5
      }
    } else {
      // 待机微动
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = Math.sin(time * 1.5) * 0.05
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = -Math.sin(time * 1.5) * 0.05
      }
      if (leftLegRef.current) {
        leftLegRef.current.rotation.x = 0
      }
      if (rightLegRef.current) {
        rightLegRef.current.rotation.x = 0
      }
    }
  })

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* === 头部 === */}
      <group position={[0, 1.55, 0]}>
        {/* 头（圆柱体 - 乐高经典头型） */}
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.3, 0.38, 16]} />
          <meshStandardMaterial color={colors.skin} />
        </mesh>
        {/* 头顶凸起（乐高标志性圆钉） */}
        <mesh position={[0, 0.24, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.1, 16]} />
          <meshStandardMaterial color={colors.skin} />
        </mesh>
        {/* 头发 */}
        <mesh position={[0, 0.15, -0.05]} castShadow>
          <boxGeometry args={[0.58, 0.22, 0.55]} />
          <meshStandardMaterial color={colors.hair} />
        </mesh>
        {/* 头发前刘海 */}
        <mesh position={[0, 0.1, 0.2]} castShadow>
          <boxGeometry args={[0.5, 0.1, 0.12]} />
          <meshStandardMaterial color={colors.hair} />
        </mesh>
        {/* 眼睛 - 左 */}
        <mesh position={[-0.1, -0.02, 0.3]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        {/* 眼睛 - 右 */}
        <mesh position={[0.1, -0.02, 0.3]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        {/* 嘴巴（微笑弧线 - 用一个扁平方块近似） */}
        <mesh position={[0, -0.12, 0.3]}>
          <boxGeometry args={[0.15, 0.025, 0.02]} />
          <meshStandardMaterial color="#CC0000" />
        </mesh>
      </group>

      {/* === 身体 === */}
      <group position={[0, 1.0, 0]}>
        {/* 躯干 */}
        <mesh castShadow>
          <boxGeometry args={[0.65, 0.55, 0.35]} />
          <meshStandardMaterial color={colors.shirt} />
        </mesh>
        {/* 领口 */}
        <mesh position={[0, 0.25, 0.05]}>
          <boxGeometry args={[0.25, 0.08, 0.25]} />
          <meshStandardMaterial color={colors.shirt} />
        </mesh>
      </group>

      {/* === 左手臂 === */}
      <group ref={leftArmRef} position={[-0.45, 1.15, 0]}>
        {/* 上臂 */}
        <mesh position={[0, -0.15, 0]} castShadow>
          <boxGeometry args={[0.18, 0.35, 0.22]} />
          <meshStandardMaterial color={colors.shirt} />
        </mesh>
        {/* 手 */}
        <mesh position={[0, -0.38, 0.05]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.12, 8]} />
          <meshStandardMaterial color={colors.skin} />
        </mesh>
      </group>

      {/* === 右手臂 === */}
      <group ref={rightArmRef} position={[0.45, 1.15, 0]}>
        {/* 上臂 */}
        <mesh position={[0, -0.15, 0]} castShadow>
          <boxGeometry args={[0.18, 0.35, 0.22]} />
          <meshStandardMaterial color={colors.shirt} />
        </mesh>
        {/* 手 */}
        <mesh position={[0, -0.38, 0.05]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.12, 8]} />
          <meshStandardMaterial color={colors.skin} />
        </mesh>
      </group>

      {/* === 腰带 === */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.65, 0.06, 0.36]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* === 左腿 === */}
      <group ref={leftLegRef} position={[-0.15, 0.5, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.28, 0.45, 0.3]} />
          <meshStandardMaterial color={colors.pants} />
        </mesh>
        {/* 鞋 */}
        <mesh position={[0, -0.45, 0.05]} castShadow>
          <boxGeometry args={[0.28, 0.08, 0.38]} />
          <meshStandardMaterial color={colors.shoes} />
        </mesh>
      </group>

      {/* === 右腿 === */}
      <group ref={rightLegRef} position={[0.15, 0.5, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.28, 0.45, 0.3]} />
          <meshStandardMaterial color={colors.pants} />
        </mesh>
        {/* 鞋 */}
        <mesh position={[0, -0.45, 0.05]} castShadow>
          <boxGeometry args={[0.28, 0.08, 0.38]} />
          <meshStandardMaterial color={colors.shoes} />
        </mesh>
      </group>
    </group>
  )
}
