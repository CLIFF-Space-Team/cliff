'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { LiveEvent } from './types';
import { latLngToVec3 } from './EarthGlobe3D';

interface EventMarkers3DProps {
  events: LiveEvent[];
  radius: number;
  selectedId: string | null;
  onSelect: (event: LiveEvent) => void;
}

const COLOR_BY_KIND: Record<LiveEvent['kind'], string> = {
  quake: '#ff6a3c',
  fireball: '#ffcc44',
  eonet: '#22d3ee',
};

const SEVERITY_COLOR: Record<NonNullable<LiveEvent['severity']>, string> = {
  critical: '#ef4444',
  high: '#f97316',
  moderate: '#eab308',
  info: '#94a3b8',
};

/**
 * Glowing 3D marker swarm pinned to the rotating globe. Three separate
 * meshes per marker:
 *   1. core sphere — small, bright, opaque (the visual anchor)
 *   2. additive halo — visual breathing room
 *   3. **invisible hit-target** — large, transparent, raycast-only. This is
 *      what fixes the "every click opens the same earthquake" report: with
 *      the old code, overlapping cores in dense regions (e.g. CONUS wildfire
 *      cluster) all collided into a single ~6 px screen footprint, so the
 *      raycast picked whichever marker happened to render last instead of
 *      the one the user actually aimed at. The hit-target gives every
 *      marker its own unambiguous click region.
 *
 * The selected marker grows ~1.7× and the click cursor flips to pointer on
 * hover so the affordance is unambiguous.
 */
export function EventMarkers3D({
  events,
  radius,
  selectedId,
  onSelect,
}: EventMarkers3DProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Pre-compute the surface-normal offset once per marker so the mesh sits
  // *above* the cloud layer rather than half-buried in it.
  const placements = useMemo(
    () =>
      events.map((e) => {
        const r = radius * 1.018; // outside the cloud shell
        return {
          event: e,
          position: latLngToVec3(e.lat, e.lng, r),
          color: e.severity ? SEVERITY_COLOR[e.severity] : COLOR_BY_KIND[e.kind],
          scale: e.scale ?? 0.045,
        };
      }),
    [events, radius],
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.children.forEach((child) => {
      const userData = child.userData as { id?: string; baseScale?: number; pulseSpeed?: number };
      if (!userData.baseScale) return;
      const isSelected = userData.id === selectedId;
      const pulse =
        1 + Math.sin(t * (userData.pulseSpeed ?? 2.4) + (userData.id?.length ?? 0)) * 0.18;
      const finalScale = userData.baseScale * pulse * (isSelected ? 1.7 : 1);
      child.scale.setScalar(finalScale);
    });
  });

  return (
    <group ref={groupRef}>
      {placements.map(({ event, position, color, scale }) => (
        <group
          key={event.id}
          position={position}
          userData={{ id: event.id, baseScale: scale, pulseSpeed: 2.4 + event.lat * 0.001 }}
        >
          {/* Visual: bright core */}
          <mesh>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial color={color} />
          </mesh>
          {/* Visual: additive halo */}
          <mesh scale={1.8}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.35}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          {/* Hit target: invisible, large, owns the click + pointer events.
           *  Sized 3.5× the core so a Mercator-clustered region (e.g. CONUS
           *  wildfires) still gives each marker its own unambiguous click
           *  region. `pointerEvents` is the default — we just rely on this
           *  mesh being closest along the ray. */}
          <mesh
            scale={3.5}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(event);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              (document.body.style as CSSStyleDeclaration).cursor = 'pointer';
            }}
            onPointerOut={() => {
              (document.body.style as CSSStyleDeclaration).cursor = '';
            }}
          >
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
