'use client';

import dynamic from 'next/dynamic';
import { Activity, ExternalLink, Flame, Globe2, Sun, Waves, Wind, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Skeleton, Surface } from '@/components/ui';
import { useEarthEvents } from '@/hooks/useEarthEvents';
import { useEarthquakes } from '@/hooks/useEarthquakes';
import { useFireballs } from '@/hooks/useFireballs';
import { useSpaceWeather } from '@/hooks/useSpaceWeather';
import { cn } from '@/lib/utils';

const EarthLiveMap = dynamic(
  () => import('./EarthLiveMap').then((m) => m.EarthLiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-[16/9] w-full overflow-hidden rounded border border-white/[0.06]">
        <Skeleton className="h-full w-full" />
      </div>
    ),
  },
);

type LayerKey = 'quakes' | 'eonet' | 'fireballs';

/**
 * Single consolidated "Earth Live" panel — replaces the previous 5 sub-tabs.
 * Top: 4 KPI tiles. Mid: world map with toggle-able layers (quakes / EONET /
 * fireballs). Bottom: split between a quake list and a space-weather summary.
 *
 * The intent is to make the user *feel* what's happening on Earth right now:
 * one glance at the map should tell you "where the action is", and the KPIs
 * frame the magnitude.
 */
export function EarthLivePanel() {
  const quakes = useEarthquakes(4.5, 'day');
  const events = useEarthEvents(7, 'open');
  const fireballs = useFireballs(60, 0.05);
  const space = useSpaceWeather();

  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    quakes: true,
    eonet: true,
    fireballs: true,
  });

  const toggleLayer = (key: LayerKey) =>
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  const kpiRow = useMemo(() => {
    const eqList = quakes.data?.items ?? [];
    const eqM5 = eqList.filter((q) => q.magnitude >= 5).length;
    const tsunami = eqList.some((q) => q.tsunami);

    const eonetCount = events.data?.events.length ?? 0;

    const sw = space.data;
    const stormy = !!sw?.kp.storm;
    const flareLetter = sw?.xray.current_class?.charAt(0) ?? '';

    const fbList = fireballs.data ?? [];
    const fbBig = fbList.filter((f) => f.energy >= 1.0).length;

    return { eqList, eqM5, tsunami, eonetCount, sw, stormy, flareLetter, fbList, fbBig };
  }, [quakes.data, events.data, space.data, fireballs.data]);

  return (
    <div className="scrollbar-thin flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-1">
      {/* ── KPI ribbon ─────────────────────────────────────────── */}
      <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi
          icon={Waves}
          label="Deprem · M5+ · 24s"
          value={kpiRow.eqM5}
          tone={kpiRow.tsunami ? 'critical' : kpiRow.eqM5 > 5 ? 'warn' : 'info'}
          hint={kpiRow.tsunami ? 'tsunami uyarısı' : 'USGS feed'}
        />
        <Kpi
          icon={Globe2}
          label="EONET · aktif"
          value={kpiRow.eonetCount}
          tone={kpiRow.eonetCount > 30 ? 'warn' : 'event'}
          hint="volkan / yangın / fırtına"
        />
        <Kpi
          icon={Sun}
          label="Kp · jeomanyetik"
          value={kpiRow.sw?.kp.kp != null ? kpiRow.sw.kp.kp.toFixed(1) : '—'}
          tone={kpiRow.stormy ? 'critical' : 'info'}
          hint={kpiRow.sw?.kp.label ?? 'NOAA SWPC'}
        />
        <Kpi
          icon={Zap}
          label="X-ray · GOES"
          value={kpiRow.sw?.xray.current_class ?? 'A/B'}
          tone={
            kpiRow.flareLetter === 'X'
              ? 'critical'
              : kpiRow.flareLetter === 'M'
                ? 'warn'
                : 'info'
          }
          hint={
            kpiRow.sw?.xray.peak_24h
              ? `24s zirve · ${kpiRow.sw.xray.peak_24h.class}`
              : 'sessiz'
          }
        />
      </div>

      {/* ── World map with toggle-able layers ──────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            <Globe2 className="size-3" />
            DÜNYA HARİTASI · CANLI
          </div>
          <div className="flex items-center gap-1">
            <LayerChip
              active={layers.quakes}
              onClick={() => toggleLayer('quakes')}
              dot="#f97316"
              label={`Deprem (${quakes.data?.items.length ?? 0})`}
            />
            <LayerChip
              active={layers.eonet}
              onClick={() => toggleLayer('eonet')}
              dot="#22d3ee"
              label={`Olay (${events.data?.events.length ?? 0})`}
            />
            <LayerChip
              active={layers.fireballs}
              onClick={() => toggleLayer('fireballs')}
              dot="#fbbf24"
              label={`Fireball (${fireballs.data?.length ?? 0})`}
            />
          </div>
        </div>

        <EarthLiveMap
          showQuakes={layers.quakes}
          showEonet={layers.eonet}
          showFireballs={layers.fireballs}
          quakes={quakes.data?.items ?? []}
          eonet={events.data?.events ?? []}
          fireballs={fireballs.data ?? []}
        />
      </div>

      {/* ── Bottom row: quake list + space-weather summary ─────── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <Surface elevation={1} className="lg:col-span-3">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
              <Activity className="size-3" />
              SON DEPREMLER · USGS
            </div>
            <span className="font-mono-tnum text-[10px] text-text-tertiary">
              {kpiRow.eqList.length}
            </span>
          </div>
          <ul className="scrollbar-thin max-h-[260px] divide-y divide-white/[0.04] overflow-y-auto">
            {kpiRow.eqList.slice(0, 10).map((eq) => {
              const magColor =
                eq.magnitude >= 7
                  ? 'text-threat-critical'
                  : eq.magnitude >= 6
                    ? 'text-threat-high'
                    : eq.magnitude >= 5
                      ? 'text-threat-moderate'
                      : 'text-text-primary';
              return (
                <li key={eq.id}>
                  <a
                    href={eq.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 px-3 py-2 hover:bg-surface-2"
                  >
                    <span
                      className={cn(
                        'min-w-[44px] font-mono-tnum text-[14px] font-semibold',
                        magColor,
                      )}
                    >
                      {eq.magnitude.toFixed(1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 text-[12px] text-text-primary">
                        <span className="truncate">{eq.place || 'unknown'}</span>
                        {eq.tsunami && (
                          <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-blue-500/15 px-1 py-px text-[9px] font-semibold uppercase text-blue-300">
                            <Waves className="size-2.5" />
                            Tsunami
                          </span>
                        )}
                      </div>
                      <div className="font-mono-tnum text-[10px] text-text-tertiary">
                        {formatTime(eq.time)}
                        {eq.depth_km != null && ` · ${eq.depth_km.toFixed(0)} km`}
                      </div>
                    </div>
                    <ExternalLink className="mt-1 size-3 shrink-0 text-text-tertiary" />
                  </a>
                </li>
              );
            })}
            {kpiRow.eqList.length === 0 && (
              <li className="px-3 py-6 text-center text-[11px] text-text-tertiary">
                Son 24 saatte M4.5+ olay yok.
              </li>
            )}
          </ul>
        </Surface>

        <Surface elevation={1} className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
              <Sun className="size-3" />
              UZAY HAVASI
            </div>
            <span className="font-mono-tnum text-[9px] uppercase tracking-wider text-text-tertiary">
              NOAA SWPC
            </span>
          </div>
          <SpaceWeatherInline data={space.data} />
        </Surface>
      </div>

      {/* ── Active Earth events strip ──────────────────────────── */}
      {events.data && events.data.events.length > 0 && (
        <Surface elevation={1}>
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
              <Flame className="size-3" />
              AKTİF DOĞA OLAYLARI · NASA EONET
            </div>
            <span className="font-mono-tnum text-[10px] text-text-tertiary">
              {events.data.events.length}
            </span>
          </div>
          <ul className="scrollbar-thin max-h-[180px] divide-y divide-white/[0.04] overflow-y-auto">
            {events.data.events.slice(0, 10).map((event) => {
              const cat = event.categories?.[0]?.title ?? 'event';
              return (
                <li key={event.id}>
                  <a
                    href={event.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 px-3 py-2 hover:bg-surface-2"
                  >
                    <span className="mt-0.5 inline-block size-1.5 shrink-0 rounded-full bg-cyan-400" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] text-text-primary">
                        {event.title}
                      </div>
                      <div className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
                        {cat}
                      </div>
                    </div>
                    <ExternalLink className="mt-1 size-3 shrink-0 text-text-tertiary" />
                  </a>
                </li>
              );
            })}
          </ul>
        </Surface>
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
        <span
          className={cn('font-mono-tnum text-2xl font-bold tabular-nums', KPI_VALUE_TONE[tone])}
        >
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
        'flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors',
        active
          ? 'border-white/[0.18] bg-surface-2 text-text-primary'
          : 'border-white/[0.06] bg-surface-1/60 text-text-tertiary hover:bg-surface-2/60',
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

function SpaceWeatherInline({
  data,
}: {
  data:
    | {
        kp: { kp?: number; label?: string; storm?: boolean; available: boolean };
        xray: { current_class?: string | null; available: boolean; peak_24h?: { class: string } | null };
        solar_wind: {
          available: boolean;
          speed_kms?: number | null;
          density_pcm3?: number | null;
          bz_nt?: number | null;
        };
      }
    | undefined;
}) {
  if (!data) return null;
  const sw = data.solar_wind;
  const bzNeg = sw?.bz_nt != null && sw.bz_nt < -3;
  return (
    <div className="space-y-2 px-3 py-2.5 text-[12px]">
      <div className="flex items-baseline justify-between">
        <span className="text-text-tertiary">Kp</span>
        <span className="font-mono-tnum font-semibold text-text-primary">
          {data.kp.kp != null ? data.kp.kp.toFixed(1) : '—'}{' '}
          {data.kp.label && <span className="ml-1 text-[10px] text-text-tertiary">{data.kp.label}</span>}
        </span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-text-tertiary">X-ray sınıfı</span>
        <span className="font-mono-tnum font-semibold text-text-primary">
          {data.xray.current_class ?? '—'}
        </span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-1 text-text-tertiary">
          <Wind className="size-3" />
          Güneş rüzgarı
        </span>
        <span className="font-mono-tnum text-text-primary">
          {sw?.speed_kms != null ? `${sw.speed_kms.toFixed(0)} km/s` : '—'}
        </span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-text-tertiary">IMF Bz</span>
        <span
          className={cn(
            'font-mono-tnum',
            bzNeg ? 'text-threat-high' : 'text-text-primary',
          )}
        >
          {sw?.bz_nt != null ? `${sw.bz_nt.toFixed(1)} nT` : '—'}
        </span>
      </div>
      {bzNeg && (
        <div className="rounded border border-threat-high/40 bg-threat-high/10 px-2 py-1 text-[10px] text-threat-high">
          Bz güneye dönmüş — manyetosfer ile etkileşim olası.
        </div>
      )}
    </div>
  );
}

function formatTime(epochMs: number): string {
  if (!epochMs) return '';
  const diffMin = Math.round((Date.now() - epochMs) / 60_000);
  if (diffMin < 1) return 'şimdi';
  if (diffMin < 60) return `${diffMin} dk önce`;
  const hr = Math.round(diffMin / 60);
  if (hr < 24) return `${hr} sa önce`;
  const day = Math.round(hr / 24);
  return `${day} gün önce`;
}
