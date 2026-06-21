'use client';

import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

interface PlanetProps {
  texture: string;
  position: [number, number, number];
  scale: number;
  rotationSpeed?: number;
  segments?: number;
}

/**
 * Generic textured-sphere planet primitive. Used by Mercury / Venus / Mars /
 * Jupiter directly. Saturn adds rings via a sibling mesh.
 */
export function Planet({
  texture,
  position,
  scale,
  rotationSpeed = 0.04,
  segments = 64,
}: PlanetProps) {
  const ref = useRef<THREE.Mesh>(null);
  const map = useTexture(texture);
  map.colorSpace = THREE.SRGBColorSpace;

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * rotationSpeed;
  });

  return (
    <mesh ref={ref} position={position} scale={scale}>
      <sphereGeometry args={[1, segments, segments]} />
      <meshStandardMaterial map={map} roughness={0.85} metalness={0.05} />
    </mesh>
  );
}
