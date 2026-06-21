'use client';

import { ArrowDownAZ, Clock, Flame as FlameIcon, Inbox, Search } from 'lucide-react';
import { useMemo } from 'react';

import { Skeleton, Surface } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { EarthCategoryMeta, EarthEvent } from '@/lib/earth-types';

import { EventCategoryIcon } from './EventCategoryIcon';
import { SeverityBadge } from './SeverityBadge';

interface EventListProps {
  events: EarthEvent[];
  categories: EarthCategoryMeta[];
  selectedId: string | null;
  isLoading: boolean;
  total: number;
  sortBy: 'recent' | 'severity';
  onSelect: (event: EarthEvent) => void;
  onSortChange: (sort: 'recent' | 'severity') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

/**
 * Sticky-header sidebar list of all currently filtered events. Click
 * → bubble up `onSelect` (parent syncs 3D + 2D + detail panel). Sort
 * toggle and a fuzzy in-list search are local — they don't touch the
 * server query, just the rendered slice.
 */
export function EventList({
  events,
  categories,
  selectedId,
  isLoading,
  total,
  sortBy,
  onSelect,
  onSortChange,
  searchQuery,
  onSearchChange,
}: EventListProps) {
  const categoryByCode = useMemo(() => {
    const m = new Map<string, EarthCategoryMeta>();
    for (const c of categories) m.set(c.code, c);
    return m;
  }, [categories]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.trim().toLowerCase();
    return events.filter((e) => e.title.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
  }, [events, searchQuery]);

  return (
    <Surface elevation={1} className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
            Olaylar
          </span>
          <span className="font-mono-tnum text-[10px] text-text-tertiary tabular-nums">
            {filtered.length}/{total}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <SortButton active={sortBy === 'recent'} onClick={() => onSortChange('recent')} icon={<Clock className="size-3" />} label="Yeni" />
          <SortButton active={sortBy === 'severity'} onClick={() => onSortChange('severity')} icon={<FlameIcon className="size-3" />} label="Şiddet" />
        </div>
      </div>

      <div className="border-b border-white/[0.06] px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Olay ara…"
            className="w-full rounded-md border border-white/[0.08] bg-surface-2 py-1 pl-7 pr-2 text-[12px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-white/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-1.5 p-2">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {filtered.map((event) => {
              const meta = categoryByCode.get(event.category);
              const isSelected = event.id === selectedId;
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(event)}
                    className={cn(
                      'flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-white/[0.03]',
                      isSelected && 'bg-white/[0.05]',
                    )}
                  >
                    <span
                      className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-md"
                      style={{
                        background: `${meta?.accent_hex ?? '#888'}20`,
                        color: meta?.accent_hex ?? '#fff',
                      }}
                    >
                      {meta ? <EventCategoryIcon icon={meta.icon} size={12} /> : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[12px] font-medium text-text-primary">
                          {event.title}
                        </p>
                        <SeverityBadge severity={event.severity} className="shrink-0" />
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-text-tertiary">
                        <span className="truncate">{meta?.label_tr ?? event.category}</span>
                        <span aria-hidden>·</span>
                        <span className="font-mono-tnum tabular-nums">{relativeTime(event.updated_at)}</span>
                        {event.primary_metric && (
                          <>
                            <span aria-hidden>·</span>
                            <span className="font-mono-tnum tabular-nums">
                              {event.primary_metric.value.toLocaleString('tr-TR', {
                                maximumFractionDigits: 1,
                              })}{' '}
                              {event.primary_metric.unit}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Surface>
  );
}

function SortButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors',
        active ? 'bg-white/[0.08] text-text-primary' : 'text-text-tertiary hover:text-text-primary',
      )}
      aria-pressed={active}
    >
      <ArrowDownAZ className={cn('size-3 opacity-0', active && 'opacity-0')} />
      {icon}
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <Inbox className="size-6 text-text-tertiary" />
      <p className="text-[12px] text-text-tertiary">Filtrelere uyan olay yok.</p>
    </div>
  );
}

function relativeTime(iso: string): string {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return '—';
  const diff = Date.now() - target;
  if (diff < 60_000) return 'şimdi';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gün`;
  const months = Math.floor(days / 30);
  return `${months} ay`;
}
