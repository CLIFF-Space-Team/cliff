'use client';

import { useMemo } from 'react';

import type { EphemerisRow } from '@/lib/api-types';

/**
 * Kompakt SVG parlaklık (apmag) çizgi grafiği. Düşük apmag = daha parlak, bu
 * yüzden y ekseni ters: en parlak (en küçük apmag) yukarıda. En parlak nokta
 * vurgulanır.
 */
export function OrbitBrightnessChart({ rows }: { rows: EphemerisRow[] }) {
  const pts = useMemo(
    () =>
      rows
        .map((r) => ({ mag: r.apmag, when: r.when }))
        .filter((p): p is { mag: number; when: string } => p.mag != null && Number.isFinite(p.mag)),
    [rows],
  );

  if (pts.length < 2) return null;

  const W = 248;
  const H = 60;
  const pad = 5;
  const mags = pts.map((p) => p.mag);
  const min = Math.min(...mags);
  const max = Math.max(...mags);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (pts.length - 1)) * (W - 2 * pad);
  // En parlak (min apmag) en üstte (küçük y).
  const y = (mag: number) => pad + ((mag - min) / span) * (H - 2 * pad);

  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.mag).toFixed(1)}`).join(' ');
  let brightestIdx = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i]!.mag < pts[brightestIdx]!.mag) brightestIdx = i;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-full" preserveAspectRatio="none" aria-hidden>
      <path d={path} fill="none" stroke="#9ec6ff" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
      <circle cx={x(brightestIdx)} cy={y(pts[brightestIdx]!.mag)} r={2.6} fill="#ffffff" />
    </svg>
  );
}
