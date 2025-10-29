'use client'

import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface MoonProps {
  earthPosition: THREE.Vector3;
  scale?: number;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
}

export const Moon = React.memo(({ earthPosition, scale = 0.27, quality = 'high' }: MoonProps) => {
  const moonRef = useRef<THREE.Mesh>(null)
  const orbitRadius = 4; // Distance from Earth
  const orbitSpeed = 0.5; // Slower orbit around Earth

  useFrame(({ clock }) => {
    if (moonRef.current) {
      const angle = clock.getElapsedTime() * orbitSpeed;
      const x = earthPosition.x + Math.cos(angle) * orbitRadius;
      const z = earthPosition.z + Math.sin(angle) * orbitRadius;
      moonRef.current.position.set(x, earthPosition.y, z);
      moonRef.current.rotation.y += 0.005;
    }
  });

  return (
    <mesh ref={moonRef} scale={scale} castShadow receiveShadow>
      <sphereGeometry args={[1, quality === 'low' ? 16 : 32, quality === 'low' ? 16 : 32]} />
      <meshStandardMaterial
        color="#C0C0C0"
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  );
});

Moon.displayName = 'Moon';