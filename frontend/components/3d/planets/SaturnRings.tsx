import React, { useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'

interface SaturnRingsProps {
  radius: number
  tilt: number
}

const SaturnRings: React.FC<SaturnRingsProps> = ({ radius, tilt }) => {
  const ringTexture = useTexture('/textures/nasa/saturn/saturn_rings.png')

  const ringGeometry = useMemo(() => {
    return new THREE.RingGeometry(radius * 1.2, radius * 2.2, 64)
  }, [radius])

  const ringMaterial = useMemo(() => {
    return new THREE.MeshPhongMaterial({
      map: ringTexture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    })
  }, [ringTexture])

  return (
    <mesh
      geometry={ringGeometry}
      material={ringMaterial}
      rotation={[Math.PI / 2 + tilt, 0, 0]}
    />
  )
}

export default SaturnRings