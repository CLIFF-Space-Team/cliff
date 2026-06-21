'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { latLngToVec3 } from './EarthGlobe3D';
import type { LiveEvent } from './types';

interface EventSimulation3DProps {
  event: LiveEvent | null;
  radius: number;
  /** Replays the simulation from t=0 every time this changes. */
  playKey: number;
}

/**
 * 3D animation overlay for the selected event. The animation differs per
 * event kind — earthquakes pulse a tangent shock-ring, fireballs streak
 * inward and flash, EONET volcanoes spew a particle cone, etc.
 *
 * Lifetime is bounded (~6 s); after that the visuals fade. Selecting the
 * same event again restarts via `playKey`.
 */
export function EventSimulation3D({ event, radius, playKey }: EventSimulation3DProps) {
  const startTimeRef = useRef(0);
  const lastPlayKeyRef = useRef(playKey);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const fireballRef = useRef<THREE.Group>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const coneRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!event) return;
    if (lastPlayKeyRef.current !== playKey) {
      lastPlayKeyRef.current = playKey;
      startTimeRef.current = clock.elapsedTime;
    }
    const t = clock.elapsedTime - startTimeRef.current;

    // ── Quake: 3 expanding tangent rings ─────────────────────────
    if (event.kind === 'quake') {
      const peak = radius * 1.1;
      ringRefs.current.forEach((mesh, i) => {
        if (!mesh) return;
        const delay = i * 0.4;
        const local = Math.max(0, t - delay);
        if (local <= 0 || local > 5) {
          mesh.visible = false;
          return;
        }
        mesh.visible = true;
        const r = Math.max(0.05, peak * Math.min(1, local / 4));
        mesh.scale.set(r, r, r);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.6 * Math.max(0, 1 - local / 5);
      });
    }

    // ── Fireball: streaking inward + flash + smoke ───────────────
    if (event.kind === 'fireball' && fireballRef.current) {
      const duration = 2.2;
      const local = Math.min(1, t / duration);
      // Approach from outer space toward the surface point.
      const start = new THREE.Vector3(...latLngToVec3(event.lat, event.lng, radius * 4));
      const end = new THREE.Vector3(...latLngToVec3(event.lat, event.lng, radius * 1.005));
      fireballRef.current.position.lerpVectors(start, end, easeOutQuint(local));
      fireballRef.current.visible = local < 1;
    }
    if (event.kind === 'fireball' && flashRef.current) {
      const peak = radius * 0.55;
      const flashStart = 2.2;
      const flashLocal = Math.max(0, t - flashStart) / 0.35;
      if (flashLocal <= 0 || flashLocal > 1) {
        flashRef.current.visible = false;
      } else {
        flashRef.current.visible = true;
        flashRef.current.scale.setScalar(peak * (0.4 + flashLocal * 1.6));
        const mat = flashRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = (1 - flashLocal) * 0.95;
      }
    }

    // ── EONET (volcano-ish): pulsing cone ────────────────────────
    if (event.kind === 'eonet' && coneRef.current) {
      const local = Math.min(1, t / 4);
      coneRef.current.visible = t < 6;
      const mat = coneRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.5 * (1 - local);
      coneRef.current.scale.set(1 + local * 0.6, 1 + local * 1.4, 1 + local * 0.6);
    }
  });

  // Compute the reusable orientation quaternion (for tangent rings) once per
  // event. Rings sit on a plane normal to the surface vector at that lat/lng.
  const ringOrientation = useMemo(() => {
    if (!event) return null;
    const surface = new THREE.Vector3(...latLngToVec3(event.lat, event.lng, 1)).normalize();
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), surface);
    return quat;
  }, [event]);

  if (!event || !ringOrientation) return null;

  const surfacePos = latLngToVec3(event.lat, event.lng, radius * 1.002);

  if (event.kind === 'quake') {
    return (
      <>
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            ref={(el) => {
              ringRefs.current[i] = el;
            }}
            position={surfacePos}
            quaternion={ringOrientation}
          >
            <ringGeometry args={[0.94, 1, 96]} />
            <meshBasicMaterial
              color={i === 0 ? '#ffe07a' : i === 1 ? '#ff7848' : '#ef4444'}
              transparent
              opacity={0}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </>
    );
  }

  if (event.kind === 'fireball') {
    const visualSize = Math.max(0.04, Math.min(0.18, Math.log10((event.scale ?? 1) * 100 + 1) * 0.04));
    return (
      <>
        <group ref={fireballRef}>
          <mesh>
            <icosahedronGeometry args={[visualSize, 1]} />
            <meshBasicMaterial color="#ffcc66" />
          </mesh>
          {/* Plasma trail aura */}
          <mesh scale={2.4}>
            <sphereGeometry args={[visualSize, 12, 12]} />
            <meshBasicMaterial
              color="#ff8844"
              transparent
              opacity={0.45}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
        <mesh ref={flashRef} position={surfacePos}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </>
    );
  }

  if (event.kind === 'eonet') {
    return (
      <mesh
        ref={coneRef}
        position={surfacePos}
        quaternion={ringOrientation}
        scale={[radius * 0.06, radius * 0.18, radius * 0.06]}
      >
        <coneGeometry args={[1, 1, 24, 1, true]} />
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    );
  }

  return null;
}

function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 5);
}
