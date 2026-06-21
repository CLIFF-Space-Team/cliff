'use client';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { Circle, MapContainer, Marker, TileLayer } from 'react-leaflet';

import { CHELYABINSK_LOCATION } from '@/lib/historic-events/chelyabinsk-2013';
import { cn } from '@/lib/utils';

interface Props {
  shockwaveRadiusKm: number;
  glassBreakageRadiusKm: number;
  phase: string;
  className?: string;
}

const PHASE_LABEL: Record<string, string> = {
  entry: 'Atmosfer Girişi',
  peak: 'Maksimum Parlaklık',
  breakup: 'Hava Patlaması',
  shockwave: 'Şokdalgası',
  damage: 'Cam Kırılması',
  aftermath: 'Sonrası',
};

function makeBurstIcon(): L.DivIcon {
  return L.divIcon({
    className: 'chelyabinsk-burst',
    html: `
      <span style="
        display: block;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: radial-gradient(circle, #fff 0%, #fef3c7 30%, #f59e0b 60%, #b45309 100%);
        border: 2px solid #000;
        box-shadow: 0 0 0 2px #fbbf24, 0 0 24px rgba(251,191,36,0.9);
      "></span>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export function ChelyabinskShockwaveMapInner({
  shockwaveRadiusKm,
  glassBreakageRadiusKm,
  phase,
  className,
}: Props) {
  const burstIconRef = useRef<L.DivIcon | null>(null);
  useEffect(() => {
    burstIconRef.current = makeBurstIcon();
  }, []);

  const center: [number, number] = [
    CHELYABINSK_LOCATION.lat,
    CHELYABINSK_LOCATION.lng,
  ];

  return (
    <div
      className={cn(
        'relative aspect-[4/3] min-h-[50vh] w-full overflow-hidden rounded-lg border border-white/[0.06] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[55vh]',
        className,
      )}
    >
      <MapContainer
        center={center}
        zoom={7}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', background: 'hsl(0 0% 4%)' }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap &copy; CARTO'
          maxZoom={18}
        />

        {/* Cam kırılması maksimum etki çemberi (yarı saydam, sürekli görünür) */}
        <Circle
          center={center}
          radius={glassBreakageRadiusKm * 1000}
          pathOptions={{
            color: '#ea580c',
            weight: 1,
            fillColor: '#ea580c',
            fillOpacity: 0.05,
            dashArray: '4 4',
          }}
        />

        {/* Anlık şokdalgası — animate olur */}
        {shockwaveRadiusKm > 0 && (
          <Circle
            center={center}
            radius={shockwaveRadiusKm * 1000}
            pathOptions={{
              color: '#f59e0b',
              weight: 2.5,
              fillColor: '#f59e0b',
              fillOpacity: 0.12,
            }}
          />
        )}

        {/* Patlama noktası */}
        {burstIconRef.current && (
          <Marker
            position={center}
            icon={burstIconRef.current}
            zIndexOffset={1000}
          />
        )}
      </MapContainer>

      {/* Faz badge */}
      <div className="pointer-events-none absolute right-2 top-2 z-[400] rounded-md border border-threat-high/40 bg-surface-1/90 px-2.5 py-1.5 backdrop-blur">
        <div className="font-mono-tnum text-[9px] uppercase tracking-wider text-text-tertiary">
          Faz
        </div>
        <div className="text-[12px] font-semibold text-threat-high">
          {PHASE_LABEL[phase] ?? phase}
        </div>
      </div>

      {/* Şokdalgası mesafe etiketi */}
      <div className="pointer-events-none absolute bottom-2 left-2 z-[400] rounded-md border border-white/[0.1] bg-surface-1/90 px-2.5 py-1.5 backdrop-blur">
        <div className="font-mono-tnum text-[9px] uppercase tracking-wider text-text-tertiary">
          Şokdalgası
        </div>
        <div className="font-mono-tnum text-[12px] font-semibold text-threat-high">
          {shockwaveRadiusKm.toFixed(0)} km
        </div>
      </div>
    </div>
  );
}
