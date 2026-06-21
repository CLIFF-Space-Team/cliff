'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

import { SurfaceRing, type SurfaceRingHandle, arcToAngle } from './SurfaceRing';
import type { ImpactFrame } from './frame';

interface ThermalGlowHaloProps {
  frame: ImpactFrame;
  /** Earth radius in scene units (for geodesic geometry). */
  earthRadius: number;
  /** Thermal radius from physics, in scene units. */
  radius: number;
  /** 0..1 timeline cursor. Halo lives 0.62 → 0.85. */
  progress: number;
  /** Multiplier for downrange asymmetry: > 1 stretches the halo along
   *  the impact direction. Pass 1 for a perfectly hemispherical glow. */
  downrangeStretch?: number;
}

/**
 * Glowing thermal-radiation footprint **on the Earth's surface**, hugging
 * the planet's curve.
 *
 * Two surface-conformant discs:
 *   - Inner core: bright white-yellow, ≈45% of the thermal radius,
 *     shorter lifetime, brighter peak.
 *   - Outer halo: orange-red, full thermal radius, longer fade.
 *
 * Both discs are filled (innerAngle = 0) `SurfaceRing`s, so they wrap
 * around the planet's curve as the radius grows — replacing the previous
 * flat camera-facing billboard which "tilted" through the surface for
 * shallow viewing angles.
 *
 * Colour cools through the lifetime: white → yellow → orange → deep
 * red as the fireball decays.
 */
export function ThermalGlowHalo({
  frame,
  earthRadius,
  radius,
  progress,
  downrangeStretch = 1.0,
}: ThermalGlowHaloProps) {
  const innerHandle = useRef<SurfaceRingHandle>(null);
  const outerHandle = useRef<SurfaceRingHandle>(null);
  const tmpInnerColor = useRef(new THREE.Color('#ffffff'));
  const tmpOuterColor = useRef(new THREE.Color('#ffaa3c'));

  useFrame(({ clock }) => {
    let envelope = 0;
    if (progress >= 0.62 && progress < 0.66) envelope = (progress - 0.62) / 0.04;
    else if (progress >= 0.66 && progress < 0.78) envelope = 1.0;
    else if (progress >= 0.78 && progress < 0.86) envelope = 1 - (progress - 0.78) / 0.08;

    const visible = envelope > 0.001;
    if (!visible) {
      innerHandle.current?.set({
        innerAngle: 0,
        outerAngle: 0,
        color: tmpInnerColor.current,
        opacity: 0,
        visible: false,
      });
      outerHandle.current?.set({
        innerAngle: 0,
        outerAngle: 0,
        color: tmpOuterColor.current,
        opacity: 0,
        visible: false,
      });
      return;
    }

    const t = clock.elapsedTime;
    // Heat-shimmer pulsation (modulates radius, not opacity, so the
    // outer halo visibly breathes against the surface).
    const pulse = 1 + Math.sin(t * 3.4) * 0.04 + Math.sin(t * 6.8) * 0.02;

    // Outer halo — full thermal radius, cools over time.
    const outerLifeT = THREE.MathUtils.clamp((progress - 0.62) / 0.24, 0, 1);
    // Color: white-hot → yellow → orange → red.
    const r = 1.0;
    const g = Math.max(0.1, 0.95 - outerLifeT * 0.45);
    const b = Math.max(0.05, 0.55 - outerLifeT * 0.5);
    tmpOuterColor.current.setRGB(r, g, b);
    const outerArc = radius * pulse * downrangeStretch;
    outerHandle.current?.set({
      innerAngle: 0,
      outerAngle: arcToAngle(outerArc, earthRadius),
      color: tmpOuterColor.current,
      opacity: 0.7 * envelope,
      visible: true,
    });

    // Inner bright core — half the radius, holds white longer.
    const innerLifeT = THREE.MathUtils.clamp((progress - 0.62) / 0.16, 0, 1);
    const ig = Math.max(0.5, 1.0 - innerLifeT * 0.25);
    const ib = Math.max(0.1, 0.85 - innerLifeT * 0.6);
    tmpInnerColor.current.setRGB(1.0, ig, ib);
    const innerArc = radius * 0.45 * pulse * downrangeStretch;
    innerHandle.current?.set({
      innerAngle: 0,
      outerAngle: arcToAngle(innerArc, earthRadius),
      color: tmpInnerColor.current,
      opacity: 0.95 * envelope,
      visible: true,
    });
  });

  if (radius <= 0) return null;
  return (
    <>
      <SurfaceRing
        ref={outerHandle}
        frame={frame}
        earthRadius={earthRadius}
        segments={96}
        liftMeters={0.025}
        renderOrder={15}
        initialColor="#ffaa3c"
      />
      <SurfaceRing
        ref={innerHandle}
        frame={frame}
        earthRadius={earthRadius}
        segments={96}
        liftMeters={0.03}
        renderOrder={16}
        initialColor="#ffffff"
      />
    </>
  );
}
