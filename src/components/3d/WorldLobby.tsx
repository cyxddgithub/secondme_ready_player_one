'use client'

import { useMemo } from 'react'
import * as THREE from 'three'

// 乐高地板块
function LegoFloorTile({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh receiveShadow>
        <boxGeometry args={[2, 0.2, 2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* 乐高凸起圆钉 - 2x2 排列 */}
      {[[-0.4, 0, -0.4], [-0.4, 0, 0.4], [0.4, 0, -0.4], [0.4, 0, 0.4]].map((pos, i) => (
        <mesh key={i} position={[pos[0], 0.15, pos[2]]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.1, 12]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </group>
  )
}

// 乐高树
function LegoTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* 树干 */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 1.2, 8]} />
        <meshStandardMaterial color="#8B5A2B" />
      </mesh>
      {/* 树冠 - 三层 */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <coneGeometry args={[0.8, 1.0, 8]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
      <mesh position={[0, 2.1, 0]} castShadow>
        <coneGeometry args={[0.6, 0.8, 8]} />
        <meshStandardMaterial color="#2E8B57" />
      </mesh>
      <mesh position={[0, 2.6, 0]} castShadow>
        <coneGeometry args={[0.4, 0.6, 8]} />
        <meshStandardMaterial color="#32CD32" />
      </mesh>
    </group>
  )
}

// 乐高建筑方块
function LegoBuilding({
  position,
  size,
  color,
  roofColor,
  label,
}: {
  position: [number, number, number]
  size: [number, number, number]
  color: string
  roofColor: string
  label: string
}) {
  const [w, h, d] = size
  return (
    <group position={position}>
      {/* 建筑主体 */}
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* 乐高凸起圆钉 - 屋顶 */}
      {Array.from({ length: Math.floor(w) }).map((_, xi) =>
        Array.from({ length: Math.floor(d) }).map((_, zi) => (
          <mesh
            key={`${xi}-${zi}`}
            position={[
              -w / 2 + 0.5 + xi * 1,
              h + 0.08,
              -d / 2 + 0.5 + zi * 1,
            ]}
            castShadow
          >
            <cylinderGeometry args={[0.18, 0.18, 0.16, 12]} />
            <meshStandardMaterial color={roofColor} />
          </mesh>
        ))
      )}
      {/* 窗户 */}
      {[[-w / 4, h / 2, d / 2 + 0.01], [w / 4, h / 2, d / 2 + 0.01]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <boxGeometry args={[w / 5, h / 4, 0.05]} />
          <meshStandardMaterial color="#87CEEB" />
        </mesh>
      ))}
      {/* 门 */}
      <mesh position={[0, 0.5, d / 2 + 0.01]}>
        <boxGeometry args={[w / 4, 1, 0.05]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
    </group>
  )
}

// 乐高路灯
function LegoLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* 灯柱 */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 2.4, 8]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* 灯头 */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#FFE4B5" emissive="#FFD700" emissiveIntensity={0.5} />
      </mesh>
      {/* 点光源 */}
      <pointLight position={[0, 2.5, 0]} color="#FFD700" intensity={3} distance={8} />
    </group>
  )
}

// 中央喷泉
function LegoFountain({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* 底座 */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[2, 2.2, 0.3, 16]} />
        <meshStandardMaterial color="#CCCCCC" />
      </mesh>
      {/* 水池外壁 */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[1.8, 1.8, 0.4, 16]} />
        <meshStandardMaterial color="#B0B0B0" />
      </mesh>
      {/* 水面 */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[1.6, 1.6, 0.1, 16]} />
        <meshStandardMaterial color="#4FC3F7" transparent opacity={0.7} />
      </mesh>
      {/* 中央柱子 */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 1.8, 8]} />
        <meshStandardMaterial color="#E0E0E0" />
      </mesh>
      {/* 顶部装饰 */}
      <mesh position={[0, 2.2, 0]} castShadow>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}

// NPC 角色（站在固定位置的乐高人）
function NPCCharacter({
  position,
  color,
  label,
}: {
  position: [number, number, number]
  color: string
  label: string
}) {
  return (
    <group position={position}>
      {/* 简化版乐高人 */}
      {/* 头 */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.24, 0.3, 12]} />
        <meshStandardMaterial color="#FFCC00" />
      </mesh>
      {/* 头顶圆钉 */}
      <mesh position={[0, 1.75, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.08, 8]} />
        <meshStandardMaterial color="#FFCC00" />
      </mesh>
      {/* 眼睛 */}
      <mesh position={[-0.08, 1.53, 0.23]}>
        <sphereGeometry args={[0.03, 6, 6]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      <mesh position={[0.08, 1.53, 0.23]}>
        <sphereGeometry args={[0.03, 6, 6]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      {/* 身体 */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[0.55, 0.5, 0.3]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* 手臂 */}
      <mesh position={[-0.38, 1.0, 0]} castShadow>
        <boxGeometry args={[0.15, 0.35, 0.18]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.38, 1.0, 0]} castShadow>
        <boxGeometry args={[0.15, 0.35, 0.18]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* 腿 */}
      <mesh position={[-0.12, 0.45, 0]} castShadow>
        <boxGeometry args={[0.22, 0.4, 0.25]} />
        <meshStandardMaterial color="#2C3E50" />
      </mesh>
      <mesh position={[0.12, 0.45, 0]} castShadow>
        <boxGeometry args={[0.22, 0.4, 0.25]} />
        <meshStandardMaterial color="#2C3E50" />
      </mesh>
    </group>
  )
}

