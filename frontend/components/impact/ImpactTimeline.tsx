'use client';

import { Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button, Surface } from '@/components/ui';
import { cn } from '@/lib/utils';

interface ImpactTimelineProps {
  progress: number;
  playing: boolean;
  onProgressChange: (next: number) => void;
  onPlayingChange: (next: boolean) => void;
  durationMs?: number;
}

const PHASES = [
  { id: 'approach', label: 'Yaklaşım', start: 0, end: 0.5 },
  { id: 'entry', label: 'Atmosfer girişi', start: 0.5, end: 0.62 },
  { id: 'impact', label: 'Çarpma', start: 0.62, end: 0.7 },
  { id: 'fireball', label: 'Ateş topu', start: 0.7, end: 0.85 },
  { id: 'shockwave', label: 'Şok dalgası', start: 0.85, end: 0.95 },
  { id: 'aftermath', label: 'Sonuç', start: 0.95, end: 1.0 },
];

const SPEEDS = [0.5, 1, 2] as const;

// Sinematik slow-motion: çarpma anının çevresinde (0.55–0.80) zaman ağırlaşır
// (bullet-time), tam çarpmada (0.64) ~4.5× yavaş, sonra normale döner. Yalnızca
// otomatik oynatmada uygulanır; scrub etkilenmez.
const SLOWMO_MIN = 0.22; // en yavaş çarpan (1/0.22 ≈ 4.5×)
function slowmoFactor(p: number): number {
  if (p <= 0.55 || p >= 0.8) return 1;
  const center = 0.64;
  const halfWidth = 0.13;
  const x = Math.min(1, Math.abs(p - center) / halfWidth); // 0 merkez → 1 kenar
  const ease = x * x * (3 - 2 * x); // smoothstep
  return SLOWMO_MIN + (1 - SLOWMO_MIN) * ease;
}

export function ImpactTimeline({
  progress,
  playing,
  onProgressChange,
  onPlayingChange,
  durationMs = 11000,
}: ImpactTimelineProps) {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const [speed, setSpeed] = useState<number>(1);
  // Stale-closure'dan kaçınmak için hızı ref'te tut — oynatma sırasında
  // çarpan değişince RAF döngüsünü yeniden başlatmaya gerek kalmaz.
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    lastTimeRef.current = performance.now();
    let current = progress;

    const tick = (now: number) => {
      const base = (now - lastTimeRef.current) / (durationMs / speedRef.current);
      lastTimeRef.current = now;
      // Çarpma anında bullet-time — sinematik ağırlık.
      current += base * slowmoFactor(current);
      if (current >= 1) {
        current = 1;
        onProgressChange(current);
        onPlayingChange(false);
        return;
      }
      onProgressChange(current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const currentPhase =
    PHASES.find((p) => progress >= p.start && progress < p.end) ?? PHASES[PHASES.length - 1];

  return (
    <Surface elevation={1} className="px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <Button
          size="icon"
          variant="primary"
          onClick={() => {
            if (progress >= 1) onProgressChange(0);
            onPlayingChange(!playing);
          }}
          aria-label={playing ? 'Duraklat' : 'Oynat'}
        >
          {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            onProgressChange(0);
            onPlayingChange(false);
          }}
          aria-label="Sıfırla"
        >
          <RotateCcw className="size-3.5" />
        </Button>

        {/* Hız çarpanı */}
        <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.08] bg-surface-1 p-0.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              aria-pressed={speed === s}
              className={cn(
                'rounded-md px-2 py-0.5 font-mono-tnum text-[11px] transition-colors',
                speed === s
                  ? 'bg-surface-3 text-text-primary'
                  : 'text-text-tertiary hover:text-text-primary',
              )}
            >
              {s}×
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 font-mono-tnum text-[11px]">
          <span className="text-text-tertiary">{currentPhase?.label}</span>
          <span className="text-text-primary">{(progress * 100).toFixed(0)}%</span>
        </div>
      </div>
      <div className="relative">
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={(e) => {
            onProgressChange(Number(e.target.value));
            onPlayingChange(false);
          }}
          className="w-full accent-white"
        />
        <div className="mt-1 flex">
          {PHASES.map((phase) => {
            const width = (phase.end - phase.start) * 100;
            const active = currentPhase?.id === phase.id;
            return (
              <div
                key={phase.id}
                style={{ width: `${width}%` }}
                className={cn(
                  'h-0.5 transition-colors',
                  active ? 'bg-white' : 'bg-white/15',
                )}
              />
            );
          })}
        </div>
        {/* Faz etiketleri — tıklayınca o faza atla (hızlı gezinme) */}
        <div className="mt-1 flex font-mono-tnum text-[9px] uppercase tracking-wider">
          {PHASES.map((phase) => {
            const width = (phase.end - phase.start) * 100;
            const active = currentPhase?.id === phase.id;
            return (
              <button
                key={phase.id}
                type="button"
                style={{ width: `${width}%` }}
                onClick={() => onProgressChange(phase.start + 0.001)}
                title={`${phase.label}'a atla`}
                className={cn(
                  'truncate px-0.5 text-center transition-colors hover:text-text-primary',
                  active ? 'text-text-secondary' : 'text-text-tertiary',
                )}
              >
                {phase.label}
              </button>
            );
          })}
        </div>
      </div>
    </Surface>
  );
}
