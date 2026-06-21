'use client';

import { Check } from 'lucide-react';

import { Surface } from '@/components/ui';
import { COMPOSITIONS } from '@/lib/impact-physics';
import { QUICK_IMPACTORS, type QuickImpactor } from '@/lib/impact-impactors';
import { cn } from '@/lib/utils';

interface ImpactorPickerProps {
  selectedId: string | null;
  onPick: (impactor: QuickImpactor) => void;
}

function sizeLabel(diameterM: number): string {
  return diameterM >= 1000
    ? `${(diameterM / 1000).toFixed(diameterM % 1000 === 0 ? 0 : 1)} km`
    : `${diameterM} m`;
}

/**
 * Hızlı "cisim" seçici — sandbox cisimleri (ev boyu → dinozor-katili →
 * kuyrukluyıldız). Tek dokunuşla input'u kurar; çağıran taraf ateşler.
 */
export function ImpactorPicker({ selectedId, onPick }: ImpactorPickerProps) {
  return (
    <Surface elevation={1} className="flex flex-col">
      <div className="flex items-baseline justify-between p-4 pb-3">
        <h2 className="text-sm font-semibold text-text-primary">Cisim Seç</h2>
        <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
          sandbox · {QUICK_IMPACTORS.length} cisim
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-2">
        {QUICK_IMPACTORS.map((q) => {
          const active = selectedId === q.id;
          const comp = COMPOSITIONS[q.input.composition];
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onPick(q)}
              className={cn(
                'group relative flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                active
                  ? 'border-white/30 bg-surface-2'
                  : 'border-white/[0.06] bg-surface-1 hover:bg-surface-2',
              )}
              aria-pressed={active}
            >
              {active && (
                <Check className="absolute right-2 top-2 size-3 text-text-primary" />
              )}
              <span className="text-2xl leading-none" aria-hidden>
                {q.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-text-primary">{q.name}</span>
                  <span className="font-mono-tnum text-[10px] text-text-tertiary">
                    {sizeLabel(q.input.diameterM)}
                  </span>
                </div>
                <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-text-secondary">
                  {q.blurb}
                </div>
                <div className="mt-1 flex items-center gap-1.5 font-mono-tnum text-[10px] text-text-tertiary">
                  <span>{comp.label}</span>
                  <span>·</span>
                  <span>{q.input.velocityKms} km/s</span>
                  <span>·</span>
                  <span>{q.input.angleDeg}°</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Surface>
  );
}
