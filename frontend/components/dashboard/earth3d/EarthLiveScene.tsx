'use client';

import dynamic from 'next/dynamic';
import { Activity, Filter, Globe2, RotateCcw, Sun, Waves, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Skeleton, Surface } from '@/components/ui';
import { useEarthEvents } from '@/hooks/useEarthEvents';
import { useEarthquakes } from '@/hooks/useEarthquakes';
import { useEarthquakesTr } from '@/hooks/useEarthquakesTr';
import { useFireballs } from '@/hooks/useFireballs';
import { useSpaceWeather } from '@/hooks/useSpaceWeather';
import { cn } from '@/lib/utils';

import { EarthquakeImmersive } from './EarthquakeImmersive';
import { EventDetailPanel } from './EventDetailPanel';
import type { LiveEvent } from './types';

const EarthLive3D = dynamic(
  () => import('./EarthLive3D').then((m) => m.EarthLive3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    ),
  },
);

type LayerKey = 'quakes' | 'eonet' | 'fireballs';

/**
 * The page-level orchestrator for "Dünya Canlı". Composes:
 *   - 4 KPI tiles (top)
 *   - the 3D globe (center)
 *   - the educational detail panel (right)
 *   - layer toggles + a quick-glance event list (bottom)
 *
 * All three feeds (quakes, fireballs, eonet) are normalized into a single
 * `LiveEvent[]` so the renderer doesn't care where a marker came from.
 */
