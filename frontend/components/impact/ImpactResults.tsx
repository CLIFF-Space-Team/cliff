'use client';

import type { CityInfo } from '@/lib/cities';
import type { CasualtyEstimate } from '@/lib/impact-casualties';
import type { ImpactResult } from '@/lib/impact-physics';
import { Surface } from '@/components/ui';
import { cn } from '@/lib/utils';

interface ImpactResultsProps {
  result: ImpactResult;
  city: CityInfo | null;
  casualties: CasualtyEstimate | null;
}

const SEVERITY_RING: Record<string, string> = {
  critical: 'bg-threat-critical/15 text-threat-critical ring-threat-critical/40',
  high: 'bg-threat-high/15 text-threat-high ring-threat-high/40',
  moderate: 'bg-threat-moderate/15 text-threat-moderate ring-threat-moderate/40',
  low: 'bg-threat-low/15 text-threat-low ring-threat-low/40',
};

const ZONE_BAR: Record<string, string> = {
  critical: 'bg-threat-critical',
  high: 'bg-threat-high',
  moderate: 'bg-threat-moderate',
  low: 'bg-threat-low',
};

/**
 * Tek panel halinde tüm çarpma sonucu — eski 8 ayrı kart yerine. Dev enerji
 * sayısı odak; altında kayıplar, etki metrikleri ve hasar bölgeleri kompakt
 * bölümlerde. Tek scroll, sakin hiyerarşi.
 */
export function ImpactResults({ result, city, casualties }: ImpactResultsProps) {
  const sev = result.verdict.severity;
  const energy =
    result.energy_megatons >= 1000
      ? `${(result.energy_megatons / 1000).toFixed(1)} Gt`
      : `${formatNumber(result.energy_megatons)} Mt`;
  const modeLabel =
    result.mode === 'airburst'
      ? `hava patlaması · ${result.airburst_altitude_km?.toFixed(0) ?? '—'} km`
      : result.mode === 'ocean'
        ? 'okyanus çarpması'
        : 'kara çarpması';
  const maxZone = result.damage_zones[0]?.radius_km ?? 1;

  return (
    <Surface elevation={1} rounded="lg" className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Hero — şiddet + enerji + verdict */}
      <div className="border-b border-white/[0.06] p-5">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset',
              SEVERITY_RING[sev] ?? SEVERITY_RING.low,
            )}
          >
            {sev}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
            {modeLabel}
          </span>
        </div>
        <div className="mt-4 flex items-end gap-2">
          <span className="font-mono-tnum text-[2.75rem] font-semibold leading-[0.9] tracking-tight tabular-nums text-text-primary">
            {energy}
          </span>
          <span className="mb-1.5 text-[11px] text-text-tertiary">TNT eşdeğeri</span>
        </div>
        <p className="mt-3 text-[13px] font-semibold text-text-primary">
          {result.verdict.headline}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
          {result.verdict.detail}
        </p>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
        {city && casualties && (
          <section>
            <SectionHead title={`${city.name} · kayıp tahmini`} />
            <div className="grid grid-cols-2 gap-2">
              <BigStat
                label="Tahmini ölü"
                value={casualties.fatalities.toLocaleString('tr-TR')}
                tone="critical"
              />
              <BigStat
                label="Tahmini yaralı"
                value={casualties.injuries.toLocaleString('tr-TR')}
                tone="high"
              />
            </div>
            <p className="mt-2 font-mono-tnum text-[10px] text-text-tertiary">
              {city.population_millions.toFixed(1)}M nüfus ·{' '}
              {casualties.density_per_km2.toLocaleString('tr-TR')} kişi/km²
            </p>
          </section>
        )}

        <section>
          <SectionHead title="Etki" />
          <dl className="grid grid-cols-2 gap-x-5 gap-y-3.5">
            <Stat label="Hiroşima" value={formatNumber(result.hiroshima_equivalents)} unit="bomba" />
            <Stat label="Termal yarıçap" value={`${result.thermal_radius_km.toFixed(1)} km`} />
            {result.mode === 'crater' && result.crater_diameter_km > 0 && (
              <Stat label="Krater çapı" value={`${result.crater_diameter_km.toFixed(2)} km`} />
            )}
            <Stat label="Sismik" value={`Mw ${result.seismic_magnitude.toFixed(1)}`} />
            {result.tsunami_initial_wave_m > 0 && (
              <Stat label="Tsunami dalgası" value={`~${result.tsunami_initial_wave_m.toFixed(0)} m`} />
            )}
            <Stat label="Yer kuplajı" value={`${(result.ground_coupling * 100).toFixed(0)}%`} />
          </dl>
        </section>

        {result.damage_zones.length > 0 && (
          <section>
            <SectionHead title="Hasar bölgeleri" />
            <div className="space-y-3">
              {result.damage_zones.map((z) => (
                <div key={z.label}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-[12px]">
                    <span className="text-text-primary">{z.label}</span>
                    <span className="font-mono-tnum text-text-secondary">
                      {z.radius_km < 1
                        ? `${(z.radius_km * 1000).toFixed(0)} m`
                        : `${z.radius_km.toFixed(z.radius_km < 10 ? 2 : 1)} km`}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={cn('h-full rounded-full', ZONE_BAR[z.severity] ?? ZONE_BAR.low)}
                      style={{ width: `${Math.max(3, (z.radius_km / maxZone) * 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] leading-snug text-text-tertiary">
                    {z.description}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Surface>
  );
}

function SectionHead({ title }: { title: string }) {
  return (
    <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
      {title}
    </h3>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-text-tertiary">{label}</dt>
      <dd className="mt-0.5 flex items-baseline gap-1 font-mono-tnum">
        <span className="text-[17px] font-medium text-text-primary">{value}</span>
        {unit && <span className="text-[10px] text-text-tertiary">{unit}</span>}
      </dd>
    </div>
  );
}

function BigStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'critical' | 'high';
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        tone === 'critical'
          ? 'border-threat-critical/25 bg-threat-critical/[0.06]'
          : 'border-threat-high/25 bg-threat-high/[0.06]',
      )}
    >
      <div className="text-[10px] uppercase tracking-wider text-text-tertiary">{label}</div>
      <div className="mt-1 font-mono-tnum text-xl font-semibold tabular-nums text-text-primary">
        {value}
      </div>
    </div>
  );
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (Math.abs(value) >= 10) return value.toFixed(1);
  if (Math.abs(value) >= 0.01) return value.toFixed(2);
  return value.toExponential(2);
}
