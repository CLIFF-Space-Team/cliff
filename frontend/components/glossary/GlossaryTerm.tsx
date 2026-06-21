'use client';

import * as Tooltip from '@radix-ui/react-tooltip';
import { HelpCircle } from 'lucide-react';
import { type ReactNode } from 'react';

import {
  findGlossaryEntry,
  type GlossaryEntry,
} from '@/lib/glossary-tr';
import { cn } from '@/lib/utils';

interface GlossaryTermProps {
  /** Sözlük id veya alias — örn: "moid", "torino" */
  of: string;
  /** Tetikleyici metin (default: terim ismi) */
  children?: ReactNode;
  className?: string;
  /** Sadece ikon göster (metin yok) */
  iconOnly?: boolean;
}

/**
 * Sözlük tooltip'i — bilinmeyen terimi anlatır.
 *
 * Kullanım:
 *   <GlossaryTerm of="moid">MOID</GlossaryTerm>
 *   "<GlossaryTerm of="moid" iconOnly /> alanında 0.05 AB altı..."
 *
 * Tooltip 2-3 cümlelik açıklama gösterir; opsiyonel "more" metniyle ek
 * bağlam. Mobilde tap'le açılır (Radix tooltip touch-friendly).
 */
export function GlossaryTerm({
  of,
  children,
  className,
  iconOnly = false,
}: GlossaryTermProps) {
  const entry = findGlossaryEntry(of);

  if (!entry) {
    // Sözlükte yoksa sessizce çocuğu döndür — render etmemek build kıramaz
    return <>{children ?? of}</>;
  }

  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            className={cn(
              'inline-flex cursor-help items-center gap-0.5 underline decoration-white/20 decoration-dotted underline-offset-2 hover:decoration-white/60',
              className,
            )}
            tabIndex={0}
            aria-label={`${entry.term} hakkında bilgi`}
          >
            {!iconOnly && (children ?? entry.term)}
            <HelpCircle className="size-3 text-text-tertiary" />
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={4}
            className={cn(
              'z-50 max-w-xs rounded-md border border-white/[0.1] bg-surface-3 p-3 text-[12px] leading-relaxed text-text-primary shadow-panel',
              'data-[state=delayed-open]:animate-fade-in data-[state=closed]:animate-fade-out',
            )}
          >
            <GlossaryContent entry={entry} />
            <Tooltip.Arrow className="fill-surface-3" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

function GlossaryContent({ entry }: { entry: GlossaryEntry }) {
  return (
    <>
      <div className="mb-1.5 font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
        {entry.category}
      </div>
      <div className="text-sm font-semibold text-text-primary">{entry.term}</div>
      <p className="mt-1.5 text-[12px] text-text-secondary">{entry.definition}</p>
      {entry.more && (
        <p className="mt-2 border-t border-white/[0.06] pt-2 text-[11px] text-text-tertiary">
          {entry.more}
        </p>
      )}
    </>
  );
}