export function EarthLiveScene() {
  const quakes = useEarthquakes(4.5, 'day');
  // AFAD: Türkiye-only sub-network catches M2.0+ events that USGS never
  // sees globally (USGS reports M4.5+). They share the `quake` event kind
  // so the renderer / detail panel don't have to branch.
  const quakesTr = useEarthquakesTr(2.0, 24);
  const events = useEarthEvents(7, 'open');
  const fireballs = useFireballs(120, undefined, 90); // last 90 days only
  const space = useSpaceWeather();

  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    quakes: true,
    eonet: true,
    fireballs: true,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [immersiveEvent, setImmersiveEvent] = useState<LiveEvent | null>(null);

  const allEvents = useMemo<LiveEvent[]>(() => {
    const out: LiveEvent[] = [];

    if (layers.quakes && quakes.data?.items) {
      for (const q of quakes.data.items) {
        if (q.lat == null || q.lon == null) continue;
        const sev =
          q.magnitude >= 7 ? 'critical'
          : q.magnitude >= 6 ? 'high'
          : q.magnitude >= 5 ? 'moderate'
          : 'info';
        out.push({
          id: `quake:${q.id}`,
          kind: 'quake',
          severity: sev,
          lat: q.lat,
          lng: q.lon,
          scale: 0.025 + Math.max(0, q.magnitude - 4) * 0.012,
          title: q.place || 'unknown',
          subtitle: `M${q.magnitude.toFixed(1)}${q.tsunami ? ' · TSUNAMİ' : ''} · USGS`,
          timestamp: new Date(q.time).toISOString(),
          externalUrl: q.url,
          raw: q as unknown as Record<string, unknown>,
        });
      }
    }

    if (layers.quakes && quakesTr.data?.items) {
      // De-dup against USGS by lat/lon proximity — bigger Türkiye quakes
      // (M4.5+) often appear in both feeds and we don't want two markers
      // stacked on the same spot.
      const seenCoords = out
        .filter((e) => e.kind === 'quake')
        .map((e) => [e.lat, e.lng] as [number, number]);
      const isDup = (lat: number, lng: number) =>
        seenCoords.some(
          ([la, lo]) => Math.abs(la - lat) < 0.05 && Math.abs(lo - lng) < 0.05,
        );

      for (const q of quakesTr.data.items) {
        if (q.lat == null || q.lon == null) continue;
        if (isDup(q.lat, q.lon)) continue;
        const sev =
          q.magnitude >= 5 ? 'moderate'
          : q.magnitude >= 4 ? 'info'
          : 'info';
        out.push({
          id: `quake-tr:${q.id}`,
          kind: 'quake',
          severity: sev,
          lat: q.lat,
          lng: q.lon,
          // Smaller marker — these are sub-M5 mostly, distinguish from USGS
          // visually without needing a separate colour layer.
          scale: 0.018 + Math.max(0, q.magnitude - 2) * 0.008,
          title: q.place || 'Türkiye',
          subtitle: `M${q.magnitude.toFixed(1)} · ${q.depth_km != null ? `${q.depth_km.toFixed(0)} km · ` : ''}AFAD`,
          timestamp: new Date(q.time).toISOString(),
          raw: q as unknown as Record<string, unknown>,
        });
      }
    }

    if (layers.fireballs && fireballs.data) {
      for (const f of fireballs.data) {
        if (f.lat == null || f.lon == null) continue;
        const sev = f.energy >= 5 ? 'high' : f.energy >= 1 ? 'moderate' : 'info';
        const dateOnly = f.date.slice(0, 10);
        const region = describeFireballRegion(f.lat, f.lon);
        out.push({
          id: `fb:${f.date}-${f.lat.toFixed(2)}-${f.lon.toFixed(2)}`,
          kind: 'fireball',
          severity: sev,
          lat: f.lat,
          lng: f.lon,
          scale: 0.02 + Math.min(0.06, Math.log10(f.energy + 1) * 0.04),
          // Title combines date + rough region so each fireball reads as a
          // distinct event in the side panel ("Bolide 2026-04-29 · Antarktika")
          // instead of five identical "Atmosferik fireball" rows.
          title: `Bolide ${dateOnly} · ${region}`,
          subtitle: `${f.energy.toFixed(2)} kt · ${region}`,
          timestamp: f.date.replace(' ', 'T') + 'Z',
          raw: f as unknown as Record<string, unknown>,
        });
      }
    }

    if (layers.eonet && events.data?.events) {
      for (const e of events.data.events) {
        const last = e.geometry?.[e.geometry.length - 1];
        if (!last || !last.coordinates || last.coordinates.length < 2) continue;
        const [lon, lat] = last.coordinates;
        if (lat == null || lon == null) continue;
        out.push({
          id: `eonet:${e.id}`,
          kind: 'eonet',
          severity: 'info',
          lat,
          lng: lon,
          scale: 0.03,
          title: e.title,
          subtitle: e.categories?.[0]?.title,
          timestamp: last.date,
          externalUrl: e.link,
          raw: e as unknown as Record<string, unknown>,
        });
      }
    }

    return out;
  }, [layers, quakes.data, quakesTr.data, fireballs.data, events.data]);

  const selectedEvent = useMemo(
    () => allEvents.find((e) => e.id === selectedId) ?? null,
    [allEvents, selectedId],
  );

  // Selection is pure data — the side panel updates, but we never auto-open
  // the heavy-weight immersive modal on click. Auto-opening was causing every
  // marker click to feel like "the same earthquake" because the modal was
  // popping over before the user could even read which event they hit.
  // Diving into the immersive view is now an explicit CTA in the side panel.
  const handleSelect = (event: LiveEvent) => {
    setSelectedId(event.id);
  };

  const handleClose = () => setSelectedId(null);
  const handleOpenImmersive = () => {
    if (selectedEvent?.kind === 'quake') {
      setImmersiveEvent(selectedEvent);
    }
  };

  // KPI numbers
  const kpi = useMemo(() => {
    const eq = quakes.data?.items ?? [];
    const eqM5 = eq.filter((q) => q.magnitude >= 5).length;
    const tsunami = eq.some((q) => q.tsunami);
    const eonetCount = events.data?.events.length ?? 0;
    const sw = space.data;
    const flareLetter = sw?.xray.current_class?.charAt(0) ?? '';
    return { eqM5, tsunami, eonetCount, sw, flareLetter };
  }, [quakes.data, events.data, space.data]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* ── KPI ribbon ─────────────────────────────────────────── */}
      <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi
          icon={Waves}
          label="Deprem · M5+ · 24s"
          value={kpi.eqM5}
          tone={kpi.tsunami ? 'critical' : kpi.eqM5 > 5 ? 'warn' : 'info'}
          hint={kpi.tsunami ? 'tsunami uyarısı' : 'USGS canlı feed'}
        />
        <Kpi
          icon={Globe2}
          label="EONET · aktif olay"
          value={kpi.eonetCount}
          tone={kpi.eonetCount > 30 ? 'warn' : 'event'}
          hint="volkan / yangın / fırtına"
        />
        <Kpi
          icon={Sun}
          label="Kp · jeomanyetik"
          value={kpi.sw?.kp.kp != null ? kpi.sw.kp.kp.toFixed(1) : '—'}
          tone={kpi.sw?.kp.storm ? 'critical' : 'info'}
          hint={kpi.sw?.kp.label ?? 'NOAA SWPC'}
        />
        <Kpi
          icon={Zap}
          label="X-ray · GOES"
          value={kpi.sw?.xray.current_class ?? 'A/B'}
          tone={
            kpi.flareLetter === 'X' ? 'critical' : kpi.flareLetter === 'M' ? 'warn' : 'info'
          }
          hint={
            kpi.sw?.xray.peak_24h ? `24s zirve · ${kpi.sw.xray.peak_24h.class}` : 'sessiz'
          }
        />
      </div>

      {/* ── Main: 3D globe + detail panel ──────────────────────── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
        <Surface
          elevation={1}
          className="relative col-span-1 min-h-[460px] overflow-hidden lg:col-span-2"
        >
          <EarthLive3D
            events={allEvents}
            selectedId={selectedId}
            selectedEvent={selectedEvent}
            onSelect={handleSelect}
          />

          {/* Top-left scene info */}
          <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-white/[0.08] bg-surface-1/85 px-3 py-1.5 backdrop-blur">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
              <Activity className="size-3" />
              CANLI 3D · {allEvents.length} olay
            </div>
          </div>

          {/* Top-right layer toggles */}
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-md border border-white/[0.08] bg-surface-1/85 p-1 backdrop-blur">
            <span className="px-2 text-[9px] uppercase tracking-wider text-text-tertiary">
              <Filter className="inline size-3" />
            </span>
            <LayerChip
              active={layers.quakes}
              onClick={() => setLayers((p) => ({ ...p, quakes: !p.quakes }))}
              dot="#f97316"
              label={`Deprem (${(quakes.data?.items.length ?? 0) + (quakesTr.data?.items.length ?? 0)})`}
            />
            <LayerChip
              active={layers.eonet}
              onClick={() => setLayers((p) => ({ ...p, eonet: !p.eonet }))}
              dot="#22d3ee"
              label={`Olay (${events.data?.events.length ?? 0})`}
            />
            <LayerChip
              active={layers.fireballs}
              onClick={() => setLayers((p) => ({ ...p, fireballs: !p.fireballs }))}
              dot="#fbbf24"
              label={`Fireball (${fireballs.data?.length ?? 0})`}
            />
          </div>

          {/* Bottom-left: reset camera + event reset */}
          {selectedId && (
            <button
              type="button"
              onClick={handleClose}
              className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-surface-1/85 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary backdrop-blur hover:bg-surface-2"
            >
              <RotateCcw className="size-3" />
              dünya görünümüne dön
            </button>
          )}

          {/* Hint */}
          {!selectedId && (
            <div className="pointer-events-none absolute bottom-3 left-3 right-3 text-center">
              <span className="rounded-md bg-surface-1/85 px-2 py-1 text-[11px] text-text-tertiary backdrop-blur">
                💡 noktalardan birine tıkla — 3D simülasyon + eğitimsel açıklama
              </span>
            </div>
          )}
        </Surface>

        <div className="col-span-1 min-h-[300px]">
          <EventDetailPanel
            event={selectedEvent}
            onClose={handleClose}
            onOpenQuakeImmersive={handleOpenImmersive}
          />
        </div>
      </div>

      {/* Immersive city-scale earthquake modal — only renders for quakes. */}
      {immersiveEvent && immersiveEvent.kind === 'quake' && (
        <EarthquakeImmersive
          event={immersiveEvent}
          onClose={() => setImmersiveEvent(null)}
        />
      )}
    </div>
  );
}

