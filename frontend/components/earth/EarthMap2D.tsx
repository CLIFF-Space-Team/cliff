'use client';

import 'leaflet/dist/leaflet.css';

import { useEffect } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';

import { pickRepresentativePoint as pickPoint } from '@/lib/earth-geometry';
import type { EarthCategoryMeta, EarthEvent } from '@/lib/earth-types';
import { cn } from '@/lib/utils';

interface EarthMap2DProps {
  events: EarthEvent[];
  categoryMap: Map<string, EarthCategoryMeta>;
  selectedId: string | null;
  onSelect: (event: EarthEvent) => void;
  className?: string;
}

const DEFAULT_CENTER: [number, number] = [20, 0];
const DEFAULT_ZOOM = 2;

/**
 * Dark-tile world map (CARTO no-tokens) overlaying every active earth
 * event. Click → bubbles up `onSelect`. Selection auto-pans/zooms to
 * the picked event so the 3D globe and 2D map stay in sync.
 *
 * Marker color = `category.accent_hex` so the 2D, 3D, chip rail and
 * list rozeti all read the same.
 */
export function EarthMap2D({
  events,
  categoryMap,
  selectedId,
  onSelect,
  className,
}: EarthMap2DProps) {
  const selectedEvent = events.find((e) => e.id === selectedId) ?? null;
  return (
    <div className={cn('relative h-full w-full overflow-hidden rounded-md border border-white/[0.06] bg-surface-1', className)}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        worldCopyJump
        style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
      >
        <TileLayer
          attribution="© OpenStreetMap contributors © CARTO"
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png"
          subdomains="abcd"
          maxZoom={19}
        />
        {events.map((event) => {
          const point = pickPoint(event);
          if (!point) return null;
          const meta = categoryMap.get(event.category);
          const color = meta?.accent_hex ?? '#9ca3af';
          const isSelected = event.id === selectedId;
          const radius = baseRadius(event.severity_score, isSelected);
          return (
            <CircleMarker
              key={event.id}
              center={[point[1], point[0]]}
              radius={radius}
              pathOptions={{
                color: isSelected ? '#ffffff' : color,
                weight: isSelected ? 2 : 1,
                fillColor: color,
                fillOpacity: isSelected ? 0.9 : 0.6,
              }}
              eventHandlers={{
                click: () => onSelect(event),
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                <span style={{ fontWeight: 600 }}>{event.title}</span>
                {meta && (
                  <>
                    <br />
                    <span style={{ color: meta.accent_hex }}>{meta.label_tr}</span>
                  </>
                )}
              </Tooltip>
            </CircleMarker>
          );
        })}
        <FocusOnSelection selectedEvent={selectedEvent} />
      </MapContainer>
    </div>
  );
}

function baseRadius(score: number, isSelected: boolean): number {
  // Square-root scale + bonus for selected so visual hierarchy is clear
  // without obliterating low-severity dots.
  const r = 4 + Math.sqrt(Math.max(0, score)) * 8;
  return isSelected ? r * 1.4 : r;
}

interface FocusOnSelectionProps {
  selectedEvent: EarthEvent | null;
}

function FocusOnSelection({ selectedEvent }: FocusOnSelectionProps) {
  const map = useMap();
  useEffect(() => {
    if (!selectedEvent) return;
    const point = pickPoint(selectedEvent);
    if (!point) return;
    const targetZoom = Math.max(map.getZoom(), 4);
    map.flyTo([point[1], point[0]], targetZoom, { duration: 0.6 });
  }, [selectedEvent, map]);
  return null;
}
