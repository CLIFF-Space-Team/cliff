'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useMemo } from 'react';
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';

import type { LiveEvent } from '../types';

interface EventMap2DProps {
  event: LiveEvent;
  /** When true the map fills its parent. False = compact inline thumbnail. */
  full?: boolean;
}

/**
 * Generic 2D map for ANY LiveEvent (quake / fireball / EONET). Replaces
 * the kind-specific Mapbox 3D experiments with a single, fast, token-free
 * Leaflet view — same code path for every marker so the user always gets
 * a "where on Earth is this?" answer.
 *
 * Quakes get Mercalli intensity rings; fireballs get a single bright dot
 * + altitude readout; EONET events render their geometry trail (start →
 * latest position) when the upstream provides multiple points.
 */
export function EventMap2D({ event, full = false }: EventMap2DProps) {
  const lat = event.lat;
  const lng = event.lng;

  const dotColor = COLOR_BY_KIND[event.kind];
  const epicenterIcon = useMemo(
    () =>
      L.divIcon({
        className: 'cliff-event-marker',
        html: `
          <div class="cliff-event-anchor" style="--dot-color:${dotColor}">
            <div class="cliff-event-pulse"></div>
            <div class="cliff-event-dot"></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
    [dotColor],
  );

  // Quake intensity zones (only for quakes — other event types get a
  // single-marker view).
  const quakeZones = useMemo(() => {
    if (event.kind !== 'quake') return null;
    const mag = (event.raw?.['magnitude'] as number) ?? 5;
    const base = Math.pow(10, (mag - 4) * 0.5) * 5;
    return [
      { band: 'IX–X', radiusKm: Math.max(0.5, base * 0.25), color: '#ef4444', label: 'Yıkıcı' },
      { band: 'VII–VIII', radiusKm: Math.max(2, base * 0.55), color: '#f97316', label: 'Ağır hasar' },
      { band: 'V–VI', radiusKm: Math.max(5, base * 1.1), color: '#eab308', label: 'Cam kırığı' },
      { band: 'III–IV', radiusKm: Math.max(15, base * 2.4), color: '#22c55e', label: 'Hissedilir' },
    ];
  }, [event]);

  // Fireball energy → impact-pressure radius (very rough scaling). 1 kt
  // gives ~1 km overpressure radius; scales with cube-root of energy.
  const fireballRing = useMemo(() => {
    if (event.kind !== 'fireball') return null;
    const kt = (event.raw?.['energy'] as number) ?? 1;
    const r1psi = Math.cbrt(kt) * 1.0; // overpressure radius (km)
    const rThermal = Math.cbrt(kt) * 1.6; // thermal radius (km)
    return [
      { radiusKm: rThermal, color: '#fbbf24', label: 'Termal etkisi' },
      { radiusKm: r1psi, color: '#f97316', label: 'Şok dalgası 1 psi' },
    ];
  }, [event]);

  // EONET geometry trail (some events ship a multi-point history).
  const eonetTrail = useMemo(() => {
    if (event.kind !== 'eonet') return null;
    const geo =
      (event.raw?.['geometry'] as Array<{ coordinates: number[]; date?: string }> | undefined) ??
      [];
    const points: [number, number][] = [];
    for (const g of geo) {
      if (Array.isArray(g.coordinates) && g.coordinates.length >= 2) {
        const [lon0, lat0] = g.coordinates;
        if (typeof lat0 === 'number' && typeof lon0 === 'number') {
          points.push([lat0, lon0]);
        }
      }
    }
    return points.length >= 2 ? points : null;
  }, [event]);

  // Auto-zoom: pick the largest meaningful radius and frame it.
  const fitRadiusKm = useMemo(() => {
    if (quakeZones) return quakeZones[quakeZones.length - 1]!.radiusKm;
    if (fireballRing) return fireballRing[0]!.radiusKm * 6;
    if (eonetTrail) {
      // Distance between first/last point ~roughly. Each degree ≈ 111 km.
      const a = eonetTrail[0]!;
      const b = eonetTrail[eonetTrail.length - 1]!;
      const km = Math.hypot(a[0] - b[0], a[1] - b[1]) * 111;
      return Math.max(20, km * 1.5);
    }
    return 50;
  }, [quakeZones, fireballRing, eonetTrail]);

  const zoom = Math.max(2, Math.min(11, Math.round(11 - Math.log2(Math.max(1, fitRadiusKm)))));

  return (
    <div
      className={
        full ? 'relative h-full w-full' : 'relative h-[200px] w-full overflow-hidden rounded'
      }
    >
      <style jsx global>{`
        .cliff-event-marker { background: transparent; border: none; }
        .cliff-event-anchor {
          position: relative; width: 22px; height: 22px;
          display: flex; align-items: center; justify-content: center;
        }
        .cliff-event-dot {
          width: 12px; height: 12px; border-radius: 50%;
          background: var(--dot-color, #ef4444);
          box-shadow: 0 0 0 2px white, 0 0 12px var(--dot-color, rgba(239,68,68,0.8));
          z-index: 2;
        }
        .cliff-event-pulse {
          position: absolute; inset: 0;
          border-radius: 50%;
          background: var(--dot-color, #ef4444);
          opacity: 0.5;
          animation: cliff-event-pulse 1.6s ease-out infinite;
          z-index: 1;
        }
        @keyframes cliff-event-pulse {
          0%   { transform: scale(0.5); opacity: 0.85; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        .leaflet-container { background: #060809; }
        .leaflet-container .leaflet-control-attribution {
          background: rgba(0,0,0,0.5); color: #888; font-size: 9px;
        }
        .leaflet-container .leaflet-control-attribution a { color: #aaa; }
      `}</style>

      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
        worldCopyJump
        zoomControl={full}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Quake intensity rings (outer first so the inner ones layer on top). */}
        {quakeZones &&
          quakeZones
            .slice()
            .reverse()
            .map((z) => (
              <Circle
                key={z.band}
                center={[lat, lng]}
                radius={z.radiusKm * 1000}
                pathOptions={{
                  color: z.color,
                  fillColor: z.color,
                  fillOpacity: 0.06,
                  weight: 1.4,
                  opacity: 0.65,
                }}
              />
            ))}

        {/* Fireball energy rings */}
        {fireballRing &&
          fireballRing
            .slice()
            .reverse()
            .map((z) => (
              <Circle
                key={z.label}
                center={[lat, lng]}
                radius={z.radiusKm * 1000}
                pathOptions={{
                  color: z.color,
                  fillColor: z.color,
                  fillOpacity: 0.05,
                  weight: 1.2,
                  opacity: 0.55,
                  dashArray: '4 3',
                }}
              />
            ))}

        {/* EONET trail polyline */}
        {eonetTrail && (
          <Polyline
            positions={eonetTrail}
            pathOptions={{
              color: '#22d3ee',
              weight: 2,
              opacity: 0.7,
              dashArray: '4 3',
            }}
          />
        )}

        <Marker position={[lat, lng]} icon={epicenterIcon}>
          <Popup>
            <strong>{event.title}</strong>
            {event.subtitle && (
              <>
                <br />
                <span style={{ color: '#888' }}>{event.subtitle}</span>
              </>
            )}
            <br />
            {lat.toFixed(2)}°, {lng.toFixed(2)}°
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

const COLOR_BY_KIND: Record<LiveEvent['kind'], string> = {
  quake: '#ef4444',
  fireball: '#fbbf24',
  eonet: '#22d3ee',
};