interface KpiProps {
  icon: typeof Activity;
  label: string;
  value: string | number;
  tone: 'critical' | 'warn' | 'info' | 'event';
  hint: string;
}

const KPI_TONE: Record<KpiProps['tone'], string> = {
  critical: 'border-threat-critical/40 bg-threat-critical/10',
  warn: 'border-threat-high/40 bg-threat-high/10',
  info: 'border-white/[0.06] bg-surface-1',
  event: 'border-cyan-500/30 bg-cyan-500/5',
};

const KPI_VALUE_TONE: Record<KpiProps['tone'], string> = {
  critical: 'text-threat-critical',
  warn: 'text-threat-high',
  info: 'text-text-primary',
  event: 'text-cyan-300',
};

function Kpi({ icon: Icon, label, value, tone, hint }: KpiProps) {
  return (
    <div className={cn('rounded-md border p-2.5', KPI_TONE[tone])}>
      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={cn('font-mono-tnum text-2xl font-bold', KPI_VALUE_TONE[tone])}>
          {value}
        </span>
        <span className="truncate text-[10px] text-text-tertiary">{hint}</span>
      </div>
    </div>
  );
}

function LayerChip({
  active,
  onClick,
  dot,
  label,
}: {
  active: boolean;
  onClick: () => void;
  dot: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors',
        active
          ? 'bg-surface-3 text-text-primary'
          : 'text-text-tertiary hover:bg-surface-2',
      )}
    >
      <span
        className="inline-block size-1.5 rounded-full"
        style={{ backgroundColor: active ? dot : '#3a3a3a' }}
      />
      {label}
    </button>
  );
}

