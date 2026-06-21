'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface MushroomCloudProps {
  impactPoint: [number, number, number];
  /** 0..1 cursor; cloud builds up from 0.65 onward. */
  progress: number;
  /** Maximum cloud height in scene units. Tied to result energy. */
  peakRadius: number;
  /** Color tint based on event. */
  tint?: 'natural' | 'iron' | 'icy';
}

/**
 * Multi-segment rising mushroom cloud built from displaced spheres + a stalk.
 * The stalk grows first; the cap blossoms when stalk reaches its target
 * height. Color ages from white-hot → orange → grey ash.
 */
export function MushroomCloud({
  impactPoint,
  progress,
  peakRadius,
  tint = 'natural',
}: MushroomCloudProps) {
  const groupRef = useRef<THREE.Group>(null);
  const stalkRef = useRef<THREE.Mesh>(null);
  const capInnerRef = useRef<THREE.Mesh>(null);
  const capOuterRef = useRef<THREE.Mesh>(null);

  // Surface normal for orientation (cloud rises radially outward from Earth)
  const orientation = useMemo(() => {
    const normal = new THREE.Vector3(...impactPoint).normalize();
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    return quat;
  }, [impactPoint]);

  // Pre-deform a sphere for organic cloud surface
  const deformedSphereGeo = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 32, 24);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    let seed = 7;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    for (let i = 0; i < pos.count; i++) {
      const r = 1 + (rng() - 0.5) * 0.16;
      pos.setXYZ(i, pos.getX(i) * r, pos.getY(i) * r, pos.getZ(i) * r);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);
  // geometry={...} prop'u R3F auto-dispose etmez → unmount'ta sızıntıyı önle.
  useEffect(() => () => deformedSphereGeo.dispose(), [deformedSphereGeo]);

  useFrame(() => {
    const inWindow = progress >= 0.65;
    if (groupRef.current) groupRef.current.visible = inWindow;
    if (!inWindow) return;

    const local = (progress - 0.65) / 0.35;
    // Tone the column down — a real impact at the resolutions we render
    // at reads better as a low, broad debris bloom than a tall mushroom.
    // Stalk drops to ~0.45× peakRadius, cap caps at 0.6× peakRadius height.
    const stalkHeight = peakRadius * 0.45;
    const capHeight = peakRadius * 0.6;

    // Stalk: grows fast in 0..0.4
    if (stalkRef.current) {
      const t = Math.min(1, local / 0.4);
      const stalkLen = stalkHeight * t;
      stalkRef.current.scale.set(peakRadius * 0.22, stalkLen, peakRadius * 0.22);
      stalkRef.current.position.y = stalkLen / 2;
      const mat = stalkRef.current.material as THREE.MeshStandardMaterial;
      const fade = Math.max(0, 1 - Math.max(0, local - 0.7));
      mat.opacity = 0.7 * fade;

      // Color: hot at base, cooling as time progresses
      const c = mat.color;
      if (local < 0.25) c.setRGB(1, 0.9, 0.6);
      else if (local < 0.55) c.setRGB(0.6, 0.45, 0.32);
      else c.setRGB(0.34, 0.30, 0.27);
    }

    // Inner cap (hot, low + flat)
    if (capInnerRef.current) {
      const t = Math.max(0, (local - 0.25) / 0.45);
      const sz = peakRadius * 0.7 * Math.min(1, t * 1.4);
      // Squashed dome (height 0.35× width) → reads as a low boil, not a balloon
      capInnerRef.current.scale.set(sz, sz * 0.35, sz);
      capInnerRef.current.position.y = capHeight * Math.min(1, t * 1.1);
      const mat = capInnerRef.current.material as THREE.MeshStandardMaterial;
      const fade = Math.max(0, 1 - Math.max(0, local - 0.6) * 1.2);
      mat.opacity = 0.7 * fade;
      capInnerRef.current.rotation.y += 0.005;
    }

    // Outer ash bloom (persistent, hugs the ground)
    if (capOuterRef.current) {
      const t = Math.max(0, (local - 0.3) / 0.65);
      const sz = peakRadius * 1.1 * Math.min(1, t * 1.2);
      capOuterRef.current.scale.set(sz, sz * 0.4, sz);
      capOuterRef.current.position.y = capHeight * 0.55 * Math.min(1.05, t * 1.15);
      const mat = capOuterRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.42 * Math.min(1, t);
      capOuterRef.current.rotation.y -= 0.003;
    }
  });

  const innerColor = tint === 'iron' ? '#ff8a3a' : tint === 'icy' ? '#cfd9ff' : '#ffb050';

  return (
    <group ref={groupRef} position={impactPoint} quaternion={orientation}>
      {/* Stalk: vertical column rising from impact point */}
      <mesh ref={stalkRef} geometry={deformedSphereGeo}>
        <meshStandardMaterial
          color="#a08070"
          transparent
          opacity={0}
          roughness={1}
          depthWrite={false}
        />
      </mesh>
      {/* Inner cap: hot orange dome */}
      <mesh ref={capInnerRef} geometry={deformedSphereGeo}>
        <meshStandardMaterial
          color={innerColor}
          emissive={innerColor}
          emissiveIntensity={0.35}
          transparent
          opacity={0}
          roughness={0.9}
          depthWrite={false}
        />
      </mesh>
      {/* Outer cap: grey ash mushroom */}
      <mesh ref={capOuterRef} geometry={deformedSphereGeo}>
        <meshStandardMaterial
          color="#5a5048"
          transparent
          opacity={0}
          roughness={1}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
