'use client'
import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
interface EnhancedStarFieldProps {
  count?: number
  quality?: 'low' | 'medium' | 'high' | 'ultra'
  radius?: number
  enableTwinkling?: boolean
}
export function EnhancedStarField({
  count = 5000,
  quality = 'high',
  radius = 100,
  enableTwinkling = true
}: EnhancedStarFieldProps) {
  const starsRef = useRef<THREE.Points>(null)
  const starCount = useMemo(() => {
    const multipliers = { low: 0.4, medium: 0.6, high: 0.8, ultra: 1.0 }
    return Math.floor(count * multipliers[quality])
  }, [count, quality])
  const stellarColors = useMemo(() => [
    new THREE.Color(0x9bb0ff), // O - Blue
    new THREE.Color(0xaabfff), // B - Blue-white
    new THREE.Color(0xcad7ff), // A - White
    new THREE.Color(0xfbf8ff), // F - Yellow-white
    new THREE.Color(0xfff4e8), // G - Yellow (Sun-like)
    new THREE.Color(0xffd2a1), // K - Orange
    new THREE.Color(0xffcc6f), // M - Red
  ], [])
  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)
    const sizes = new Float32Array(starCount)
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = radius * (0.8 + Math.random() * 0.2) // Slight depth variation
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
      const random = Math.random()
      let stellarClass
      if (random < 0.05) stellarClass = 0      // O - Rare
      else if (random < 0.15) stellarClass = 1 // B
      else if (random < 0.30) stellarClass = 2 // A
      else if (random < 0.50) stellarClass = 3 // F
      else if (random < 0.75) stellarClass = 4 // G - Common
      else if (random < 0.90) stellarClass = 5 // K
      else stellarClass = 6                     // M - Common
      const stellarColor = stellarColors[stellarClass]
      colors[i * 3] = stellarColor.r
      colors[i * 3 + 1] = stellarColor.g
      colors[i * 3 + 2] = stellarColor.b
      const apparentMagnitude = Math.random()
      sizes[i] = 0.5 + apparentMagnitude * 2.5
    }
    return { positions, colors, sizes }
  }, [starCount, radius, stellarColors])
  useFrame((state) => {
    if (enableTwinkling && starsRef.current) {
      const time = state.clock.getElapsedTime()
      const sizes = starsRef.current.geometry.attributes.size.array as Float32Array
      for (let i = 0; i < starCount; i++) {
        const frequency = 0.5 + (i % 100) / 100
        const twinkle = 0.8 + 0.2 * Math.sin(time * frequency + i)
        const baseSizes = sizes as Float32Array
        const baseSize = 0.5 + (i % 250) / 100
        sizes[i] = baseSize * twinkle
      }
      starsRef.current.geometry.attributes.size.needsUpdate = true
    }
  })
  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <primitive object={new THREE.BufferAttribute(positions, 3)} attach="attributes-position" />
        <primitive object={new THREE.BufferAttribute(colors, 3)} attach="attributes-color" />
        <primitive object={new THREE.BufferAttribute(sizes, 1)} attach="attributes-size" />
      </bufferGeometry>
      <pointsMaterial
        size={1.0}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}
export default EnhancedStarField