import { cva, type VariantProps } from 'class-variance-authority';
import { type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-white/10 bg-surface-2 text-text-secondary',
        outline: 'border-white/20 bg-transparent text-text-primary',
        ghost: 'border-transparent bg-white/5 text-text-secondary',
        success: 'border-threat-low/30 bg-threat-low/10 text-threat-low',
        warning: 'border-threat-high/30 bg-threat-high/10 text-threat-high',
        danger: 'border-threat-critical/30 bg-threat-critical/10 text-threat-critical',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
