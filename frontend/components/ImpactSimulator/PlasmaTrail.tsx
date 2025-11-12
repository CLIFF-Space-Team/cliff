'use client'
import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
interface PlasmaTrailProps {
  startPosition: THREE.Vector3
  endPosition: THREE.Vector3
  intensity: number
  color: THREE.Color
}
export function PlasmaTrail({ 
  startPosition, 
  endPosition, 
  intensity,
  color 
}: PlasmaTrailProps) {
  const trailRef = useRef<THREE.Line>(null)
  const pointsRef = useRef<THREE.Points>(null)
  const { curve, particlePositions } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      endPosition,
      endPosition.clone().lerp(startPosition, 0.5),
      startPosition
    ])
    const particleCount = 30
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount
      const point = curve.getPoint(t)
      positions[i * 3] = point.x
      positions[i * 3 + 1] = point.y
      positions[i * 3 + 2] = point.z
    }
    return { curve, particlePositions: positions }
  }, [startPosition, endPosition])
  const trailGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 20, 0.02 * intensity, 8, false)
  }, [curve, intensity])
  useFrame((state) => {
    if (pointsRef.current) {
      const mat = pointsRef.current.material as THREE.PointsMaterial
      mat.opacity = 0.6 + Math.sin(state.clock.elapsedTime * 5) * 0.2
    }
  })
  return (
    <>
      <line ref={trailRef}>
        <primitive object={trailGeometry} attach="geometry" />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.8 * intensity}
          blending={THREE.AdditiveBlending}
        />
      </line>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={30}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05 * intensity}
          color={color}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </>
  )
}
