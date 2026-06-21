'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';

import type { Earthquake } from '@/hooks/useEarthquakes';
import type { EonetEvent } from '@/hooks/useEarthEvents';
import type { FireballRow } from '@/hooks/useFireballs';

interface EarthLiveMapProps {
  showQuakes: boolean;
  showEonet: boolean;
  showFireballs: boolean;
  quakes: Earthquake[];
  eonet: EonetEvent[];
  fireballs: FireballRow[];
}

/**
 * Single-pane world map combining the three Earth feeds the dashboard cares
 * about. Uses CARTO's dark-no-labels basemap to avoid clashing with the
 * pure-black theme; each layer has a distinct accent colour:
 *
 *   - quakes   → orange     (USGS earthquakes)
 *   - eonet    → cyan       (volcanoes / wildfires / storms)
 *   - fireballs → amber/red (atmospheric impacts, sized by energy)
 *
 * Markers use `CircleMarker` so radius is in screen pixels (consistent zoom
 * presence) while still being filterable + keyboard-accessible via popups.
 */
export function EarthLiveMap({
  showQuakes,
  showEonet,
  showFireballs,
  quakes,
  eonet,
  fireballs,
}: EarthLiveMapProps) {
  useEffect(() => {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  return (
    <div className="overflow-hidden rounded-md border border-white/[0.06]">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        scrollWheelZoom={false}
        style={{ height: 'min(420px, 50vh)', width: '100%', background: '#070707' }}
        attributionControl={false}
        worldCopyJump
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          attribution="&copy; OSM &copy; CARTO"
        />

        {/* ── Earthquakes ──────────────────────────────────── */}
        {showQuakes &&
          quakes.map((q) => {
            if (q.lat == null || q.lon == null) return null;
            const radius = Math.max(3, Math.min(14, (q.magnitude - 3.5) * 3));
            const color =
              q.magnitude >= 7
                ? '#ef4444'
                : q.magnitude >= 6
                  ? '#f97316'
                  : q.magnitude >= 5
                    ? '#eab308'
                    : '#fb923c';
            return (
              <CircleMarker
                key={`eq-${q.id}`}
                center={[q.lat, q.lon]}
                radius={radius}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.55,
                  weight: 1.2,
                }}
              >
                <Popup className="cliff-leaflet-popup">
                  <div className="text-[12px]">
                    <div className="font-bold">M{q.magnitude.toFixed(1)} · deprem</div>
                    <div>{q.place}</div>
                    {q.depth_km != null && <div>{q.depth_km.toFixed(0)} km derinlik</div>}
                    {q.tsunami && <div className="text-blue-500">⚠ Tsunami uyarısı</div>}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* ── EONET active events ───────────────────────────── */}
        {showEonet &&
          eonet.flatMap((event) => {
            const last = event.geometry?.[event.geometry.length - 1];
            if (!last || !last.coordinates || last.coordinates.length < 2) return [];
            const [lon, lat] = last.coordinates;
            if (lat == null || lon == null) return [];
            return [
              <CircleMarker
                key={`eonet-${event.id}`}
                center={[lat, lon]}
                radius={5}
                pathOptions={{
                  color: '#22d3ee',
                  fillColor: '#22d3ee',
                  fillOpacity: 0.45,
                  weight: 1,
                }}
              >
                <Popup className="cliff-leaflet-popup">
                  <div className="text-[12px]">
                    <div className="font-bold">{event.title}</div>
                    <div className="opacity-70">
                      {event.categories?.map((c) => c.title).join(' · ')}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>,
            ];
          })}

        {/* ── Fireballs (atmospheric impacts) ──────────────── */}
        {showFireballs &&
          fireballs.map((f, idx) => {
            if (f.lat == null || f.lon == null) return null;
            const radius = Math.max(3, Math.min(11, Math.log10(f.energy + 1.1) * 6 + 2));
            const color =
              f.energy >= 5 ? '#ef4444' : f.energy >= 1 ? '#f97316' : '#fbbf24';
            return (
              <CircleMarker
                key={`fb-${idx}-${f.date}`}
                center={[f.lat, f.lon]}
                radius={radius}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.4,
                  weight: 1,
                }}
              >
                <Popup className="cliff-leaflet-popup">
                  <div className="text-[12px]">
                    <div className="font-bold">Fireball · {f.energy.toFixed(2)} kt</div>
                    <div>{f.date.slice(0, 10)}</div>
                    {f.altitude != null && <div>{f.altitude.toFixed(0)} km irtifa</div>}
                    {f.velocity != null && <div>{f.velocity.toFixed(1)} km/s</div>}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </div>
  );
}
