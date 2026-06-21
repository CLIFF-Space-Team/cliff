'use client';

import { MapPin, Star } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Surface } from '@/components/ui';
import type { CityInfo } from '@/lib/cities';
import {
  REGION_LABELS,
  TURKISH_CITIES,
  type TurkishCity,
} from '@/lib/cities-tr';
import { cn } from '@/lib/utils';

const ASSUMED_URBAN_DENSITY = 3000; // ppl/km² — Türkiye yerleşim ortalaması

/**
 * `TurkishCity` → `CityInfo` köprüsü. Mevcut `CasualtyPanel` ve impact
 * fizik motoru `CityInfo` bekliyor; population/density'den makul bir
 * yerleşik-alan tahmini çıkararak köprüyü kuruyoruz.
 */
export function turkishCityToCityInfo(t: TurkishCity): CityInfo {
  const area_km2 = Math.max(50, t.population / ASSUMED_URBAN_DENSITY);
  return {
    id: `tr-${t.plate}`,
    name: t.name,
    country: 'TR',
    lat: t.lat,
    lng: t.lng,
    population_millions: t.population / 1_000_000,
    area_km2,
  };
}

interface TurkishCityPickerProps {
  selectedId: string | null;
  onSelect: (city: CityInfo | null) => void;
  className?: string;
}

type RegionFilter = TurkishCity['region'] | 'all' | 'metropolitan';

const REGION_FILTERS: ReadonlyArray<{ value: RegionFilter; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'metropolitan', label: '★ Büyükşehir' },
  { value: 'marmara', label: 'Marmara' },
  { value: 'ege', label: 'Ege' },
  { value: 'akdeniz', label: 'Akdeniz' },
  { value: 'ic-anadolu', label: 'İç Anadolu' },
  { value: 'karadeniz', label: 'Karadeniz' },
  { value: 'dogu-anadolu', label: 'D. Anadolu' },
  { value: 'guneydogu-anadolu', label: 'GD. Anadolu' },
];

/**
 * 81 il + büyükşehir filtreli Türkiye'ye özel şehir seçici.
 *
 * Mevcut global `CityPicker`'ın yerine ya da yanında kullanılır. Çıktı
 * `CityInfo` tipindedir, bu yüzden `CasualtyPanel` ve diğer impact-bağımlı
 * component'ler ekstra adapter olmadan kullanır.
 */
export function TurkishCityPicker({
  selectedId,
  onSelect,
  className,
}: TurkishCityPickerProps) {
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState<RegionFilter>('metropolitan');

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');
    return TURKISH_CITIES.filter((c) => {
      if (region === 'metropolitan' && !c.metropolitan) return false;
      if (region !== 'all' && region !== 'metropolitan' && c.region !== region) {
        return false;
      }
      if (!q) return true;
      return c.name.toLocaleLowerCase('tr-TR').includes(q);
    }).sort((a, b) => b.population - a.population);
  }, [search, region]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    const m = /^tr-(\d+)$/.exec(selectedId);
    if (!m) return null;
    return TURKISH_CITIES.find((c) => c.plate === Number(m[1])) ?? null;
  }, [selectedId]);

  return (
    <Surface elevation={1} className={cn('space-y-3 p-4', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            <MapPin className="size-3.5" />
            🇹🇷 Türkiye Şehirleri
          </h2>
          <p className="text-[11px] text-text-tertiary">
            81 il + büyükşehir merkezi · etki bölgesi nüfusu hesaplanır
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

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="İl ara…"
        className="w-full rounded-md border border-white/10 bg-surface-2 px-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-white/30"
      />

      <div className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {REGION_FILTERS.map((rf) => {
          const active = region === rf.value;
          return (
            <button
              key={rf.value}
              type="button"
              onClick={() => setRegion(rf.value)}
              className={cn(
                'shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider transition-colors',
                active
                  ? 'border-white/30 bg-surface-3 text-text-primary'
                  : 'border-white/[0.08] bg-surface-1 text-text-secondary hover:bg-surface-2',
              )}
            >
              {rf.label}
            </button>
          );
        })}
      </div>

      <div className="scrollbar-thin grid max-h-56 grid-cols-2 gap-1 overflow-y-auto pr-1 sm:grid-cols-3">
        {filtered.length === 0 && (
          <p className="col-span-full py-6 text-center text-[11px] text-text-tertiary">
            Aramayla eşleşen il yok.
          </p>
        )}
        {filtered.map((c) => {
          const id = `tr-${c.plate}`;
          const active = id === selectedId;
          return (
            <button
              key={c.plate}
              type="button"
              onClick={() => onSelect(turkishCityToCityInfo(c))}
              className={cn(
                'rounded-md border px-2 py-1.5 text-left text-[11px] transition-colors',
                active
                  ? 'border-white/30 bg-surface-3 text-text-primary'
                  : 'border-white/[0.06] bg-surface-1 text-text-secondary hover:bg-surface-2',
              )}
            >
              <div className="flex items-center gap-1 truncate font-medium">
                {c.metropolitan && (
                  <Star className="size-2.5 shrink-0 text-threat-moderate" />
                )}
                <span className="truncate">{c.name}</span>
              </div>
              <div className="font-mono-tnum text-[10px] text-text-tertiary">
                {String(c.plate).padStart(2, '0')} ·{' '}
                {(c.population / 1_000_000).toFixed(1)}M ·{' '}
                {REGION_LABELS[c.region].slice(0, 4)}
              </div>
            </button>
          );
        })}
      </div>
    </Surface>
  );
}
