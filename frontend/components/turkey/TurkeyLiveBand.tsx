'use client';

import { motion } from 'framer-motion';
import { Activity, Flame } from 'lucide-react';
import { useMemo } from 'react';

import { useEarthquakesKoeri } from '@/hooks/useEarthquakesKoeri';
import { useEarthquakesTr } from '@/hooks/useEarthquakesTr';
import { useWildfires } from '@/hooks/useWildfires';
import { cn } from '@/lib/utils';

interface BandItem {
  key: string;
  icon: typeof Flame;
  label: string;
  detail: string;
  /** ISO timestamp — sıralama ve "X önce" hesabı için */
  at: string;
  severity: 'low' | 'moderate' | 'high';
  /** Kaynak rozet — AFAD/KOERI/FIRMS */
  source?: string;
}

/**
 * AFAD + KOERI olaylarını dedupe et: aynı dakika içinde ve <5 km mesafede
 * aynı magnitude eşleşmesi varsa tek olay kabul edilir; daha fazla detay
 * sağlayan kaynak (önce AFAD) tutulur.
 */
function dedupeQuakes<
  T extends {
    id: string;
    magnitude: number;
    time: number;
    lat: number | null;
    lon: number | null;
  },
>(rows: T[]): T[] {
  const seen: T[] = [];
  for (const row of rows) {
    const dup = seen.find((existing) => {
      const dt = Math.abs((existing.time ?? 0) - (row.time ?? 0));
      if (dt > 90_000) return false; // 90 sn
      if (Math.abs((existing.magnitude ?? 0) - (row.magnitude ?? 0)) > 0.4) return false;
      if (existing.lat == null || existing.lon == null || row.lat == null || row.lon == null) {
        return false;
      }
      const dLat = Math.abs(existing.lat - row.lat);
      const dLon = Math.abs(existing.lon - row.lon);
      return dLat < 0.08 && dLon < 0.08; // ~8 km
    });
    if (!dup) seen.push(row);
  }
  return seen;
}

/**
 * Türkiye'ye özel canlı şerit — sticky/üstte kayar.
 *
 * Kaynaklar:
 *  - AFAD M2.5+ son 24 saat depremleri
 *  - NASA FIRMS aktif yangınları (TUR)
 *
 * Etkinlikte vali / MEM'in "biz neden bu projeyle ilgilenelim" sorusuna
 * cevap veren ilk vitrin. Veri yokken bant gizleniyor — boş görünmesin.
 */
