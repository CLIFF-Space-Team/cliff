'use client';

import { History } from 'lucide-react';

import { Surface } from '@/components/ui';
import { useHistoryToday, type HistoricalEvent } from '@/hooks/useHistoryToday';
import { useLanguage } from '@/providers/LanguageProvider';

const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const CATEGORY_LABEL: Record<HistoricalEvent['category'], { tr: string; en: string }> = {
  impact: { tr: 'Çarpma', en: 'Impact' },
  airburst: { tr: 'Hava patlaması', en: 'Airburst' },
  discovery: { tr: 'Keşif', en: 'Discovery' },
  mission: { tr: 'Görev', en: 'Mission' },
  flyby: { tr: 'Yakın geçiş', en: 'Flyby' },
  milestone: { tr: 'Kilometre taşı', en: 'Milestone' },
};

const SEVERITY_DOT: Record<HistoricalEvent['severity'], string> = {
  critical: 'bg-threat-critical',
  high: 'bg-threat-high',
  moderate: 'bg-threat-moderate',
  low: 'bg-threat-low',
  info: 'bg-text-secondary',
};

/**
 * "Geçmişte Bugün" — anniversary widget. Server returns up to a handful of
 * curated events for today's UTC date (or the closest prior day if today is
 * blank). Title shifts colour based on severity so a Tunguska-class entry
 * actually looks dramatic vs. an ordinary discovery.
 */
export function HistoryTodayCard() {
  const { data, isLoading } = useHistoryToday();
  const { locale } = useLanguage();

  if (isLoading) {
    return (
      <Surface elevation={1} className="p-3 animate-pulse">
        <div className="h-3 w-32 rounded bg-surface-2" />
        <div className="mt-2 h-5 w-3/4 rounded bg-surface-2" />
        <div className="mt-3 h-12 w-full rounded bg-surface-2" />
      </Surface>
    );
  }

  if (!data || data.events.length === 0) return null;

  const dateLabel =
    locale === 'tr'
      ? `${data.day} ${TR_MONTHS[data.month - 1] ?? ''}`
      : new Date(2000, data.month - 1, data.day).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'long',
        });

  return (
    <Surface elevation={1} className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
          <History className="size-3" />
          {locale === 'tr' ? 'GEÇMİŞTE BUGÜN' : 'ON THIS DAY'}
        </div>
        <span className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-secondary">
          {dateLabel}
          {!data.is_today && (
            <span className="ml-1 text-text-tertiary">(en yakın)</span>
          )}
        </span>
      </div>
      <ul className="space-y-2.5">
        {data.events.slice(0, 3).map((event, idx) => {
          const title = locale === 'tr' ? event.title_tr : event.title_en;
          const summary = locale === 'tr' ? event.summary_tr : event.summary_en;
          const category =
            CATEGORY_LABEL[event.category]?.[locale === 'tr' ? 'tr' : 'en'] ?? event.category;
          const yearsAgo = new Date().getUTCFullYear() - event.year;
          return (
            <li key={`${event.year}-${idx}`} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="flex items-baseline gap-1.5 text-[13px] font-semibold text-text-primary">
                  <span
                    className={`size-1.5 rounded-full ${SEVERITY_DOT[event.severity]}`}
                  />
                  {title}
                </h4>
                <span className="shrink-0 font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
                  {event.year < 0
                    ? `${Math.abs(event.year).toLocaleString()} ÖNCE`
                    : `${event.year} · ${yearsAgo} YIL ÖNCE`}
                </span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
                {category}
              </div>
              <p className="text-[12px] leading-relaxed text-text-secondary">{summary}</p>
            </li>
          );
        })}
      </ul>
    </Surface>
  );
}
