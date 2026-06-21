'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface StarFieldProps {
  count?: number;
  radius?: number;
}

/**
 * 30k point-sprite star background. White with subtle stellar-temperature tints
 * — never blue or warm enough to break the pure-black aesthetic.
 */
export function StarField({ count = 30_000, radius = 800 }: StarFieldProps) {
  const ref = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const tmpColor = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (0.6 + Math.random() * 0.4);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      // Subtle stellar palette (mostly white, slight warm/cool drift)
      const t = Math.random();
      if (t < 0.7) tmpColor.setRGB(1, 1, 1);
      else if (t < 0.88) tmpColor.setRGB(0.9, 0.92, 1.0);
      else tmpColor.setRGB(1.0, 0.94, 0.86);
      col[i * 3] = tmpColor.r;
      col[i * 3 + 1] = tmpColor.g;
      col[i * 3 + 2] = tmpColor.b;
    }
    return { positions: pos, colors: col };
  }, [count, radius]);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.0015;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1.6}
        sizeAttenuation={false}
        vertexColors
        transparent
        opacity={0.95}
        depthWrite={false}
      />
    </points>
  );
}
