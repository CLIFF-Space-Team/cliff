'use client';

import { cn } from '@/lib/utils';
import type { EarthEventSeverity } from '@/lib/earth-types';

const SEVERITY_LABEL: Record<EarthEventSeverity, string> = {
  critical: 'Kritik',
  high: 'Yüksek',
  moderate: 'Orta',
  low: 'Düşük',
  info: 'Bilgi',
};

const SEVERITY_CLASSES: Record<EarthEventSeverity, string> = {
  critical: 'bg-threat-critical/15 text-threat-critical border-threat-critical/35',
  high: 'bg-threat-high/15 text-threat-high border-threat-high/35',
  moderate: 'bg-threat-moderate/15 text-threat-moderate border-threat-moderate/35',
  low: 'bg-threat-low/15 text-threat-low border-threat-low/35',
  info: 'bg-white/5 text-text-tertiary border-white/10',
};

interface SeverityBadgeProps {
  severity: EarthEventSeverity;
  className?: string;
  label?: string;
  size?: 'sm' | 'md';
}

/**
 * Single source of truth for severity visual treatment. Threat color
 * tokens stay reserved for severity only — kategori renkleri ayrı.
 */
export function SeverityBadge({ severity, className, label, size = 'sm' }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium uppercase tracking-wide',
        SEVERITY_CLASSES[severity],
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="inline-block size-1.5 rounded-full"
        style={{
          background: severity === 'info' ? 'rgba(255,255,255,0.5)' : 'currentColor',
        }}
      />
      {label ?? SEVERITY_LABEL[severity]}
    </span>
  );
}
