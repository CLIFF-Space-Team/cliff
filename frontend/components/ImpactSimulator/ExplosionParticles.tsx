'use client'
import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
interface ExplosionParticlesProps {
  position: THREE.Vector3
  progress: number
  intensity: number
}
export function ExplosionParticles({ position, progress, intensity }: ExplosionParticlesProps) {
  const particlesRef = useRef<THREE.Points>(null)
  const particleCount = Math.min(300, Math.floor(intensity * 150))
  const { positions, velocities, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      positions[i3] = position.x + (Math.random() - 0.5) * 0.1
      positions[i3 + 1] = position.y + (Math.random() - 0.5) * 0.1
      positions[i3 + 2] = position.z + (Math.random() - 0.5) * 0.1
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const speed = 0.5 + Math.random() * 2
      velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed
      velocities[i3 + 1] = Math.sin(phi) * Math.sin(theta) * speed
      velocities[i3 + 2] = Math.cos(phi) * speed
      const heat = Math.random()
      colors[i3] = 1.0
      colors[i3 + 1] = 0.5 + heat * 0.5
      colors[i3 + 2] = heat * 0.3
      sizes[i] = 0.02 + Math.random() * 0.05
    }
    return { positions, velocities, colors, sizes }
  }, [particleCount, position])
  useFrame(() => {
    if (!particlesRef.current || progress <= 0 || progress >= 1) {
      if (particlesRef.current) particlesRef.current.visible = false
      return
    }
    particlesRef.current.visible = true
    const positionsAttr = particlesRef.current.geometry.attributes.position
    const colorsAttr = particlesRef.current.geometry.attributes.color
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      positionsAttr.array[i3] = positions[i3] + velocities[i3] * progress
      positionsAttr.array[i3 + 1] = positions[i3 + 1] + velocities[i3 + 1] * progress
      positionsAttr.array[i3 + 2] = positions[i3 + 2] + velocities[i3 + 2] * progress
      const fade = 1 - progress
      colorsAttr.array[i3] = colors[i3] * fade
      colorsAttr.array[i3 + 1] = colors[i3 + 1] * fade
      colorsAttr.array[i3 + 2] = colors[i3 + 2] * fade
    }
    positionsAttr.needsUpdate = true
    colorsAttr.needsUpdate = true
  })
  return (
    <points ref={particlesRef}>
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
        size={0.05}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  )
}
