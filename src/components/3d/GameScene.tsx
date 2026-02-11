'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Sky, Stars, Environment } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import PlayerController from './PlayerController'
import WorldLobby from './WorldLobby'

function LoadingFallback() {
  return (
    <mesh position={[0, 1, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#FFD700" />
    </mesh>
  )
}

interface GameSceneProps {
  playerColor?: string
}

export default function GameScene({ playerColor }: GameSceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 8, 12], fov: 55, near: 0.1, far: 200 }}
      style={{ width: '100%', height: '100%' }}
    >
      {/* 天空 */}
      <Sky
        distance={450000}
        sunPosition={[100, 50, 100]}
        inclination={0.5}
        azimuth={0.25}
        turbidity={8}
        rayleigh={0.5}
      />
      <Stars radius={100} depth={50} count={1000} factor={4} fade speed={1} />

      {/* 光照 */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
      />
      <hemisphereLight
        color="#87CEEB"
        groundColor="#8CC084"
        intensity={0.4}
      />

      {/* 雾 */}
      <fog attach="fog" color="#C8E6FF" near={30} far={80} />

      <Suspense fallback={<LoadingFallback />}>
        <Physics gravity={[0, -9.81, 0]}>
          {/* 地面碰撞体 */}
          <RigidBody type="fixed" position={[0, -0.2, 0]}>
            <CuboidCollider args={[50, 0.2, 50]} />
          </RigidBody>

          {/* 建筑碰撞体 */}
          {/* 竞技场 */}
          <RigidBody type="fixed" position={[-10, 2, -10]}>
            <CuboidCollider args={[2.5, 2, 2.5]} />
          </RigidBody>
          {/* 任务大厅 */}
          <RigidBody type="fixed" position={[10, 1.5, -10]}>
            <CuboidCollider args={[2.5, 1.5, 2]} />
          </RigidBody>
          {/* 市场 */}
          <RigidBody type="fixed" position={[10, 1.5, 10]}>
            <CuboidCollider args={[3, 1.5, 2]} />
          </RigidBody>
          {/* 社交广场 */}
          <RigidBody type="fixed" position={[-10, 1.5, 10]}>
            <CuboidCollider args={[2, 1.5, 2.5]} />
          </RigidBody>
          {/* 时间金库 */}
          <RigidBody type="fixed" position={[0, 2.5, -14]}>
            <CuboidCollider args={[2, 2.5, 2]} />
          </RigidBody>
          {/* 喷泉 */}
          <RigidBody type="fixed" position={[0, 0.4, 0]}>
            <CuboidCollider args={[2.2, 0.4, 2.2]} />
          </RigidBody>

          {/* 玩家角色 */}
          <PlayerController spawnPosition={[0, 2, 6]} color={playerColor} />

          {/* 场景 */}
          <WorldLobby />
        </Physics>
      </Suspense>
    </Canvas>
  )
}
