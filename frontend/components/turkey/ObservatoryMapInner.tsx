'use client';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

import {
  OBSERVATORY_TYPE_LABELS,
  TURKISH_OBSERVATORIES,
  type Observatory,
} from '@/lib/observatories-tr';
import { cn } from '@/lib/utils';

/**
 * Leaflet marker icon'u Next.js bundle'da kırılır (default ikon resimleri
 * relative path'lerini kaybeder). Custom div icon ile aşıyoruz — hem temiz
 * görünür hem CDN bağımlılığı yok.
 */
function makeIcon(type: Observatory['type']): L.DivIcon {
  const color =
    type === 'national'
      ? 'hsl(25 95% 53%)' // threat-high (turuncu) — ulusal
      : type === 'university'
        ? 'hsl(0 0% 98%)' // beyaz — üniversite
        : 'hsl(0 0% 64%)'; // gri — amatör
  return L.divIcon({
    className: 'observatory-marker',
    html: `
      <span style="
        display: inline-block;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid hsl(0 0% 0%);
        box-shadow: 0 0 0 1px ${color}, 0 0 8px ${color}80;
      "></span>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -8],
  });
}

export function ObservatoryMapInner({ className }: { className?: string }) {
  const [icons, setIcons] = useState<Record<Observatory['type'], L.DivIcon> | null>(
    null,
  );

  useEffect(() => {
    // Leaflet objects must be created client-side after mount
    setIcons({
      national: makeIcon('national'),
      university: makeIcon('university'),
      amateur: makeIcon('amateur'),
    });
  }, []);

  return (
    <div
      className={cn(
        'relative aspect-[4/3] min-h-[50vh] w-full overflow-hidden rounded-lg border border-white/[0.06] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[55vh]',
        className,
      )}
    >
      <MapContainer
        center={[39.0, 35.0]}
        zoom={6}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', background: 'hsl(0 0% 4%)' }}
        attributionControl={false}
      >
        {/* Carto Dark Matter — koyu tema, ücretsiz */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={18}
        />

        {icons &&
          TURKISH_OBSERVATORIES.map((obs) => (
            <Marker
              key={obs.id}
              position={[obs.lat, obs.lng]}
              icon={icons[obs.type]}
            >
              <Popup className="observatory-popup">
                <div style={{ minWidth: '220px', maxWidth: '300px' }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'hsl(0 0% 98%)',
                      marginBottom: '4px',
                    }}
                  >
                    {obs.name}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: 'hsl(0 0% 64%)',
                      marginBottom: '8px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {obs.shortName} · {OBSERVATORY_TYPE_LABELS[obs.type]} ·{' '}
                    {obs.city}
                  </div>
                  <p
                    style={{
                      fontSize: '12px',
                      lineHeight: 1.5,
                      color: 'hsl(0 0% 80%)',
                      margin: '0 0 8px',
                    }}
                  >
                    {obs.description}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      fontSize: '11px',
                      color: 'hsl(0 0% 64%)',
                      fontFamily: 'monospace',
                    }}
                  >
                    <span>{obs.altitudeM} m</span>
                    {obs.largestTelescopeM != null && (
                      <span>Ø {obs.largestTelescopeM} m</span>
                    )}
                    <span>· {obs.founded}</span>
                  </div>
                  {obs.url && (
                    <a
                      href={obs.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        marginTop: '8px',
                        fontSize: '11px',
                        color: 'hsl(0 0% 92%)',
                        textDecoration: 'underline',
                      }}
                    >
                      Resmi site →
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Legend overlay */}
      <div className="pointer-events-none absolute bottom-2 left-2 z-[400] rounded-md border border-white/[0.1] bg-surface-1/90 px-2.5 py-1.5 backdrop-blur">
        <div className="font-mono-tnum text-[9px] uppercase tracking-wider text-text-tertiary">
          Gözlem Evleri
        </div>
        <div className="mt-1 flex flex-col gap-0.5 text-[10px] text-text-secondary">
          <LegendDot color="hsl(25 95% 53%)" label="Ulusal" />
          <LegendDot color="hsl(0 0% 98%)" label="Üniversite" />
          <LegendDot color="hsl(0 0% 64%)" label="Amatör" />
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="size-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 0 1px ${color}` }}
      />
      <span>{label}</span>
    </span>
  );
}
