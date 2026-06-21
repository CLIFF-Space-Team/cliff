'use client';

import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { AsteroidManifestEntry } from './types';

interface GlbAsteroidProps {
  entry: AsteroidManifestEntry;
  position: [number, number, number];
  scale: number;
  hazardous?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
}

export function GlbAsteroid({
  entry,
  position,
  scale,
  hazardous,
  selected = false,
  dimmed = false,
  onClick,
}: GlbAsteroidProps) {
  const groupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const { scene } = useGLTF(entry.modelPath);

  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.transparent = true;
          if (hazardous && mat.color) mat.color.lerp(new THREE.Color('#a36a4a'), 0.25);
        }
      }
    });
    return clone;
  }, [scene, hazardous]);

  const rotationSpeed = useMemo(() => {
    if (!entry.rotation_period_h) return 0.1;
    return (2 * Math.PI) / (entry.rotation_period_h * 60);
  }, [entry.rotation_period_h]);

  const targetScale = scale * (selected ? 1.6 : 1);
  const targetOpacity = dimmed ? 0.2 : 1;

  useFrame((_, dt) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * rotationSpeed;
      const current = groupRef.current.scale.x;
      const next = THREE.MathUtils.lerp(current, targetScale, Math.min(1, dt * 6));
      groupRef.current.scale.setScalar(next);
    }
    cloned.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material as THREE.MeshStandardMaterial;
        if (mat?.opacity !== undefined) {
          mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, Math.min(1, dt * 6));
        }
      }
    });
    if (haloRef.current) {
      const haloMat = haloRef.current.material as THREE.MeshBasicMaterial;
      const target = selected ? 0.3 : 0;
      haloMat.opacity = THREE.MathUtils.lerp(haloMat.opacity, target, Math.min(1, dt * 6));
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
    >
      <primitive object={cloned} />
      <mesh ref={haloRef} scale={1.45}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  );
}
