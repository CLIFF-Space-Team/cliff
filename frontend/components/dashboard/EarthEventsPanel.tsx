'use client';

import { Flame, Globe2, MapPin, Mountain, Waves } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';

import { ApiError } from '@/lib/api-client';
import { Skeleton, SourceLabel, Surface } from '@/components/ui';
import { useAfadEarthquakes, type AfadEarthquake } from '@/hooks/useAfadEarthquakes';
import {
  useEarthEvents,
  type EonetCategory,
  type EonetEvent,
} from '@/hooks/useEarthEvents';
import { useVolcanoes, type Volcano } from '@/hooks/useVolcanoes';
import { useWildfires, type Wildfire } from '@/hooks/useWildfires';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';

type TabKey = 'eonet' | 'tr' | 'fires' | 'volcanoes';

const TABS: ReadonlyArray<{ key: TabKey; label: string; icon: LucideIcon }> = [
  { key: 'tr', label: 'Türkiye', icon: MapPin },
  { key: 'fires', label: 'Yangın', icon: Flame },
  { key: 'volcanoes', label: 'Volkan', icon: Mountain },
  { key: 'eonet', label: 'EONET', icon: Globe2 },
];

export function EarthEventsPanel() {
  const [tab, setTab] = useState<TabKey>('tr');

  return (
    <Surface elevation={1} className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Dünya Tehditleri</h2>
          <p className="text-[11px] text-text-tertiary">
            Türkiye + küresel canlı tehlike kaynakları
          </p>
        </div>
      </div>

      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/[0.06] bg-surface-0/60 p-1 scrollbar-thin">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = key === tab;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              role="tab"
              aria-selected={active}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-sm px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors',
                active
                  ? 'bg-surface-2 text-text-primary'
                  : 'text-text-tertiary hover:bg-surface-2/60 hover:text-text-secondary',
              )}
            >
              <Icon className="size-3" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {tab === 'tr' && <TurkeyEarthquakesTab />}
        {tab === 'fires' && <WildfiresTab />}
        {tab === 'volcanoes' && <VolcanoesTab />}
        {tab === 'eonet' && <EonetTab />}
      </div>
    </Surface>
  );
}

// ── Türkiye depremleri (AFAD) ─────────────────────────────────────────

function TurkeyEarthquakesTab() {
  const { data, isLoading, isError } = useAfadEarthquakes(2.0, 24);

  return (
    <PanelBody
      isLoading={isLoading && !data}
      isError={isError}
      isEmpty={!data?.items.length}
      emptyText="Son 24 saatte M2.0+ deprem yok."
      source="deprem.afad.gov.tr"
      sourceUrl="https://deprem.afad.gov.tr"
      updatedAt={data?.fetched_at}
    >
      <ul role="list" className="divide-y divide-white/[0.04]">
        {data?.items.map((q) => <AfadRow key={q.id} q={q} />)}
      </ul>
    </PanelBody>
  );
}

