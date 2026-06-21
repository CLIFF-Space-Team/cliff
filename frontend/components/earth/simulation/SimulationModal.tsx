'use client';

import dynamic from 'next/dynamic';
import { Loader2, Pause, Play, RotateCcw, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button, Skeleton } from '@/components/ui';
import { EventCategoryIcon } from '@/components/earth/EventCategoryIcon';
import { SeverityBadge } from '@/components/earth/SeverityBadge';
import { api } from '@/lib/api-client';
import type { EarthCategoryMeta, EarthEvent } from '@/lib/earth-types';
import { cn } from '@/lib/utils';

import { buildCopy } from './copy';
import type { SimulationSceneProps } from './types';

const WildfireScene = dynamic(() => import('./scenes/WildfireScene').then((m) => m.WildfireScene), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});
const VolcanoScene = dynamic(() => import('./scenes/VolcanoScene').then((m) => m.VolcanoScene), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});
const StormScene = dynamic(() => import('./scenes/StormScene').then((m) => m.StormScene), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});
const FloodScene = dynamic(() => import('./scenes/FloodScene').then((m) => m.FloodScene), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});
const QuakeScene = dynamic(() => import('./scenes/QuakeScene').then((m) => m.QuakeScene), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});
const GenericScene = dynamic(() => import('./scenes/GenericScene').then((m) => m.GenericScene), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

interface SimulationModalProps {
  event: EarthEvent;
  category: EarthCategoryMeta;
  onClose: () => void;
}

/**
 * Universal disaster-simulator modal.
 *
 * Layout:
 *   ┌─ left  : 3D scene (per-category, picked by `pickScene`)
 *   └─ right : sidebar (severity band + history + AI explanation + scene legend)
 *
 * Controls:
 *   - top-left  : verdict + metric HUD
 *   - top-right : close button
 *   - bottom    : play/pause + restart
 */
export function SimulationModal({ event, category, onClose }: SimulationModalProps) {
  const [playing, setPlaying] = useState(true);
  const [playKey, setPlayKey] = useState(0);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const copy = useMemo(() => buildCopy(event), [event]);
  const SceneComponent = pickScene(event.category);

  // Auto-fetch AI summary tied to this event.
  useEffect(() => {
    let cancelled = false;
    setAiLoading(true);
    setAiError(null);
    setAiText(null);
    api
      .post<{ reply: string }>('/api/v1/ai/chat', {
        history: [],
        query: copy.aiPrompt,
        temperature: 0.5,
        stream: false,
      })
      .then((res) => {
        if (cancelled) return;
        setAiText(res.reply);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const e = err as { status?: number; code?: string } | null;
        if (e?.status === 429 || e?.code === 'RATE_LIMITED') {
          setAiError('Çok hızlı tıkladın — AI istek limiti aşıldı.');
        } else if (e?.code === 'AI_NOT_CONFIGURED') {
          setAiError('AI servisi yapılandırılmadı.');
        } else {
          setAiError('AI servisine erişilemedi.');
        }
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [event.id, copy.aiPrompt]);

  // Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const sceneProps: SimulationSceneProps = {
    event,
    category,
    playing,
    playKey,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sim-modal-title"
    >
      <div className="grid h-full max-h-[100dvh] w-full grid-cols-1 grid-rows-[minmax(40vh,1fr)_minmax(0,auto)] overflow-y-auto lg:grid-cols-[1fr_360px] lg:grid-rows-1 lg:overflow-hidden">
        {/* Scene */}
        <div className="relative min-h-[40vh] lg:min-h-0">
          <SceneComponent {...sceneProps} />

          {/* HUD */}
          <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-white/10 bg-surface-1/85 px-3 py-2 backdrop-blur">
            <div className="flex items-center gap-2">
              <span
                className="flex size-6 items-center justify-center rounded-md"
                style={{
                  background: `${category.accent_hex}1d`,
                  color: category.accent_hex,
                }}
              >
                <EventCategoryIcon icon={category.icon} size={12} />
              </span>
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                  copy.verdictTone === 'critical' && 'bg-threat-critical/20 text-threat-critical',
                  copy.verdictTone === 'high' && 'bg-threat-high/20 text-threat-high',
                  copy.verdictTone === 'moderate' && 'bg-threat-moderate/20 text-threat-moderate',
                  copy.verdictTone === 'low' && 'bg-threat-low/20 text-threat-low',
                  copy.verdictTone === 'info' && 'bg-white/10 text-text-tertiary',
                )}
              >
                {copy.verdictLabel}
              </span>
              {event.primary_metric && (
                <span className="font-mono-tnum text-lg font-bold text-text-primary">
                  {event.primary_metric.value.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}{' '}
                  <span className="text-xs text-text-tertiary">{event.primary_metric.unit}</span>
                </span>
              )}
            </div>
            <div id="sim-modal-title" className="mt-0.5 max-w-[320px] truncate text-[12px] text-text-secondary">
              {event.title}
            </div>
          </div>

          {/* Bottom controls */}
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-md border border-white/10 bg-surface-1/85 px-1 py-1 backdrop-blur">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? 'Duraklat' : 'Devam'}
            >
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              <span className="hidden sm:inline">{playing ? 'duraklat' : 'oynat'}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPlayKey((k) => k + 1);
                setPlaying(true);
              }}
            >
              <RotateCcw className="size-3.5" />
              <span className="hidden sm:inline">tekrar oynat</span>
            </Button>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-md border border-white/10 bg-surface-1/85 text-text-secondary backdrop-blur hover:bg-surface-2 hover:text-text-primary"
            aria-label="Kapat"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Sidebar */}
        <aside className="scrollbar-thin overflow-y-auto border-l border-white/[0.06] bg-surface-0 p-4">
          <div className="mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
              SAHNE AÇIKLAMASI
            </div>
            <h2 className="mt-1 text-base font-semibold text-text-primary">
              Bu olay ne anlama geliyor?
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <SeverityBadge severity={event.severity} />
              <span className="text-[11px] text-text-tertiary">{category.label_tr}</span>
            </div>
          </div>

          {copy.band && (
            <section className="mb-4 rounded-md border border-white/[0.06] bg-surface-1 p-3">
              <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
                Şiddet Bandı (tahmini)
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono-tnum text-xl font-bold text-text-primary">{copy.band.band}</span>
                <span className="text-[11px] text-text-secondary">({copy.band.range})</span>
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">{copy.band.tr}</p>
            </section>
          )}

          {copy.historicalReference && (
            <section className="mb-4 rounded-md border border-white/[0.06] bg-surface-1 p-3">
              <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
                Benzer Tarihi Olay
              </div>
              <div className="mt-1 text-[13px] text-text-primary">
                <span className="font-semibold">{copy.historicalReference.place}</span>
                {' · '}
                <span className="font-mono-tnum">{copy.historicalReference.year}</span>
              </div>
              <div className="font-mono-tnum text-[11px] text-text-secondary">
                {copy.historicalReference.metric}
              </div>
            </section>
          )}

          <section className="mb-4 rounded-md border border-white/[0.06] bg-surface-1 p-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider text-text-tertiary">AI Açıklaması</div>
              <span className="font-mono-tnum text-[9px] uppercase text-text-tertiary">grok-4.3</span>
            </div>
            {aiLoading && (
              <div className="mt-2 flex items-center gap-2 text-[12px] text-text-tertiary">
                <Loader2 className="size-3 animate-spin" />
                AI bağlam topluyor…
              </div>
            )}
            {aiError && !aiLoading && <p className="mt-2 text-[12px] text-threat-critical">{aiError}</p>}
            {aiText && !aiLoading && (
              <p className="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-text-secondary">
                {aiText}
              </p>
            )}
          </section>

          <section className="rounded-md border border-white/[0.06] bg-surface-1 p-3">
            <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
              Sahnedeki Görseller Ne Anlama Geliyor?
            </div>
            <ul className="mt-1.5 space-y-1.5 text-[11px] leading-relaxed text-text-secondary">
              {copy.legend.map((line, idx) => (
                <li key={idx} className="list-inside list-disc marker:text-text-tertiary">
                  {line}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function pickScene(categoryCode: string): React.ComponentType<SimulationSceneProps> {
  switch (categoryCode) {
    case 'wildfires':
      return WildfireScene;
    case 'volcanoes':
      return VolcanoScene;
    case 'severeStorms':
      return StormScene;
    case 'floods':
      return FloodScene;
    case 'earthquakes':
    case 'earthquakes-tr':
      return QuakeScene;
    default:
      return GenericScene;
  }
}
