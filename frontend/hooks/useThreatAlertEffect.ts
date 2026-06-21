'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { useWebSocket } from '@/providers/WebSocketProvider';

const MUTE_KEY = 'cliff:audio_muted';
const FLASH_DURATION_MS = 1500;

/**
 * Programatik alarm tonu — ses dosyası gerektirmez. WebAudio ile
 * 220 Hz sine wave + soft envelope + 3 beep.
 *
 * Browser AudioContext yalnızca kullanıcı etkileşiminden sonra başlatılabilir
 * (Chrome auto-play policy). Sayfa yüklenir yüklenmez ses başlatmak yerine,
 * AudioContext'i lazy oluşturuyoruz; ilk uyarıda kullanıcı sayfa ile
 * etkileşmişse çalar, etkileşmemişse sessizce başarısız olur.
 */
function playAlarmTone(): void {
  if (typeof window === 'undefined') return;
  const AudioCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtor) return;

  try {
    const ctx = new AudioCtor();
    if (ctx.state === 'suspended') {
      // Etkileşim yoksa muhtemelen suspended; 'resume()' deneyelim,
      // başarısız olursa sessizce çık.
      ctx.resume().catch(() => undefined);
    }
    const now = ctx.currentTime;
    const beepDuration = 0.18;
    const gap = 0.12;

    for (let i = 0; i < 3; i += 1) {
      const start = now + i * (beepDuration + gap);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, start);
      const gain = ctx.createGain();
      // Soft envelope — 5 ms attack, 30 ms decay, hold, 50 ms release
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.005);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.05);
      gain.gain.setValueAtTime(0.18, start + beepDuration - 0.05);
      gain.gain.linearRampToValueAtTime(0, start + beepDuration);

      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + beepDuration);
    }

    // 1.5 s sonra context kapansın — bellek sızıntısı engellenir
    window.setTimeout(() => ctx.close().catch(() => undefined), 1500);
  } catch {
    // Bazı tarayıcılarda AudioContext oluşturma hata verebilir; sessiz geç.
  }
}

/**
 * Sahnenin üstüne tam ekran kırmızı flash overlay koy, 1.5 sn fade-out.
 *
 * Doğrudan DOM'a inject ediyoruz çünkü hook çağıran component'in
 * render ağacında olması gerekmiyor — global bir efekt bu.
 */
function flashScreen(): void {
  if (typeof document === 'undefined') return;
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9999;
    pointer-events: none;
    background: hsl(0 84% 60%);
    opacity: 0;
    transition: opacity 200ms ease-out;
  `;
  document.body.appendChild(overlay);

  // Force reflow then animate in
  void overlay.offsetWidth;
  overlay.style.opacity = '0.35';

  window.setTimeout(() => {
    overlay.style.transition = `opacity ${FLASH_DURATION_MS - 200}ms ease-in`;
    overlay.style.opacity = '0';
  }, 200);

  window.setTimeout(() => {
    overlay.remove();
  }, FLASH_DURATION_MS + 50);
}

/** Sahnenin kamera shake'i için custom event — SolarSystemScene dinleyebilir. */
function emitShake(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('cliff:threat-shake'));
}

/** localStorage'dan mute durumu — varsayılan: muted (kullanıcı açar). */
export function isAudioMuted(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(MUTE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setAudioMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? 'true' : 'false');
  } catch {
    // ignore
  }
  // Aynı tab'da `storage` event tetiklenmez; custom event ile diğer
  // dinleyicileri (TTS hook, vb.) haberdar et.
  window.dispatchEvent(
    new CustomEvent('cliff:mute-changed', { detail: muted }),
  );
}

// Demo Tour klavye 'M' kısayolu — global mute toggle
if (typeof window !== 'undefined') {
  window.addEventListener('cliff:demo:toggle-mute', () => {
    setAudioMuted(!isAudioMuted());
  });
}

/**
 * Global threat-alert efekti orkestrasyonu. WebSocketProvider'ın `lastEvent`
 * stream'ine abone olur, `threat_alert` geldiğinde:
 *
 * 1. Kırmızı toast (yüksek/kritik için error/warning seviyesi)
 * 2. Tam ekran kırmızı flash overlay (1.5 sn fade)
 * 3. Alarm sesi (mute kontrollü, default kapalı)
 * 4. `cliff:threat-shake` custom event (sahne shake handler'ı için)
 */
export function useThreatAlertEffect(): void {
  const { lastEvent } = useWebSocket();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastEvent || lastEvent.type !== 'threat_alert') return;
    const alertId = lastEvent.alert.alert_id;
    // Aynı alert iki kez tetiklenmesin (lastEvent reference değiştiğinde
    // useEffect tekrar çalışabilir).
    if (handledRef.current === alertId) return;
    handledRef.current = alertId;

    const a = lastEvent.alert;
    const isCritical = a.severity === 'critical';

    // 1. Toast
    const message = `${isCritical ? '⚠ KRİTİK' : '⚠ Tehdit'} · ${a.name}`;
    const description = a.description ?? a.title;
    if (isCritical) {
      toast.error(message, { description, duration: 10000 });
    } else if (a.severity === 'high') {
      toast.warning(message, { description, duration: 8000 });
    } else {
      toast(message, { description, duration: 5000 });
    }

    // 2. Flash overlay
    flashScreen();

    // 3. Audio (mute kontrollü)
    if (!isAudioMuted()) {
      playAlarmTone();
    }

    // 4. Camera shake event
    emitShake();
  }, [lastEvent]);
}
