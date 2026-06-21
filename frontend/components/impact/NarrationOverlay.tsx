'use client';

import { Radio } from 'lucide-react';
import { useMemo } from 'react';

import { cn } from '@/lib/utils';
import { getActiveCaption, getNarrative } from '@/lib/impact-narratives';

interface NarrationOverlayProps {
  presetId: string | null;
  progress: number;
}

const PHASE_LABELS: { [k: string]: string } = {
  approach: 'Yaklaşım',
  entry: 'Atmosfer girişi',
  impact: 'Çarpma',
  fireball: 'Ateş topu',
  shockwave: 'Şok dalgası',
};

function phaseFor(progress: number): string {
  if (progress < 0.5) return 'approach';
  if (progress < 0.62) return 'entry';
  if (progress < 0.7) return 'impact';
  if (progress < 0.85) return 'fireball';
  return 'shockwave';
}

export function NarrationOverlay({ presetId, progress }: NarrationOverlayProps) {
  const script = useMemo(() => getNarrative(presetId), [presetId]);
  const caption = useMemo(() => getActiveCaption(script, progress), [script, progress]);
  const phase = phaseFor(progress);

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col items-stretch gap-2 sm:bottom-4">
      <div
        className={cn(
          'pointer-events-auto self-center rounded-full border border-white/10 bg-black/65 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-text-secondary backdrop-blur transition-opacity',
          'flex items-center gap-1.5',
        )}
      >
        <Radio className="size-3 text-text-tertiary animate-pulse-gentle" aria-hidden />
        <span>faz</span>
        <span className="font-mono-tnum text-text-primary">{PHASE_LABELS[phase]}</span>
        <span className="text-text-tertiary">·</span>
        <span className="font-mono-tnum text-text-primary">{(progress * 100).toFixed(0)}%</span>
      </div>

      {caption && (
        <div
          key={caption.start}
          className="pointer-events-auto mx-auto max-w-2xl rounded-lg border border-white/[0.08] bg-black/70 px-4 py-3 text-center text-sm leading-relaxed text-text-primary shadow-panel backdrop-blur animate-fade-in sm:text-base"
        >
          {caption.text}
        </div>
      )}
    </div>
  );
}
