'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

interface AtmosphericBlanketProps {
  /** Earth radius in scene units. */
  earthScale: number;
  /** 0..1 reveal driver. */
  reveal: number;
}

/**
 * For Chicxulub-class events — a full-Earth dust haze that fades in slowly,
 * representing the global blackout from atmospheric ejecta.
 */
export function AtmosphericBlanket({ earthScale, reveal }: AtmosphericBlanketProps) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, reveal * 0.35, 0.06);
    ref.current.rotation.y += 0.002;
  });

  return (
    <mesh ref={ref} scale={earthScale * 1.04}>
      <sphereGeometry args={[1, 48, 48]} />
      <meshBasicMaterial
        color="#2a2520"
        transparent
        opacity={0}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}
