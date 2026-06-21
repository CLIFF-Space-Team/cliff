'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cliff:lite_mode';

interface LiteModeDetector {
  enabled: boolean;
  /** Detection nedenleri — debug + log için */
  reasons: string[];
}

/**
 * Cihazın "lite mode" gerektirip gerektirmediğini sezgisel olarak tespit eder.
 *
 * Triggers (her biri tek başına yeterli):
 *   - URL `?lite=1`
 *   - localStorage'da kullanıcı tercihi
 *   - `navigator.deviceMemory <= 2` (eski/düşük cihaz)
 *   - `navigator.hardwareConcurrency <= 2` (zayıf CPU)
 *   - `window.innerWidth < 480` (küçük telefon ekranı)
 *   - `prefers-reduced-motion` aktif
 */
function detectLiteMode(): LiteModeDetector {
  const reasons: string[] = [];

  if (typeof window === 'undefined') {
    return { enabled: false, reasons: ['ssr'] };
  }

  // 1. URL query
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('lite') === '1') {
      reasons.push('?lite=1');
    }
  } catch {
    // ignore
  }

  // 2. localStorage tercihi
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') reasons.push('user-preference');
    if (stored === 'false') {
      // Kullanıcı manuel olarak full-mode istediyse override
      return { enabled: false, reasons: ['user-override'] };
    }
  } catch {
    // ignore
  }

  // 3. Cihaz hafızası (Chrome only API, ancak destek geniş)
  const nav = window.navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2) {
    reasons.push(`memory:${nav.deviceMemory}gb`);
  }

  // 4. CPU
  if (
    typeof nav.hardwareConcurrency === 'number' &&
    nav.hardwareConcurrency <= 2
  ) {
    reasons.push(`cpu:${nav.hardwareConcurrency}`);
  }

  // 5. Küçük ekran
  if (window.innerWidth < 480) {
    reasons.push(`narrow:${window.innerWidth}px`);
  }

  // 6. Reduced motion tercihi
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      reasons.push('reduced-motion');
    }
  } catch {
    // ignore
  }

  return { enabled: reasons.length > 0, reasons };
}

/**
 * Lite mode aktif mi? 3D component'leri buna abone olarak postprocessing/
 * bloom/shadow kapatır, low-poly varyantları kullanır.
 *
 * Component-level optimizasyon component'in kendi sorumluluğu — bu hook
 * yalnızca "olmalı mı" kararını verir.
 */
export function useLiteMode(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const result = detectLiteMode();
    setEnabled(result.enabled);
    if (result.enabled && process.env.NODE_ENV !== 'production') {
      console.log('[CLIFF] lite mode active:', result.reasons.join(', '));
    }
  }, []);

  return enabled;
}

/** Kullanıcı manuel olarak lite mode'u toggle edebilir. */
export function setLiteModePreference(value: boolean | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (value == null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
    }
  } catch {
    // ignore
  }
}
