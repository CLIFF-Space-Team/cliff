'use client'

import React, { useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { ShaderUtils } from '../shaders/PlanetaryShaders'

interface EnhancedJupiterProps {
  position?: [number, number, number]
  scale?: number
  quality?: 'low' | 'medium' | 'high' | 'ultra'
  enableAnimation?: boolean
  enableRotation?: boolean
  nasaTexture?: string
}

/**
 * Enhanced Jupiter Component
 * Gas giant with NASA Juno texture and animated bands
 */
export function EnhancedJupiter({
  position = [20, 0, 0],
  scale = 2.8,
  quality = 'high',
  enableAnimation = true,
  enableRotation = true,
  nasaTexture = '/textures/nasa/jupiter/jupiter_juno_2k.jpg'
}: EnhancedJupiterProps) {
  const jupiterRef = useRef<THREE.Mesh>(null)
  const cloudLayerRef = useRef<THREE.Mesh>(null)
  
  // Load NASA Juno texture
  const jupiterTexture = useLoader(THREE.TextureLoader, nasaTexture)
  
  // Create gas giant material with animated bands
  const jupiterMaterial = React.useMemo(() => {
    if (!enableAnimation || quality === 'low') {
      return new THREE.MeshStandardMaterial({
        map: jupiterTexture,
        roughness: 0.6,
        metalness: 0.1,
      })
    }
    
    return ShaderUtils.createGasGiantMaterial(jupiterTexture)
  }, [jupiterTexture, enableAnimation, quality])
  
  // Animation
  useFrame((state, delta) => {
    if (enableRotation && jupiterRef.current) {
      // Jupiter rotates very fast (fastest in solar system)
      jupiterRef.current.rotation.y += delta * 0.15
    }
    
    // Update animated bands
    if (enableAnimation && jupiterMaterial instanceof THREE.ShaderMaterial) {
      if (jupiterMaterial.uniforms.time) {
        jupiterMaterial.uniforms.time.value += delta
      }
    }
    
    // Slight cloud layer rotation
    if (cloudLayerRef.current && quality !== 'low') {
      cloudLayerRef.current.rotation.y += delta * 0.12
    }
  })
  
  return (
    <group position={position}>
      {/* Jupiter Core with NASA Juno Texture */}
      <mesh ref={jupiterRef}>
        <sphereGeometry args={[scale, 64, 64]} />
        <primitive object={jupiterMaterial} attach="material" />
      </mesh>
      
      {/* Atmospheric haze/glow */}
      {quality !== 'low' && (
        <mesh scale={1.02}>
          <sphereGeometry args={[scale, 32, 32]} />
          <meshBasicMaterial
            color="#d4a574"
            transparent
            opacity={0.1}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
      
      {/* Great Red Spot highlight (high quality only) */}
      {(quality === 'high' || quality === 'ultra') && (
        <mesh ref={cloudLayerRef} scale={1.005}>
          <sphereGeometry args={[scale, 64, 64]} />
          <meshBasicMaterial
            color="#c87137"
            transparent
            opacity={0.15}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}

export default EnhancedJupiter