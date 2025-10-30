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

  // Daha gerçekçi asteroid geometrisi
  const asteroidGeometry = useMemo(() => {
    const detail = quality === 'ultra' ? 4 : quality === 'high' ? 3 : quality === 'medium' ? 2 : 1
    const geom = new THREE.IcosahedronGeometry(scale, detail)
    
    // Yüzeyi düzensiz yap - gerçek asteroid görünümü
    const positions = geom.getAttribute('position')
    const vertex = new THREE.Vector3()
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i)
      
      // Çok katmanlı noise ile gerçekçi yüzey
      const n1 = Math.sin(vertex.x * 4) * Math.cos(vertex.y * 3.5) * Math.sin(vertex.z * 5)
      const n2 = Math.sin(vertex.x * 12) * Math.cos(vertex.y * 10) * Math.sin(vertex.z * 15)
      const n3 = Math.sin(vertex.x * 30) * Math.cos(vertex.y * 25) * Math.sin(vertex.z * 35)
      
      const combined = (n1 * 0.5 + n2 * 0.3 + n3 * 0.2) * 0.3
      
      vertex.normalize()
      vertex.multiplyScalar(scale * (1.0 + combined))
      
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z)
    }
    
    geom.computeVertexNormals()
    return geom
  }, [scale, quality])

  return (
    <group position={position}>
      <mesh castShadow receiveShadow geometry={asteroidGeometry} material={material} />
      {showLabel && name && (
        <Html distanceFactor={10} position={[0, 1.2 * scale, 0]} style={{ pointerEvents: 'none' }}>
          <div className="px-2 py-1 rounded bg-black/70 text-white text-[10px] border border-white/10">{name}</div>
        </Html>
      )}
    </group>
  )
}

export default DetailedAsteroid