function AfadRow({ q }: { q: AfadEarthquake }) {
  const tone =
    q.magnitude >= 6
      ? 'text-threat-critical'
      : q.magnitude >= 5
        ? 'text-threat-high'
        : q.magnitude >= 4
          ? 'text-threat-moderate'
          : 'text-text-secondary';
  return (
    <li className="px-4 py-2.5">
      <div className="flex items-start gap-3">
        <div className={cn('font-mono-tnum text-base font-bold', tone)}>
          {q.magnitude.toFixed(1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-text-primary">{q.place}</div>
          <div className="mt-0.5 flex flex-wrap gap-x-2 font-mono-tnum text-[10px] text-text-tertiary">
            <span>{formatRelative(new Date(q.time))}</span>
            {q.depth_km != null && <span>· {q.depth_km.toFixed(1)} km derin</span>}
            <span>· {q.type}</span>
          </div>
        </div>
      </div>
    </li>
  );
}

// ── Yangınlar (NASA FIRMS) ────────────────────────────────────────────

function WildfiresTab() {
  const { data, isLoading, isError, error } = useWildfires('TUR', 1);

  if (error instanceof ApiError && error.code === 'FIRMS_NOT_CONFIGURED') {
    return (
      <PanelBody
        isLoading={false}
        isError={false}
        isEmpty
        emptyText="NASA FIRMS API anahtarı yapılandırılmamış. Backend ortam değişkeni FIRMS_API_KEY ekleyin."
        source="NASA FIRMS"
        sourceUrl="https://firms.modaps.eosdis.nasa.gov"
        updatedAt={null}
      >
        <div />
      </PanelBody>
    );
  }

  return (
    <PanelBody
      isLoading={isLoading && !data}
      isError={isError}
      isEmpty={!data?.items.length}
      emptyText="Son 24 saatte Türkiye'de aktif yangın tespiti yok."
      source={data?.source ?? 'NASA FIRMS · VIIRS_SNPP_NRT'}
      sourceUrl="https://firms.modaps.eosdis.nasa.gov"
      updatedAt={data?.fetched_at}
    >
      <ul role="list" className="divide-y divide-white/[0.04]">
        {data?.items.slice(0, 50).map((f, i) => (
          <WildfireRow key={`${f.acq_at}-${f.lat}-${f.lon}-${i}`} fire={f} />
        ))}
      </ul>
    </PanelBody>
  );
}

function WildfireRow({ fire }: { fire: Wildfire }) {
  const tone =
    fire.frp >= 100
      ? 'text-threat-critical'
      : fire.frp >= 30
        ? 'text-threat-high'
        : 'text-threat-moderate';
  return (
    <li className="px-4 py-2.5">
      <div className="flex items-start gap-3">
        <Flame className={cn('mt-0.5 size-4 shrink-0', tone)} />
        <div className="min-w-0 flex-1">
          <div className="font-mono-tnum text-sm text-text-primary">
            {fire.lat.toFixed(2)}, {fire.lon.toFixed(2)}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-2 font-mono-tnum text-[10px] text-text-tertiary">
            <span>FRP {fire.frp.toFixed(1)} MW</span>
            <span>· {fire.brightness_k.toFixed(0)} K</span>
            <span>· {fire.satellite || fire.source}</span>
            {fire.acq_at > 0 && <span>· {formatRelative(new Date(fire.acq_at))}</span>}
          </div>
        </div>
      </div>
    </li>
  );
}

// ── Volkanlar (Smithsonian) ───────────────────────────────────────────

function VolcanoesTab() {
  const { data, isLoading, isError } = useVolcanoes();
  return (
    <PanelBody
      isLoading={isLoading && !data}
      isError={isError}
      isEmpty={!data?.items.length}
      emptyText="Şu an yükseltilmiş alarm seviyesinde volkan yok."
      source="USGS Volcano Hazards Program"
      sourceUrl="https://volcanoes.usgs.gov/"
      updatedAt={data?.fetched_at}
    >
      <ul role="list" className="divide-y divide-white/[0.04]">
        {data?.items.map((v) => <VolcanoRow key={v.title} v={v} />)}
      </ul>
    </PanelBody>
  );
}

function VolcanoRow({ v }: { v: Volcano }) {
  return (
    <li className="px-4 py-2.5">
      <div className="flex items-start gap-3">
        <Mountain className="mt-0.5 size-4 shrink-0 text-text-tertiary" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-text-primary">{v.volcano_name}</span>
            {v.country && (
              <span className="text-[10px] text-text-tertiary">{v.country}</span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-text-secondary">
            {v.summary}
          </p>
          {v.published_at > 0 && (
            <div className="mt-0.5 font-mono-tnum text-[10px] text-text-tertiary">
              {formatRelative(new Date(v.published_at))}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

// ── EONET (NASA) ──────────────────────────────────────────────────────

const EONET_ICONS: Record<string, LucideIcon> = {
  wildfires: Flame,
  severeStorms: Waves,
  volcanoes: Mountain,
  seaLakeIce: Waves,
  earthquakes: Globe2,
};

function EonetTab() {
  const { data, isLoading, isError } = useEarthEvents(30, 'open');
  return (
    <PanelBody
      isLoading={isLoading && !data}
      isError={isError}
      isEmpty={!data?.events?.length}
      emptyText="Şu an açık EONET olayı yok."
      source="NASA EONET (son 30 gün, açık)"
      sourceUrl="https://eonet.gsfc.nasa.gov"
      updatedAt={null}
    >
      <ul role="list" className="divide-y divide-white/[0.04]">
        {data?.events?.slice(0, 25).map((e) => <EonetRow key={e.id} event={e} />)}
      </ul>
    </PanelBody>
  );
}

function EonetRow({ event }: { event: EonetEvent }) {
  const cat: EonetCategory = event.categories[0] ?? { id: 'unknown', title: 'Olay' };
  const Icon = EONET_ICONS[cat.id] ?? Globe2;
  const lastGeom = event.geometry[event.geometry.length - 1];
  const coords =
    lastGeom?.type === 'Point' &&
    Array.isArray(lastGeom.coordinates) &&
    lastGeom.coordinates.length >= 2
      ? `${lastGeom.coordinates[1]?.toFixed(2)}, ${lastGeom.coordinates[0]?.toFixed(2)}`
      : null;
  return (
    <li className="px-4 py-2.5">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-text-tertiary" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-text-secondary">
              {cat.title}
            </span>
            {lastGeom?.date && (
              <span className="font-mono-tnum text-[10px] text-text-tertiary">
                {formatRelative(lastGeom.date)}
              </span>
            )}
          </div>
          <h4 className="mt-0.5 truncate text-sm font-medium text-text-primary">
            {event.title}
          </h4>
          {coords && (
            <div className="mt-0.5 font-mono-tnum text-[10px] text-text-tertiary">
              {coords}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

// ── Shared body wrapper ───────────────────────────────────────────────

function PanelBody({
  isLoading,
  isError,
  isEmpty,
  emptyText,
  source,
  sourceUrl,
  updatedAt,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  emptyText: string;
  source: string;
  sourceUrl?: string;
  updatedAt: string | null | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isError && (
          <div className="px-4 py-6 text-sm text-threat-critical">Veri alınamadı.</div>
        )}
        {isLoading && (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        )}
        {!isLoading && !isError && isEmpty && (
          <div className="px-4 py-8 text-center text-sm text-text-tertiary">{emptyText}</div>
        )}
        {!isLoading && !isError && !isEmpty && children}
      </div>
      <div className="border-t border-white/[0.06]">
        <SourceLabel source={source} updatedAt={updatedAt ?? null} href={sourceUrl} />
      </div>
    </div>
  );
}
