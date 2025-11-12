'use client'
import React, { useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { ShaderUtils } from '../shaders/PlanetaryShaders'
interface EnhancedSaturnProps {
  position?: [number, number, number]
  scale?: number
  quality?: 'low' | 'medium' | 'high' | 'ultra'
  showRings?: boolean
  enableRotation?: boolean
  sunPosition?: THREE.Vector3
  nasaTexture?: string
}
function SaturnRings({
  planetScale,
  quality,
  sunPosition = new THREE.Vector3(-20, 0, 0)
}: {
  planetScale: number
  quality: string
  sunPosition?: THREE.Vector3
}) {
  const ringsRef = useRef<THREE.Mesh>(null)
  const ringTexture = React.useMemo(() => {
    const canvas = document.createElement('canvas')
    const size = quality === 'ultra' ? 1024 : quality === 'high' ? 512 : 256
    canvas.width = size
    canvas.height = 1
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, size, 0)
    gradient.addColorStop(0, 'transparent')
    gradient.addColorStop(0.3, '#b8a885')
    gradient.addColorStop(0.35, '#6b5d4f')
    gradient.addColorStop(0.4, '#8f7f6a')
    gradient.addColorStop(0.5, '#c4b5a0')
    gradient.addColorStop(0.55, '#7a6e5d')
    gradient.addColorStop(0.65, '#a09586')
    gradient.addColorStop(0.75, '#4a3f35')
    gradient.addColorStop(0.85, '#8b7d6f')
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, 1)
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    return texture
  }, [quality])
  const ringMaterial = React.useMemo(() => {
    return ShaderUtils.createRingMaterial(ringTexture, sunPosition)
  }, [ringTexture, sunPosition])
  return (
    <mesh 
      ref={ringsRef}
      rotation={[Math.PI / 2 + 0.4, 0, 0]} // Tilt rings
    >
      <ringGeometry 
        args={[
          planetScale * 1.5,  // Inner radius
          planetScale * 2.5,  // Outer radius
          quality === 'ultra' ? 128 : quality === 'high' ? 64 : 32
        ]} 
      />
      <primitive object={ringMaterial} attach="material" />
    </mesh>
  )
}
export function EnhancedSaturn({
  position = [30, 0, 0],
  scale = 2.4,
  quality = 'high',
  showRings = true,
  enableRotation = true,
  sunPosition = new THREE.Vector3(-20, 0, 0),
  nasaTexture = '/textures/nasa/saturn/saturn_cassini_2k.jpg'
}: EnhancedSaturnProps) {
  const saturnRef = useRef<THREE.Mesh>(null)
  const saturnTexture = useLoader(THREE.TextureLoader, nasaTexture)
  useFrame((state, delta) => {
    if (enableRotation && saturnRef.current) {
      saturnRef.current.rotation.y += delta * 0.12
    }
  })
  return (
    <group position={position}>
      {}
      <mesh ref={saturnRef}>
        <sphereGeometry args={[scale, 64, 64]} />
        <meshStandardMaterial
          map={saturnTexture}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
      {}
      {showRings && (
        <SaturnRings 
          planetScale={scale}
          quality={quality}
          sunPosition={sunPosition}
        />
      )}
      {}
      {quality !== 'low' && (
        <mesh scale={1.03}>
          <sphereGeometry args={[scale, 32, 32]} />
          <meshBasicMaterial
            color="#e6d8b8"
            transparent
            opacity={0.08}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  )
}
export default EnhancedSaturn