'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface CosmicDustProps {
  count?: number
  quality?: 'low' | 'medium' | 'high' | 'ultra'
  radius?: number
  color?: string
}

/**
 * Cosmic Dust Particle System
 * Interplanetary dust with quality-based density
 */
export function CosmicDust({
  count = 1000,
  quality = 'high',
  radius = 50,
  color = '#ffffff'
}: CosmicDustProps) {
  const particlesRef = useRef<THREE.Points>(null)
  
  // Quality-based particle count
  const particleCount = useMemo(() => {
    const multipliers = { low: 0.2, medium: 0.4, high: 0.7, ultra: 1.0 }
    return Math.floor(count * multipliers[quality])
  }, [count, quality])
  
  // Generate particle positions
  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    
    const colorObj = new THREE.Color(color)
    
    for (let i = 0; i < particleCount; i++) {
      // Random position in sphere
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = Math.random() * radius
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
      
      // Slight color variation
      const variation = 0.9 + Math.random() * 0.1
      colors[i * 3] = colorObj.r * variation
      colors[i * 3 + 1] = colorObj.g * variation
      colors[i * 3 + 2] = colorObj.b * variation
      
      // Random sizes
      sizes[i] = 0.02 + Math.random() * 0.03
    }
    
    return { positions, colors, sizes }
  }, [particleCount, radius, color])
  
  // Subtle animation
  useFrame((state, delta) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.01
    }
  })
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <primitive object={new THREE.BufferAttribute(positions, 3)} attach="attributes-position" />
        <primitive object={new THREE.BufferAttribute(colors, 3)} attach="attributes-color" />
        <primitive object={new THREE.BufferAttribute(sizes, 1)} attach="attributes-size" />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        vertexColors
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

export default CosmicDust