'use client';

import { Skull, Stethoscope, Users } from 'lucide-react';

import { Surface } from '@/components/ui';
import type { CityInfo } from '@/lib/cities';
import type { CasualtyEstimate } from '@/lib/impact-casualties';
import { cn } from '@/lib/utils';

interface CasualtyPanelProps {
  city: CityInfo;
  estimate: CasualtyEstimate;
}

export function CasualtyPanel({ city, estimate }: CasualtyPanelProps) {
  const total = estimate.fatalities + estimate.injuries;
  const popM = city.population_millions * 1_000_000;
  const affectedPct = popM > 0 ? Math.min(1, total / popM) : 0;

  return (
    <Surface elevation={1} className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            <Users className="size-3.5" />
            {city.name} — Kayıp Tahmini
          </h3>
          <p className="text-[11px] text-text-tertiary">
            {city.population_millions.toFixed(1)}M nüfus · {estimate.density_per_km2.toLocaleString()} kişi/km²
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
            Etkilenen
          </div>
          <div className="font-mono-tnum text-sm font-semibold text-text-primary">
            {(affectedPct * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat
          icon={Skull}
          label="Tahmini ölü"
          value={estimate.fatalities.toLocaleString('tr-TR')}
          tone="critical"
        />
        <Stat
          icon={Stethoscope}
          label="Tahmini yaralı"
          value={estimate.injuries.toLocaleString('tr-TR')}
          tone="high"
        />
      </div>

      <div className="space-y-1.5">
        <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
          Bölge bazında
        </div>
        {estimate.zones
          .filter((z) => z.overlap_km2 > 0)
          .map((z) => (
            <div key={z.label} className="text-[11px]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-text-secondary">{z.label}</span>
                <span className="font-mono-tnum text-text-primary">
                  {z.fatalities.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ölü
                </span>
              </div>
              <div className="font-mono-tnum text-[10px] text-text-tertiary">
                {z.radius_km.toFixed(1)} km · {z.overlap_km2.toFixed(0)} km² etkilenen
              </div>
            </div>
          ))}
      </div>

      <p className="border-t border-white/[0.06] pt-2 text-[10px] leading-relaxed text-text-tertiary">
        Tahminler şehir merkezine doğrudan çarpma + uniform popülasyon dağılımı
        varsayar. Gerçek kayıplar SEDAC LandScan grid sorgusu ile inceltilebilir.
      </p>
    </Surface>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone: 'critical' | 'high';
}) {
  return (
    <div
      className={cn(
        'rounded-md border p-3',
        tone === 'critical'
          ? 'border-threat-critical/30 bg-threat-critical/5'
          : 'border-threat-high/30 bg-threat-high/5',
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-tertiary">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="mt-1 font-mono-tnum text-base font-semibold text-text-primary">
        {value}
      </div>
    </div>
  );
}
