'use client';

import { Activity, Globe2, Layers, ShieldAlert } from 'lucide-react';

import { Skeleton, Surface } from '@/components/ui';
import type { EarthEventSummary } from '@/lib/earth-types';

interface EarthKpiBarProps {
  summary: EarthEventSummary | undefined;
  isLoading: boolean;
}

/**
 * 4-up KPI ribbon mirroring the asteroid dashboard's tile pattern.
 * Numbers come straight from `/api/v1/earth/summary` (computed
 * server-side from Redis, no client aggregation needed).
 */
export function EarthKpiBar({ summary, isLoading }: EarthKpiBarProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={idx} className="h-[72px] w-full" />
        ))}
      </div>
    );
  }

  const totalCategories = Object.keys(summary.by_category).length;
  const criticalPlusHigh =
    (summary.by_severity.critical ?? 0) + (summary.by_severity.high ?? 0);

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
      <KpiTile
        icon={<Globe2 className="size-3.5" />}
        label="Aktif Olay"
        value={summary.total_open}
        caption="açık (canlı)"
      />
      <KpiTile
        icon={<Activity className="size-3.5" />}
        label="Son 24 Saat"
        value={summary.last_24h}
        caption="güncellenen"
      />
      <KpiTile
        icon={<ShieldAlert className="size-3.5" />}
        label="Kritik + Yüksek"
        value={criticalPlusHigh}
        caption="izlenen"
        tone="critical"
      />
      <KpiTile
        icon={<Layers className="size-3.5" />}
        label="Kategori"
        value={totalCategories}
        caption="aktif tür"
      />
    </div>
  );
}

interface KpiTileProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  caption: string;
  tone?: 'default' | 'critical';
}

function KpiTile({ icon, label, value, caption, tone = 'default' }: KpiTileProps) {
  const valueClasses =
    tone === 'critical' && value > 0
      ? 'text-threat-high'
      : 'text-text-primary';
  return (
    <Surface elevation={1} className="flex flex-col gap-1 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-tertiary">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`font-mono-tnum text-xl font-semibold tabular-nums sm:text-2xl ${valueClasses}`}>
          {value.toLocaleString('tr-TR')}
        </span>
        <span className="truncate text-[10px] text-text-tertiary">{caption}</span>
      </div>
    </Surface>
  );
}
