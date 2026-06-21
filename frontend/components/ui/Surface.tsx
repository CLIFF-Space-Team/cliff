import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const surfaceVariants = cva('relative isolate', {
  variants: {
    elevation: {
      0: 'bg-surface-0',
      1: 'bg-surface-1',
      2: 'bg-surface-2',
      3: 'bg-surface-3',
    },
    border: {
      none: '',
      subtle: 'border border-white/[0.06]',
      default: 'border border-white/10',
      strong: 'border border-white/[0.18]',
    },
    rounded: {
      none: '',
      sm: 'rounded-md',
      md: 'rounded-lg',
      lg: 'rounded-xl',
      xl: 'rounded-2xl',
    },
    glass: {
      true: 'surface-glass',
      false: '',
    },
  },
  defaultVariants: {
    elevation: 1,
    border: 'subtle',
    rounded: 'md',
    glass: false,
  },
});

export interface SurfaceProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof surfaceVariants> {}

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, elevation, border, rounded, glass, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(surfaceVariants({ elevation, border, rounded, glass }), className)}
      {...props}
    />
  ),
);
Surface.displayName = 'Surface';
