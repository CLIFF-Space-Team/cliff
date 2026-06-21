'use client';

import { Radio } from 'lucide-react';
import { useMemo } from 'react';

import { Skeleton, Surface } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { EarthCategoryMeta, EarthEvent } from '@/lib/earth-types';

import { EventCategoryIcon } from '../EventCategoryIcon';

const SEVERITY_DOT: Record<EarthEvent['severity'], string> = {
  critical: 'bg-threat-critical',
  high: 'bg-threat-high',
  moderate: 'bg-threat-moderate',
  low: 'bg-threat-low',
  info: 'bg-white/40',
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'şimdi';
  if (m < 60) return `${m}dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}sa`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}gün`;
  return `${Math.floor(d / 30)}ay`;
}

interface LiveFeedProps {
  events: EarthEvent[];
  categoryMap: Map<string, EarthCategoryMeta>;
  selectedId: string | null;
  isLoading: boolean;
  sortBy: 'recent' | 'severity';
  onSortChange: (s: 'recent' | 'severity') => void;
  onSelect: (e: EarthEvent) => void;
}

/**
 * The "CANLI AKIŞ" rail — a live list of natural events. Severity dot +
 * category icon + title + relative time + primary metric. Clicking a row
 * selects the event (highlights its globe beacon and flies the camera to it).
 */
export function LiveFeed({
  events,
  categoryMap,
  selectedId,
  isLoading,
  sortBy,
  onSortChange,
  onSelect,
}: LiveFeedProps) {
  const sorted = useMemo(() => events, [events]);

  return (
    <Surface elevation={1} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5 items-center justify-center">
            <span className="absolute inline-flex size-2.5 animate-ping rounded-full bg-threat-critical/70" />
            <span className="relative inline-flex size-1.5 rounded-full bg-threat-critical" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-text-primary">
            Canlı Akış
          </span>
          <span className="font-mono-tnum text-[11px] text-text-tertiary">
            {events.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5 rounded-md border border-white/[0.06] bg-surface-2 p-0.5">
          {(['recent', 'severity'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSortChange(s)}
              className={cn(
                'rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
                sortBy === s
                  ? 'bg-white/[0.08] text-text-primary'
                  : 'text-text-tertiary hover:text-text-primary',
              )}
            >
              {s === 'recent' ? 'Yeni' : 'Şiddet'}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {!isLoading && sorted.length === 0 && (
          <div className="flex h-full items-center justify-center px-4 py-10 text-center">
            <div className="flex flex-col items-center gap-2 text-text-tertiary">
              <Radio className="size-5" />
              <p className="text-[12px]">Filtrelere uyan canlı olay yok.</p>
            </div>
          </div>
        )}
        {!isLoading &&
          sorted.map((event) => {
            const cat = categoryMap.get(event.category);
            const active = event.id === selectedId;
            const accent = cat?.accent_hex ?? '#ffffff';
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelect(event)}
                className={cn(
                  'group flex w-full items-start gap-2.5 border-b border-white/[0.04] px-3 py-2.5 text-left transition-colors',
                  active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]',
                )}
              >
                <span className="relative mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-2">
                  <span
                    aria-hidden
                    className={cn(
                      'absolute -right-0.5 -top-0.5 size-2 rounded-full ring-2 ring-surface-1',
                      SEVERITY_DOT[event.severity],
                    )}
                  />
                  <EventCategoryIcon
                    icon={cat?.icon ?? 'alert-circle'}
                    size={14}
                    className="text-text-secondary"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[12.5px] font-medium text-text-primary">
                      {event.title}
                    </span>
                    <span className="shrink-0 font-mono-tnum text-[10px] text-text-tertiary">
                      {relativeTime(event.updated_at)}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-[11px] text-text-tertiary">
                    <span style={{ color: accent }}>{cat?.label_tr ?? event.category}</span>
                    {event.primary_metric && (
                      <>
                        <span className="text-text-disabled">·</span>
                        <span className="font-mono-tnum text-text-secondary">
                          {event.primary_metric.value.toLocaleString('tr-TR', {
                            maximumFractionDigits: 1,
                          })}{' '}
                          {event.primary_metric.unit}
                        </span>
                      </>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
      </div>
    </Surface>
  );
}
