'use client';

import type { LucideIcon } from 'lucide-react';

import { Surface } from '@/components/ui';
import { cn } from '@/lib/utils';

interface Row {
  label: string;
  value: number;
  /** Optional small caption shown under the label (e.g. country full name). */
  caption?: string;
}

interface AdminTopListProps {
  title: string;
  icon: LucideIcon;
  rows: Row[];
  /** Bar accent colour */
  tone?: 'cyan' | 'violet' | 'amber';
  emptyHint?: string;
  /** Maximum number of rows to render (older entries clipped). Default 8. */
  limit?: number;
}

const TONE_BAR: Record<NonNullable<AdminTopListProps['tone']>, string> = {
  cyan: 'bg-cyan-500/30',
  violet: 'bg-violet-500/30',
  amber: 'bg-amber-500/30',
};

const TONE_TEXT: Record<NonNullable<AdminTopListProps['tone']>, string> = {
  cyan: 'text-cyan-300',
  violet: 'text-violet-300',
  amber: 'text-amber-300',
};

export function AdminTopList({
  title,
  icon: Icon,
  rows,
  tone = 'cyan',
  emptyHint = 'Henüz veri yok.',
  limit = 8,
}: AdminTopListProps) {
  const visible = rows.slice(0, limit);
  const max = Math.max(1, ...visible.map((r) => r.value));

  return (
    <Surface elevation={1} className="p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
        <Icon className="size-3" />
        {title}
      </div>
      {visible.length === 0 ? (
        <p className="text-[11px] text-text-tertiary">{emptyHint}</p>
      ) : (
        <ol className="space-y-1.5">
          {visible.map((row) => {
            const pct = (row.value / max) * 100;
            return (
              <li key={row.label} className="space-y-0.5">
                <div className="flex items-baseline justify-between gap-2 text-[11px]">
                  <span className="truncate text-text-primary" title={row.label}>
                    {row.label}
                  </span>
                  <span className={cn('font-mono-tnum tabular-nums', TONE_TEXT[tone])}>
                    {row.value.toLocaleString('tr-TR')}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded bg-white/[0.04]">
                  <div
                    className={cn('h-full rounded', TONE_BAR[tone])}
                    style={{ width: `${pct.toFixed(1)}%` }}
                  />
                </div>
                {row.caption && (
                  <div className="text-[10px] text-text-tertiary">{row.caption}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Surface>
  );
}
