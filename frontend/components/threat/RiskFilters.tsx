'use client';

import { Filter, X } from 'lucide-react';

import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useThreatFiltersStore } from '@/stores/threatFilters';

import type { RiskClass } from '@/lib/api-types';

const SEVERITY_OPTIONS: Array<{ value: RiskClass | null; label: string }> = [
  { value: null, label: 'Tümü' },
  { value: 'low', label: 'Düşük+' },
  { value: 'moderate', label: 'Orta+' },
  { value: 'high', label: 'Yüksek+' },
  { value: 'critical', label: 'Kritik' },
];

export function RiskFilters() {
  const { minSeverity, hazardousOnly, setMinSeverity, setHazardousOnly, reset } =
    useThreatFiltersStore();

  const hasActive = minSeverity !== null || hazardousOnly;

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.06] bg-surface-1/50 px-4 py-2">
      <Filter className="size-3 text-text-tertiary" />
      <div className="flex flex-wrap items-center gap-1">
        {SEVERITY_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => setMinSeverity(opt.value)}
            className={cn(
              'rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wider transition-colors',
              minSeverity === opt.value
                ? 'border-white/30 bg-surface-3 text-text-primary'
                : 'border-white/[0.06] text-text-secondary hover:bg-surface-2',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setHazardousOnly(!hazardousOnly)}
        className={cn(
          'rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wider transition-colors',
          hazardousOnly
            ? 'border-threat-high/40 bg-threat-high/15 text-threat-high'
            : 'border-white/[0.06] text-text-secondary hover:bg-surface-2',
        )}
      >
        PHA
      </button>
      {hasActive && (
        <Button size="icon" variant="ghost" onClick={reset} className="ml-auto h-6 w-6">
          <X className="size-3" />
        </Button>
      )}
    </div>
  );
}
