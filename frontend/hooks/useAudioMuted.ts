'use client';

import { useEffect, useState } from 'react';

import { isAudioMuted } from '@/hooks/useThreatAlertEffect';

/**
 * Reaktif olarak ses mute durumunu takip eder. AudioMuteToggle veya kod
 * `setAudioMuted` çağırdığında bu hook update verir (custom event üzerinden).
 *
 * Cross-tab senkronizasyon için ayrıca `storage` event'ini de dinler.
 */
export function useAudioMuted(): boolean {
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    setMuted(isAudioMuted());
    const onChange = () => setMuted(isAudioMuted());
    window.addEventListener('cliff:mute-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('cliff:mute-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  return muted;
}
