'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface EjectaChunksProps {
  impactPoint: [number, number, number];
  /** 0..1 cursor; chunks fly during 0.62 → 1.0. */
  progress: number;
  /** Visual size scale for the chunks. */
  scale?: number;
  /** Number of chunks. Overrides the energy-derived count when provided. */
  count?: number;
  /** Impact angle (deg from horizontal). Lower angles produce a stronger
   *  downrange bias (butterfly pattern). */
  angleDeg?: number;
  /** Impact azimuth (deg from north, clockwise). Sets the downrange
   *  direction in the tangent plane. */
  azimuthDeg?: number;
  /** Drives chunk count + escape-velocity fraction (giant impacts fling debris
   *  off into space instead of all of it falling back). */
  energyMegatons?: number;
  /** Low-power devices → halve the chunk count. */
  lite?: boolean;
}

interface ChunkData {
  dir: THREE.Vector3;
  speed: number;
  spin: THREE.Vector3;
  size: number;
  /** True → enough speed to escape; flies off radially, gravity ~ignored. */
  escaping: boolean;
}

/**
 * Macroscopic rock chunks ejected outward from the impact site on parabolic
 * trajectories. Single InstancedMesh (cheap) with per-chunk launch direction +
 * speed. Earth-facing gravity pulls most back down; on giant impacts a fraction
 * reach escape velocity and fly off into space. Freshly-launched debris glows
 * hot (bloom catches it) and cools as it tumbles.
 */
export function EjectaChunks({
  impactPoint,
  progress,
  scale = 0.025,
  count,
  angleDeg = 90,
  azimuthDeg = 90,
  energyMegatons = 0,
  lite = false,
}: EjectaChunksProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Energy magnitude drives both density and how many chunks escape.
  const e = useMemo(
    () => THREE.MathUtils.clamp(Math.log10(energyMegatons + 1), 0, 9),
    [energyMegatons],
  );
  const n = useMemo(() => {
    if (count && count > 0) return count;
    const base = Math.round(150 + e * 32); // 150 → ~440
    const capped = Math.min(440, base);
    return lite ? Math.round(capped / 2) : capped;
  }, [count, e, lite]);
  // Fraction reaching escape velocity: nil below ~1000 Mt, up to ~45% at extreme.
  const escapeFraction = useMemo(
    () => THREE.MathUtils.clamp((e - 3) / 7, 0, 0.45),
    [e],
  );

  // Tangent frame aligned with the impact azimuth so the local +X axis
  // (we treat as `tangent`) points downrange. Same maths as `frame.ts`.
  const frame = useMemo(() => {
    const normal = new THREE.Vector3(...impactPoint).normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);
    let north = worldUp.clone().sub(normal.clone().multiplyScalar(worldUp.dot(normal)));
    if (north.lengthSq() < 1e-6) {
      const worldX = new THREE.Vector3(1, 0, 0);
      north = worldX.clone().sub(normal.clone().multiplyScalar(worldX.dot(normal)));
    }
    north.normalize();
    const east = new THREE.Vector3().crossVectors(normal, north).normalize();
    const az = (azimuthDeg * Math.PI) / 180;
    const tangent = north
      .clone()
      .multiplyScalar(Math.cos(az))
      .addScaledVector(east, Math.sin(az))
      .normalize();
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
    return { normal, tangent, bitangent, origin: new THREE.Vector3(...impactPoint) };
  }, [impactPoint, azimuthDeg]);

  // Bias factor — shallower impacts dump more debris downrange.
  const downrangeBias = useMemo(() => {
    if (angleDeg >= 75) return 0;
    if (angleDeg >= 45) return 0.4;
    if (angleDeg >= 25) return 0.7;
    return 0.9;
  }, [angleDeg]);
  const downrangeSpeedMul = useMemo(() => {
    return 1 + ((90 - Math.max(20, angleDeg)) / 70) * 1.5;
  }, [angleDeg]);

  const chunks = useMemo(() => {
    let seed = 4242;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    const arr: ChunkData[] = [];
    for (let i = 0; i < n; i++) {
      let θ_uniform = (rng() - 0.5) * Math.PI * 2;
      let θ: number;
      if (downrangeBias <= 0) {
        θ = θ_uniform;
      } else {
        const sign = Math.sign(θ_uniform) || 1;
        const t = Math.abs(θ_uniform) / Math.PI;
        const biased = Math.pow(t, 1 + downrangeBias * 2.5);
        θ = sign * biased * Math.PI;
      }
      const φ = Math.acos(0.55 + rng() * 0.45); // upward bias
      const lx = Math.sin(φ) * Math.cos(θ);
      const ly = Math.sin(φ) * Math.sin(θ);
      const lz = Math.cos(φ);
      const dir = new THREE.Vector3()
        .addScaledVector(frame.tangent, lx)
        .addScaledVector(frame.bitangent, ly)
        .addScaledVector(frame.normal, lz)
        .normalize();

      const downrangeFactor = 1 + (downrangeSpeedMul - 1) * 0.5 * (1 + Math.cos(θ));
      // Escapers fly nearly straight up/out and fast.
      const escaping = rng() < escapeFraction && lz > 0.45;
      const baseSpeed = (0.4 + Math.pow(rng(), 1.5) * 3.6) * downrangeFactor;
      arr.push({
        dir,
        speed: escaping ? baseSpeed * (2.2 + rng() * 1.6) : baseSpeed,
        spin: new THREE.Vector3(rng() * 4, rng() * 4, rng() * 4),
        size: 0.4 + Math.pow(rng(), 2) * 1.6,
        escaping,
      });
    }
    return arr;
  }, [n, frame, downrangeBias, downrangeSpeedMul, escapeFraction]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpPos = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!meshRef.current) return;
    const inWindow = progress >= 0.62 && progress <= 1.0;
    meshRef.current.visible = inWindow;
    if (!inWindow) return;

    const local = (progress - 0.62) / 0.38;
    const tSec = local * 1.8;

    for (let i = 0; i < n; i++) {
      const c = chunks[i]!;
      const travel = c.speed * tSec * (1 + (c.size - 0.6) * 0.2);
      // Escapers ignore gravity → straight out into space. Others arc back.
      const gravity = c.escaping ? 0 : -0.5 * tSec * tSec * 2.0;
      tmpPos
        .copy(frame.origin)
        .addScaledVector(c.dir, travel)
        .addScaledVector(frame.normal, gravity);

      dummy.position.copy(tmpPos);
      dummy.rotation.set(c.spin.x * tSec, c.spin.y * tSec, c.spin.z * tSec);
      dummy.scale.setScalar(c.size * scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;

    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    // Fresh ejecta glows hot (bloom-bright) then cools through the flight.
    mat.emissiveIntensity = THREE.MathUtils.lerp(1.5, 0.08, Math.min(1, local * 1.4));
    mat.opacity = Math.max(0, 1 - Math.max(0, local - 0.72) * 2.4);
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, n]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial
        color="#2a1f17"
        roughness={1.0}
        metalness={0.0}
        emissive="#ff7a2a"
        emissiveIntensity={0.08}
        toneMapped={false}
        transparent
        opacity={1}
      />
    </instancedMesh>
  );
}
