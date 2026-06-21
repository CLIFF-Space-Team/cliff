'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface PersistentDustLayerProps {
  /** Earth radius in scene units. */
  earthRadius: number;
  /** Energy yield in megatons — drives final opacity. */
  energyMegatons: number;
  /** 0..1 timeline cursor. Layer fades in 0.85 → 1.00 and stays. */
  progress: number;
}

/**
 * Thin global atmospheric dust layer that fades in after the main impact
 * effects subside. Opacity scales with energy: small impacts stay barely
 * visible, mega-impacts shroud the whole planet.
 *
 * This is the "impact winter" envelope — distinct from the existing
 * `AtmosphericBlanket` (Chicxulub-only); this fires for every event
 * proportional to its yield so even a 5 MT crater leaves a visible haze.
 */
export function PersistentDustLayer({
  earthRadius,
  energyMegatons,
  progress,
}: PersistentDustLayerProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const finalOpacity = useMemo(() => {
    // 1 MT → 0.04, 100 MT → 0.16, 10 000 MT → 0.34, 1 Mt+ → cap 0.55.
    if (energyMegatons <= 0) return 0;
    const norm = Math.log10(Math.max(0.1, energyMegatons)) / 6; // 0..1 across 1..1e6 Mt
    return THREE.MathUtils.clamp(0.04 + norm * 0.5, 0, 0.55);
  }, [energyMegatons]);

  const finalColor = useMemo(() => {
    // Bigger → browner (more debris), smaller → grey.
    const t = THREE.MathUtils.clamp(Math.log10(Math.max(0.1, energyMegatons)) / 5, 0, 1);
    const c = new THREE.Color('#5a4a40');
    const big = new THREE.Color('#3c2a1a');
    return c.lerp(big, t);
  }, [energyMegatons]);

  useFrame(() => {
    if (!meshRef.current) return;
    const t = THREE.MathUtils.clamp((progress - 0.85) / 0.15, 0, 1);
    const eased = t * t * (3 - 2 * t);
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = eased * finalOpacity;
    meshRef.current.visible = mat.opacity > 0.001;
  });

  if (energyMegatons <= 0) return null;
  return (
    <mesh ref={meshRef} renderOrder={4}>
      <sphereGeometry args={[earthRadius * 1.022, 48, 32]} />
      <meshBasicMaterial
        color={finalColor}
        transparent
        opacity={0}
        depthWrite={false}
        side={THREE.BackSide}
        toneMapped={false}
      />
    </mesh>
  );
}
