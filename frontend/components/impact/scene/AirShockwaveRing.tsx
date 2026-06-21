'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

import { SurfaceRing, type SurfaceRingHandle, arcToAngle } from './SurfaceRing';
import type { ImpactFrame } from './frame';

// Lerp uç renkleri — değişmez sabitler, modül kapsamında bir kez kurulur
// (eskiden useFrame'de her kare 4 yeni THREE.Color tahsis ediliyordu).
const INNER_EARLY = new THREE.Color('#cfeeff');
const INNER_LATE = new THREE.Color('#ffffff');
const OUTER_EARLY = new THREE.Color('#a8d4ff');
const OUTER_LATE = new THREE.Color('#cfeeff');

interface AirShockwaveRingProps {
  frame: ImpactFrame;
  /** Earth radius in scene units. Required for surface-conformant geometry. */
  earthRadius: number;
  /** Inner (5 psi) terminal arc-length in scene units. */
  innerRadius: number;
  /** Outer (1 psi) terminal arc-length in scene units. */
  outerRadius: number;
  /** 0..1 timeline cursor. Wave expands 0.62 → 0.95. */
  progress: number;
}

/**
 * Two concentric pressure-wave bands wrapping the Earth's surface from
 * the impact site:
 *
 *   - Inner ring: 5 psi (heavy structural damage), bright white-cyan,
 *     reaches `innerRadius` at progress 0.85.
 *   - Outer ring: 1 psi (window damage), soft cyan, reaches `outerRadius`
 *     at progress 0.95.
 *
 * Each band is rendered as a thin geodesic strip on the Earth's sphere
 * (via `SurfaceRing`) so as the wave expands it visibly hugs the curve
 * of the planet — no more "flat ring on a flat tangent plane" cheat.
 *
 * Geometry is allocated once at mount; per-frame updates only rewrite
 * vertex positions in place. Zero allocations during animation.
 */
export function AirShockwaveRing({
  frame,
  earthRadius,
  innerRadius,
  outerRadius,
  progress,
}: AirShockwaveRingProps) {
  const innerHandleRef = useRef<SurfaceRingHandle>(null);
  const outerHandleRef = useRef<SurfaceRingHandle>(null);

  // Reusable colour temporaries so we don't allocate per frame.
  const tmpInner = useRef(new THREE.Color('#ffffff'));
  const tmpOuter = useRef(new THREE.Color('#cfeeff'));

  useFrame(() => {
    const drive = (
      handle: SurfaceRingHandle | null,
      maxArc: number,
      startProgress: number,
      duration: number,
      thicknessFraction: number,
      colorOut: THREE.Color,
      colorEarly: THREE.Color,
      colorLate: THREE.Color,
      maxOpacity: number,
    ) => {
      if (!handle) return;
      const t = (progress - startProgress) / duration;
      if (t < 0 || t > 1.05) {
        handle.set({
          innerAngle: 0,
          outerAngle: 0,
          color: colorOut,
          opacity: 0,
          visible: false,
        });
        return;
      }
      const eased = 1 - Math.pow(1 - Math.min(1, t), 1.6); // ease-out
      const outerArc = eased * maxArc;
      const thickness = Math.max(0.04, maxArc * thicknessFraction);
      const innerArc = Math.max(0, outerArc - thickness);
      const innerAngle = arcToAngle(innerArc, earthRadius);
      const outerAngle = arcToAngle(outerArc, earthRadius);
      const opacity = Math.max(0, (1 - t) * maxOpacity);
      // Cool-blue early, near-white at peak (mix between two presets).
      const mix = THREE.MathUtils.clamp(t * 1.4, 0, 1);
      colorOut.copy(colorEarly).lerp(colorLate, mix);
      handle.set({
        innerAngle,
        outerAngle,
        color: colorOut,
        opacity,
        visible: true,
      });
    };

    drive(
      innerHandleRef.current,
      innerRadius,
      0.62,
      0.23,
      0.06,
      tmpInner.current,
      INNER_EARLY,
      INNER_LATE,
      0.85,
    );
    drive(
      outerHandleRef.current,
      outerRadius,
      0.62,
      0.33,
      0.04,
      tmpOuter.current,
      OUTER_EARLY,
      OUTER_LATE,
      0.55,
    );
  });

  if (innerRadius <= 0 && outerRadius <= 0) return null;

  return (
    <>
      {outerRadius > 0 && (
        <SurfaceRing
          ref={outerHandleRef}
          frame={frame}
          earthRadius={earthRadius}
          renderOrder={14}
          initialColor="#cfeeff"
        />
      )}
      {innerRadius > 0 && (
        <SurfaceRing
          ref={innerHandleRef}
          frame={frame}
          earthRadius={earthRadius}
          renderOrder={15}
          initialColor="#ffffff"
        />
      )}
    </>
  );
}
