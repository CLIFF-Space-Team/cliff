'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface AsteroidBeltProps {
  count?: number;
  innerRadius?: number;
  outerRadius?: number;
  thickness?: number;
}

/**
 * Background asteroid swarm rendered as a single InstancedMesh. Pure visual
 * polish for the dashboard; no per-instance interactivity.
 */
export function AsteroidBelt({
  count = 1500,
  innerRadius = 220,
  outerRadius = 320,
  thickness = 6,
}: AsteroidBeltProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  const data = useMemo(() => {
    const items: Array<{ a: number; b: number; angle: number; speed: number; rot: THREE.Euler; size: number }> = [];
    for (let i = 0; i < count; i++) {
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
      const angle = Math.random() * Math.PI * 2;
      items.push({
        a: radius,
        b: radius * (0.95 + Math.random() * 0.1),
        angle,
        speed: 0.02 + Math.random() * 0.05,
        rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
        size: 0.6 + Math.random() * 1.2,
      });
    }
    return items;
  }, [count, innerRadius, outerRadius]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (!item) continue;
      const a = item.angle + item.speed * t * 0.05;
      dummy.position.set(
        Math.cos(a) * item.a,
        (Math.sin(item.angle * 7 + t * 0.04) - 0.5) * thickness,
        Math.sin(a) * item.b,
      );
      dummy.rotation.copy(item.rot);
      dummy.scale.setScalar(item.size);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#3a342c" roughness={0.94} metalness={0.04} />
    </instancedMesh>
  );
}
