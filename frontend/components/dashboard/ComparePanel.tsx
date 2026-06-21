'use client';

import { ArrowRightLeft, X } from 'lucide-react';
import { useMemo } from 'react';

import { Skeleton, StatusPill, Surface } from '@/components/ui';
import { useNeoRiskDetail } from '@/hooks/useNeoDetail';
import { useRiskSnapshot } from '@/hooks/useRiskSnapshot';
import {
  formatDiameter,
  formatDistanceKm,
  formatScore,
  formatTimestamp,
  formatVelocity,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import { useCompareStore } from '@/stores/compareStore';

import type { RiskRecord } from '@/lib/api-types';

export function ComparePanel() {
  const picks = useCompareStore((s) => s.picks);
  const setSlot = useCompareStore((s) => s.setSlot);
  const clear = useCompareStore((s) => s.clear);

  return (
    <Surface elevation={1} className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            <ArrowRightLeft className="size-3.5" />
            NEO Karşılaştırma
          </h2>
          <p className="text-[11px] text-text-tertiary">İki NEO yan yana metrik diff</p>
        </div>
        {picks.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-[11px] text-text-tertiary hover:text-text-primary"
          >
            temizle
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-px bg-white/[0.04]">
        <Slot slot={0} neoId={picks[0] ?? null} setSlot={setSlot} />
        <Slot slot={1} neoId={picks[1] ?? null} setSlot={setSlot} />
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {picks.length === 2 ? (
          <ComparisonRows neoA={picks[0]!} neoB={picks[1]!} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-text-tertiary">
            <ArrowRightLeft className="size-6 opacity-50" />
            <p className="text-xs">
              Risk listesinden iki NEO seç. Risk panelinden &quot;Karşılaştır&quot; tuşu veya
              aşağıdaki dropdown&apos;lardan ekleyebilirsin.
            </p>
          </div>
        )}
      </div>
    </Surface>
  );
}

function Slot({
  slot,
  neoId,
  setSlot,
}: {
  slot: 0 | 1;
  neoId: string | null;
  setSlot: (slot: 0 | 1, neoId: string | null) => void;
}) {
  const { data: snap } = useRiskSnapshot(50);
  const item = useMemo(
    () => (neoId ? snap?.items.find((i) => i.neo_id === neoId) : null),
    [neoId, snap],
  );
  return (
    <div className="bg-surface-1 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
          slot {slot + 1}
        </span>
        {neoId && (
          <button
            type="button"
            onClick={() => setSlot(slot, null)}
            className="text-text-tertiary hover:text-text-primary"
          >
            <X className="size-3" />
          </button>
        )}
      </div>
      <select
        value={neoId ?? ''}
        onChange={(e) => setSlot(slot, e.target.value || null)}
        className="w-full truncate rounded-md border border-white/10 bg-surface-2 px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-white/30"
      >
        <option value="">— NEO seç —</option>
        {snap?.items?.map((i) => (
          <option key={i.neo_id} value={i.neo_id}>
            {i.name} ({i.risk_class})
          </option>
        ))}
      </select>
      {item && (
        <div className="mt-2 flex items-center gap-2">
          <StatusPill severity={item.risk_class} size="sm">
            {item.risk_class}
          </StatusPill>
          <span className="font-mono-tnum text-[11px] text-text-secondary">
            {formatScore(item.hybrid_score)}
          </span>
        </div>
      )}
    </div>
  );
}

function ComparisonRows({ neoA, neoB }: { neoA: string; neoB: string }) {
  const a = useNeoRiskDetail(neoA);
  const b = useNeoRiskDetail(neoB);

  if (a.isLoading || b.isLoading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }
  if (!a.data || !b.data) {
    return (
      <div className="px-4 py-6 text-center text-xs text-threat-critical">
        Karşılaştırılacak veriler alınamadı.
      </div>
    );
  }

  const rows = buildRows(a.data, b.data);

  return (
    <table className="w-full table-fixed text-xs">
      <thead>
        <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-text-tertiary">
          <th className="w-1/3 px-3 py-2 text-left font-medium">Metrik</th>
          <th className="w-1/3 px-3 py-2 text-right font-medium">{a.data.name}</th>
          <th className="w-1/3 px-3 py-2 text-right font-medium">{b.data.name}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/[0.04]">
        {rows.map((row) => (
          <tr key={row.label}>
            <td className="px-3 py-2 text-text-secondary">{row.label}</td>
            <td
              className={cn(
                'px-3 py-2 text-right font-mono-tnum',
                row.winner === 'a' ? 'font-semibold text-text-primary' : 'text-text-secondary',
              )}
            >
              {row.aValue}
            </td>
            <td
              className={cn(
                'px-3 py-2 text-right font-mono-tnum',
                row.winner === 'b' ? 'font-semibold text-text-primary' : 'text-text-secondary',
              )}
            >
              {row.bValue}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface Row {
  label: string;
  aValue: string;
  bValue: string;
  /** Which side is "more dangerous" (highlighted bold). null = no highlight. */
  winner: 'a' | 'b' | null;
}

function buildRows(a: RiskRecord, b: RiskRecord): Row[] {
  const rows: Row[] = [];
  rows.push({
    label: 'Risk sınıfı',
    aValue: a.risk_class,
    bValue: b.risk_class,
    winner: rankOf(a.risk_class) > rankOf(b.risk_class) ? 'a' : rankOf(b.risk_class) > rankOf(a.risk_class) ? 'b' : null,
  });
  rows.push({
    label: 'Hibrit skor',
    aValue: formatScore(a.hybrid_score),
    bValue: formatScore(b.hybrid_score),
    winner: a.hybrid_score > b.hybrid_score ? 'a' : b.hybrid_score > a.hybrid_score ? 'b' : null,
  });
  rows.push({
    label: 'ML güven',
    aValue: `${(a.ml_confidence * 100).toFixed(0)}%`,
    bValue: `${(b.ml_confidence * 100).toFixed(0)}%`,
    winner: null,
  });
  rows.push({
    label: 'Çap (max)',
    aValue: formatDiameter(a.diameter_max_km),
    bValue: formatDiameter(b.diameter_max_km),
    winner: cmpNumeric(a.diameter_max_km, b.diameter_max_km),
  });
  rows.push({
    label: 'Min mesafe',
    aValue: formatDistanceKm(a.miss_distance_km),
    bValue: formatDistanceKm(b.miss_distance_km),
    winner: cmpNumericAsc(a.miss_distance_km, b.miss_distance_km),
  });
  rows.push({
    label: 'Hız',
    aValue: formatVelocity(a.relative_velocity_kms),
    bValue: formatVelocity(b.relative_velocity_kms),
    winner: cmpNumeric(a.relative_velocity_kms, b.relative_velocity_kms),
  });
  rows.push({
    label: 'Yaklaşma',
    aValue: formatTimestamp(a.next_approach_at),
    bValue: formatTimestamp(b.next_approach_at),
    winner: null,
  });
  rows.push({
    label: 'PHA',
    aValue: a.is_potentially_hazardous ? 'Evet' : 'Hayır',
    bValue: b.is_potentially_hazardous ? 'Evet' : 'Hayır',
    winner: a.is_potentially_hazardous && !b.is_potentially_hazardous
      ? 'a'
      : !a.is_potentially_hazardous && b.is_potentially_hazardous
        ? 'b'
        : null,
  });
  rows.push({
    label: 'Sentry-listed',
    aValue: a.sentry_listed ? 'Evet' : 'Hayır',
    bValue: b.sentry_listed ? 'Evet' : 'Hayır',
    winner: a.sentry_listed && !b.sentry_listed ? 'a' : !a.sentry_listed && b.sentry_listed ? 'b' : null,
  });
  if (a.monte_carlo && b.monte_carlo) {
    rows.push({
      label: 'MC p1',
      aValue: formatDistanceKm(a.monte_carlo.p1_km),
      bValue: formatDistanceKm(b.monte_carlo.p1_km),
      winner: cmpNumericAsc(a.monte_carlo.p1_km, b.monte_carlo.p1_km),
    });
    rows.push({
      label: 'MC p99',
      aValue: formatDistanceKm(a.monte_carlo.p99_km),
      bValue: formatDistanceKm(b.monte_carlo.p99_km),
      winner: cmpNumericAsc(a.monte_carlo.p99_km, b.monte_carlo.p99_km),
    });
  }
  if (a.geo_distance_au != null || b.geo_distance_au != null) {
    rows.push({
      label: 'Şu an Earth\'ten (AU)',
      aValue: a.geo_distance_au != null ? a.geo_distance_au.toFixed(3) : '—',
      bValue: b.geo_distance_au != null ? b.geo_distance_au.toFixed(3) : '—',
      winner: cmpNumericAsc(a.geo_distance_au, b.geo_distance_au),
    });
  }
  return rows;
}

function rankOf(c: RiskRecord['risk_class']): number {
  return { minimal: 0, low: 1, moderate: 2, high: 3, critical: 4 }[c] ?? 0;
}

function cmpNumeric(a: number | null | undefined, b: number | null | undefined): 'a' | 'b' | null {
  if (a == null || b == null) return null;
  if (a > b) return 'a';
  if (b > a) return 'b';
  return null;
}

function cmpNumericAsc(a: number | null | undefined, b: number | null | undefined): 'a' | 'b' | null {
  if (a == null || b == null) return null;
  if (a < b) return 'a';
  if (b < a) return 'b';
  return null;
}
