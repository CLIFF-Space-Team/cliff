'use client'

import React, { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SimpleCelestialBody } from '@/types/astronomical-data'

interface PerformantAsteroidsProps {
  count?: number
  quality?: 'low' | 'medium' | 'high'
  nasaAsteroidsData?: SimpleCelestialBody[]
}

export const PerformantAsteroids: React.FC<PerformantAsteroidsProps> = ({
  count = 150,
  quality = 'high',
  nasaAsteroidsData = []
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  
  
  const asteroidData = useMemo(() => {
    const data = []
    const actualCount = Math.max(count, nasaAsteroidsData.length > 0 ? nasaAsteroidsData.length : 50)

    for (let i = 0; i < actualCount; i++) {
      
      const radius = 15 + Math.random() * 25 
      const angle = (i / actualCount) * Math.PI * 2 + (Math.random() * 0.5)
      
      
      const heightDev = (Math.random() - 0.5) * 2.0

      
      let scale = 0.4 + Math.random() * 0.6 
      
      
      if (nasaAsteroidsData[i]) {
        const radiusKm = nasaAsteroidsData[i].info.radius_km || 1
        
        scale = Math.max(0.3, Math.min(2.0, radiusKm * 0.5))
      }

      data.push({
        initialRadius: radius,
        initialAngle: angle,
        height: heightDev,
        scale: scale,
        
        orbitSpeed: (0.05 / radius) * (0.5 + Math.random() * 0.5) * 0.2, 
        
        rotationAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
        rotationSpeed: (Math.random() - 0.5) * 0.02
      })
    }
    return data
  }, [count, nasaAsteroidsData])

  
  const { geometry, material } = useMemo(() => {
    
    const geo = new THREE.IcosahedronGeometry(1, 1)
    
    
    const mat = new THREE.MeshStandardMaterial({
      color: '#8B7355',
      roughness: 0.8,
      metalness: 0.2,
      flatShading: true 
    })

    return { geometry: geo, material: mat }
  }, [])

  
  useFrame((state, delta) => {
    if (!meshRef.current) return

    const time = state.clock.getElapsedTime()
    const dummy = new THREE.Object3D()

    asteroidData.forEach((data, i) => {
      
      
      const currentAngle = data.initialAngle + (time * data.orbitSpeed)

      const x = Math.cos(currentAngle) * data.initialRadius
      const z = Math.sin(currentAngle) * data.initialRadius
      
      dummy.position.set(x, data.height, z)
      
      
      dummy.rotation.set(
        time * data.rotationSpeed * data.rotationAxis.x,
        time * data.rotationSpeed * data.rotationAxis.y,
        time * data.rotationSpeed * data.rotationAxis.z
      )

      dummy.scale.setScalar(data.scale)
      dummy.updateMatrix()

      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, asteroidData.length]}
      castShadow
      receiveShadow
    />
  )
}

export default PerformantAsteroids
