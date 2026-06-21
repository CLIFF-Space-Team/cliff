'use client';

import { cn } from '@/lib/utils';
import { COMPOSITIONS, type Composition } from '@/lib/impact-physics';

interface CompositionPickerProps {
  value: Composition;
  onChange: (c: Composition) => void;
}

const COLORS: Record<Composition, string> = {
  iron: 'from-slate-300 to-slate-500',
  stony: 'from-amber-200 to-amber-700',
  carbonaceous: 'from-stone-700 to-stone-900',
  icy: 'from-sky-200 to-sky-500',
};

export function CompositionPicker({ value, onChange }: CompositionPickerProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-medium text-text-secondary">Bileşim</span>
        <span className="font-mono-tnum text-[10px] text-text-tertiary">
          ρ = {COMPOSITIONS[value].density_kg_m3} kg/m³
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {(Object.values(COMPOSITIONS) as (typeof COMPOSITIONS)[Composition][]).map((c) => {
          const active = value === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              title={c.description}
              className={cn(
                'group relative overflow-hidden rounded-md border p-2 text-left transition-all',
                active
                  ? 'border-white/30 bg-surface-2 ring-1 ring-white/20'
                  : 'border-white/[0.06] bg-surface-1 hover:bg-surface-2',
              )}
            >
              <div
                className={cn(
                  'mb-1 h-1 w-full rounded-full bg-gradient-to-r',
                  COLORS[c.id],
                )}
              />
              <div className="text-[11px] font-medium text-text-primary">{c.label}</div>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-text-tertiary">
        {COMPOSITIONS[value].description}
      </p>
    </div>
  );
}
