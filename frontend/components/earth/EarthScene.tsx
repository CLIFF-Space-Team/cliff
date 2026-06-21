'use client';

import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Skeleton, Surface } from '@/components/ui';
import {
  useEarthCategories,
  useEarthEvents,
  useEarthSummary,
} from '@/hooks/useEarthEventsV2';
import { pickRepresentativePoint } from '@/lib/earth-geometry';
import type {
  EarthCategoryMeta,
  EarthEvent,
  EarthEventFilters,
  EarthEventSeverity,
  EarthEventSummary,
} from '@/lib/earth-types';
import { cn } from '@/lib/utils';

import { CategoryFilterChips } from './CategoryFilterChips';
import { EventCategoryIcon } from './EventCategoryIcon';
import { SeverityBadge } from './SeverityBadge';
import { EventFocusCard } from './live/EventFocusCard';
import { LiveFeed } from './live/LiveFeed';

// Tarayıcı-only (R3F / Leaflet) — SSR yok.
const LiveGlobe = dynamic(() => import('./live/LiveGlobe').then((m) => m.LiveGlobe), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});
const EarthMap2D = dynamic(() => import('./EarthMap2D').then((m) => m.EarthMap2D), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});
const SimulationModal = dynamic(
  () => import('./simulation/SimulationModal').then((m) => m.SimulationModal),
  { ssr: false },
);

type ViewMode = '3d' | '2d';

/**
 * "Sinematik canlı küre" — globe-hero Earth-live dashboard. The 3D planet is the
 * stage: real EONET / USGS / AFAD events pulse on its surface; the right rail is
 * a live feed; selecting an event flies the camera to it and opens a focus card.
 * Filters + selection live in the URL; WS pushes mutate the React Query cache via
 * WebSocketProvider — this component just reads.
 */
