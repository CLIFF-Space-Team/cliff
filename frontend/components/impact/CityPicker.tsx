'use client';

import dynamic from 'next/dynamic';
import { Loader2, MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Skeleton, Surface } from '@/components/ui';
import { CITIES, type CityInfo } from '@/lib/cities';
import { cn } from '@/lib/utils';

const CityMap = dynamic(() => import('./CityMap').then((m) => m.CityMap), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-video w-full items-center justify-center rounded-md border border-white/[0.06] bg-surface-2">
      <Loader2 className="size-4 animate-spin text-text-tertiary" />
    </div>
  ),
});

interface CityPickerProps {
  selectedId: string | null;
  onSelect: (city: CityInfo | null) => void;
}

export function CityPicker({ selectedId, onSelect }: CityPickerProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CITIES;
    return CITIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q),
    );
  }, [search]);

  const selected = selectedId ? CITIES.find((c) => c.id === selectedId) ?? null : null;

  return (
    <Surface elevation={1} className="space-y-3 p-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            <MapPin className="size-3.5" />
            Çarpma Konumu
          </h2>
          <p className="text-[11px] text-text-tertiary">
            Şehir seç veya haritadan tıkla — popülasyon-bazlı kayıp tahmini hesaplanır
          </p>
        </div>
        {selected && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-[11px] text-text-tertiary hover:text-text-primary"
          >
            temizle
          </button>
        )}
      </div>

      <CityMap selectedId={selectedId} onSelect={onSelect} />

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Şehir ara (isim veya ülke kodu)…"
        className="w-full rounded-md border border-white/10 bg-surface-2 px-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-white/30"
      />

      <div className="scrollbar-thin grid max-h-48 grid-cols-2 gap-1 overflow-y-auto pr-1 sm:grid-cols-3">
        {filtered.map((city) => {
          const active = city.id === selectedId;
          return (
            <button
              key={city.id}
              type="button"
              onClick={() => onSelect(city)}
              className={cn(
                'rounded-md border px-2 py-1.5 text-left text-[11px] transition-colors',
                active
                  ? 'border-white/30 bg-surface-3 text-text-primary'
                  : 'border-white/[0.06] bg-surface-1 text-text-secondary hover:bg-surface-2',
              )}
            >
              <div className="truncate font-medium">{city.name}</div>
              <div className="font-mono-tnum text-[10px] text-text-tertiary">
                {city.country} · {city.population_millions.toFixed(1)}M
              </div>
            </button>
          );
        })}
      </div>
    </Surface>
  );
}
