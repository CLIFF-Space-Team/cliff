'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

interface MoonProps {
  parentPosition: [number, number, number];
  orbitRadius?: number;
  scale?: number;
  speed?: number;
}

/**
 * Lightweight procedural moon. Color-only material — no texture (keeps the
 * scene under 4k textures total without sacrificing polish).
 */
export function Moon({
  parentPosition,
  orbitRadius = 3.4,
  scale = 0.45,
  speed = 0.35,
}: MoonProps) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * speed;
    ref.current.position.set(
      parentPosition[0] + Math.cos(t) * orbitRadius,
      parentPosition[1] + Math.sin(t * 0.18) * 0.2,
      parentPosition[2] + Math.sin(t) * orbitRadius,
    );
    ref.current.rotation.y += 0.005;
  });

  return (
    <mesh ref={ref} scale={scale}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="#bfb3a3" roughness={0.95} metalness={0.02} />
    </mesh>
  );
}
