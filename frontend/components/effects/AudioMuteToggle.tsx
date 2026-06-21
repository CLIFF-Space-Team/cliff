'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';

import { isAudioMuted, setAudioMuted } from '@/hooks/useThreatAlertEffect';
import { cn } from '@/lib/utils';

/**
 * Sağ alt köşede sabit duran küçük ses on/off toggle.
 *
 * Threat-alert alarm sesini kontrol eder. localStorage'dan ilk durumu okur,
 * tıklandıkça toggle yapar. SSR'de muted varsayılan, hydrate sonrası gerçek
 * değer.
 */
export function AudioMuteToggle({ className }: { className?: string }) {
  const [muted, setMuted] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setMuted(isAudioMuted());
    setHydrated(true);
  }, []);

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    setAudioMuted(next);
  };

  if (!hydrated) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}
      title={muted ? 'Tehdit alarmı sesi · KAPALI' : 'Tehdit alarmı sesi · AÇIK'}
      className={cn(
        'fixed bottom-3 right-3 z-30 flex size-9 items-center justify-center rounded-full border border-white/[0.1] bg-surface-1/85 text-text-secondary backdrop-blur transition-colors hover:border-white/[0.2] hover:text-text-primary',
        // Mobile bottom nav var; arada boşluk bırak
        'sm:bottom-4 sm:right-4',
        className,
      )}
    >
      {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
    </button>
  );
}
