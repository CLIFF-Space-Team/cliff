'use client';

import dynamic from 'next/dynamic';
import { Building2, Loader2, Map, Pause, Play, RotateCcw, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button, Skeleton } from '@/components/ui';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

import type { LiveEvent } from './types';

const EarthquakeScene = dynamic(
  () => import('./EarthquakeScene').then((m) => m.EarthquakeScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-black">
        <Skeleton className="h-full w-full" />
      </div>
    ),
  },
);

// Leaflet pulls `window` at import-time, so we lazy-load on the client only.
const EarthquakeMap2D = dynamic(
  () => import('./city/EarthquakeMap2D').then((m) => m.EarthquakeMap2D),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-black">
        <Skeleton className="h-full w-full" />
      </div>
    ),
  },
);

type ViewMode = 'procedural' | 'map2d';

interface EarthquakeImmersiveProps {
  event: LiveEvent;
  onClose: () => void;
}

const MERCALLI_SCALE: Array<{ band: string; range: string; tr: string }> = [
  { band: 'I-III',  range: 'M < 4',     tr: 'Hissedilmez veya çok hafif. Cisimler hareket etmez.' },
  { band: 'IV',     range: 'M 4 – 4.9', tr: 'Hafif. İçeride hissedilir, eşyalar tıkırdar.' },
  { band: 'V-VI',   range: 'M 5 – 5.9', tr: 'Orta. Çoğunluk hisseder, raflardan eşya düşer.' },
  { band: 'VII',    range: 'M 6 – 6.4', tr: 'Kuvvetli. Standart yapılarda hafif hasar.' },
  { band: 'VIII',   range: 'M 6.5 – 6.9', tr: 'Çok kuvvetli. Zayıf yapılarda ciddi hasar.' },
  { band: 'IX-X',   range: 'M 7 – 7.9',   tr: 'Yıkıcı. Modern binalarda da hasar, yapı çökmeleri.' },
  { band: 'XI-XII', range: 'M 8+',       tr: 'Felaket. Geniş alanda toplam yıkım.' },
];

function bandFor(mag: number): string {
  if (mag < 4) return 'I-III';
  if (mag < 5) return 'IV';
  if (mag < 6) return 'V-VI';
  if (mag < 6.5) return 'VII';
  if (mag < 7) return 'VIII';
  if (mag < 8) return 'IX-X';
  return 'XI-XII';
}

const FAMOUS_REFERENCES: Array<{ year: number; place: string; mag: number }> = [
  { year: 2011, place: 'Tōhoku, Japonya', mag: 9.1 },
  { year: 2010, place: 'Şili (Maule)',     mag: 8.8 },
  { year: 2023, place: 'Kahramanmaraş',    mag: 7.8 },
  { year: 1999, place: 'İzmit',            mag: 7.6 },
  { year: 1995, place: 'Kobe, Japonya',    mag: 6.9 },
  { year: 1989, place: 'Loma Prieta, ABD', mag: 6.9 },
];

/**
 * Immersive earthquake "experience" — replaces the hand-wavy ring overlay.
 *
 * Layout:
 *   - full-screen modal (z-50, dimmed backdrop)
 *   - left  : 3D city scene that physically shakes + collapses on cue
 *   - right : educational sidebar (Mercalli intensity, comparable historical
 *             quakes, an auto-fetched LLM explanation grounded in the
 *             specific event)
 *
 * The simulation parameters (shake amplitude, building-collapse probability,
 * surface-wave speed) are derived from the magnitude so M5.0 looks
 * meaningfully different from M7.5.
 */
