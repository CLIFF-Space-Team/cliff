'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

import { SurfaceRing, type SurfaceRingHandle, arcToAngle } from './SurfaceRing';
import type { ImpactFrame } from './frame';

interface SeismicRipplesProps {
  frame: ImpactFrame;
  /** Earth radius in scene units (for geodesic ring geometry). */
  earthRadius: number;
  /** Felt-radius (scene units) — sets max travel distance. */
  feltRadius: number;
  /** Magnitude (Mw). Higher → darker settle disc on the ground. */
  magnitude: number;
  /** 0..1 timeline cursor. Ripples emit 0.65 → 1.00. */
  progress: number;
}

const RING_COUNT = 5;

/**
 * Concentric brown-gold ground ripples emanating from the impact site,
 * representing the surface seismic wave. Each ring is a thin geodesic
 * band wrapping the Earth's sphere, so big quakes visibly bend the
 * ripple front around the planet's curve — not a flat coin growing on a
 * flat plate.
 *
 * Rings spawn staggered (every 0.045 progress), expand to `feltRadius`,
 * and fade as they outrun their energy. M ≥ 7 also drops a low-opacity
 * dark settle disc that fades in as the rings die.
 */
export function SeismicRipples({
  frame,
  earthRadius,
  feltRadius,
  magnitude,
  progress,
}: SeismicRipplesProps) {
  const ringHandles = useRef<Array<SurfaceRingHandle | null>>([]);
  const settleHandle = useRef<SurfaceRingHandle | null>(null);
  const tmpColor = useRef(new THREE.Color('#9a6a30'));
  const tmpSettleColor = useRef(new THREE.Color('#1a0e08'));

  useFrame(() => {
    if (progress < 0.64) {
      ringHandles.current.forEach((h) => {
        if (h) h.set({ innerAngle: 0, outerAngle: 0, color: tmpColor.current, opacity: 0, visible: false });
      });
      if (settleHandle.current) {
        settleHandle.current.set({
          innerAngle: 0,
          outerAngle: 0,
          color: tmpSettleColor.current,
          opacity: 0,
          visible: false,
        });
      }
      return;
    }

    for (let i = 0; i < RING_COUNT; i++) {
      const handle = ringHandles.current[i];
      if (!handle) continue;
      const ringStart = 0.64 + i * 0.045;
      const ringDuration = 0.28;
      const t = (progress - ringStart) / ringDuration;
      if (t < 0 || t > 1.05) {
        handle.set({ innerAngle: 0, outerAngle: 0, color: tmpColor.current, opacity: 0, visible: false });
        continue;
      }
      const eased = 1 - Math.pow(1 - Math.min(1, t), 1.6);
      const outerArc = eased * feltRadius;
      const thickness = Math.max(0.04, feltRadius * 0.03);
      const innerArc = Math.max(0, outerArc - thickness);
      const wobble = 1 + Math.sin(t * Math.PI * 4) * 0.08;
      const opacity = Math.max(0, (1 - t) * 0.55 * wobble);
      handle.set({
        innerAngle: arcToAngle(innerArc, earthRadius),
        outerAngle: arcToAngle(outerArc, earthRadius),
        color: tmpColor.current,
        opacity,
        visible: true,
      });
    }

    // Big-quake settle disc — a wide low-opacity dome of settled dust on
    // the ground. We render it as a fully-filled disc by setting the
    // inner angle to 0.
    if (settleHandle.current) {
      const visibleSettle = magnitude >= 7;
      if (!visibleSettle) {
        settleHandle.current.set({
          innerAngle: 0,
          outerAngle: 0,
          color: tmpSettleColor.current,
          opacity: 0,
          visible: false,
        });
      } else {
        const tt = THREE.MathUtils.clamp((progress - 0.78) / 0.22, 0, 1);
        const angle = arcToAngle(feltRadius * 0.85, earthRadius);
        settleHandle.current.set({
          innerAngle: 0,
          outerAngle: angle,
          color: tmpSettleColor.current,
          opacity: tt * 0.32,
          visible: true,
        });
      }
    }
  });

  if (feltRadius <= 0) return null;
  return (
    <>
      {magnitude >= 7 && (
        <SurfaceRing
          ref={(el) => {
            settleHandle.current = el;
          }}
          frame={frame}
          earthRadius={earthRadius}
          segments={120}
          renderOrder={11}
          initialColor="#1a0e08"
        />
      )}
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <SurfaceRing
          key={i}
          ref={(el) => {
            ringHandles.current[i] = el;
          }}
          frame={frame}
          earthRadius={earthRadius}
          renderOrder={13}
          initialColor="#9a6a30"
        />
      ))}
    </>
  );
}
