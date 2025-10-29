'use client'

import React, { useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'

interface EnhancedMarsProps {
  position?: [number, number, number]
  scale?: number
  quality?: 'low' | 'medium' | 'high' | 'ultra'
  showAtmosphere?: boolean
  enableRotation?: boolean
}

/**
 * Enhanced Mars Component
 * Realistic Mars rendering with atmosphere
 */
export function EnhancedMars({
  position = [8, 0, -5],
  scale = 1.0,
  quality = 'high',
  showAtmosphere = true,
  enableRotation = true
}: EnhancedMarsProps) {
  const marsRef = useRef<THREE.Mesh>(null)
  const atmosphereRef = useRef<THREE.Mesh>(null)
  
  // Load Mars texture with correct path
  const marsTexture = useLoader(
    THREE.TextureLoader, 
    '/textures/nasa/mars/mars_mro_2k.jpg'
  )
  
  // Animation
  useFrame((state, delta) => {
    if (enableRotation && marsRef.current) {
      marsRef.current.rotation.y += delta * 0.08
    }
  })
  
  return (
    <group position={position}>
      {/* Mars Core */}
      <mesh ref={marsRef} castShadow receiveShadow>
        <sphereGeometry args={[scale, quality === 'low' ? 32 : 64, quality === 'low' ? 32 : 64]} />
        <meshStandardMaterial
          map={marsTexture}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      
      {/* Thin Martian Atmosphere */}
      {showAtmosphere && quality !== 'low' && (
        <mesh ref={atmosphereRef} scale={1.02}>
          <sphereGeometry args={[scale, 32, 32]} />
          <meshBasicMaterial
            color="#FF6B35"
            transparent
            opacity={0.08}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  )
}

export default EnhancedMars