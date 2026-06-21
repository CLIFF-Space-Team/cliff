'use client';

import { Activity, AlertTriangle, Flame, Globe2, Radio, Rocket, Waves, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMemo } from 'react';

import { useEarthEvents } from '@/hooks/useEarthEvents';
import { useEarthquakes } from '@/hooks/useEarthquakes';
import { useFireballs } from '@/hooks/useFireballs';
import { useRiskSnapshot } from '@/hooks/useRiskSnapshot';
import { useSpaceWeather } from '@/hooks/useSpaceWeather';
import { cn } from '@/lib/utils';

interface TickerItem {
  id: string;
  icon: LucideIcon;
  /** Visual category — drives the dot color. */
  tone: 'critical' | 'warn' | 'info' | 'event';
  label: string; // small uppercase tag
  text: string; // main message
}

const TONE_DOT: Record<TickerItem['tone'], string> = {
  critical: 'bg-threat-critical',
  warn: 'bg-threat-high',
  info: 'bg-text-secondary',
  event: 'bg-blue-400',
};

/**
 * Marquee-style ticker that surfaces what's happening RIGHT NOW across the
 * three data streams the dashboard owns:
 *   - upcoming asteroid close approaches (next 30 days, top by score)
 *   - active EONET earth events (volcanoes, wildfires, severe storms…)
 *   - recent JPL Fireballs (≥0.5 kt energy)
 *
 * Items rotate left-to-right via CSS keyframes and pause on hover so a user
 * can read a specific entry. The ticker is purely presentational — it never
 * blocks the page, never throws, and renders nothing if all three queries
 * are empty/erroring (graceful degrade).
 */