export function EarthScene() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const selectedCategories = useMemo(() => {
    const raw = params.get('categories') ?? '';
    return raw ? raw.split(',').filter(Boolean) : [];
  }, [params]);
  const severityMin = (params.get('severity') as EarthEventSeverity | null) ?? null;
  const sortBy = ((params.get('sort') as 'recent' | 'severity') ?? 'recent') as
    | 'recent'
    | 'severity';
  const view = ((params.get('view') as ViewMode) ?? '3d') as ViewMode;
  const selectedId = params.get('event');

  const [simulationOpen, setSimulationOpen] = useState(false);
  const [hovered, setHovered] = useState<EarthEvent | null>(null);

  const filters: EarthEventFilters = useMemo(
    () => ({
      categories: selectedCategories.length ? selectedCategories : undefined,
      severity_min: severityMin ?? undefined,
      status: 'all',
      sort_by: sortBy,
      limit: 200,
    }),
    [selectedCategories, severityMin, sortBy],
  );

  const eventsQuery = useEarthEvents(filters);
  const categoriesQuery = useEarthCategories();
  const summaryQuery = useEarthSummary();

  const categories: EarthCategoryMeta[] = useMemo(
    () => categoriesQuery.data?.items ?? [],
    [categoriesQuery.data],
  );
  const categoryMap = useMemo(() => {
    const m = new Map<string, EarthCategoryMeta>();
    for (const c of categories) m.set(c.code, c);
    return m;
  }, [categories]);

  const events = useMemo(() => eventsQuery.data?.items ?? [], [eventsQuery.data]);

  const selectedEvent = useMemo(
    () => (selectedId ? events.find((e) => e.id === selectedId) ?? null : null),
    [selectedId, events],
  );
  const selectedCategory = selectedEvent
    ? categoryMap.get(selectedEvent.category) ?? null
    : null;
  const selectedPoint = useMemo(
    () => (selectedEvent ? pickRepresentativePoint(selectedEvent) : null),
    [selectedEvent],
  );

  const writeParams = useCallback(
    (mutator: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString());
      mutator(next);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const toggleCategory = useCallback(
    (code: string) => {
      writeParams((next) => {
        const current = next.get('categories')?.split(',').filter(Boolean) ?? [];
        const updated = current.includes(code)
          ? current.filter((c) => c !== code)
          : [...current, code];
        if (updated.length === 0) next.delete('categories');
        else next.set('categories', updated.join(','));
      });
    },
    [writeParams],
  );

  const clearCategories = useCallback(
    () => writeParams((next) => next.delete('categories')),
    [writeParams],
  );

  const setSort = useCallback(
    (sort: 'recent' | 'severity') =>
      writeParams((next) => {
        if (sort === 'recent') next.delete('sort');
        else next.set('sort', sort);
      }),
    [writeParams],
  );

  const setView = useCallback(
    (mode: ViewMode) =>
      writeParams((next) => {
        if (mode === '3d') next.delete('view');
        else next.set('view', mode);
      }),
    [writeParams],
  );

  const selectEvent = useCallback(
    (event: EarthEvent | null) =>
      writeParams((next) => {
        if (!event) next.delete('event');
        else next.set('event', event.id);
      }),
    [writeParams],
  );

  // Drop a selection that scrolled out of the filtered set.
  useEffect(() => {
    if (selectedId && !events.find((e) => e.id === selectedId)) {
      writeParams((next) => next.delete('event'));
    }
  }, [selectedId, events, writeParams]);

  const handleHover = useCallback((e: EarthEvent | null) => {
    setHovered((prev) => (prev?.id === e?.id ? prev : e));
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Filtre barı */}
      <Surface elevation={1} className="space-y-2 px-3 py-2">
        <CategoryFilterChips
          categories={categories}
          selected={selectedCategories}
          counts={summaryQuery.data?.by_category}
          onToggle={toggleCategory}
          onClear={clearCategories}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SeverityFilter
            value={severityMin}
            onChange={(v) =>
              writeParams((next) => {
                if (!v) next.delete('severity');
                else next.set('severity', v);
              })
            }
          />
          <ViewSwitcher view={view} onChange={setView} />
        </div>
      </Surface>

      {/* Gövde — küre hero + canlı akış */}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-12">
        <Surface
          elevation={1}
          className="relative order-1 h-[52vh] w-full overflow-hidden sm:h-[58vh] lg:col-span-8 lg:h-full"
        >
          {view === '3d' ? (
            <LiveGlobe
              events={events}
              categoryMap={categoryMap}
              selectedId={selectedId}
              selectedPoint={selectedPoint}
              onSelect={selectEvent}
              onHover={handleHover}
            />
          ) : (
            <EarthMap2D
              events={events}
              categoryMap={categoryMap}
              selectedId={selectedId}
              onSelect={selectEvent}
            />
          )}

          {/* KPI çipleri — sol üst */}
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
            <KpiChip
              label="Aktif"
              value={summaryQuery.data?.total_open}
              loading={summaryQuery.isLoading}
            />
            <KpiChip
              label="24s"
              value={summaryQuery.data?.last_24h}
              loading={summaryQuery.isLoading}
            />
            <KpiChip
              label="Kritik+Yüksek"
              value={criticalPlusHigh(summaryQuery.data)}
              loading={summaryQuery.isLoading}
              tone="critical"
            />
          </div>

          {/* Güncelleniyor — sağ üst */}
          {eventsQuery.isFetching && (
            <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-surface-2/80 px-2 py-0.5 font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary backdrop-blur">
              Güncelleniyor…
            </div>
          )}

          {/* Hover ipucu — üst orta */}
          {view === '3d' && hovered && hovered.id !== selectedId && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-10 max-w-[80%] -translate-x-1/2">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-surface-1/90 px-3 py-1.5 backdrop-blur">
                <EventCategoryIcon
                  icon={categoryMap.get(hovered.category)?.icon ?? 'alert-circle'}
                  size={13}
                  className="shrink-0 text-text-secondary"
                />
                <span className="truncate text-[12px] font-medium text-text-primary">
                  {hovered.title}
                </span>
                <SeverityBadge severity={hovered.severity} />
              </div>
            </div>
          )}

          {/* Odak kartı — sol alt */}
          {selectedEvent && (
            <div className="absolute bottom-3 left-3 z-10">
              <EventFocusCard
                event={selectedEvent}
                category={selectedCategory}
                onClose={() => selectEvent(null)}
                onOpenSimulation={
                  selectedEvent && selectedCategory
                    ? () => setSimulationOpen(true)
                    : undefined
                }
              />
            </div>
          )}

          {/* Kontrol ipucu — sağ alt (sadece 3D) */}
          {view === '3d' && (
            <div className="pointer-events-none absolute bottom-3 right-3 z-10 hidden font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary md:block">
              sürükle döndür · tekerlek yakınlaş
            </div>
          )}
        </Surface>

        {/* Sağ ray — canlı akış */}
        <div className="order-2 flex min-h-[300px] flex-col lg:col-span-4 lg:min-h-0">
          <LiveFeed
            events={events}
            categoryMap={categoryMap}
            selectedId={selectedId}
            isLoading={eventsQuery.isLoading}
            sortBy={sortBy}
            onSortChange={setSort}
            onSelect={selectEvent}
          />
        </div>
      </div>

      {simulationOpen && selectedEvent && selectedCategory && (
        <SimulationModal
          event={selectedEvent}
          category={selectedCategory}
          onClose={() => setSimulationOpen(false)}
        />
      )}
    </div>
  );
}

