'use client';

import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Check,
  Crosshair,
  Globe2,
  Map,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'cliff:impact:wizard-seen';

interface ImpactWizardProps {
  /** Manuel olarak aç (örn. yardım butonundan). null ise localStorage'a göre. */
  forceOpen?: boolean;
  onClose?: () => void;
}

/**
 * Çarpma Simülatörü onboarding wizard — 3-step modal.
 *
 * İlk ziyarette otomatik açılır (`localStorage:cliff:impact:wizard-seen` yok).
 * Skip butonu var. `?wizard=skip` URL parametresi ile kalıcı olarak atlanır
 * (ImpactPage'in sorumluluğu).
 */
export function ImpactWizard({ forceOpen, onClose }: ImpactWizardProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceOpen != null) {
      setOpen(forceOpen);
      if (forceOpen) setStep(0);
      return;
    }
    if (typeof window === 'undefined') return;
    try {
      // URL'de ?wizard=skip varsa hiç açma
      const params = new URLSearchParams(window.location.search);
      if (params.get('wizard') === 'skip') return;
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        // Sayfa yüklendikten kısa süre sonra aç (paneller stabilize olsun)
        const t = window.setTimeout(() => setOpen(true), 500);
        return () => window.clearTimeout(t);
      }
    } catch {
      // ignore
    }
  }, [forceOpen]);

  const dismiss = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    onClose?.();
  };

  const next = () => {
    if (step >= 2) {
      dismiss();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && dismiss()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[55] bg-black/70 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[56] w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2',
            'rounded-xl border border-white/[0.1] bg-surface-2 shadow-panel',
            'data-[state=open]:animate-slide-in-up',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
            <Dialog.Title asChild>
              <h2 className="text-sm font-semibold text-text-primary">
                Çarpma Simülatörü Rehberi
              </h2>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Kapat"
                className="rounded-md p-1 text-text-tertiary hover:text-text-primary"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Step content */}
          <div className="space-y-4 px-5 py-5 sm:px-6">
            {step === 0 && <Step1 />}
            {step === 1 && <Step2 />}
            {step === 2 && <Step3 />}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-3">
            {/* Step dots */}
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === step ? 'w-6 bg-text-primary' : 'w-1.5 bg-white/[0.18]',
                  )}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                >
                  <ArrowLeft className="size-3.5" />
                  Geri
                </Button>
              )}
              {step < 2 ? (
                <Button type="button" size="sm" onClick={next}>
                  İleri
                  <ArrowRight className="size-3.5" />
                </Button>
              ) : (
                <Button type="button" size="sm" onClick={dismiss}>
                  <Check className="size-3.5" />
                  Anladım
                </Button>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Step1() {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-3 text-text-primary">
          <Sparkles className="size-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            1. Senaryonu seç
          </h3>
          <p className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
            Hazır kartlardan başla — sonra ince ayar yap
          </p>
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-text-secondary">
        Sol panelde üç kategori var:{' '}
        <span className="font-semibold text-text-primary">🇹🇷 Türkiye</span>,{' '}
        <span className="font-semibold text-text-primary">🕰️ Tarihsel</span>,{' '}
        <span className="font-semibold text-text-primary">🛰️ Canlı NEO</span>.
        Her kart gerçek bir asteroidi (Apophis, Bennu) veya tarihsel olayı
        (Çelyabinsk, Tunguska) farklı şehirlere taşır. Bir kart tıkla,
        parametreler otomatik dolar.
      </p>
      <div className="rounded-md border border-white/[0.06] bg-surface-1 p-3">
        <p className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
          İpucu
        </p>
        <p className="mt-1 text-[12px] text-text-secondary">
          Türkiye sekmesi etkinlik için en iyi başlangıç — çarpma noktası
          otomatik şehir seçilir.
        </p>
      </div>
    </>
  );
}

function Step2() {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-3 text-text-primary">
          <Crosshair className="size-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            2. Hedefini seç
          </h3>
          <p className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
            Şehir seçici · Dünya veya Türkiye
          </p>
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-text-secondary">
        Senaryo seçtikten sonra, sol orta paneldeki{' '}
        <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.1] bg-surface-1 px-1.5 py-0.5 text-[11px]">
          <Globe2 className="size-3" /> Dünya
        </span>{' '}
        /{' '}
        <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.1] bg-surface-1 px-1.5 py-0.5 text-[11px]">
          🇹🇷 Türkiye
        </span>{' '}
        toggle ile şehir listesini değiştir. Türkiye modunda 81 il + büyükşehir
        merkezleri filtre edilebilir. Tıkladığın anda harita o şehre
        odaklanır.
      </p>
    </>
  );
}

function Step3() {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-3 text-text-primary">
          <Box className="size-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            3. Sonucu izle
          </h3>
          <p className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
            3D + Harita · canlı sonuç
          </p>
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-text-secondary">
        Üst sağdaki{' '}
        <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.1] bg-surface-1 px-1.5 py-0.5 text-[11px]">
          <Box className="size-3" /> 3D
        </span>{' '}
        /{' '}
        <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.1] bg-surface-1 px-1.5 py-0.5 text-[11px]">
          <Map className="size-3" /> Harita
        </span>{' '}
        {`ile görünüm değiştir. 3D'de meteorun atmosfere girişi animasyonu;
        haritada krater + şokdalgası halkaları + etkilenen iller sayılır.
        Sağ panelde anlık kayıp tahmini, enerji eşdeğerliği ve verdict.`}
      </p>
      <div className="rounded-md border border-white/[0.06] bg-surface-1 p-3">
        <p className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
          Şimdi başla
        </p>
        <p className="mt-1 text-[12px] text-text-secondary">
          Bu rehber bir daha gözükmeyecek. İhtiyacın olursa parametre
          etiketlerinin yanındaki ⓘ ikonlarına tıkla — her terim için kısa
          açıklama açılır.
        </p>
      </div>
    </>
  );
}