export function EarthquakeImmersive({ event, onClose }: EarthquakeImmersiveProps) {
  const magnitude = (event.raw?.['magnitude'] as number) ?? 5.0;
  const place = (event.raw?.['place'] as string) ?? 'unknown';
  const depth = event.raw?.['depth_km'] as number | null | undefined;
  const tsunami = !!event.raw?.['tsunami'];

  const [playing, setPlaying] = useState(true);
  const [playKey, setPlayKey] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('procedural');
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // The 2D map view (Leaflet) doesn't need any token, so the toggle is
  // always available now.
  const eventLat = (event.raw?.['lat'] as number) ?? event.lat;
  const eventLng = (event.raw?.['lon'] as number) ?? event.lng;

  const band = bandFor(magnitude);
  const bandText = MERCALLI_SCALE.find((b) => b.band === band)?.tr ?? '';

  const closestReference = useMemo(() => {
    return FAMOUS_REFERENCES.slice().sort(
      (a, b) => Math.abs(a.mag - magnitude) - Math.abs(b.mag - magnitude),
    )[0];
  }, [magnitude]);

  const verdict = useMemo(() => {
    if (magnitude >= 7) return { tone: 'critical' as const, label: 'YIKICI' };
    if (magnitude >= 6) return { tone: 'high' as const, label: 'KUVVETLI' };
    if (magnitude >= 5) return { tone: 'moderate' as const, label: 'ORTA' };
    return { tone: 'low' as const, label: 'HAFİF' };
  }, [magnitude]);

  // Fetch a one-shot LLM explanation that's grounded in *this* quake's
  // properties. We re-use the existing /ai/chat backend — it routes to
  // Grok-4.3 with the Live Search tool enabled, so the answer can pull in
  // fresh context about the affected region (active fault lines, recent
  // precedents).
  useEffect(() => {
    let cancelled = false;
    setAiLoading(true);
    setAiError(null);
    setAiText(null);

    const prompt =
      `Bana ${place} bölgesinde gerçekleşen M${magnitude.toFixed(1)} büyüklüğündeki ` +
      (depth != null ? `${depth.toFixed(0)} km derinlikteki ` : '') +
      `depremi 4-6 cümleyle açıkla. Bu büyüklük genelde ne yapar, bölgenin ` +
      `fay sistemine kısaca değin, geçmişteki benzer büyüklükteki bir olayla ` +
      `karşılaştır. Uzman olmayan bir okuyucu için sade ve eğitici bir dilde yaz; ` +
      `korkutucu veya sansasyonel olma. Türkçe yanıtla.`;

    api
      .post<{ reply: string }>('/api/v1/ai/chat', {
        history: [],
        query: prompt,
        temperature: 0.45,
        stream: false,
      })
      .then((res) => {
        if (cancelled) return;
        setAiText(res.reply);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Surface a clear message for the common 429 (rate limit) so the
        // user knows it's not a server outage — they're just clicking
        // through too many quakes too fast.
        const e = err as { status?: number; code?: string } | null;
        if (e?.status === 429 || e?.code === 'RATE_LIMITED') {
          setAiError('Çok hızlı tıkladın — AI istek limiti aşıldı, biraz bekle.');
        } else if (e?.code === 'AI_NOT_CONFIGURED') {
          setAiError('AI servisi yapılandırılmadı (AI_API_KEY eksik).');
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
  }, [event.id, magnitude, place, depth]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="grid h-full w-full grid-cols-1 lg:grid-cols-[1fr_360px]">
        {/* ── 3D scene ──────────────────────────────────── */}
        <div className="relative min-h-0">
          {viewMode === 'procedural' ? (
            <EarthquakeScene
              magnitude={magnitude}
              depthKm={depth ?? null}
              place={place}
              playing={playing}
              playKey={playKey}
            />
          ) : (
            <EarthquakeMap2D
              lat={eventLat}
              lng={eventLng}
              magnitude={magnitude}
              place={place}
              depthKm={depth ?? null}
              tsunami={tsunami}
            />
          )}

          {/* View toggle — top-centre, matches the controls strip at the bottom.
           *  Always shown: the 2D Leaflet map needs no API token. */}
          <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-1 rounded-md border border-white/10 bg-surface-1/85 p-1 backdrop-blur">
            <button
              type="button"
              onClick={() => setViewMode('procedural')}
              className={cn(
                'flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider transition-colors',
                viewMode === 'procedural'
                  ? 'bg-surface-3 text-text-primary'
                  : 'text-text-tertiary hover:bg-surface-2',
              )}
            >
              <Building2 className="size-3" />
              Simülasyon
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map2d')}
              className={cn(
                'flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider transition-colors',
                viewMode === 'map2d'
                  ? 'bg-surface-3 text-text-primary'
                  : 'text-text-tertiary hover:bg-surface-2',
              )}
            >
              <Map className="size-3" />
              2D Harita
            </button>
          </div>

          {/* Top-left magnitude HUD */}
          <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-white/10 bg-surface-1/85 px-3 py-2 backdrop-blur">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                  verdict.tone === 'critical' && 'bg-threat-critical/20 text-threat-critical',
                  verdict.tone === 'high' && 'bg-threat-high/20 text-threat-high',
                  verdict.tone === 'moderate' && 'bg-threat-moderate/20 text-threat-moderate',
                  verdict.tone === 'low' && 'bg-threat-low/20 text-threat-low',
                )}
              >
                {verdict.label}
              </span>
              <span className="font-mono-tnum text-lg font-bold text-text-primary">
                M{magnitude.toFixed(1)}
              </span>
            </div>
            <div className="mt-0.5 max-w-[280px] truncate text-[12px] text-text-secondary">
              {place}
            </div>
            {(depth != null || tsunami) && (
              <div className="mt-0.5 font-mono-tnum text-[10px] text-text-tertiary">
                {depth != null && `${depth.toFixed(0)} km derinlik`}
                {tsunami && ' · TSUNAMİ UYARISI'}
              </div>
            )}
          </div>

          {/* Bottom controls — only meaningful for the procedural simulation */}
          {viewMode === 'procedural' && (
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
          )}
          {viewMode === 'map2d' && (
            <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md border border-white/10 bg-surface-1/85 px-3 py-1.5 text-[11px] text-text-tertiary backdrop-blur">
              CartoDB Dark · OpenStreetMap · sismik şiddet zonları (M büyüklüğüne göre)
            </div>
          )}

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

        {/* ── Educational sidebar ───────────────────────── */}
        <aside className="scrollbar-thin overflow-y-auto border-l border-white/[0.06] bg-surface-0 p-4">
          <div className="mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
              SAHNE AÇIKLAMASI
            </div>
            <h2 className="mt-1 text-base font-semibold text-text-primary">
              Bu deprem ne anlama geliyor?
            </h2>
          </div>

          {/* Mercalli intensity band */}
          <section className="mb-4 rounded-md border border-white/[0.06] bg-surface-1 p-3">
            <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
              Mercalli Şiddet Aralığı (tahmini)
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono-tnum text-xl font-bold text-text-primary">
                {band}
              </span>
              <span className="text-[11px] text-text-secondary">
                ({MERCALLI_SCALE.find((b) => b.band === band)?.range})
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
              {bandText}
            </p>
          </section>

          {/* Comparable historical quake */}
          {closestReference && (
            <section className="mb-4 rounded-md border border-white/[0.06] bg-surface-1 p-3">
              <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
                Benzer Büyüklükteki Tarihi Olay
              </div>
              <div className="mt-1 text-[13px] text-text-primary">
                <span className="font-semibold">{closestReference.place}</span> ·{' '}
                <span className="font-mono-tnum">{closestReference.year}</span>
              </div>
              <div className="font-mono-tnum text-[11px] text-text-secondary">
                M{closestReference.mag.toFixed(1)}{' '}
                <span className="text-text-tertiary">
                  (Δ {Math.abs(closestReference.mag - magnitude).toFixed(1)})
                </span>
              </div>
            </section>
          )}

          {/* AI explanation */}
          <section className="mb-4 rounded-md border border-white/[0.06] bg-surface-1 p-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
                AI Açıklaması
              </div>
              <span className="font-mono-tnum text-[9px] uppercase text-text-tertiary">
                grok-4.3
              </span>
            </div>
            {aiLoading && (
              <div className="mt-2 flex items-center gap-2 text-[12px] text-text-tertiary">
                <Loader2 className="size-3 animate-spin" />
                AI bağlam topluyor…
              </div>
            )}
            {aiError && !aiLoading && (
              <p className="mt-2 text-[12px] text-threat-critical">
                {aiError}
              </p>
            )}
            {aiText && !aiLoading && (
              <p className="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-text-secondary">
                {aiText}
              </p>
            )}
          </section>

          {/* Sahne anahtarı */}
          <section className="rounded-md border border-white/[0.06] bg-surface-1 p-3">
            <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
              Sahnedeki Görseller Ne Anlama Geliyor?
            </div>
            <ul className="mt-1.5 space-y-1.5 text-[11px] leading-relaxed text-text-secondary">
              <li>
                <span className="font-semibold text-text-primary">Zemin dalgası</span> ·
                P-dalgası önce gelir (hızlı, hafif), S-dalgası onu izler (büyük yan-yana
                hareket).
              </li>
              <li>
                <span className="font-semibold text-text-primary">Bina sallanması</span> ·
                M{magnitude.toFixed(1)}&apos;e göre genlik hesaplanır. Yüksek binalar daha
                geç tepki verir (rezonans).
              </li>
              <li>
                <span className="font-semibold text-text-primary">Yıkım</span> ·
                {magnitude >= 7
                  ? ' Bu büyüklükte standart yapılarda bile çökme olası — sahnedeki binalar bunu temsil eder.'
                  : magnitude >= 6
                    ? ' Zayıf yapılarda çökme, modern yapılarda hasar.'
                    : magnitude >= 5
                      ? ' Yapısal çökme genelde olmaz, eşyalar düşer.'
                      : ' Çökme olmaz; sahnedeki binalar sadece sallanır.'}
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
