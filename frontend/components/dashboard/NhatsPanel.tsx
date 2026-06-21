'use client';

import { Target } from 'lucide-react';

import { Skeleton, SourceLabel, Surface } from '@/components/ui';
import { useNhats } from '@/hooks/useNhats';

export function NhatsPanel() {
  const { data, isLoading, isError } = useNhats();

  const targets = (data?.data ?? [])
    .filter((t) => t.min_dv && Number.isFinite(t.min_dv.dv))
    .sort((a, b) => (a.min_dv?.dv ?? 99) - (b.min_dv?.dv ?? 99))
    .slice(0, 15);

  return (
    <Surface elevation={1} className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            <Target className="size-3.5" />
            İnsanlı Misyon Hedefleri
          </h2>
          <p className="text-[11px] text-text-tertiary">JPL NHATS · Δv ≤ 12 km/s</p>
        </div>
        <span className="font-mono-tnum text-[10px] text-text-tertiary">{data?.data?.length ?? 0}</span>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {isError && (
          <div className="px-4 py-6 text-sm text-threat-critical">NHATS verisi alınamadı.</div>
        )}
        {isLoading && (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        )}
        {!isLoading && !isError && (
          <ul role="list" className="divide-y divide-white/[0.04]">
            {targets.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-text-tertiary">
                Hedef yok.
              </li>
            )}
            {targets.map((t) => (
              <li
                key={t.des}
                className="flex items-baseline justify-between gap-2 px-4 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-text-primary">{t.fullname ?? t.des}</div>
                  <div className="font-mono-tnum text-[10px] text-text-tertiary">
                    {t.des} · {t.n_via_traj ?? '?'} trajektor
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono-tnum text-xs text-text-primary">
                    Δv {t.min_dv?.dv?.toFixed(1)} km/s
                  </div>
                  <div className="font-mono-tnum text-[10px] text-text-tertiary">
                    {t.min_dv?.dur} gün
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="border-t border-white/[0.06]">
        <SourceLabel
          source="JPL NHATS"
          href="https://cneos.jpl.nasa.gov/nhats/"
        />
      </div>
    </Surface>
  );
}
