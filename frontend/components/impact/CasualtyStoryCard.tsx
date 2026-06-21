'use client';

import { Bomb, Building2, Flame } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Surface } from '@/components/ui';
import type { CityInfo } from '@/lib/cities';
import type { CasualtyEstimate } from '@/lib/impact-casualties';
import type { ImpactResult } from '@/lib/impact-physics';
import { cn } from '@/lib/utils';

const HIROSHIMA_KT = 15;
const HIROSHIMA_MT = HIROSHIMA_KT / 1000;
const TUNGUSKA_MT = 12;
const TSAR_BOMBA_MT = 50;

/** Türkiye'den ünlü şehirlerin yaklaşık nüfusu (milyon). Karşılaştırma için. */
const TR_REFERENCE_CITIES: Array<{ name: string; population: number }> = [
  { name: 'Sinop', population: 222000 },
  { name: 'Edirne', population: 414000 },
  { name: 'Eskişehir', population: 910000 },
  { name: 'Adana', population: 2_270_000 },
  { name: 'İzmir', population: 4_470_000 },
  { name: 'Ankara', population: 5_800_000 },
  { name: 'İstanbul', population: 15_800_000 },
];

function findClosestCity(target: number): { name: string; population: number; ratio: number } {
  let best = TR_REFERENCE_CITIES[0]!;
  let bestDiff = Math.abs(best.population - target);
  for (const c of TR_REFERENCE_CITIES.slice(1)) {
    const d = Math.abs(c.population - target);
    if (d < bestDiff) {
      best = c;
      bestDiff = d;
    }
  }
  return { ...best, ratio: target / best.population };
}

function useAnimatedCount(target: number, durationMs = 1500): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const initial = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(Math.round(initial + (target - initial) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

interface Props {
  city: CityInfo;
  result: ImpactResult;
  estimate: CasualtyEstimate;
}

/**
 * Sonuç hikayeleştirme kartı:
 *  - Animasyonlu kayıp sayacı
 *  - "Bu yıkım X şehri kadar"
 *  - Enerji eşdeğerliği (Hiroşima / Tunguska / Tsar Bomba)
 */
export function CasualtyStoryCard({ city, result, estimate }: Props) {
  const totalAffected = estimate.fatalities + estimate.injuries;
  const animatedFatalities = useAnimatedCount(estimate.fatalities);
  const animatedInjuries = useAnimatedCount(estimate.injuries);

  const cityRef = findClosestCity(totalAffected);
  const energyMt = result.energy_megatons;

  const equivalences: Array<{ label: string; ratio: number; emoji: string }> = [
    { label: 'Hiroşima bombası', ratio: energyMt / HIROSHIMA_MT, emoji: '💣' },
    { label: 'Tunguska olayı', ratio: energyMt / TUNGUSKA_MT, emoji: '🌲' },
    { label: 'Tsar Bomba', ratio: energyMt / TSAR_BOMBA_MT, emoji: '☢️' },
  ].filter((e) => e.ratio > 0.001);

  return (
    <Surface elevation={2} rounded="lg" className="space-y-4 p-4">
      <header className="flex items-center gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-threat-critical/15 text-threat-critical">
          <Flame className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            Hikaye · {city.name}
          </h3>
          <p className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
            Yıkım anlatısı
          </p>
        </div>
      </header>

      {/* Animated counts */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-threat-critical/30 bg-threat-critical/5 p-3 text-center">
          <p className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
            Tahmini ölü
          </p>
          <p className="font-mono-tnum text-2xl font-semibold tabular-nums text-threat-critical sm:text-3xl">
            {animatedFatalities.toLocaleString('tr-TR')}
          </p>
        </div>
        <div className="rounded-md border border-threat-high/30 bg-threat-high/5 p-3 text-center">
          <p className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
            Tahmini yaralı
          </p>
          <p className="font-mono-tnum text-2xl font-semibold tabular-nums text-threat-high sm:text-3xl">
            {animatedInjuries.toLocaleString('tr-TR')}
          </p>
        </div>
      </div>

      {/* Şehir karşılaştırma */}
      {totalAffected > 100 && (
        <div className="flex items-start gap-2 rounded-md border border-white/[0.06] bg-surface-1 p-3">
          <Building2 className="size-4 shrink-0 text-text-secondary" />
          <p className="text-[12px] leading-relaxed text-text-secondary">
            Bu yıkım yaklaşık{' '}
            <span className="font-semibold text-text-primary">
              {cityRef.ratio < 1
                ? `${cityRef.name}'in nüfusunun %${Math.round(cityRef.ratio * 100)}'i`
                : cityRef.ratio < 1.5
                  ? `${cityRef.name} kadar`
                  : `${cityRef.ratio.toFixed(1)}× ${cityRef.name}`}
            </span>{' '}
            büyüklüğünde bir kitleyi etkiler.
          </p>
        </div>
      )}

      {/* Enerji eşdeğerlikleri — basit bar chart */}
      <div className="space-y-2">
        <p className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
          Enerji eşdeğerliği · {energyMt.toFixed(2)} Mt TNT
        </p>
        <div className="space-y-1.5">
          {equivalences.map((e) => {
            const log = Math.log10(Math.max(0.001, e.ratio)); // -3..3 aralığı
            const widthPct = Math.max(4, Math.min(100, ((log + 3) / 6) * 100));
            return (
              <div key={e.label} className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-text-secondary">
                    {e.emoji} {e.label}
                  </span>
                  <span className="font-mono-tnum text-text-primary">
                    {e.ratio < 1
                      ? `${(e.ratio * 100).toFixed(1)}%`
                      : `${e.ratio.toFixed(1)}×`}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-1">
                  <div
                    className={cn(
                      'h-full transition-all duration-700',
                      e.ratio >= 1
                        ? 'bg-threat-critical'
                        : e.ratio >= 0.1
                          ? 'bg-threat-high'
                          : 'bg-threat-moderate',
                    )}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {result.verdict && (
        <div className="flex items-start gap-2 rounded-md border border-threat-critical/40 bg-threat-critical/5 p-3">
          <Bomb className="size-4 shrink-0 text-threat-critical" />
          <div>
            <p className="text-[12px] font-semibold text-text-primary">
              {result.verdict.headline}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">
              {result.verdict.detail}
            </p>
          </div>
        </div>
      )}
    </Surface>
  );
}
