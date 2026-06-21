'use client';

import { Compass, Satellite } from 'lucide-react';

import { Skeleton, Surface } from '@/components/ui';
import { useIssPasses, type IssPass } from '@/hooks/useIssPasses';
import { cn } from '@/lib/utils';

const DIR_TR: Record<string, string> = {
  N: 'Kuzey',
  NE: 'Kuzeydoğu',
  E: 'Doğu',
  SE: 'Güneydoğu',
  S: 'Güney',
  SW: 'Güneybatı',
  W: 'Batı',
  NW: 'Kuzeybatı',
  NNE: 'Kuzey-kuzeydoğu',
  ENE: 'Doğu-kuzeydoğu',
  ESE: 'Doğu-güneydoğu',
  SSE: 'Güney-güneydoğu',
  SSW: 'Güney-güneybatı',
  WSW: 'Batı-güneybatı',
  WNW: 'Batı-kuzeybatı',
  NNW: 'Kuzey-kuzeybatı',
};

function dirLabel(d: string): string {
  return DIR_TR[d] ?? d;
}

function formatPassTime(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  const today = new Date();
  const sameDay =
    dt.getDate() === today.getDate() &&
    dt.getMonth() === today.getMonth() &&
    dt.getFullYear() === today.getFullYear();
  const time = dt.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (sameDay) return `Bugün ${time}`;
  const date = dt.toLocaleDateString('tr-TR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
  return `${date} ${time}`;
}

export function IssPassesWidget({ className }: { className?: string }) {
  const { data, isLoading } = useIssPasses(8);

  return (
    <Surface
      elevation={2}
      rounded="lg"
      className={cn('flex flex-col gap-3 p-4 sm:p-5', className)}
    >
      <header className="flex items-center gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2">
          <Satellite className="size-4 text-text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            ISS Türkiye Geçişleri
          </h3>
          <p className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
            NASA Spot the Station · 5 büyük şehir
          </p>
        </div>
      </header>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      )}

      {!isLoading && (data?.items.length ?? 0) === 0 && (
        <p className="font-mono-tnum text-[11px] text-text-tertiary">
          Yakın gelecek için yayınlanmış görsel geçiş yok. NASA günde bir
          güncelliyor.
        </p>
      )}

      {!isLoading && data?.items && data.items.length > 0 && (
        <ul className="space-y-2">
          {data.items.slice(0, 6).map((pass: IssPass, idx) => (
            <li
              key={`${pass.city}-${pass.starts_at}-${idx}`}
              className="flex items-center justify-between gap-3 rounded-md border border-white/[0.06] bg-surface-1 p-2.5"
            >
              <div>
                <div className="text-[12px] font-medium text-text-primary">
                  {pass.city}
                </div>
                <div className="mt-0.5 font-mono-tnum text-[10px] text-text-tertiary">
                  {formatPassTime(pass.starts_at)} · {pass.duration_min} dk ·
                  max {pass.max_elevation_deg}°
                </div>
              </div>
              <div className="flex items-center gap-1 text-right text-[11px] text-text-secondary">
                <Compass className="size-3 text-text-tertiary" />
                {dirLabel(pass.appears_dir)} → {dirLabel(pass.disappears_dir)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}
