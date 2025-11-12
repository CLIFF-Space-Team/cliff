'use client'
import React, { useMemo } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { createAsteroidPBRMaterial } from './AsteroidPBRMaterial'
interface DetailedAsteroidProps {
  neoId?: string
  name?: string
  hazardous?: boolean
  quality?: 'low' | 'medium' | 'high' | 'ultra'
  position?: [number, number, number]
  scale?: number
  showLabel?: boolean
}
export const DetailedAsteroid: React.FC<DetailedAsteroidProps> = ({
  neoId,
  name,
  hazardous = false,
  quality = 'high',
  position = [0, 0, 0],
  scale = 1,
  showLabel = true
}) => {
  const material = useMemo(() => createAsteroidPBRMaterial({ hazardous, quality }), [hazardous, quality])
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <icosahedronGeometry args={[scale, quality === 'ultra' ? 3 : quality === 'high' ? 2 : 1]} />
        <meshStandardMaterial attach="material" {...(material as any)} />
      </mesh>
      {showLabel && name && (
        <Html distanceFactor={10} position={[0, 1.2 * scale, 0]} style={{ pointerEvents: 'none' }}>
          <div className="px-2 py-1 rounded bg-black/70 text-white text-[10px] border border-white/10">{name}</div>
        </Html>
      )}
    </group>
  )
}
export default DetailedAsteroid