export function LiveActivityTicker() {
  const risk = useRiskSnapshot(20);
  const events = useEarthEvents(7, 'open');
  const fireballs = useFireballs(15, 0.4, 60);
  const quakes = useEarthquakes(4.5, 'day');
  const space = useSpaceWeather();

  const items = useMemo<TickerItem[]>(() => {
    const out: TickerItem[] = [];

    // 1. Upcoming close approaches — next 30 days, soonest first.
    const now = Date.now();
    const horizonMs = 30 * 24 * 3600 * 1000;
    const approaches = (risk.data?.items ?? [])
      .filter((r) => r.next_approach_at)
      .map((r) => ({
        ...r,
        ts: new Date(r.next_approach_at!).getTime(),
      }))
      .filter((r) => Number.isFinite(r.ts) && r.ts >= now - 24 * 3600 * 1000 && r.ts <= now + horizonMs)
      .sort((a, b) => a.ts - b.ts)
      .slice(0, 8);

    for (const r of approaches) {
      const days = Math.max(0, Math.round((r.ts - now) / (24 * 3600 * 1000)));
      const dist = r.miss_distance_km
        ? r.miss_distance_km >= 1_000_000
          ? `${(r.miss_distance_km / 1_000_000).toFixed(2)}M km`
          : `${(r.miss_distance_km / 1000).toFixed(0)}k km`
        : '—';
      const dia = r.diameter_max_km != null
        ? r.diameter_max_km >= 1
          ? `${r.diameter_max_km.toFixed(1)} km`
          : `${Math.round(r.diameter_max_km * 1000)} m`
        : '?';
      out.push({
        id: `approach:${r.neo_id}`,
        icon: Rocket,
        tone: r.is_potentially_hazardous ? 'critical' : r.risk_class === 'critical' || r.risk_class === 'high' ? 'warn' : 'info',
        label: days === 0 ? 'BUGÜN' : `${days} GÜN`,
        text: `${r.name} · ${dia} · ${dist}`,
      });
    }

    // 2. EONET active events.
    const eonet = (events.data?.events ?? []).slice(0, 10);
    for (const e of eonet) {
      const cat = e.categories?.[0]?.title ?? 'event';
      out.push({
        id: `eonet:${e.id}`,
        icon: categoryIcon(cat),
        tone: 'event',
        label: cat.toUpperCase(),
        text: e.title.length > 70 ? e.title.slice(0, 70) + '…' : e.title,
      });
    }

    // 3. Recent fireballs (top 6 by energy).
    const fb = (fireballs.data ?? [])
      .slice()
      .sort((a, b) => (b.energy ?? 0) - (a.energy ?? 0))
      .slice(0, 6);
    for (const f of fb) {
      const dateStr = f.date?.slice(0, 10) ?? '';
      out.push({
        id: `fireball:${f.date}-${f.lat}`,
        icon: Flame,
        tone: f.energy >= 5 ? 'warn' : 'info',
        label: 'FIREBALL',
        text: `${dateStr} · ${f.energy.toFixed(2)} kt · ${f.lat.toFixed(1)}°,${f.lon.toFixed(1)}°`,
      });
    }

    // 4. Recent earthquakes (M5+ from last 24 h, top 6).
    const eq = (quakes.data?.items ?? [])
      .filter((q) => q.magnitude >= 5)
      .slice(0, 6);
    for (const q of eq) {
      out.push({
        id: `eq:${q.id}`,
        icon: Waves,
        tone: q.magnitude >= 7 ? 'critical' : q.magnitude >= 6 ? 'warn' : 'event',
        label: `M${q.magnitude.toFixed(1)}`,
        text: `${q.place || 'unknown'}${q.tsunami ? ' · TSUNAMİ' : ''}`,
      });
    }

    // 5. Space weather flags (Kp ≥ 5 storm, M/X-class flare).
    const sw = space.data;
    if (sw?.kp.available && sw.kp.storm && sw.kp.kp != null) {
      out.push({
        id: 'sw:kp',
        icon: Zap,
        tone: sw.kp.kp >= 7 ? 'critical' : 'warn',
        label: 'JEOMANYETIK FIRTINA',
        text: `${sw.kp.label} · Kp ${sw.kp.kp.toFixed(1)}`,
      });
    }
    if (sw?.xray.available && sw.xray.current_class) {
      const letter = sw.xray.current_class.charAt(0);
      if (letter === 'M' || letter === 'X') {
        out.push({
          id: 'sw:xray',
          icon: Zap,
          tone: letter === 'X' ? 'critical' : 'warn',
          label: 'GÜNEŞ PATLAMASI',
          text: `${sw.xray.current_class} sınıfı GOES X-ışını akışı`,
        });
      }
    }

    return out;
  }, [risk.data, events.data, fireballs.data, quakes.data, space.data]);

  if (items.length === 0) return null;

  // Duplicate the list so the marquee can loop seamlessly.
  const doubled = [...items, ...items];

  return (
    <div
      className="relative overflow-hidden border-b border-white/[0.06] bg-surface-1/50 backdrop-blur"
      role="region"
      aria-label="Canlı aktivite"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-surface-0 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-surface-0 to-transparent" />

      <div className="flex items-center gap-2 px-3 py-1.5">
        <div className="flex shrink-0 items-center gap-1.5 pr-3">
          <Radio className="size-3 animate-pulse text-threat-critical" />
          <span className="font-mono-tnum text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
            CANLI
          </span>
        </div>

        <div className="ticker-track flex min-w-0 flex-1 items-center gap-6 whitespace-nowrap">
          {doubled.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={`${item.id}-${idx}`}
                className="flex shrink-0 items-center gap-1.5 text-[11px]"
              >
                <span
                  className={cn(
                    'inline-block size-1.5 rounded-full',
                    TONE_DOT[item.tone],
                  )}
                />
                <Icon className="size-3 text-text-tertiary" aria-hidden />
                <span className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
                  {item.label}
                </span>
                <span className="text-text-secondary">{item.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .ticker-track {
          animation: ticker-marquee 90s linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
        @keyframes ticker-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

function categoryIcon(cat: string): LucideIcon {
  const c = cat.toLowerCase();
  if (c.includes('volcano')) return Activity;
  if (c.includes('fire') || c.includes('wild')) return Flame;
  if (c.includes('storm') || c.includes('cyclone')) return AlertTriangle;
  return Globe2;
}
