'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useMemo } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

interface EarthquakeMap2DProps {
  lat: number;
  lng: number;
  magnitude: number;
  place: string;
  depthKm?: number | null;
  tsunami?: boolean;
}

interface IntensityZone {
  band: string;
  /** Approximate felt radius in km. */
  radiusKm: number;
  /** Tone class for the legend swatch. */
  color: string;
  /** Short Turkish description shown in the legend + popup. */
  label: string;
}

/**
 * Empirical felt-intensity radii from magnitude. The numbers are tuned to
 * match published USGS ShakeMap "felt area" curves at the order-of-magnitude
 * level — good enough for an educational overlay, not for engineering.
 *
 *   M5  → ~5 km strong / 50 km felt
 *   M6  → ~15 km strong / 200 km felt
 *   M7  → ~50 km strong / 600 km felt
 *   M8  → ~150 km strong / 1500 km felt
 */
function intensityZones(mag: number): IntensityZone[] {
  // Felt-area scaling: log10(area) ~ 1.0*M + const → radius ~ 10^(0.5*M).
  const base = Math.pow(10, (mag - 4) * 0.5) * 5;
  return [
    { band: 'IX–X', radiusKm: Math.max(0.5, base * 0.25), color: '#ef4444', label: 'Yıkıcı sarsıntı' },
    { band: 'VII–VIII', radiusKm: Math.max(2, base * 0.55), color: '#f97316', label: 'Ağır hasar' },
    { band: 'V–VI', radiusKm: Math.max(5, base * 1.1), color: '#eab308', label: 'Orta · cam kırığı' },
    { band: 'III–IV', radiusKm: Math.max(15, base * 2.4), color: '#22c55e', label: 'Hissedilir' },
  ];
}

/**
 * Flat 2D earthquake briefing — replaces the heavy Mapbox 3D building view.
 * Shows the epicenter on a dark CartoDB basemap with concentric Mercalli
 * intensity rings (felt → strong → ağır → yıkıcı) so the reader can read
 * the affected radius at a glance.
 *
 * Why 2D not 3D:
 *   - No Mapbox token required (uses CartoDB Dark Matter, free)
 *   - The intensity rings convey the actual physics better than a tilted
 *     building view ever could — a quake's footprint is fundamentally a
 *     2D map.
 *   - Loads in <1s, no GPU cost.
 */
export function EarthquakeMap2D({
  lat,
  lng,
  magnitude,
  place,
  depthKm,
  tsunami,
}: EarthquakeMap2DProps) {
  const zones = useMemo(() => intensityZones(magnitude), [magnitude]);

  // Choose initial zoom from the largest ring so the user sees the full
  // felt radius without panning. Capped so distant tsunami quakes don't
  // zoom out to "world view".
  const maxRadiusKm = zones[zones.length - 1]!.radiusKm;
  const zoom = useMemo(() => {
    const z = 11 - Math.log2(Math.max(1, maxRadiusKm));
    return Math.max(3, Math.min(11, Math.round(z)));
  }, [maxRadiusKm]);

  // Pulsing epicenter marker — built as a divIcon so we don't depend on
  // Leaflet's default PNG marker assets (which trip up Webpack).
  const epicenterIcon = useMemo(
    () =>
      L.divIcon({
        className: 'cliff-epicenter-marker',
        html: `
          <div class="cliff-epicenter-anchor">
            <div class="cliff-epicenter-pulse"></div>
            <div class="cliff-epicenter-dot"></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
    [],
  );

  return (
    <div className="relative h-full w-full">
      {/* Local pulse keyframes — scoped via a class so we don't pollute global CSS. */}
      <style jsx global>{`
        .cliff-epicenter-marker { background: transparent; border: none; }
        .cliff-epicenter-anchor {
          position: relative; width: 22px; height: 22px;
          display: flex; align-items: center; justify-content: center;
        }
        .cliff-epicenter-dot {
          width: 12px; height: 12px; border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 0 2px white, 0 0 14px rgba(239,68,68,0.85);
          z-index: 2;
        }
        .cliff-epicenter-pulse {
          position: absolute; inset: 0;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.55);
          animation: cliff-epicenter-pulse 1.6s ease-out infinite;
          z-index: 1;
        }
        @keyframes cliff-epicenter-pulse {
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
      >
        <TileLayer
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Render rings outermost → innermost so the strong-shake ring sits
         *  on top of the felt ring (more vivid colour stack). */}
        {zones
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

        <Marker position={[lat, lng]} icon={epicenterIcon}>
          <Popup>
            <strong>M{magnitude.toFixed(1)}</strong>
            <br />
            {place}
            <br />
            {depthKm != null ? `${depthKm.toFixed(0)} km derinlik · ` : ''}
            {lat.toFixed(2)}°, {lng.toFixed(2)}°
            {tsunami && (
              <>
                <br />
                <span style={{ color: '#ef4444', fontWeight: 600 }}>TSUNAMİ UYARISI</span>
              </>
            )}
          </Popup>
        </Marker>
      </MapContainer>

      {/* Legend — anchored bottom-left so it doesn't clash with the
       *  EarthquakeImmersive's own bottom-centre control strip. */}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-white/10 bg-surface-1/90 px-3 py-2 text-[11px] backdrop-blur">
        <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
          Sismik şiddet zonları
        </div>
        <ul className="space-y-1">
          {zones.map((z) => (
            <li key={z.band} className="flex items-center gap-2 text-text-secondary">
              <span
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: z.color }}
              />
              <span className="font-mono-tnum text-text-primary">
                {z.band}
              </span>
              <span className="text-text-tertiary">·</span>
              <span>{z.label}</span>
              <span className="ml-auto font-mono-tnum text-text-tertiary">
                {z.radiusKm < 10
                  ? z.radiusKm.toFixed(1)
                  : Math.round(z.radiusKm)}{' '}
                km
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
