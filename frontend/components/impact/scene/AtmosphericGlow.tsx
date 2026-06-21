'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface AtmosphericGlowProps {
  /** 3D position of the entry hemisphere centre (impact site, normalised). */
  entryDirection: [number, number, number];
  /** Earth radius in scene units (used to size the shell). */
  earthRadius: number;
  /** 0..1 timeline cursor. Glow ramps 0.45 → 0.62, peak ~0.58. */
  progress: number;
}

/**
 * Thin spherical shell wrapping the Earth. Bright orange glow over the
 * entry hemisphere, falling off to nothing on the far side. Visible only
 * during the entry window (0.45 → 0.62) — peaks just before impact.
 *
 * Uses a custom ShaderMaterial so we can tint by a per-vertex dot product
 * with the entry direction, getting a smooth "frontside is on fire" look
 * for the cost of a single sphere mesh.
 */
export function AtmosphericGlow({
  entryDirection,
  earthRadius,
  progress,
}: AtmosphericGlowProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(() => {
    const dir = new THREE.Vector3(...entryDirection).normalize();
    return new THREE.ShaderMaterial({
      uniforms: {
        uIntensity: { value: 0 },
        uEntryDir: { value: dir },
        uColor: { value: new THREE.Color('#ff9b3c') },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uIntensity;
        uniform vec3 uEntryDir;
        uniform vec3 uColor;
        varying vec3 vNormal;
        void main() {
          // Local space normal — re-derived from view-space; the cheap
          // approximation is to compare position-space normal against the
          // entry direction. We pass entry direction in view space too.
          float facing = max(0.0, dot(normalize(vNormal), normalize(uEntryDir)));
          float glow = pow(facing, 1.4) * uIntensity;
          // Fresnel-ish edge boost so silhouette pops.
          float edge = 1.0 - max(0.0, vNormal.z);
          glow += edge * uIntensity * 0.35;
          gl_FragColor = vec4(uColor * glow, glow);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      toneMapped: false,
    });
  }, [entryDirection]);
  // <primitive object={material}> R3F tarafından auto-dispose edilmez →
  // entryDirection değişince/unmount'ta eski ShaderMaterial+program sızar.
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    if (!meshRef.current) return;
    let intensity = 0;
    if (progress >= 0.45 && progress < 0.5) {
      intensity = ((progress - 0.45) / 0.05) * 0.4;
    } else if (progress >= 0.5 && progress < 0.58) {
      intensity = 0.4 + ((progress - 0.5) / 0.08) * 0.5;
    } else if (progress >= 0.58 && progress < 0.62) {
      intensity = 0.9 - ((progress - 0.58) / 0.04) * 0.4;
    } else if (progress >= 0.62 && progress < 0.66) {
      // Brief afterglow during the impact flash.
      intensity = 0.5 - ((progress - 0.62) / 0.04) * 0.5;
    }
    const u = material.uniforms.uIntensity;
    if (u) u.value = intensity;
    meshRef.current.visible = intensity > 0.001;
  });

  return (
    <mesh ref={meshRef} renderOrder={3}>
      <sphereGeometry args={[earthRadius * 1.045, 48, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
