'use client';

import { useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api-client';
import type { RiskClass, RiskRecord, RiskSnapshot } from '@/lib/api-types';
import { cn } from '@/lib/utils';

/**
 * Cinematic-tour info card: cycles through REAL tracked NEOs (live backend risk
 * snapshot), showing one asteroid's vitals at a time. Purely informational
 * overlay — pointer-events disabled so it never blocks the scene.
 */

const ROTATE_MS = 6500;
const LUNAR_DISTANCE_KM = 384_400;

function fmtDiameter(km: number | null): string {
  if (km == null) return '—';
  return km >= 1 ? `${km.toFixed(2)} km` : `${Math.round(km * 1000)} m`;
}
function fmtMiss(km: number | null): string {
  if (km == null) return '—';
  const ld = km / LUNAR_DISTANCE_KM;
  return ld >= 1 ? `${ld.toFixed(1)} AU-ay` : `${Math.round(km).toLocaleString('tr-TR')} km`;
}

const RISK_TR: Record<RiskClass, string> = {
  critical: 'KRİTİK',
  high: 'YÜKSEK',
  moderate: 'ORTA',
  low: 'DÜŞÜK',
  minimal: 'MİNİMAL',
};
function riskBadge(c: RiskClass): string {
  switch (c) {
    case 'critical':
      return 'border-threat-critical/40 bg-threat-critical/15 text-threat-critical';
    case 'high':
      return 'border-threat-high/40 bg-threat-high/15 text-threat-high';
    case 'moderate':
      return 'border-threat-moderate/40 bg-threat-moderate/15 text-threat-moderate';
    case 'low':
      return 'border-threat-low/40 bg-threat-low/15 text-threat-low';
    default:
      return 'border-white/15 bg-white/[0.06] text-text-tertiary';
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[9px] uppercase tracking-wider text-text-tertiary">{label}</dt>
      <dd className="text-[11px] text-text-primary">{value}</dd>
    </div>
  );
}

export function CinematicNeoCard() {
  const [items, setItems] = useState<RiskRecord[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let active = true;
    apiFetch<RiskSnapshot>('/api/v1/threats/risk/snapshot')
      .then((snap) => {
        if (!active) return;
        const list = (snap.items ?? []).filter((r) => r.diameter_max_km != null);
        // Most "interesting" first (scored + hazardous), then fill with the rest.
        list.sort((a, b) => b.hybrid_score - a.hybrid_score);
        if (list.length) setItems(list.slice(0, 24));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const id = window.setInterval(() => setIdx((i) => (i + 1) % items.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [items.length]);

  const neo = items[idx];
  if (!neo) return null;

  return (
    <div className="pointer-events-none absolute left-3 top-16 z-10 w-[min(82vw,250px)] sm:left-5 sm:top-20">
      <div
        key={neo.neo_id}
        className="animate-fade-in rounded-xl border border-white/[0.1] bg-surface-1/80 p-3 shadow-panel backdrop-blur"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono-tnum text-[9px] uppercase tracking-[0.22em] text-text-tertiary">
            İzlenen NEO · canlı
          </span>
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 font-mono-tnum text-[8px] uppercase tracking-wider',
              riskBadge(neo.risk_class),
            )}
          >
            {RISK_TR[neo.risk_class]}
          </span>
        </div>
        <p className="mt-1.5 truncate text-[14px] font-semibold text-text-primary">{neo.name}</p>
        <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 font-mono-tnum">
          <Stat label="Çap" value={fmtDiameter(neo.diameter_max_km)} />
          <Stat
            label="Hız"
            value={neo.relative_velocity_kms != null ? `${neo.relative_velocity_kms.toFixed(1)} km/s` : '—'}
          />
          <Stat label="Geçiş mesafesi" value={fmtMiss(neo.miss_distance_km)} />
          <Stat label="Risk skoru" value={neo.hybrid_score.toFixed(2)} />
        </dl>
        {neo.is_potentially_hazardous && (
          <p className="mt-2 font-mono-tnum text-[9px] font-medium uppercase tracking-wider text-threat-high">
            ⚠ Potansiyel tehlikeli (PHA)
          </p>
        )}
      </div>
    </div>
  );
}
