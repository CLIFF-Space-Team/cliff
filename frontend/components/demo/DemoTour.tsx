'use client';

import { Pause, Play, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import { useAudioMuted } from '@/hooks/useAudioMuted';
import { prefetchTts, useTtsAudio } from '@/hooks/useTts';
import { dispatchDemoAction } from '@/lib/demo-event-bus';
import {
  DEMO_SCRIPT,
  DEMO_TTS_VOICE_SPEED,
  estimateStepDuration,
} from '@/lib/demo-script';
import { cn } from '@/lib/utils';

/**
 * Etkinlikte vali / MEM müdürü protokol sunumu için scripted otomatik tur.
 *
 * v2.0:
 *  - Uzun, akıcı caption metinleri (`lib/demo-script.ts`)
 *  - TTS hızı 1.12 (Türkçe için akıcı, hızlı ama anlaşılır)
 *  - Süre metin uzunluğundan otomatik hesaplanır
 *  - Sayfa-içi otomasyon (event bus üstünden DemoActions component'ine sinyaller)
 *
 * Tetikleme: herhangi bir sayfada `?demo=1`. ESC ile çıkış, space ile pause/resume.
 */
export function DemoTour() {
  return (
    <Suspense fallback={null}>
      <DemoTourInner />
    </Suspense>
  );
}

function DemoTourInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const muted = useAudioMuted();

  const isDemo = searchParams.get('demo') === '1';

  const stepIndex = useMemo(() => {
    if (!isDemo) return -1;
    const exact = DEMO_SCRIPT.findIndex((s) => {
      const [stepPath, stepQuery = ''] = s.path.split('?');
      if (stepPath !== pathname) return false;
      // Step path query string ile eşleşiyorsa daha kesin; yoksa path-only kabul
      if (!stepQuery) return true;
      const stepParams = new URLSearchParams(stepQuery);
      stepParams.delete('demo');
      for (const [key, value] of stepParams.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    });
    if (exact >= 0) return exact;
    return DEMO_SCRIPT.findIndex((s) => s.path.split('?')[0] === pathname);
  }, [isDemo, pathname, searchParams]);

  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [audioDurationS, setAudioDurationS] = useState<number | null>(null);
  const [audioDone, setAudioDone] = useState(false);

  // Step değişince elapsed + audio state sıfırla
  useEffect(() => {
    setElapsed(0);
    setAudioDurationS(null);
    setAudioDone(false);
  }, [stepIndex]);

  // Sayfa-içi otomasyon — step başladığında schedule edilen action'ları zaman ile dispatch et
  useEffect(() => {
    if (!isDemo || stepIndex < 0 || paused) return;
    const step = DEMO_SCRIPT[stepIndex];
    if (!step?.actions || step.actions.length === 0) return;
    const timers = step.actions.map((action) =>
      window.setTimeout(() => {
        dispatchDemoAction(action.payload);
      }, action.delayS * 1000),
    );
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [isDemo, stepIndex, paused]);

  // Step ilerletici
  const advanceStep = useCallback(() => {
    const nextStep = DEMO_SCRIPT[stepIndex + 1];
    if (nextStep) {
      router.push(nextStep.path);
    } else {
      router.push(DEMO_SCRIPT[0]!.path);
    }
  }, [router, stepIndex]);

  // Progress sayacı (UI bar için)
  useEffect(() => {
    if (!isDemo || stepIndex < 0 || paused) return;
    const interval = window.setInterval(() => {
      setElapsed((e) => e + 0.1);
    }, 100);
    return () => window.clearInterval(interval);
  }, [isDemo, stepIndex, paused]);

  // Step ilerletme — TTS senkron veya tahmin süresi
  useEffect(() => {
    if (!isDemo || stepIndex < 0 || paused) return;
    const step = DEMO_SCRIPT[stepIndex];
    if (!step) return;

    // 1) Manuel override süre verilmişse kesin süre kullan
    if (step.durationS) {
      const t = window.setTimeout(advanceStep, step.durationS * 1000);
      return () => window.clearTimeout(t);
    }

    // 2) Ses kapalı (mute) → tahmin süresi
    if (muted) {
      const fallback = estimateStepDuration(step.caption) * 1000;
      const t = window.setTimeout(advanceStep, fallback);
      return () => window.clearTimeout(t);
    }

    // 3) Ses açık → audio bitene kadar bekle, sonra 1.5sn dinleme buffer'ı
    if (audioDone) {
      const buffer = 1500;
      const t = window.setTimeout(advanceStep, buffer);
      return () => window.clearTimeout(t);
    }

    // 4) Audio yüklenmedi/oynamıyor → max guard süre (audio promise hata aldı varsay)
    const maxGuardS =
      (audioDurationS ?? estimateStepDuration(step.caption) * 1.4) + 6;
    const t = window.setTimeout(advanceStep, maxGuardS * 1000);
    return () => window.clearTimeout(t);
  }, [isDemo, stepIndex, paused, muted, audioDone, audioDurationS, advanceStep]);

  // ESC ile çıkış, space ile toggle
  const exitTour = useCallback(() => {
    const cleanPath = pathname.split('?')[0] ?? '/';
    router.push(cleanPath);
  }, [pathname, router]);

  useEffect(() => {
    if (!isDemo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitTour();
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        setPaused((p) => !p);
      }
      // ← / → arrow keys: önceki / sonraki step
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        advanceStep();
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        const prevStep = DEMO_SCRIPT[stepIndex - 1];
        if (prevStep) router.push(prevStep.path);
      }
      // M: mute toggle
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        const muteEvt = new CustomEvent('cliff:demo:toggle-mute');
        window.dispatchEvent(muteEvt);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDemo, exitTour, advanceStep, router, stepIndex]);

  // TTS pre-fetch — sonraki step caption'ını arka planda yükle
  useEffect(() => {
    if (!isDemo || stepIndex < 0 || muted || paused) return;
    const nextStep = DEMO_SCRIPT[stepIndex + 1];
    if (nextStep?.caption) {
      prefetchTts(nextStep.caption, undefined, DEMO_TTS_VOICE_SPEED);
    }
  }, [isDemo, stepIndex, muted, paused]);

  // Caption seslendirme — onPlayDone step'i ilerletir
  const activeCaption =
    isDemo && stepIndex >= 0 ? DEMO_SCRIPT[stepIndex]?.caption ?? null : null;
  useTtsAudio({
    text: activeCaption,
    enabled: isDemo && !paused && !muted,
    voiceSpeed: DEMO_TTS_VOICE_SPEED,
    volume: 0.85,
    onPlayStart: (durationS) => {
      setAudioDurationS(durationS);
      setAudioDone(false);
    },
    onPlayDone: () => {
      setAudioDone(true);
    },
  });

  if (!isDemo || stepIndex < 0) return null;
  const step = DEMO_SCRIPT[stepIndex];
  if (!step) return null;

  // Progress bar için en iyi süre tahmini: manuel > audio > heuristic
  const totalS =
    step.durationS ??
    (audioDurationS != null ? audioDurationS + 1.5 : estimateStepDuration(step.caption));
  const stepProgress = Math.min(1, elapsed / totalS);
  const cumulativeBefore = DEMO_SCRIPT.slice(0, stepIndex).reduce(
    (s, x) => s + (x.durationS ?? estimateStepDuration(x.caption)),
    0,
  );
  const totalDuration = DEMO_SCRIPT.reduce(
    (s, x) => s + (x.durationS ?? estimateStepDuration(x.caption)),
    0,
  );
  const overallProgress =
    Math.min(1, (cumulativeBefore + elapsed) / totalDuration) * 100;

  return (
    <>
      {/* Üst progress bar + kompakt kontroller */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-40 flex flex-col"
        role="region"
        aria-label="Demo tur"
      >
        <div className="h-1 w-full bg-surface-1">
          <div
            className="h-full bg-threat-high transition-all duration-100 ease-linear"
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        <div className="pointer-events-auto mx-auto mt-3 flex w-full max-w-3xl items-center gap-3 rounded-full border border-threat-high/40 bg-surface-1/95 px-4 py-2 shadow-lg backdrop-blur sm:mt-4">
          <span className="font-mono-tnum text-[10px] uppercase tracking-wider text-threat-high">
            ▶ Demo
          </span>
          <span className="font-mono-tnum text-[10px] text-text-tertiary">
            {stepIndex + 1}/{DEMO_SCRIPT.length}
          </span>
          <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-text-primary">
            {step.shortLabel}
          </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Devam' : 'Duraklat'}
            className={cn(
              'flex size-6 items-center justify-center rounded-full text-text-secondary hover:text-text-primary',
            )}
          >
            {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
          </button>
          <button
            type="button"
            onClick={exitTour}
            aria-label="Turdan çık"
            className="flex size-6 items-center justify-center rounded-full text-text-secondary hover:text-text-primary"
          >
            <X className="size-3" />
          </button>
        </div>
      </div>

        <div className="mx-auto mt-1 h-px w-full max-w-3xl bg-white/[0.06]">
          <div
            className="h-full bg-text-secondary transition-all duration-100 ease-linear"
            style={{ width: `${stepProgress * 100}%` }}
          />
        </div>
      </div>

      {/* ALT — büyük caption overlay (DEMO'NUN ANA GÖRSEL ANLATIMı) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-16 sm:pb-20">
        <div className="pointer-events-auto mx-3 w-full max-w-3xl rounded-xl border border-threat-high/40 bg-surface-1/95 p-4 shadow-2xl backdrop-blur sm:p-5">
          {/* Step başlığı */}
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-threat-high/20 font-mono-tnum text-[11px] font-bold text-threat-high">
              {stepIndex + 1}
            </span>
            <span className="font-mono-tnum text-[10px] uppercase tracking-wider text-threat-high">
              {step.shortLabel}
            </span>
            {muted && (
              <span className="ml-auto rounded-full border border-threat-moderate/40 bg-threat-moderate/10 px-2 py-0.5 font-mono-tnum text-[9px] uppercase tracking-wider text-threat-moderate">
                🔇 sesi sol alttan aç
              </span>
            )}
          </div>
          {/* Caption metni — büyük, okunaklı */}
          <p className="mt-2 text-[13px] leading-relaxed text-text-primary sm:text-[14px]">
            {step.caption}
          </p>
          {/* Kontrol hint */}
          <p className="mt-2 font-mono-tnum text-[9px] uppercase tracking-wider text-text-tertiary">
            ← → geç · Esc çık · M sesi
          </p>
        </div>
      </div>
    </>
  );
}
