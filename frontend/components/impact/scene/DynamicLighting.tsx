'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

interface DynamicLightingProps {
  progress: number;
}

// Faz renkleri bir kez parse edilir (eskiden useFrame'de her kare
// THREE.Color.set(hexString) → gereksiz CSS renk-string ayrıştırması).
const PHASES = [
  { dir: new THREE.Color('#fff5e0'), dirI: 1.6, amb: new THREE.Color('#1a2030'), ambI: 0.18 },
  { dir: new THREE.Color('#ffa55a'), dirI: 2.6, amb: new THREE.Color('#3a1808'), ambI: 0.4 },
  { dir: new THREE.Color('#d36a40'), dirI: 1.8, amb: new THREE.Color('#2a1208'), ambI: 0.3 },
  { dir: new THREE.Color('#b88060'), dirI: 1.4, amb: new THREE.Color('#1a1410'), ambI: 0.22 },
] as const;

/**
 * Tints the directional key light from natural sunlight toward warm orange
 * during the impact + fireball window. Adds atmosphere to the scene without
 * needing volumetric shading.
 */
export function DynamicLighting({ progress }: DynamicLightingProps) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);

  useFrame(() => {
    if (!lightRef.current || !ambientRef.current) return;

    const ph =
      progress < 0.62
        ? PHASES[0]
        : progress < 0.78
          ? PHASES[1]
          : progress < 0.92
            ? PHASES[2]
            : PHASES[3];

    lightRef.current.color.lerp(ph.dir, 0.05);
    lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, ph.dirI, 0.05);
    ambientRef.current.color.lerp(ph.amb, 0.05);
    ambientRef.current.intensity = THREE.MathUtils.lerp(
      ambientRef.current.intensity,
      ph.ambI,
      0.05,
    );
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.18} color="#1a2030" />
      <directionalLight ref={lightRef} position={[6, 4, 8]} intensity={1.6} color="#fff5e0" />
    </>
  );
}
