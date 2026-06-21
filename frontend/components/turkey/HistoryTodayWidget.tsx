'use client';

import { CalendarDays, Sparkles } from 'lucide-react';

import { Badge, Skeleton, Surface } from '@/components/ui';
import { useHistoryToday } from '@/hooks/useHistoryToday';
import { cn } from '@/lib/utils';

const CATEGORY_TR: Record<string, string> = {
  impact: 'Çarpma',
  airburst: 'Hava Patlaması',
  discovery: 'Keşif',
  mission: 'Misyon',
  flyby: 'Yakın Geçiş',
  milestone: 'Dönüm Noktası',
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'text-threat-critical',
  high: 'text-threat-high',
  moderate: 'text-threat-moderate',
  low: 'text-threat-low',
  info: 'text-text-secondary',
};

export function HistoryTodayWidget({ className }: { className?: string }) {
  const { data, isLoading } = useHistoryToday();
  const events = data?.events ?? [];

  return (
    <Surface
      elevation={2}
      rounded="lg"
      className={cn('flex flex-col gap-3 p-4 sm:p-5', className)}
    >
      <header className="flex items-center gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2">
          <CalendarDays className="size-4 text-text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            Tarihte Bugün
          </h3>
          <p className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
            {data
              ? `${String(data.day).padStart(2, '0')}.${String(data.month).padStart(2, '0')} · ${data.is_today ? 'bugün' : 'en yakın yıldönümü'}`
              : '—'}
          </p>
        </div>
      </header>

      {isLoading && <Skeleton className="h-20" />}

      {!isLoading && events.length === 0 && (
        <p className="font-mono-tnum text-[11px] text-text-tertiary">
          Bu tarih için kayıtlı bir asteroit olayı yok.
        </p>
      )}

      {!isLoading && events.length > 0 && (
        <ul className="space-y-2.5">
          {events.slice(0, 3).map((evt, i) => (
            <li
              key={`${evt.year}-${i}`}
              className="rounded-md border border-white/[0.06] bg-surface-1 p-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    'font-mono-tnum text-lg font-semibold tabular-nums',
                    SEVERITY_COLOR[evt.severity] ?? 'text-text-primary',
                  )}
                >
                  {evt.year}
                </span>
                <Badge variant="ghost" className="text-[9px]">
                  {CATEGORY_TR[evt.category] ?? evt.category}
                </Badge>
              </div>
              <h4 className="mt-1 text-[12px] font-semibold text-text-primary">
                <Sparkles className="mr-1 inline size-3 text-text-tertiary" />
                {evt.title_tr}
              </h4>
              <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
                {evt.summary_tr}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}
