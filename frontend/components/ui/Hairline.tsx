import { cn } from '@/lib/utils';

interface HairlineProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Hairline({ orientation = 'horizontal', className }: HairlineProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        'shrink-0 bg-white/[0.06]',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
    />
  );
}
