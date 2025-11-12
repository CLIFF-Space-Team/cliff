'use client'
import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
interface DebrisCloudProps {
  position: THREE.Vector3
  progress: number
  intensity: number
}
export function DebrisCloud({ position, progress, intensity }: DebrisCloudProps) {
  const cloudRef = useRef<THREE.Points>(null)
  const particleCount = Math.min(500, Math.floor(intensity * 250))
  const { positions, velocities, sizes, colors } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    const colors = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      positions[i3] = position.x
      positions[i3 + 1] = position.y
      positions[i3 + 2] = position.z
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const speed = 0.3 + Math.random() * 1.5
      const upBias = 1.5
      velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed
      velocities[i3 + 1] = (Math.cos(phi) + upBias) * speed
      velocities[i3 + 2] = Math.sin(phi) * Math.sin(theta) * speed
      sizes[i] = 0.01 + Math.random() * 0.04
      const dustColor = 0.3 + Math.random() * 0.3
      colors[i3] = dustColor
      colors[i3 + 1] = dustColor * 0.8
      colors[i3 + 2] = dustColor * 0.6
    }
    return { positions, velocities, sizes, colors }
  }, [particleCount, position])
  useFrame((state, delta) => {
    if (!cloudRef.current) return
    if (progress < 0.15 || progress > 0.9) {
      cloudRef.current.visible = false
      return
    }
    cloudRef.current.visible = true
    const localProgress = (progress - 0.15) / 0.75
    const positionsAttr = cloudRef.current.geometry.attributes.position
    const sizesAttr = cloudRef.current.geometry.attributes.size
    const gravity = -9.8
    const airDrag = 0.5
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      const time = localProgress * 10
      const dragFactor = Math.exp(-airDrag * time)
      const vx = velocities[i3] * dragFactor
      const vy = velocities[i3 + 1] * dragFactor + gravity * time
      const vz = velocities[i3 + 2] * dragFactor
      positionsAttr.array[i3] = positions[i3] + vx * time
      positionsAttr.array[i3 + 1] = positions[i3 + 1] + vy * time + 0.5 * gravity * time * time
      positionsAttr.array[i3 + 2] = positions[i3 + 2] + vz * time
      sizesAttr.array[i] = sizes[i] * (1 + localProgress * 3)
    }
    positionsAttr.needsUpdate = true
    sizesAttr.needsUpdate = true
    const material = cloudRef.current.material as THREE.PointsMaterial
    material.opacity = 0.7 * (1 - localProgress * 0.6)
  })
  return (
    <points ref={cloudRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleCount}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        vertexColors
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  )
}
