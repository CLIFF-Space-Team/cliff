import React from 'react'
import * as THREE from 'three'
export const Sun: React.FC = () => {
  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial emissive="#ffd700" emissiveIntensity={2} />
    </mesh>
  )
}
export default Sun;