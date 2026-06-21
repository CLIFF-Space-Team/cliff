'use client';

import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Skeleton, SourceLabel, Surface } from '@/components/ui';
import { useImpactPresets } from '@/hooks/useImpactPresets';
import { LOCAL_TR_PRESETS, type ImpactPreset } from '@/lib/impact-presets';
import { cn } from '@/lib/utils';

type PresetCategory = 'turkey' | 'historical' | 'active_neo';

const CATEGORY_TABS: ReadonlyArray<{ value: PresetCategory; label: string }> = [
  { value: 'turkey', label: '🇹🇷 Türkiye' },
  { value: 'historical', label: '🕰️ Tarihsel' },
  { value: 'active_neo', label: '🛰️ Canlı NEO' },
];

function categorizePreset(preset: ImpactPreset): PresetCategory {
  if (preset.id.startsWith('tr-')) return 'turkey';
  return preset.kind === 'active_neo' ? 'active_neo' : 'historical';
}

interface PresetPickerProps {
  selectedId: string | null;
  onPick: (preset: ImpactPreset) => void;
}

export function PresetPicker({ selectedId, onPick }: PresetPickerProps) {
  const { data, isLoading, isError, refetch, isFetching } = useImpactPresets();
  // Backend canonical preset'leri + Türkiye'ye yatık yerel ek preset'ler.
  // Yerel olanlar sona ekleniyor, benzersiz id ön ekiyle (`tr-`).
  const presets = useMemo(
    () => [...(data?.items ?? []), ...LOCAL_TR_PRESETS],
    [data?.items],
  );

  // Aktif kategori: seçili preset hangi kategorideyse o, yoksa Türkiye.
  const initialCategory = useMemo<PresetCategory>(() => {
    if (selectedId) {
      const found = presets.find((p) => p.id === selectedId);
      if (found) return categorizePreset(found);
    }
    return 'turkey';
  }, [selectedId, presets]);

  const [activeCategory, setActiveCategory] = useState<PresetCategory>(initialCategory);

  const filtered = useMemo(
    () => presets.filter((p) => categorizePreset(p) === activeCategory),
    [presets, activeCategory],
  );

  const counts = useMemo<Record<PresetCategory, number>>(() => {
    const out: Record<PresetCategory, number> = {
      turkey: 0,
      historical: 0,
      active_neo: 0,
    };
    for (const p of presets) {
      out[categorizePreset(p)] += 1;
    }
    return out;
  }, [presets]);

  return (
    <Surface elevation={1} className="flex flex-col">
      <div className="flex items-baseline justify-between p-4 pb-3">
        <h2 className="text-sm font-semibold text-text-primary">Hazır Senaryolar</h2>
        <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
          {presets.length} senaryo
        </span>
      </div>

      {/* Kategori sekmeleri */}
      <div className="flex gap-1 px-4 pb-3">
        {CATEGORY_TABS.map((tab) => {
          const active = activeCategory === tab.value;
          const count = counts[tab.value];
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveCategory(tab.value)}
              className={cn(
                'flex-1 rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors',
                active
                  ? 'border-white/30 bg-surface-3 text-text-primary'
                  : 'border-white/[0.06] bg-surface-1 text-text-secondary hover:bg-surface-2',
              )}
              aria-pressed={active}
            >
              <span>{tab.label}</span>
              <span className="ml-1.5 font-mono-tnum text-[9px] text-text-tertiary">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="px-4">
        {isLoading && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        )}
        {isError && (
          <div className="flex items-center gap-2 py-3 text-sm text-threat-critical">
            <span>Senaryolar alınamadı.</span>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-md border border-white/10 bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-text-primary hover:bg-surface-3 disabled:opacity-50"
            >
              {isFetching ? 'Deneniyor…' : 'Tekrar dene'}
            </button>
          </div>
        )}
        {!isLoading && !isError && filtered.length === 0 && (
          <p className="py-4 text-center text-[11px] text-text-tertiary">
            Bu kategoride senaryo yok.
          </p>
        )}
        {!isLoading && !isError && filtered.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {filtered.map((p) => {
              const active = selectedId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPick(p)}
                  className={cn(
                    'group relative rounded-md border px-3 py-2 text-left transition-colors',
                    active
                      ? 'border-white/30 bg-surface-2'
                      : 'border-white/[0.06] bg-surface-1 hover:bg-surface-2',
                  )}
                >
                  {active && (
                    <Check className="absolute right-2 top-2 size-3 text-text-primary" />
                  )}
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
                      {p.era}
                    </span>
                    {p.kind === 'active_neo' && (
                      <span className="text-[8px] uppercase tracking-wider text-threat-low">
                        canlı
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-sm font-medium text-text-primary">{p.name}</div>
                  <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-text-secondary">
                    {p.context}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <SourceLabel
        source={data?.source ?? 'JPL SBDB + tarihi kayıt'}
        updatedAt={data?.fetched_at}
      />
    </Surface>
  );
}