export function TurkeyLiveBand({ className }: { className?: string }) {
  const afadQuakes = useEarthquakesTr(2.5, 24);
  const koeriQuakes = useEarthquakesKoeri(2.5, 24);
  const fires = useWildfires('TUR', 1);

  const items = useMemo<BandItem[]>(() => {
    const out: BandItem[] = [];

    // İki feed birleştir + dedupe (KOERI veriyi AFAD ile çakışıyorsa AFAD tutulur)
    const combined = [
      ...(afadQuakes.data?.items ?? []).map((q) => ({ ...q, _src: 'AFAD' })),
      ...(koeriQuakes.data?.items ?? []).map((q) => ({ ...q, _src: 'KOERI' })),
    ];
    const unique = dedupeQuakes(combined);

    for (const q of unique) {
      const mag = q.magnitude ?? 0;
      const severity: BandItem['severity'] =
        mag >= 5 ? 'high' : mag >= 4 ? 'moderate' : 'low';
      out.push({
        key: `q-${q.id}`,
        icon: Activity,
        label: `${q.place || 'Türkiye'} · M${mag.toFixed(1)}`,
        detail: q.depth_km != null ? `${q.depth_km.toFixed(1)} km` : '',
        at: new Date(q.time).toISOString(),
        severity,
        source: q._src,
      });
    }

    for (const [idx, f] of (fires.data?.items ?? []).entries()) {
      const lat = typeof f.lat === 'number' ? f.lat.toFixed(2) : '';
      const lng = typeof f.lon === 'number' ? f.lon.toFixed(2) : '';
      const where = lat && lng ? `${lat}°, ${lng}°` : 'Türkiye';
      out.push({
        key: `f-${lat}-${lng}-${f.acq_at ?? idx}`,
        icon: Flame,
        label: `Aktif yangın · ${where}`,
        detail:
          f.brightness_k != null ? `parlaklık ${Math.round(f.brightness_k)} K` : '',
        at: f.acq_at
          ? new Date(f.acq_at * 1000).toISOString()
          : new Date().toISOString(),
        severity: 'moderate',
      });
    }

    return out
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, 18);
  }, [afadQuakes.data, koeriQuakes.data, fires.data]);

  const isLoading = afadQuakes.isLoading && koeriQuakes.isLoading && fires.isLoading;
  const hasItems = items.length > 0;

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 glass-bar border-b border-white/10 px-3 py-2',
          className,
        )}
      >
        <BandLabel />
        <div className="h-3 w-32 animate-pulse rounded-full bg-white/[0.08]" />
      </div>
    );
  }

  if (!hasItems) {
    // 0 öğe = ya feed kapalı ya da gerçekten sakin bir gün — sessizce gizle.
    return null;
  }

  // Marquee için 2x render — ortadan bittiğinde başa dönüş kusursuz olsun.
  const doubled = [...items, ...items];

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 overflow-hidden glass-bar border-b border-white/10 px-3 py-2',
        className,
      )}
      role="region"
      aria-label="Türkiye canlı durum şeridi"
    >
      <BandLabel />
      <div
        className="relative flex-1 overflow-hidden"
        // Pause animation while user hovers (desktop only — touch users
        // get a static read on tap because the page itself blocks scroll).
        onMouseEnter={(e) => {
          const child = e.currentTarget.firstElementChild as HTMLElement | null;
          if (child) child.style.animationPlayState = 'paused';
        }}
        onMouseLeave={(e) => {
          const child = e.currentTarget.firstElementChild as HTMLElement | null;
          if (child) child.style.animationPlayState = 'running';
        }}
      >
        <motion.div
          className="flex shrink-0 items-center gap-6 whitespace-nowrap will-change-transform"
          animate={{ x: ['0%', '-50%'] }}
          transition={{
            duration: Math.max(30, items.length * 4),
            ease: 'linear',
            repeat: Infinity,
          }}
        >
          {doubled.map((item, idx) => (
            <BandPill key={`${item.key}-${idx}`} item={item} />
          ))}
        </motion.div>
        {/* Edge fade so text doesn't slam into the label */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-surface-1 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface-1 to-transparent"
          aria-hidden
        />
      </div>
    </div>
  );
}

function BandLabel() {
  return (
    <div className="flex shrink-0 items-center gap-2 pr-3">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-pulse-gentle rounded-full bg-threat-high opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-threat-high" />
      </span>
      <span className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-secondary">
        🇹🇷 Türkiye Canlı
      </span>
    </div>
  );
}

const SEVERITY_TEXT: Record<BandItem['severity'], string> = {
  low: 'text-text-secondary',
  moderate: 'text-threat-moderate',
  high: 'text-threat-high',
};

function BandPill({ item }: { item: BandItem }) {
  const Icon = item.icon;
  const ago = relativeTr(item.at);
  return (
    <span className="flex items-center gap-2 text-[12px]">
      <Icon className={cn('size-3.5 shrink-0', SEVERITY_TEXT[item.severity])} />
      <span className="text-text-primary">{item.label}</span>
      {item.detail && (
        <span className="font-mono-tnum text-[11px] text-text-tertiary">
          {item.detail}
        </span>
      )}
      {item.source && (
        <span className="rounded border border-white/[0.08] bg-surface-2 px-1 font-mono-tnum text-[9px] uppercase tracking-wider text-text-tertiary">
          {item.source}
        </span>
      )}
      <span className="font-mono-tnum text-[11px] text-text-tertiary">·</span>
      <span className="font-mono-tnum text-[11px] text-text-tertiary">{ago}</span>
    </span>
  );
}

/** "5 dk önce", "2 sa önce" gibi kısa Türkçe relative format. */
function relativeTr(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return 'şimdi';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} sa önce`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} g önce`;
}

