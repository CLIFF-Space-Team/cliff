'use client';

import {
  AlertTriangle,
  Flame,
  Mountain,
  Radio,
  Skull,
  TrendingUp,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';

import { Surface } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { ImpactResult } from '@/lib/impact-physics';

interface ResultPanelProps {
  result: ImpactResult;
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-threat-critical/15 text-threat-critical ring-threat-critical/40',
  high: 'bg-threat-high/15 text-threat-high ring-threat-high/40',
  moderate: 'bg-threat-moderate/15 text-threat-moderate ring-threat-moderate/40',
  low: 'bg-threat-low/15 text-threat-low ring-threat-low/40',
};

export function ResultPanel({ result }: ResultPanelProps) {
  return (
    <div className="space-y-3">
      <Verdict result={result} />
      <EnergyBlock result={result} />
      <DamageZonesBlock result={result} />
      <ComparisonsBlock result={result} />
      <CraterBlock result={result} />
    </div>
  );
}

function Verdict({ result }: ResultPanelProps) {
  const { verdict, mode, airburst_altitude_km } = result;
  const styles = SEVERITY_STYLES[verdict.severity] ?? SEVERITY_STYLES.low;

  return (
    <Surface elevation={1} className="p-4">
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle
          className={cn(
            'size-4',
            verdict.severity === 'critical' && 'text-threat-critical',
            verdict.severity === 'high' && 'text-threat-high',
            verdict.severity === 'moderate' && 'text-threat-moderate',
            verdict.severity === 'low' && 'text-threat-low',
          )}
        />
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset',
            styles,
          )}
        >
          {verdict.severity}
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-text-tertiary">
          {mode === 'airburst'
            ? `hava patlaması · ${airburst_altitude_km?.toFixed(0)} km`
            : mode === 'ocean'
              ? 'okyanus impact'
              : 'kara impact'}
        </span>
      </div>
      <h3 className="text-base font-semibold text-text-primary">{verdict.headline}</h3>
      <p className="mt-1 text-sm leading-relaxed text-text-secondary">{verdict.detail}</p>
    </Surface>
  );
}

function EnergyBlock({ result }: ResultPanelProps) {
  return (
    <Surface elevation={1} className="p-4">
      <SectionHead icon={Zap} title="Enerji" />
      <dl className="grid grid-cols-2 gap-2">
        <Stat
          label="Toplam"
          value={
            result.energy_megatons >= 1000
              ? `${(result.energy_megatons / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} Gt`
              : `${formatNumber(result.energy_megatons)} Mt`
          }
          unit="TNT"
        />
        <Stat
          label="Hiroşima"
          value={formatNumber(result.hiroshima_equivalents)}
          unit="bomba"
        />
        <Stat
          label="Yer kuplajı"
          value={`${(result.ground_coupling * 100).toFixed(0)}%`}
          hint="Yere ulaşan enerji oranı"
        />
        <Stat label="Kütle" value={formatMass(result.mass_kg)} />
      </dl>
    </Surface>
  );
}

function DamageZonesBlock({ result }: ResultPanelProps) {
  if (result.damage_zones.length === 0) {
    return null;
  }
  const max = result.damage_zones[0]?.radius_km ?? 1;
  return (
    <Surface elevation={1} className="p-4">
      <SectionHead icon={Wind} title="Hasar Zone'ları" />
      <div className="space-y-2">
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
                className={cn(
                  'h-full rounded-full transition-all',
                  z.severity === 'critical' && 'bg-threat-critical',
                  z.severity === 'high' && 'bg-threat-high',
                  z.severity === 'moderate' && 'bg-threat-moderate',
                  z.severity === 'low' && 'bg-threat-low',
                )}
                style={{ width: `${Math.max(2, (z.radius_km / max) * 100)}%` }}
              />
            </div>
            <div className="mt-0.5 text-[11px] text-text-tertiary">{z.description}</div>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function CraterBlock({ result }: ResultPanelProps) {
  if (result.mode !== 'crater' || result.crater_diameter_km <= 0) return null;
  return (
    <Surface elevation={1} className="p-4">
      <SectionHead icon={Mountain} title="Krater" />
      <dl className="grid grid-cols-3 gap-2">
        <Stat label="Çap" value={`${result.crater_diameter_km.toFixed(2)} km`} />
        <Stat label="Derinlik" value={`${result.crater_depth_km.toFixed(2)} km`} />
        <Stat label="Hacim" value={`${formatNumber(result.crater_volume_km3)} km³`} />
      </dl>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-3">
        <Stat
          label="Sismik magnitüd"
          value={`Mw ${result.seismic_magnitude.toFixed(1)}`}
          icon={Waves}
        />
        <Stat
          label="Hissedilme yarıçapı"
          value={`${formatNumber(result.seismic_felt_radius_km)} km`}
          icon={Radio}
        />
      </div>
      {result.tsunami_initial_wave_m > 0 && (
        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <Stat
            label="Tsunami (deniz seviyesi)"
            value={`~${result.tsunami_initial_wave_m.toFixed(0)} m dalga`}
            icon={Waves}
          />
        </div>
      )}
    </Surface>
  );
}

function ComparisonsBlock({ result }: ResultPanelProps) {
  if (result.comparisons.length === 0) return null;
  return (
    <Surface elevation={1} className="p-4">
      <SectionHead icon={TrendingUp} title="Karşılaştırma" />
      <ul className="space-y-1.5 text-xs">
        {result.comparisons.map((c) => (
          <li key={c.label} className="flex items-baseline justify-between gap-2">
            <span className="text-text-secondary">{c.label}</span>
            <span className="font-mono-tnum text-text-primary">
              {formatRatio(c.ratio)}×
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-text-tertiary">
        Enerji oranları. {'>'}1 = referanstan daha şiddetli.
      </p>
    </Surface>
  );
}

function SectionHead({ icon: Icon, title }: { icon: typeof Flame; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 border-b border-white/[0.06] pb-2">
      <Icon className="size-3.5 text-text-tertiary" aria-hidden />
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        {title}
      </h3>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  icon?: typeof Flame;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-text-tertiary">
        {Icon && <Icon className="size-3" aria-hidden />}
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1 font-mono-tnum">
        <span className="text-base font-medium text-text-primary">{value}</span>
        {unit && <span className="text-[10px] text-text-tertiary">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 text-[10px] text-text-tertiary">{hint}</div>}
    </div>
  );
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (Math.abs(value) >= 10) return value.toFixed(1);
  if (Math.abs(value) >= 0.01) return value.toFixed(3);
  return value.toExponential(2);
}

function formatMass(kg: number): string {
  if (kg >= 1e12) return `${(kg / 1e12).toFixed(2)} Tt`;
  if (kg >= 1e9) return `${(kg / 1e9).toFixed(2)} Gt`;
  if (kg >= 1e6) return `${(kg / 1e6).toFixed(2)} Mt`;
  if (kg >= 1e3) return `${(kg / 1e3).toFixed(2)} t`;
  return `${kg.toFixed(0)} kg`;
}

function formatRatio(r: number): string {
  if (r >= 1000) return r.toExponential(1);
  if (r >= 100) return r.toFixed(0);
  if (r >= 1) return r.toFixed(1);
  if (r >= 0.01) return r.toFixed(3);
  return r.toExponential(1);
}
