'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { getAsteroidTextureSet } from './textureFactory';
import type { AsteroidSpectralType } from './types';

interface ProceduralAsteroidProps {
  position: [number, number, number];
  scale: number;
  type: AsteroidSpectralType;
  seed: number;
  hazardous?: boolean;
  detail?: number;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
}

const TYPE_TINT: Record<AsteroidSpectralType, { metalness: number; roughness: number }> = {
  C: { metalness: 0.04, roughness: 1.0 },
  S: { metalness: 0.06, roughness: 0.9 },
  M: { metalness: 0.45, roughness: 0.55 },
  B: { metalness: 0.04, roughness: 0.98 },
  V: { metalness: 0.05, roughness: 0.82 },
  X: { metalness: 0.18, roughness: 0.82 },
  D: { metalness: 0.04, roughness: 0.98 },
};

/**
 * Spacecraft-style procedural asteroid:
 *  - icosahedron(detail=3) with vertex displacement noise = rocky silhouette
 *  - 1024² PBR maps (diffuse + normal + roughness + AO) baked from textureFactory
 *  - hazardous: subtle rust tint via material.color
 *  - selected: 1.6× scale + emissive glow + halo
 */
export function ProceduralAsteroid({
  position,
  scale,
  type,
  seed,
  hazardous = false,
  detail = 3,
  selected = false,
  dimmed = false,
  onClick,
}: ProceduralAsteroidProps) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    // Sphere has clean equirectangular UVs that play well with our PBR maps.
    // Higher segments + per-vertex noise gives a rocky silhouette without losing
    // the texture lookup precision the icosahedron lost on its triangle UVs.
    const segments = detail >= 3 ? 96 : 64;
    const geo = new THREE.SphereGeometry(1, segments, segments);
    const positionAttr = geo.attributes.position as THREE.BufferAttribute;
    const seeded = pseudoRandom(seed);
    const vertex = new THREE.Vector3();
    // Pre-roll a few values so each asteroid has unique low-freq deformation.
    const phaseA = seeded() * Math.PI * 2;
    const phaseB = seeded() * Math.PI * 2;
    const phaseC = seeded() * Math.PI * 2;
    for (let i = 0; i < positionAttr.count; i++) {
      vertex.fromBufferAttribute(positionAttr, i);
      const nx = vertex.x;
      const ny = vertex.y;
      const nz = vertex.z;
      const noise =
        0.20 * Math.sin(nx * 2.1 + phaseA) * Math.cos(ny * 2.4 + phaseB) +
        0.10 * Math.sin(nx * 5.7 + phaseB) * Math.cos(nz * 4.3 + phaseC) +
        0.06 * Math.sin(ny * 9.1 + phaseC) * Math.cos(nz * 7.7 + phaseA) +
        0.04 * (seeded() - 0.5);
      vertex.multiplyScalar(1 + noise);
      positionAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    geo.computeVertexNormals();
    if (geo.attributes.uv && !geo.attributes.uv2) {
      geo.setAttribute(
        'uv2',
        new THREE.BufferAttribute((geo.attributes.uv as THREE.BufferAttribute).array, 2),
      );
    }
    return geo;
  }, [seed, detail]);

  const textures = useMemo(() => {
    // Note: getAsteroidTextureSet returns a SHARED set — mutating offset/repeat
    // on it would clobber other asteroids of the same type. Clone the textures
    // instead so each asteroid carries its own UV transform.
    const shared = getAsteroidTextureSet(type, 1024);
    const offset = new THREE.Vector2((seed % 360) / 360, ((seed >> 16) % 100) / 100);
    const repeat = new THREE.Vector2(2.4, 1.2);

    const cloneTex = (tex: THREE.Texture) => {
      const t = tex.clone();
      t.offset.copy(offset);
      t.repeat.copy(repeat);
      t.needsUpdate = false; // data already uploaded on shared
      return t;
    };

    return {
      map: cloneTex(shared.map),
      normalMap: cloneTex(shared.normalMap),
      roughnessMap: cloneTex(shared.roughnessMap),
      aoMap: cloneTex(shared.aoMap),
    };
  }, [type, seed]);

  // Klonlanan dokular + üretilen geometri prop ile takıldığı için R3F bunları
  // auto-dispose ETMEZ — [type,seed]/[seed,detail] değişince eski klonlar/geometri
  // sızar (dashboard'da yüzlerce NEO + senaryo değişimi → birincil GPU sızıntısı).
  useEffect(
    () => () => {
      textures.map.dispose();
      textures.normalMap.dispose();
      textures.roughnessMap.dispose();
      textures.aoMap.dispose();
    },
    [textures],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const tint = TYPE_TINT[type];

  const colorTint = useMemo(() => {
    const c = new THREE.Color('#ffffff');
    if (hazardous) c.lerp(new THREE.Color('#c98666'), 0.35);
    return c;
  }, [hazardous]);

  const rotationSpeed = useMemo(() => {
    const seeded = pseudoRandom(seed + 999);
    return 0.05 + seeded() * 0.4;
  }, [seed]);

  // Selected gets a small bump (≈+15%) plus a halo + emissive glow. The
  // 1.6× boost we used to apply made the asteroid fill the frame once the
  // camera also dollied closer in focus mode — so we keep the scale almost
  // identical and rely on glow/halo for the "this one is selected" cue.
  const targetScale = scale * (selected ? 1.15 : 1);
  const targetOpacity = dimmed ? 0.22 : 1;

  useFrame((_, dt) => {
    if (groupRef.current) {
      groupRef.current.rotation.x += dt * rotationSpeed * 0.3;
      groupRef.current.rotation.y += dt * rotationSpeed;
      const current = groupRef.current.scale.x;
      const next = THREE.MathUtils.lerp(current, targetScale, Math.min(1, dt * 6));
      groupRef.current.scale.setScalar(next);
    }
    if (materialRef.current) {
      materialRef.current.opacity = THREE.MathUtils.lerp(
        materialRef.current.opacity,
        targetOpacity,
        Math.min(1, dt * 6),
      );
      materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        materialRef.current.emissiveIntensity,
        selected ? 0.18 : 0,
        Math.min(1, dt * 6),
      );
    }
    if (haloRef.current) {
      const haloMat = haloRef.current.material as THREE.MeshBasicMaterial;
      const target = selected ? 0.32 : 0;
      haloMat.opacity = THREE.MathUtils.lerp(haloMat.opacity, target, Math.min(1, dt * 6));
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
    >
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          ref={materialRef}
          map={textures.map}
          normalMap={textures.normalMap}
          normalScale={new THREE.Vector2(1.4, 1.4)}
          roughnessMap={textures.roughnessMap}
          aoMap={textures.aoMap}
          aoMapIntensity={1.2}
          color={colorTint}
          roughness={tint.roughness}
          metalness={tint.metalness}
          transparent
          opacity={1}
          emissive={new THREE.Color('#ffffff')}
          emissiveIntensity={0}
        />
      </mesh>
      <mesh ref={haloRef} scale={1.5}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          color={hazardous ? '#ff6b4a' : '#ffffff'}
          transparent
          opacity={0}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function pseudoRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}
