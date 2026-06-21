'use client';

import { useMemo } from 'react';

import { Skeleton, SourceLabel, StatusPill, Surface } from '@/components/ui';
import { formatDistanceKm, formatScore, formatVelocity } from '@/lib/format';
import { useDashboardStore } from '@/stores/dashboard';
import { useRiskSnapshot } from '@/hooks/useRiskSnapshot';
import { useThreatFiltersStore } from '@/stores/threatFilters';
import { cn } from '@/lib/utils';

import { RiskFilters } from './RiskFilters';

import type { RiskClass } from '@/lib/api-types';

const RANK: Record<RiskClass, number> = {
  minimal: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

export function RiskSnapshotPanel() {
  const { data, isLoading, isError, refetch, isFetching } = useRiskSnapshot(50);
  const selectedNeoId = useDashboardStore((s) => s.selectedNeoId);
  const setSelected = useDashboardStore((s) => s.setSelectedNeoId);
  const { minSeverity, hazardousOnly, search } = useThreatFiltersStore();

  const filtered = useMemo(() => {
    if (!data?.items) return [];
    const minRank = minSeverity ? RANK[minSeverity] : 0;
    const q = search.trim().toLowerCase();
    return data.items.filter((item) => {
      if (RANK[item.risk_class] < minRank) return false;
      if (hazardousOnly && !item.is_potentially_hazardous) return false;
      if (q) {
        const hay = `${item.name} ${item.neo_id} ${item.designation ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, minSeverity, hazardousOnly, search]);

  return (
    <Surface elevation={1} className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Risk Anlık Görünümü</h2>
          <p className="text-[11px] text-text-tertiary">
            {filtered.length} / {data?.items.length ?? 0} NEO
          </p>
        </div>
        <span className="font-mono-tnum text-[10px] text-text-tertiary">
          toplam · {data?.total ?? '—'}
        </span>
      </div>
      <RiskFilters />
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {isError && (
          <div className="space-y-2 px-4 py-6 text-sm text-threat-critical">
            <p>Risk verisi yüklenemedi. Backend bağlantısını kontrol edin.</p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-md border border-white/10 bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-text-primary hover:bg-surface-3 disabled:opacity-50"
            >
              {isFetching ? 'Deneniyor…' : 'Tekrar dene'}
            </button>
          </div>
        )}
        {isLoading && (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        )}
        {!isLoading && !isError && (
          <ul role="list" className="divide-y divide-white/[0.04]">
            {filtered.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-text-tertiary">
                {data?.items.length
                  ? 'Filtreyle eşleşen NEO yok.'
                  : 'Henüz risk kaydı yok. Scheduler ilk döngüsünü tamamladığında dolacak.'}
              </li>
            )}
            {filtered.map((item) => {
              const active = selectedNeoId === item.neo_id;
              return (
                <li key={item.neo_id}>
                  <button
                    type="button"
                    onClick={() => setSelected(active ? null : item.neo_id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/60',
                      active && 'bg-surface-2',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-text-primary">
                          {item.name}
                        </span>
                        {item.sentry_listed && (
                          <span className="rounded-md bg-threat-high/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-threat-high">
                            sentry
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 font-mono-tnum text-[11px] text-text-tertiary">
                        <span>{formatDistanceKm(item.miss_distance_km)}</span>
                        <span aria-hidden>·</span>
                        <span>{formatVelocity(item.relative_velocity_kms)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusPill severity={item.risk_class} size="sm">
                        {item.risk_class}
                      </StatusPill>
                      <span className="font-mono-tnum text-[11px] text-text-secondary">
                        {formatScore(item.hybrid_score)}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="border-t border-white/[0.06]">
        <SourceLabel
          source="NASA NeoWs + JPL Sentry + Horizons"
          updatedAt={data?.computed_at ?? null}
          href="https://cneos.jpl.nasa.gov/sentry/"
        />
      </div>
    </Surface>
  );
}
