'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CapsuleCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import LegoCharacter from './LegoCharacter'

const MOVE_SPEED = 5
const JUMP_FORCE = 5
const CAMERA_DISTANCE = 8
const CAMERA_HEIGHT = 5
const CAMERA_LERP = 0.08
const WORLD_BOUNDARY = 23

interface PlayerControllerProps {
  spawnPosition?: [number, number, number]
  color?: string
}

export default function PlayerController({
  spawnPosition = [0, 2, 6],
  color,
}: PlayerControllerProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null)
  const characterRef = useRef<THREE.Group>(null)
  const { camera } = useThree()

  const [keys, setKeys] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
  })

  const [isMoving, setIsMoving] = useState(false)
  const [isJumping, setIsJumping] = useState(false)
  const [isGrounded, setIsGrounded] = useState(true)

  // 键盘输入
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        setKeys((k) => ({ ...k, forward: true }))
        break
      case 'KeyS':
      case 'ArrowDown':
        setKeys((k) => ({ ...k, backward: true }))
        break
      case 'KeyA':
      case 'ArrowLeft':
        setKeys((k) => ({ ...k, left: true }))
        break
      case 'KeyD':
      case 'ArrowRight':
        setKeys((k) => ({ ...k, right: true }))
        break
      case 'Space':
        e.preventDefault()
        setKeys((k) => ({ ...k, jump: true }))
        break
    }
  }, [])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        setKeys((k) => ({ ...k, forward: false }))
        break
      case 'KeyS':
      case 'ArrowDown':
        setKeys((k) => ({ ...k, backward: false }))
        break
      case 'KeyA':
      case 'ArrowLeft':
        setKeys((k) => ({ ...k, left: false }))
        break
      case 'KeyD':
      case 'ArrowRight':
        setKeys((k) => ({ ...k, right: false }))
        break
      case 'Space':
        setKeys((k) => ({ ...k, jump: false }))
        break
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  // 获取相机前方方向（忽略 Y 轴）
  const getCameraForward = useCallback(() => {
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    return forward
  }, [camera])

  const getCameraRight = useCallback(() => {
    const forward = getCameraForward()
    const right = new THREE.Vector3()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()
    return right
  }, [getCameraForward])

  useFrame(() => {
    if (!rigidBodyRef.current) return

    const body = rigidBodyRef.current
    const position = body.translation()
    const velocity = body.linvel()

    // 检测是否在地面
    const grounded = Math.abs(velocity.y) < 0.1
    setIsGrounded(grounded)
    if (grounded) setIsJumping(false)

    // 计算移动方向
    const moveDirection = new THREE.Vector3(0, 0, 0)
    const forward = getCameraForward()
    const right = getCameraRight()

    if (keys.forward) moveDirection.add(forward)
    if (keys.backward) moveDirection.sub(forward)
    if (keys.left) moveDirection.sub(right)
    if (keys.right) moveDirection.add(right)

    const moving = moveDirection.length() > 0
    setIsMoving(moving)

    if (moving) {
      moveDirection.normalize()

      // 边界限制
      const nextX = position.x + moveDirection.x * 0.1
      const nextZ = position.z + moveDirection.z * 0.1

      let clampedX = moveDirection.x
      let clampedZ = moveDirection.z

      if (Math.abs(nextX) > WORLD_BOUNDARY) clampedX = 0
      if (Math.abs(nextZ) > WORLD_BOUNDARY) clampedZ = 0

      body.setLinvel(
        {
          x: clampedX * MOVE_SPEED,
          y: velocity.y,
          z: clampedZ * MOVE_SPEED,
        },
        true
      )

      // 旋转角色面向移动方向
      if (characterRef.current) {
        const angle = Math.atan2(moveDirection.x, moveDirection.z)
        characterRef.current.rotation.y = angle
      }
    } else {
      // 停止水平移动
      body.setLinvel({ x: 0, y: velocity.y, z: 0 }, true)
    }

    // 跳跃
    if (keys.jump && grounded && !isJumping) {
      body.setLinvel({ x: velocity.x, y: JUMP_FORCE, z: velocity.z }, true)
      setIsJumping(true)
    }

    // 防止掉出世界
    if (position.y < -5) {
      body.setTranslation({ x: 0, y: 3, z: 6 }, true)
      body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }

    // 第三人称相机跟随
    const targetCameraPos = new THREE.Vector3(
      position.x - forward.x * CAMERA_DISTANCE,
      position.y + CAMERA_HEIGHT,
      position.z - forward.z * CAMERA_DISTANCE
    )

    camera.position.lerp(targetCameraPos, CAMERA_LERP)
    camera.lookAt(position.x, position.y + 1.5, position.z)
  })

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={spawnPosition}
      enabledRotations={[false, false, false]}
      mass={1}
      linearDamping={0.5}
      lockRotations
    >
      <CapsuleCollider args={[0.5, 0.3]} position={[0, 0.8, 0]} />
      <group ref={characterRef}>
        <LegoCharacter isMoving={isMoving} isJumping={isJumping} color={color} />
      </group>
    </RigidBody>
  )
}
