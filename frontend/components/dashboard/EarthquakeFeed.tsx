'use client';

import { Activity, ExternalLink, Waves } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Surface } from '@/components/ui';
import { useEarthquakes } from '@/hooks/useEarthquakes';
import { cn } from '@/lib/utils';

/**
 * USGS earthquake feed. Filter chips switch between 24-hour and 7-day windows
 * with M2.5+ / M4.5+ magnitude floors. Sorted newest-first; tsunami advisories
 * surface as a teal pill on the right.
 */
export function EarthquakeFeed() {
  const [magFloor, setMagFloor] = useState<2.5 | 4.5>(4.5);
  const [window, setWindow] = useState<'day' | 'week'>('day');
  const { data, isLoading } = useEarthquakes(magFloor, window);

  const items = useMemo(() => data?.items ?? [], [data]);

  return (
    <Surface elevation={1} className="flex h-full min-h-0 flex-col p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
          <Activity className="size-3" />
          USGS DEPREMLER
        </div>
        <span className="font-mono-tnum text-[10px] text-text-tertiary">
          {data?.total ?? 0} olay
        </span>
      </div>

      <div className="mb-2 flex items-center gap-1">
        {([
          ['M2.5+', 2.5 as const],
          ['M4.5+', 4.5 as const],
        ] as const).map(([label, value]) => (
          <button
            key={label}
            type="button"
            onClick={() => setMagFloor(value)}
            className={cn(
              'rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors',
              magFloor === value
                ? 'bg-surface-3 text-text-primary'
                : 'text-text-tertiary hover:bg-surface-2',
            )}
          >
            {label}
          </button>
        ))}
        <span className="mx-1 text-text-tertiary">·</span>
        {([
          ['24h', 'day' as const],
          ['7g', 'week' as const],
        ] as const).map(([label, value]) => (
          <button
            key={label}
            type="button"
            onClick={() => setWindow(value)}
            className={cn(
              'rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors',
              window === value
                ? 'bg-surface-3 text-text-primary'
                : 'text-text-tertiary hover:bg-surface-2',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {isLoading && (
          <div className="space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded bg-surface-2/60" />
            ))}
          </div>
        )}
        {!isLoading && items.length === 0 && (
          <div className="py-6 text-center text-[11px] text-text-tertiary">
            Bu pencerede olay yok.
          </div>
        )}
        {items.map((eq) => {
          const magColor =
            eq.magnitude >= 7
              ? 'text-threat-critical'
              : eq.magnitude >= 6
                ? 'text-threat-high'
                : eq.magnitude >= 5
                  ? 'text-threat-moderate'
                  : 'text-text-primary';
          return (
            <a
              key={eq.id}
              href={eq.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 rounded p-1.5 hover:bg-surface-2"
            >
              <span
                className={cn(
                  'min-w-[44px] font-mono-tnum text-[14px] font-semibold tabular-nums',
                  magColor,
                )}
              >
                {eq.magnitude.toFixed(1)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[12px] text-text-primary">
                  <span className="truncate">{eq.place || 'unknown'}</span>
                  {eq.tsunami && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-blue-500/15 px-1 py-px text-[9px] font-semibold uppercase tracking-wider text-blue-300">
                      <Waves className="size-2.5" />
                      Tsunami
                    </span>
                  )}
                </div>
                <div className="font-mono-tnum text-[10px] text-text-tertiary">
                  {formatTime(eq.time)}
                  {eq.depth_km != null && ` · ${eq.depth_km.toFixed(0)} km derinlik`}
                  {eq.felt != null && eq.felt > 0 && ` · ${eq.felt} hissetti`}
                </div>
              </div>
              <ExternalLink className="mt-1 size-3 shrink-0 text-text-tertiary" />
            </a>
          );
        })}
      </div>
    </Surface>
  );
}

function formatTime(epochMs: number): string {
  if (!epochMs) return '';
  const diffMin = Math.round((Date.now() - epochMs) / 60_000);
  if (diffMin < 1) return 'şimdi';
  if (diffMin < 60) return `${diffMin} dk önce`;
  const hr = Math.round(diffMin / 60);
  if (hr < 24) return `${hr} sa önce`;
  const day = Math.round(hr / 24);
  return `${day} gün önce`;
}
