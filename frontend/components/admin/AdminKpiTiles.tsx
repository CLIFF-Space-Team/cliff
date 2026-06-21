'use client';

import { Activity, BarChart3, Eye, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Surface } from '@/components/ui';
import { cn } from '@/lib/utils';

interface AdminKpiTilesProps {
  todayViews: number;
  todayUniques: number;
  liveNow: number | null;
  totalViews90d: number;
}

interface Tile {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: 'info' | 'success' | 'event';
}

const TONE_BG: Record<Tile['tone'], string> = {
  info: 'bg-surface-2',
  success: 'bg-emerald-500/10',
  event: 'bg-cyan-500/10',
};

const TONE_TEXT: Record<Tile['tone'], string> = {
  info: 'text-text-primary',
  success: 'text-emerald-300',
  event: 'text-cyan-300',
};

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('tr-TR');
}

export function AdminKpiTiles({
  todayViews,
  todayUniques,
  liveNow,
  totalViews90d,
}: AdminKpiTilesProps) {
  const tiles: Tile[] = [
    {
      label: 'Bugün · Görüntüleme',
      value: fmt(todayViews),
      hint: 'tüm sayfalar (UTC)',
      icon: Eye,
      tone: 'info',
    },
    {
      label: 'Bugün · Tekil Ziyaretçi',
      value: fmt(todayUniques),
      hint: 'farklı IP',
      icon: Users,
      tone: 'info',
    },
    {
      label: 'Şu An Online',
      value: liveNow == null ? '—' : fmt(liveNow),
      hint: liveNow == null ? 'WS bağlanıyor…' : 'aktif WebSocket',
      icon: Activity,
      tone: 'success',
    },
    {
      label: 'Toplam · 90 Gün',
      value: fmt(totalViews90d),
      hint: 'kümülatif görüntüleme',
      icon: BarChart3,
      tone: 'event',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <Surface key={t.label} elevation={1} className="p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            <span
              className={cn(
                'inline-flex size-6 items-center justify-center rounded',
                TONE_BG[t.tone],
              )}
            >
              <t.icon className={cn('size-3', TONE_TEXT[t.tone])} />
            </span>
            {t.label}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={cn(
                'font-mono-tnum text-2xl font-bold leading-none',
                TONE_TEXT[t.tone],
              )}
            >
              {t.value}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-text-tertiary">{t.hint}</div>
        </Surface>
      ))}
    </div>
  );
}
