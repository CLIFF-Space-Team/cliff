'use client';

import { Database } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatRelative } from '@/lib/format';

interface SourceLabelProps {
  source: string;
  updatedAt?: string | Date | null;
  href?: string;
  className?: string;
}

export function SourceLabel({ source, updatedAt, href, className }: SourceLabelProps) {
  const inner = (
    <>
      <Database className="size-2.5" aria-hidden />
      <span>Kaynak: {source}</span>
      {updatedAt && (
        <>
          <span className="text-text-tertiary/60">·</span>
          <span className="font-mono-tnum">{formatRelative(updatedAt)}</span>
        </>
      )}
    </>
  );
  const cls = cn(
    'flex items-center gap-1 px-3 py-2 text-[10px] text-text-tertiary',
    className,
  );
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={cn(cls, 'transition-colors hover:text-text-secondary')}
      >
        {inner}
      </a>
    );
  }
  return <div className={cls}>{inner}</div>;
}
