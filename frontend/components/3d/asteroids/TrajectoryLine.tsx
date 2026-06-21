'use client';

import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

import type { OrbitResponse } from '@/hooks/useOrbit';

interface TrajectoryLineProps {
  orbit: OrbitResponse;
  /** Scene-coord origin to translate the orbit to (typically Sun's position). */
  origin?: [number, number, number];
  /** AU → scene unit scale. Default tuned so 1 AU NEO orbits sit near Earth shell. */
  auScale?: number;
  color?: string;
  opacity?: number;
}

/**
 * Renders a NEO's Keplerian orbit ellipse as a glowing line.
 *
 * Default scale is tuned so the orbit reads naturally at the dashboard's
 * Earth-centric view: 1 AU = 12 scene units. The orbit is centered on the
 * given `origin` (Sun position).
 *
 * Drei <Line> internally uses `meshline` for thick, anti-aliased lines that
 * look good even at tiny pixel widths.
 */
export function TrajectoryLine({
  orbit,
  origin = [0, 0, 0],
  auScale = 12,
  color = '#9ec6ff',
  opacity = 0.55,
}: TrajectoryLineProps) {
  const points = useMemo(() => {
    return orbit.points_au.map<[number, number, number]>(([x, y, z]) => [
      origin[0] + x * auScale,
      origin[1] + z * auScale, // ecliptic Y → scene Y (z up swap)
      origin[2] - y * auScale,
    ]);
  }, [orbit, origin, auScale]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={1.4}
      transparent
      opacity={opacity}
      depthWrite={false}
    />
  );
}

/**
 * Earth's reference orbit (1 AU circle around Sun). Drawn behind NEO orbit
 * for scale comparison.
 */
export function EarthReferenceOrbit({
  origin = [0, 0, 0],
  auScale = 12,
  segments = 128,
}: {
  origin?: [number, number, number];
  auScale?: number;
  segments?: number;
}) {
  const points = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      out.push([origin[0] + Math.cos(a) * auScale, origin[1], origin[2] - Math.sin(a) * auScale]);
    }
    return out;
  }, [origin, auScale, segments]);

  return (
    <Line
      points={points}
      color="#3b6fb6"
      lineWidth={0.8}
      transparent
      opacity={0.3}
      depthWrite={false}
      dashed
      dashSize={1.4}
      gapSize={1.0}
    />
  );
}
