'use client';

import { ExternalLink, Newspaper } from 'lucide-react';
import { useMemo } from 'react';

import { Surface } from '@/components/ui';
import { useTurkishPress, type PressArticle } from '@/hooks/useTurkishPress';
import {
  PRESS_TOPIC_LABELS,
  TURKISH_PRESS,
  type PressItem,
} from '@/lib/turkish-press';

/**
 * "Basında Asteroit" — Türkçe basın aggregator'ını gösterir.
 *
 * Canlı backend feed'i (`/api/v1/earth/turkish-press`) varsa onu, boşsa
 * elle küratörlenmiş `TURKISH_PRESS` arşivine düşer. Linkler yeni sekmede
 * `rel="noopener noreferrer"` ile açılır.
 */
interface PressRow {
  id: string;
  date: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  topicLabel: string;
}

const MAX_ITEMS = 6;

function topicLabelFor(topic: string): string {
  return (PRESS_TOPIC_LABELS as Record<string, string>)[topic] ?? topic;
}

function fromArticle(a: PressArticle): PressRow {
  return {
    id: a.id,
    date: a.date,
    title: a.title,
    summary: a.summary,
    url: a.url,
    source: a.source,
    topicLabel: topicLabelFor(a.topic),
  };
}

function fromItem(p: PressItem): PressRow {
  return {
    id: p.id,
    date: p.date,
    title: p.title,
    summary: p.summary,
    url: p.url,
    source: p.source,
    topicLabel: PRESS_TOPIC_LABELS[p.topic],
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function PressWidget() {
  const query = useTurkishPress();

  const { rows, usingFallback } = useMemo(() => {
    const live = query.data?.items ?? [];
    const fallback = live.length === 0;
    const base: PressRow[] = fallback
      ? TURKISH_PRESS.map(fromItem)
      : live.map(fromArticle);
    return { rows: base.slice(0, MAX_ITEMS), usingFallback: fallback };
  }, [query.data]);

  if (rows.length === 0) return null;

  return (
    <Surface elevation={1} rounded="lg" className="p-3">
      <div className="mb-2 flex items-center gap-2">
        <Newspaper className="size-3.5 text-text-secondary" aria-hidden />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Basında Asteroit
        </h3>
        {usingFallback && (
          <span className="ml-auto font-mono-tnum text-[9px] uppercase tracking-wider text-text-tertiary">
            arşiv
          </span>
        )}
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-md border border-white/[0.06] bg-surface-1 p-2.5 transition-colors hover:border-white/[0.18] hover:bg-surface-2"
            >
              <div className="flex items-center gap-2">
                <span className="shrink-0 rounded border border-white/[0.08] bg-surface-2 px-1 font-mono-tnum text-[9px] uppercase tracking-wider text-text-tertiary">
                  {r.topicLabel}
                </span>
                <span className="truncate font-mono-tnum text-[10px] text-text-tertiary">
                  {r.source}
                </span>
                <span className="ml-auto shrink-0 font-mono-tnum text-[10px] text-text-tertiary">
                  {formatDate(r.date)}
                </span>
                <ExternalLink
                  className="size-3 shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <p className="mt-1 line-clamp-2 text-[12px] font-medium leading-snug text-text-primary">
                {r.title}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-text-tertiary">
                {r.summary}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </Surface>
  );
}