function criticalPlusHigh(summary: EarthEventSummary | undefined): number | undefined {
  if (!summary) return undefined;
  return (summary.by_severity.critical ?? 0) + (summary.by_severity.high ?? 0);
}

function KpiChip({
  label,
  value,
  loading,
  tone,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  tone?: 'critical';
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-surface-1/80 px-2.5 py-1 backdrop-blur">
      <span
        className={cn(
          'font-mono-tnum text-[13px] font-semibold tabular-nums',
          tone === 'critical' ? 'text-threat-critical' : 'text-text-primary',
        )}
      >
        {loading || value == null ? '—' : value.toLocaleString('tr-TR')}
      </span>
      <span className="text-[9px] uppercase tracking-wider text-text-tertiary">{label}</span>
    </div>
  );
}

interface SeverityFilterProps {
  value: EarthEventSeverity | null;
  onChange: (next: EarthEventSeverity | null) => void;
}

function SeverityFilter({ value, onChange }: SeverityFilterProps) {
  const options: Array<{ key: EarthEventSeverity | 'all'; label: string }> = [
    { key: 'all', label: 'Hepsi' },
    { key: 'low', label: 'Düşük+' },
    { key: 'moderate', label: 'Orta+' },
    { key: 'high', label: 'Yüksek+' },
    { key: 'critical', label: 'Sadece Kritik' },
  ];
  return (
    <div className="flex items-center gap-1 rounded-md border border-white/[0.06] bg-surface-2 p-0.5">
      {options.map((opt) => {
        const isActive = (value ?? 'all') === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key === 'all' ? null : (opt.key as EarthEventSeverity))}
            className={cn(
              'rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
              isActive
                ? 'bg-white/[0.08] text-text-primary'
                : 'text-text-tertiary hover:text-text-primary',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface ViewSwitcherProps {
  view: ViewMode;
  onChange: (mode: ViewMode) => void;
}

function ViewSwitcher({ view, onChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-white/[0.06] bg-surface-2 p-0.5">
      {(['3d', '2d'] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={cn(
            'rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
            view === mode
              ? 'bg-white/[0.08] text-text-primary'
              : 'text-text-tertiary hover:text-text-primary',
          )}
        >
          {mode === '3d' ? '3D Küre' : '2D Harita'}
        </button>
      ))}
    </div>
  );
}
