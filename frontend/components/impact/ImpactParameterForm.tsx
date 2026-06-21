'use client';

import { Surface } from '@/components/ui';
import { GlossaryTerm } from '@/components/glossary/GlossaryTerm';
import { CompositionPicker } from './CompositionPicker';
import type { ImpactInput } from '@/lib/impact-physics';
import { cn } from '@/lib/utils';

interface ImpactParameterFormProps {
  value: ImpactInput;
  onChange: (next: ImpactInput) => void;
}

export function ImpactParameterForm({ value, onChange }: ImpactParameterFormProps) {
  const set = <K extends keyof ImpactInput>(key: K, next: ImpactInput[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <Surface elevation={1} className="space-y-4 p-4">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Parametreler</h2>
        <p className="mt-0.5 text-[11px] text-text-tertiary">
          Slider veya kutuyu kullan; sonuçlar canlı.
        </p>
      </div>

      <NumericSlider
        label={<GlossaryTerm of="impact_diameter">Çap</GlossaryTerm>}
        unit="m"
        min={1}
        max={20_000}
        step={1}
        value={value.diameterM}
        onChange={(v) => set('diameterM', v)}
        format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(2)} km` : `${v} m`)}
        scale="log"
      />
      <NumericSlider
        label={<GlossaryTerm of="impact_velocity">Hız</GlossaryTerm>}
        unit="km/s"
        min={5}
        max={72}
        step={0.5}
        value={value.velocityKms}
        onChange={(v) => set('velocityKms', v)}
      />
      <NumericSlider
        label={<GlossaryTerm of="impact_angle">Geliş açısı</GlossaryTerm>}
        unit="°"
        min={5}
        max={90}
        step={1}
        value={value.angleDeg}
        onChange={(v) => set('angleDeg', v)}
      />
      <AzimuthSlider
        value={value.impactAzimuthDeg ?? 90}
        onChange={(v) => set('impactAzimuthDeg', v)}
      />

      <CompositionPicker value={value.composition} onChange={(c) => set('composition', c)} />

      <div>
        <div className="mb-1.5 text-xs font-medium text-text-secondary">
          <GlossaryTerm of="impact_target">Hedef yüzey</GlossaryTerm>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-xs">
          {(['sedimentary', 'crystalline', 'water'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set('targetType', t)}
              className={cn(
                'rounded-md border px-2 py-1.5 transition-colors',
                value.targetType === t
                  ? 'border-white/30 bg-surface-2 text-text-primary'
                  : 'border-white/[0.06] bg-surface-1 text-text-secondary hover:bg-surface-2',
              )}
            >
              {t === 'sedimentary' ? 'Tortul' : t === 'crystalline' ? 'Sert kaya' : 'Okyanus'}
            </button>
          ))}
        </div>
      </div>
    </Surface>
  );
}

interface AzimuthSliderProps {
  value: number;
  onChange: (n: number) => void;
}

function AzimuthSlider({ value, onChange }: AzimuthSliderProps) {
  // 0 = N (yukarı), 90 = E, 180 = S, 270 = W. Compass rose ile ok yön gösterir.
  const dirLabel = (() => {
    const v = ((value % 360) + 360) % 360;
    if (v < 22.5 || v >= 337.5) return 'Kuzey';
    if (v < 67.5) return 'Kuzeydoğu';
    if (v < 112.5) return 'Doğu';
    if (v < 157.5) return 'Güneydoğu';
    if (v < 202.5) return 'Güney';
    if (v < 247.5) return 'Güneybatı';
    if (v < 292.5) return 'Batı';
    return 'Kuzeybatı';
  })();

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-text-secondary">
          <GlossaryTerm of="impact_azimuth">Geliş yönü</GlossaryTerm>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-tertiary">{dirLabel}</span>
          <input
            type="number"
            min={0}
            max={359}
            step={5}
            value={Math.round(value)}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isFinite(next)) onChange(((next % 360) + 360) % 360);
            }}
            className="w-20 rounded-md border border-white/10 bg-surface-1 px-2 py-1 text-right font-mono-tnum text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-white/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={359}
          step={5}
          value={Math.round(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-white"
        />
        {/* Mini compass rose */}
        <div
          className="relative size-8 shrink-0 rounded-full border border-white/15 bg-surface-2"
          aria-hidden="true"
          title="Kuzeyi temsil eden ok"
        >
          <span className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 text-[8px] font-semibold text-text-tertiary">
            K
          </span>
          <svg
            viewBox="-10 -10 20 20"
            className="absolute inset-0"
            style={{ transform: `rotate(${value}deg)` }}
          >
            <path
              d="M 0 -7 L 2.5 4 L 0 2 L -2.5 4 Z"
              fill="#ffffff"
              opacity={0.85}
            />
          </svg>
        </div>
      </div>
      <div className="mt-0.5 flex justify-between font-mono-tnum text-[10px] text-text-tertiary">
        <span>0°</span>
        <span>{Math.round(value)}°</span>
        <span>359°</span>
      </div>
    </div>
  );
}

interface NumericSliderProps {
  label: React.ReactNode;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (n: number) => void;
  format?: (n: number) => string;
  scale?: 'linear' | 'log';
}

function NumericSlider({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
  format,
  scale = 'linear',
}: NumericSliderProps) {
  // Log slider for parameters with huge range (e.g. diameter 1m..20km).
  const toSlider = (v: number) => {
    if (scale === 'log') {
      return Math.log10(Math.max(min, v)) - Math.log10(min);
    }
    return v;
  };
  const fromSlider = (s: number) => {
    if (scale === 'log') {
      return Math.pow(10, s + Math.log10(min));
    }
    return s;
  };
  const sliderMin = scale === 'log' ? 0 : min;
  const sliderMax = scale === 'log' ? Math.log10(max) - Math.log10(min) : max;
  const sliderStep = scale === 'log' ? 0.01 : step;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-text-secondary">{label}</span>
        <input
          aria-label={typeof label === 'string' ? label : 'parametre'}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next)) onChange(Math.max(min, Math.min(max, next)));
          }}
          className="w-24 rounded-md border border-white/10 bg-surface-1 px-2 py-1 text-right font-mono-tnum text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-white/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>
      <input
        type="range"
        min={sliderMin}
        max={sliderMax}
        step={sliderStep}
        value={toSlider(value)}
        onChange={(e) => {
          const raw = Number(e.target.value);
          let next = fromSlider(raw);
          // Snap to step on log scale too
          if (scale === 'log') next = Math.round(next / step) * step;
          onChange(Math.max(min, Math.min(max, next)));
        }}
        className="w-full accent-white"
      />
      <div className="mt-0.5 flex justify-between font-mono-tnum text-[10px] text-text-tertiary">
        <span>{format ? format(min) : `${min} ${unit}`}</span>
        <span>{format ? format(value) : `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })} ${unit}`}</span>
        <span>{format ? format(max) : `${max} ${unit}`}</span>
      </div>
    </div>
  );
}
