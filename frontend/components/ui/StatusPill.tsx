import { cva, type VariantProps } from 'class-variance-authority';
import { type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';
import type { RiskClass } from '@/lib/api-types';

const pillVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider',
  {
    variants: {
      severity: {
        critical: 'bg-threat-critical/15 text-threat-critical ring-1 ring-inset ring-threat-critical/40 animate-critical-pulse',
        high: 'bg-threat-high/15 text-threat-high ring-1 ring-inset ring-threat-high/40',
        moderate: 'bg-threat-moderate/15 text-threat-moderate ring-1 ring-inset ring-threat-moderate/40',
        low: 'bg-threat-low/15 text-threat-low ring-1 ring-inset ring-threat-low/40',
        minimal: 'bg-white/5 text-text-tertiary ring-1 ring-inset ring-white/10',
        none: 'bg-white/5 text-text-tertiary ring-1 ring-inset ring-white/10',
      },
      size: {
        sm: 'h-5 text-[10px]',
        md: 'h-6 text-xs',
      },
    },
    defaultVariants: {
      severity: 'minimal',
      size: 'md',
    },
  },
);

export interface StatusPillProps
  extends HTMLAttributes<HTMLSpanElement>,
    Omit<VariantProps<typeof pillVariants>, 'severity'> {
  severity: RiskClass;
}

export function StatusPill({ severity, size, className, children, ...props }: StatusPillProps) {
  return (
    <span className={cn(pillVariants({ severity, size }), className)} {...props}>
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          severity === 'critical' && 'bg-threat-critical',
          severity === 'high' && 'bg-threat-high',
          severity === 'moderate' && 'bg-threat-moderate',
          severity === 'low' && 'bg-threat-low',
          severity === 'minimal' && 'bg-text-tertiary',
        )}
      />
      {children ?? severity}
    </span>
  );
}
