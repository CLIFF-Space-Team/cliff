'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

interface ImpactLightProps {
  impactPoint: [number, number, number];
  progress: number;
}

/**
 * Bright PointLight at the impact site that flashes on at the impact moment
 * (~0.62) and fades over the fireball window (~0.85).
 */
export function ImpactLight({ impactPoint, progress }: ImpactLightProps) {
  const ref = useRef<THREE.PointLight>(null);

  useFrame(() => {
    if (!ref.current) return;
    if (progress < 0.62 || progress > 0.95) {
      ref.current.intensity = 0;
      return;
    }
    const local = (progress - 0.62) / 0.33;
    // Sharp peak then exponential decay
    const peak = local < 0.08 ? local / 0.08 : Math.exp(-(local - 0.08) * 3);
    ref.current.intensity = peak * 18;
  });

  return (
    <pointLight
      ref={ref}
      position={impactPoint}
      color="#ffd098"
      intensity={0}
      distance={6}
      decay={2}
    />
  );
}
