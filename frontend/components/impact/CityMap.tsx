'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet';

import { CITIES, type CityInfo } from '@/lib/cities';

interface CityMapProps {
  selectedId: string | null;
  onSelect: (city: CityInfo | null) => void;
}

export function CityMap({ selectedId, onSelect }: CityMapProps) {
  // Fix for default marker icon paths under Webpack
  useEffect(() => {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  const center = useMemo<[number, number]>(() => {
    if (selectedId) {
      const c = CITIES.find((c) => c.id === selectedId);
      if (c) return [c.lat, c.lng];
    }
    return [25, 20];
  }, [selectedId]);

  return (
    <div className="overflow-hidden rounded-md border border-white/[0.06]">
      <MapContainer
        center={center}
        zoom={2}
        scrollWheelZoom={false}
        style={{ height: '180px', width: '100%', background: '#0a0a0a' }}
        attributionControl={false}
        worldCopyJump
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          attribution='&copy; OSM &copy; CARTO'
        />
        <FlyTo selectedId={selectedId} />
        {CITIES.map((c) => {
          const active = c.id === selectedId;
          const radius = active ? 8 : 4 + Math.log10(c.population_millions + 1) * 2;
          return (
            <CircleMarker
              key={c.id}
              center={[c.lat, c.lng]}
              radius={radius}
              pathOptions={{
                color: active ? '#ef4444' : '#9ec6ff',
                fillColor: active ? '#ef4444' : '#9ec6ff',
                fillOpacity: active ? 0.85 : 0.45,
                weight: active ? 2 : 1,
              }}
              eventHandlers={{
                click: () => onSelect(c),
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}

function FlyTo({ selectedId }: { selectedId: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!selectedId) return;
    const c = CITIES.find((x) => x.id === selectedId);
    if (c) map.flyTo([c.lat, c.lng], 5, { duration: 0.8 });
  }, [selectedId, map]);
  return null;
}