/**
 * Coarse human-readable region label from lat/lng — used to distinguish
 * fireball events ("Bolide 2026-04-29 · Pasifik" vs "· Antarktika") since
 * the JPL feed itself only gives raw coordinates. Not meant to be precise:
 * 80% of bolides land over open water, so ocean basins dominate the labels.
 */
function describeFireballRegion(lat: number, lon: number): string {
  if (lat >= 66.5) return 'Arktik';
  if (lat <= -66.5) return 'Antarktika';
  // Normalise lon to [-180, 180]
  let L = lon;
  while (L > 180) L -= 360;
  while (L < -180) L += 360;

  if (lat >= 35 && L >= -10 && L <= 60) return 'Avrupa / K. Afrika';
  if (lat <= 12 && lat >= -35 && L >= -20 && L <= 55) return 'Afrika';
  if (lat >= 10 && L >= 60 && L <= 145) return 'Asya';
  if (lat <= 12 && L >= 90 && L <= 155) return 'G.D. Asya';
  if (lat <= 0 && L >= 110 && L <= 155) return 'Avustralasya';
  if (lat >= 10 && L >= -130 && L <= -60) return 'K. Amerika';
  if (lat <= 12 && lat >= -55 && L >= -82 && L <= -34) return 'G. Amerika';

  // Ocean basins
  if (L >= -180 && L <= -100) return 'Pasifik';
  if (L >= 100 && L <= 180) return 'Pasifik';
  if (L >= -80 && L <= -10) return 'Atlantik';
  if (L >= 40 && L <= 100 && lat <= 30) return 'Hint Okyanusu';
  return 'Açık Deniz';
}
