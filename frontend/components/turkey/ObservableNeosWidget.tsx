'use client';

import { Eye, Telescope } from 'lucide-react';

import { Badge, Skeleton, Surface } from '@/components/ui';
import {
  useObservableNeos,
  type ObservableNeo,
} from '@/hooks/useObservableNeos';
import { cn } from '@/lib/utils';

const CLASS_LABELS: Record<ObservableNeo['observable_class'], string> = {
  naked_eye: 'Çıplak gözle',
  amateur_telescope: 'Amatör teleskop',
  professional: 'Profesyonel',
  out_of_reach: 'Erişim dışı',
};

const CLASS_COLORS: Record<ObservableNeo['observable_class'], string> = {
  naked_eye: 'text-threat-low',
  amateur_telescope: 'text-text-primary',
  professional: 'text-text-secondary',
  out_of_reach: 'text-text-tertiary',
};

export function ObservableNeosWidget({ className }: { className?: string }) {
  const { data, isLoading } = useObservableNeos(14, 16);

  return (
    <Surface
      elevation={2}
      rounded="lg"
      className={cn('flex flex-col gap-3 p-4 sm:p-5', className)}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2">
            <Telescope className="size-4 text-text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Türkiye Semasından Gözlenebilir
            </h3>
            <p className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
              Önümüzdeki 14 gün · m ≤ 16 · gece görünür
            </p>
          </div>
        </div>
      </header>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      )}

      {!isLoading && (data?.items.length ?? 0) === 0 && (
        <p className="font-mono-tnum text-[11px] text-text-tertiary">
          Bu pencerede parlak NEO geçişi yok. Gece teleskopla bekleyenler için
          dingin bir hafta.
        </p>
      )}

      {!isLoading && data?.items && data.items.length > 0 && (
        <ul className="space-y-2">
          {data.items.slice(0, 6).map((neo) => (
            <li
              key={neo.neo_id}
              className="flex items-center justify-between gap-3 rounded-md border border-white/[0.06] bg-surface-1 p-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[12px] font-medium text-text-primary">
                    {neo.name}
                  </span>
                  {neo.is_potentially_hazardous && (
                    <Badge variant="ghost" className="text-[9px]">
                      PHA
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 font-mono-tnum text-[10px] text-text-tertiary">
                  m={neo.apparent_magnitude.toFixed(1)}
                  {neo.phase_angle_deg != null && (
                    <> · faz {neo.phase_angle_deg.toFixed(0)}°</>
                  )}{' '}
                  · ⌀{' '}
                  {neo.diameter_max_km
                    ? `${(neo.diameter_max_km * 1000).toFixed(0)}m`
                    : '—'}
                </div>
                <div className="mt-0.5 font-mono-tnum text-[10px] text-text-tertiary">
                  {neo.best_time_tr ?? neo.observable_window}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={cn(
                    'flex items-center gap-1 text-[11px] font-semibold',
                    CLASS_COLORS[neo.observable_class],
                  )}
                >
                  <Eye className="size-3" />
                  {CLASS_LABELS[neo.observable_class]}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}
