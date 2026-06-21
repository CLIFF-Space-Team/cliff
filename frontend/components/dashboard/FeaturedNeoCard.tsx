'use client';

import { ArrowUpRight } from 'lucide-react';

import { StatusPill, Surface } from '@/components/ui';
import { useFeaturedNeo } from '@/hooks/useFeaturedNeo';
import { useDashboardStore } from '@/stores/dashboard';
import {
  formatDiameter,
  formatDistanceKm,
  formatScore,
  formatVelocity,
} from '@/lib/format';

/**
 * Dashboard hero — the single highest-priority threat. One focal number (the
 * hybrid score), the object name, and three key stats. Clicking focuses the
 * NEO in the 3D scene (sets `selectedNeoId`).
 */
export function FeaturedNeoCard() {
  const { data, isLoading } = useFeaturedNeo();
  const setSelected = useDashboardStore((s) => s.setSelectedNeoId);

  if (isLoading) {
    return (
      <Surface elevation={2} rounded="lg" className="animate-pulse p-5">
        <div className="h-3 w-28 rounded bg-surface-3" />
        <div className="mt-5 h-12 w-24 rounded bg-surface-3" />
        <div className="mt-4 h-4 w-40 rounded bg-surface-3" />
        <div className="mt-4 h-px w-full bg-surface-3" />
        <div className="mt-4 h-8 w-full rounded bg-surface-3" />
      </Surface>
    );
  }

  if (!data || !data.available || !data.neo_id) {
    return null;
  }

  const days = data.days_until_approach;
  const daysLabel =
    days === null || days === undefined
      ? null
      : days === 0
        ? 'bugün'
        : days === 1
          ? 'yarın'
          : `${days} gün`;

  const focus = () => setSelected(data.neo_id!);

  return (
    <Surface
      elevation={2}
      rounded="lg"
      className="group cursor-pointer p-5 transition-colors hover:border-white/[0.14]"
      onClick={focus}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          focus();
        }
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">
          En yüksek tehdit
        </span>
        {daysLabel && (
          <span className="font-mono-tnum text-[11px] text-text-secondary">
            yaklaşma · {daysLabel}
          </span>
        )}
      </div>

      {/* Focal number — the hybrid score. */}
      <div className="mt-4 flex items-end gap-3">
        <span className="font-mono-tnum text-[3.25rem] font-semibold leading-[0.9] tracking-tight tabular-nums text-text-primary">
          {formatScore(data.hybrid_score ?? 0)}
        </span>
        {data.risk_class && (
          <StatusPill severity={data.risk_class} size="sm" className="mb-1.5">
            {data.risk_class}
          </StatusPill>
        )}
      </div>

      <h3 className="mt-3 truncate text-[15px] font-semibold text-text-primary">
        {data.name}
      </h3>

      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-4 font-mono-tnum">
        <Stat label="çap" value={formatDiameter(data.diameter_max_km ?? null)} />
        <Stat label="mesafe" value={formatDistanceKm(data.miss_distance_km ?? null)} />
        <Stat label="hız" value={formatVelocity(data.relative_velocity_kms ?? null)} />
      </dl>

      <div className="mt-4 flex items-center justify-end gap-1 text-[11px] font-medium uppercase tracking-wider text-text-secondary transition-colors group-hover:text-text-primary">
        İncele
        <ArrowUpRight className="size-3.5" />
      </div>
    </Surface>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[9px] uppercase tracking-wider text-text-tertiary">{label}</dt>
      <dd className="mt-0.5 text-[13px] text-text-primary">{value}</dd>
    </div>
  );
}
