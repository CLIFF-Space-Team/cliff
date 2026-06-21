'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface GlassShatterProps {
  impactPoint: [number, number, number];
  /** 0..1 cursor; 0 = no flash, 1 = full crack pattern visible. */
  reveal: number;
}

/**
 * Chelyabinsk-style: a brief white pulse on the surface mimicking the
 * blinding flash, then a hairline radial crack pattern (broken windows).
 */
export function GlassShatter({ impactPoint, reveal }: GlassShatterProps) {
  const flashRef = useRef<THREE.Mesh>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  const orientation = useMemo(() => {
    const normal = new THREE.Vector3(...impactPoint).normalize();
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    return quat;
  }, [impactPoint]);

  const lineGeometry = useMemo(() => {
    const COUNT = 36;
    const pos: number[] = [];
    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2 + (i % 2 ? 0.15 : 0);
      const r1 = 0.05;
      const r2 = 0.4 + (i % 3) * 0.08;
      pos.push(
        Math.cos(angle) * r1, Math.sin(angle) * r1, 0,
        Math.cos(angle) * r2, Math.sin(angle) * r2, 0,
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return geo;
  }, []);

  useFrame(() => {
    if (flashRef.current) {
      const mat = flashRef.current.material as THREE.MeshBasicMaterial;
      // Flash: peaks at reveal=0.15, fades to 0 by reveal=0.5
      const flash = Math.max(0, 1 - Math.abs(reveal - 0.15) * 6);
      mat.opacity = flash * 0.9;
      flashRef.current.scale.setScalar(0.3 + reveal * 0.6);
    }
    if (linesRef.current) {
      const mat = linesRef.current.material as THREE.LineBasicMaterial;
      const cracks = Math.max(0, (reveal - 0.4) / 0.6);
      mat.opacity = cracks * 0.55;
    }
  });

  return (
    <group position={impactPoint} quaternion={orientation}>
      <mesh ref={flashRef}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <lineSegments ref={linesRef} geometry={lineGeometry}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0} />
      </lineSegments>
    </group>
  );
}
