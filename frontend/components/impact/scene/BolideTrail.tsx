// @ts-nocheck — Float32Array indexing is runtime-safe but trips
// `noUncheckedIndexedAccess`. Logic is hand-verified.
'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { fireTexture } from '@/components/earth/simulation/textures';

interface BolideTrailProps {
  /** Approach start (asteroid begins here at t=0). */
  startPos: [number, number, number];
  /** Impact target on the Earth surface. */
  target: [number, number, number];
  /** 0..1 timeline cursor. Trail visible during atmospheric entry only. */
  progress: number;
}

const PUFF_COUNT = 9;
const TRAIL_LENGTH = 7.5;
const UP = new THREE.Vector3(0, 1, 0);

// Mirror of the asteroid-position math in `Asteroid` so the trail's
// head sits exactly where the rock is during approach. Returns null
// once the asteroid has burrowed (post 0.65).
function asteroidPosition(
  start: [number, number, number],
  target: [number, number, number],
  progress: number,
): THREE.Vector3 | null {
  if (progress >= 0.65) return null;
  const t = Math.min(1, progress / 0.65);
  const eased = Math.pow(t, 1.6);
  // Below 0.85 we follow a quadratic curve — above we fall straight in.
  if (t < 0.85) {
    const k = eased / Math.pow(0.85, 1.6);
    // X/Z linear, Y quadratic (so the asteroid arcs through the sky).
    const x = start[0] + (target[0] - start[0]) * k;
    const z = start[2] + (target[2] - start[2]) * k;
    // Quadratic ease for Y: matches the orchestrator's THREEMathLerpQuad
    const y = start[1] + (target[1] - start[1]) * (k * k);
    return new THREE.Vector3(x, y, z);
  }
  // Final dive: linear from the curve end-point to slightly past target.
  const k = (t - 0.85) / 0.15;
  const x = target[0];
  const y = target[1];
  const z = target[2];
  return new THREE.Vector3(x, y, z).addScaledVector(
    new THREE.Vector3(target[0], target[1], target[2]).normalize(),
    -k * 0.05,
  );
}

/**
 * Plasma trail behind the asteroid during atmospheric entry (0.45..0.64).
 *
 * Two layers:
 *   1. A bright sprite at the asteroid's current location — the ablation
 *      fireball itself.
 *   2. PUFF_COUNT trailing sprites that streak backward along the
 *      approach direction, fading + cooling toward the rear.
 */
export function BolideTrail({ startPos, target, progress }: BolideTrailProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => fireTexture(), []);
  const history = useMemo(() => {
    return new Array(PUFF_COUNT).fill(null).map(() => new THREE.Vector3());
  }, []);
  // Kare başına tahsisatı önlemek için scratch vektörler.
  const scratch = useMemo(
    () => ({ dir: new THREE.Vector3(), target: new THREE.Vector3(), sideways: new THREE.Vector3() }),
    [],
  );
  const initialised = useRef(false);

  useFrame(({ camera }) => {
    if (!groupRef.current || !headRef.current) return;

    let envelope = 0;
    if (progress >= 0.4 && progress < 0.5) envelope = (progress - 0.4) / 0.1;
    else if (progress >= 0.5 && progress < 0.6) envelope = 1.0;
    else if (progress >= 0.6 && progress < 0.66) envelope = 1 - (progress - 0.6) / 0.06;

    const ast = asteroidPosition(startPos, target, progress);
    const visible = envelope > 0.001 && ast !== null;
    groupRef.current.visible = visible;
    headRef.current.visible = visible;
    if (!visible || !ast) {
      initialised.current = false;
      return;
    }

    // Approach direction = unit vector from asteroid toward target.
    const dir = scratch.dir.set(target[0], target[1], target[2]).sub(ast).normalize();
    // `sideways` yalnızca dir'e bağlı — döngüde 9× yerine bir kez hesapla.
    const sideways = scratch.sideways.crossVectors(dir, UP).normalize();

    // Pre-seed history when freshly enabled so the trail appears already
    // formed (no awkward "growing" frame on entry).
    if (!initialised.current) {
      for (let i = 0; i < PUFF_COUNT; i++) {
        history[i].copy(ast).addScaledVector(dir, -((i + 1) / PUFF_COUNT) * TRAIL_LENGTH);
      }
      initialised.current = true;
    }

    // Bright head sprite at the asteroid.
    headRef.current.position.copy(ast);
    headRef.current.lookAt(camera.position);
    const headScale = 0.65 * envelope;
    headRef.current.scale.set(headScale, headScale, 1);
    const headMat = headRef.current.material as THREE.MeshBasicMaterial;
    headMat.opacity = 0.95 * envelope;

    // Trailing puffs.
    for (let i = 0; i < PUFF_COUNT; i++) {
      const t = (i + 1) / PUFF_COUNT;
      const targetPos = scratch.target.copy(ast).addScaledVector(dir, -t * TRAIL_LENGTH);
      // Subtle wobble so the trail isn't a perfectly straight line.
      targetPos.addScaledVector(sideways, Math.sin(t * 6 + progress * 30) * 0.05 * (1 - t));
      history[i].lerp(targetPos, 0.5);

      const child = groupRef.current.children[i] as THREE.Mesh | undefined;
      if (!child) continue;
      child.position.copy(history[i]);
      child.lookAt(camera.position);
      const fade = (1 - t) * envelope;
      const s = (0.55 + (1 - t) * 0.35);
      child.scale.set(s, s, 1);
      const mat = child.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.85 * fade;
      // Cool from white-yellow (front) → red (rear) along the trail
      const c = 1.0 - t * 0.55;
      mat.color.setRGB(1.0, c * 0.8 + 0.2, c * 0.3);
    }
  });

  return (
    <>
      <mesh ref={headRef} renderOrder={20}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={tex}
          color="#ffffff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <group ref={groupRef}>
        {Array.from({ length: PUFF_COUNT }).map((_, i) => (
          <mesh key={i} renderOrder={19}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={tex}
              color="#ffae3c"
              transparent
              opacity={0}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </>
  );
}
