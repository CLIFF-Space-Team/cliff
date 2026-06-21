'use client';

import 'leaflet/dist/leaflet.css';

import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useEffect } from 'react';

import { cn } from '@/lib/utils';

import type { SimulationSceneProps } from '../types';

/**
 * Fallback "scene" for the long-tail categories that don't get a full
 * 3D model (drought, dust haze, snow, sea/lake ice, landslides, manmade,
 * water-color, temperature extremes). It's still meant to feel
 * cinematic — not a static map — so we layer:
 *
 *   - Dark Leaflet basemap zoomed onto the event location
 *   - Pulsing concentric rings keyed to the category accent
 *   - Side-by-side category-aware ambient text (handled by sidebar)
 *
 * The pulsing rings + accent border + map focus are the only visual
 * differences from the regular earth events page — but in this
 * full-bleed layout that's enough to feel like a "deep zoom" view.
 */
export function GenericScene({ event, category }: SimulationSceneProps) {
  const point = pickPoint(event);
  const center: [number, number] = point ? [point[1], point[0]] : [20, 0];
  const accent = category.accent_hex;

  return (
    <div
      className={cn(
        'relative h-full w-full overflow-hidden bg-surface-0',
      )}
    >
      <MapContainer
        center={center}
        zoom={point ? 6 : 2}
        scrollWheelZoom
        worldCopyJump
        style={{ height: '100%', width: '100%', background: '#04060d' }}
      >
        <TileLayer
          attribution="© OpenStreetMap contributors © CARTO"
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png"
          subdomains="abcd"
          maxZoom={19}
        />
        {point && (
          <>
            {/* Three pulsing rings of decreasing opacity = "this is happening" feel */}
            <CircleMarker
              center={center}
              radius={50}
              pathOptions={{ color: accent, weight: 1, fillColor: accent, fillOpacity: 0.04 }}
            />
            <CircleMarker
              center={center}
              radius={28}
              pathOptions={{ color: accent, weight: 1.5, fillColor: accent, fillOpacity: 0.12 }}
            />
            <CircleMarker
              center={center}
              radius={12}
              pathOptions={{ color: accent, weight: 2, fillColor: accent, fillOpacity: 0.55 }}
            />
            <FlyOnMount center={center} />
          </>
        )}
      </MapContainer>

      {/* Subtle gradient overlay so the map fades into the surrounding modal chrome */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />

      {/* Pulsing CSS rings on top of the marker so the visual reads even while zoomed out */}
      {point && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ filter: `drop-shadow(0 0 24px ${accent}aa)` }}
        >
          <div
            className="size-2 animate-ping rounded-full"
            style={{ background: accent }}
          />
        </div>
      )}
    </div>
  );
}

function FlyOnMount({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, Math.max(map.getZoom(), 6), { duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function pickPoint(event: SimulationSceneProps['event']): [number, number] | null {
  for (let i = event.geometries.length - 1; i >= 0; i--) {
    const g = event.geometries[i];
    if (!g || g.type !== 'Point') continue;
    const c = g.coordinates as number[];
    if (Array.isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
      return [c[0] as number, c[1] as number];
    }
  }
  return null;
}