// 围墙/栅栏
function LegoBorder() {
  const posts: [number, number, number][] = []
  const halfSize = 24
  for (let i = -halfSize; i <= halfSize; i += 3) {
    posts.push([i, 0, -halfSize])
    posts.push([i, 0, halfSize])
    posts.push([-halfSize, 0, i])
    posts.push([halfSize, 0, i])
  }
  return (
    <group>
      {posts.map((pos, i) => (
        <mesh key={i} position={[pos[0], 0.5, pos[2]]} castShadow>
          <boxGeometry args={[0.2, 1, 0.2]} />
          <meshStandardMaterial color="#E67E22" />
        </mesh>
      ))}
    </group>
  )
}

export default function WorldLobby() {
  // 生成棋盘格地板
  const floorTiles = useMemo(() => {
    const tiles: { pos: [number, number, number]; color: string }[] = []
    for (let x = -12; x <= 12; x += 2) {
      for (let z = -12; z <= 12; z += 2) {
        const isEven = ((x + z) / 2) % 2 === 0
        tiles.push({
          pos: [x, -0.1, z],
          color: isEven ? '#A8D5A2' : '#8CC084',
        })
      }
    }
    return tiles
  }, [])

  return (
    <group>
      {/* === 地板 === */}
      {floorTiles.map((tile, i) => (
        <LegoFloorTile key={i} position={tile.pos} color={tile.color} />
      ))}

      {/* === 中央喷泉 === */}
      <LegoFountain position={[0, 0, 0]} />

      {/* === 建筑 === */}
      {/* 竞技场 */}
      <LegoBuilding
        position={[-10, 0, -10]}
        size={[5, 4, 5]}
        color="#E74C3C"
        roofColor="#C0392B"
        label="竞技场"
      />
      {/* 任务大厅 */}
      <LegoBuilding
        position={[10, 0, -10]}
        size={[5, 3, 4]}
        color="#3498DB"
        roofColor="#2980B9"
        label="任务大厅"
      />
      {/* 市场 */}
      <LegoBuilding
        position={[10, 0, 10]}
        size={[6, 3, 4]}
        color="#F39C12"
        roofColor="#E67E22"
        label="市场"
      />
      {/* 社交广场建筑 */}
      <LegoBuilding
        position={[-10, 0, 10]}
        size={[4, 3, 5]}
        color="#9B59B6"
        roofColor="#8E44AD"
        label="社交广场"
      />
      {/* 时间金库 */}
      <LegoBuilding
        position={[0, 0, -14]}
        size={[4, 5, 4]}
        color="#1A1A2E"
        roofColor="#FFD700"
        label="时间金库"
      />

      {/* === 树木 === */}
      <LegoTree position={[-5, 0, 5]} />
      <LegoTree position={[5, 0, 5]} />
      <LegoTree position={[-5, 0, -5]} />
      <LegoTree position={[5, 0, -5]} />
      <LegoTree position={[-8, 0, 0]} />
      <LegoTree position={[8, 0, 0]} />
      <LegoTree position={[0, 0, 8]} />
      <LegoTree position={[-15, 0, 5]} />
      <LegoTree position={[15, 0, -5]} />
      <LegoTree position={[-3, 0, 15]} />
      <LegoTree position={[6, 0, -16]} />

      {/* === 路灯 === */}
      <LegoLamp position={[-4, 0, 0]} />
      <LegoLamp position={[4, 0, 0]} />
      <LegoLamp position={[0, 0, 4]} />
      <LegoLamp position={[0, 0, -4]} />
      <LegoLamp position={[-8, 0, -8]} />
      <LegoLamp position={[8, 0, 8]} />

      {/* === NPC 角色 === */}
      <NPCCharacter position={[-10, 0.25, -7]} color="#E74C3C" label="竞技场守卫" />
      <NPCCharacter position={[10, 0.25, -7]} color="#3498DB" label="任务发布员" />
      <NPCCharacter position={[10, 0.25, 7]} color="#F39C12" label="市场商人" />
      <NPCCharacter position={[-10, 0.25, 7]} color="#9B59B6" label="社交达人" />
      <NPCCharacter position={[3, 0.25, 1]} color="#27AE60" label="新手引导" />

      {/* === 围墙 === */}
      <LegoBorder />

      {/* === 装饰方块散落 === */}
      {[
        { pos: [-6, 0.2, 12] as [number, number, number], color: '#E74C3C' },
        { pos: [7, 0.2, 13] as [number, number, number], color: '#3498DB' },
        { pos: [-14, 0.2, -3] as [number, number, number], color: '#F39C12' },
        { pos: [14, 0.2, 3] as [number, number, number], color: '#2ECC71' },
        { pos: [12, 0.2, -14] as [number, number, number], color: '#9B59B6' },
      ].map((block, i) => (
        <mesh key={i} position={block.pos} castShadow>
          <boxGeometry args={[0.8, 0.4, 0.8]} />
          <meshStandardMaterial color={block.color} />
        </mesh>
      ))}
    </group>
  )
}
