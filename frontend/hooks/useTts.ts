'use client';

import { useEffect, useRef } from 'react';

import { API_BASE_URL } from '@/lib/api-client';

// Absolute URL (origin + path). A bare relative path 404s under the
// split-origin deploy where the backend lives on a different host than the
// Next app — matching useChat / api-client behaviour keeps TTS reachable.
const ENDPOINT = `${API_BASE_URL}/api/v1/ai/tts`;

/**
 * Module-level audio cache. Aynı metin + voice id kombinasyonu için ikinci
 * çağrı network'a gitmez; ilk çağrının ürettiği blob URL'i tekrar oynatır.
 *
 * Cache page reload'da temizlenir (URL.createObjectURL session-bound).
 * 50 entry üst sınırı — uzun demo turlarında bellek şişmesin.
 */
const cache = new Map<string, Promise<string>>();
const MAX_CACHE = 50;

function cacheKey(text: string, voiceId: string | undefined, speed: number): string {
  return `${voiceId ?? '_'}:${speed.toFixed(2)}:${text}`;
}

async function fetchTtsAudio(
  text: string,
  voiceId: string | undefined,
  voiceSpeed: number,
): Promise<string> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      voice_id: voiceId,
      voice_speed: voiceSpeed,
    }),
  });
  if (!response.ok) {
    let code: string | null = null;
    try {
      const data = (await response.json()) as { detail?: { code?: string } };
      code = data?.detail?.code ?? null;
    } catch {
      // ignore
    }
    throw new Error(code ?? `TTS_HTTP_${response.status}`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

/**
 * Arka planda TTS audio'yu çek ve cache'e koy. Promise'i return etmez —
 * fire-and-forget pattern. DemoTour stepIndex+1 caption'ı için kullanır,
 * step geçişinde gecikme=0 olur.
 */
export function prefetchTts(
  text: string | null | undefined,
  voiceId?: string,
  voiceSpeed = 1.0,
): void {
  if (!text || !text.trim()) return;
  // getCachedTts cache'e ekler ve promise'i set eder; await etmiyoruz.
  void getCachedTts(text, voiceId, voiceSpeed).catch(() => undefined);
}

function getCachedTts(
  text: string,
  voiceId: string | undefined,
  voiceSpeed: number,
): Promise<string> {
  const key = cacheKey(text, voiceId, voiceSpeed);
  const existing = cache.get(key);
  if (existing) return existing;

  // LRU-ish evict
  if (cache.size >= MAX_CACHE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }

  const promise = fetchTtsAudio(text, voiceId, voiceSpeed).catch((err) => {
    cache.delete(key); // başarısız ise tekrar denenebilsin
    throw err;
  });
  cache.set(key, promise);
  return promise;
}

interface UseTtsAudioOptions {
  /** Çalınacak metin. null/empty olunca audio pause edilir. */
  text: string | null | undefined;
  /** Etkin değilse hiçbir şey yapma. */
  enabled: boolean;
  /** Opsiyonel ses kimliği (server default'u override eder). */
  voiceId?: string;
  /** Konuşma hızı 0.7..1.2. */
  voiceSpeed?: number;
  /** Opsiyonel volume 0..1. */
  volume?: number;
  /** Audio bitince çağrılır (DemoTour bunu bekleyip step ilerletir). */
  onPlayDone?: () => void;
  /** Audio yüklenip oynamaya başladığında çağrılır. */
  onPlayStart?: (durationS: number) => void;
}

/**
 * `text` değiştiğinde TTS endpoint'inden seslendirme alır ve oynatır.
 *
 * - Aynı text/voice tekrar girince cache hit ile anlık oynatır.
 * - `enabled=false` veya text boş olunca mevcut audio durdurulur.
 * - Hata durumunda sessizce başarısız olur (UI bloklamamak için).
 */
export function useTtsAudio({
  text,
  enabled,
  voiceId,
  voiceSpeed = 1.0,
  volume = 1.0,
  onPlayDone,
  onPlayStart,
}: UseTtsAudioOptions): void {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onDoneRef = useRef(onPlayDone);
  const onStartRef = useRef(onPlayStart);
  onDoneRef.current = onPlayDone;
  onStartRef.current = onPlayStart;

  useEffect(() => {
    audioRef.current?.pause();
    audioRef.current = null;

    if (!enabled || !text || !text.trim()) return;

    let cancelled = false;
    getCachedTts(text, voiceId, voiceSpeed)
      .then((url) => {
        if (cancelled) return;
        const audio = new Audio(url);
        audio.volume = Math.max(0, Math.min(1, volume));
        audio.onloadedmetadata = () => {
          if (cancelled) return;
          onStartRef.current?.(audio.duration || 0);
        };
        audio.onended = () => {
          if (cancelled) return;
          onDoneRef.current?.();
        };
        audio.play().catch(() => {
          // user-gesture engelliyse "sanki bitti" işle ki step ilerlesin
          if (!cancelled) onDoneRef.current?.();
        });
        audioRef.current = audio;
      })
      .catch(() => {
        if (!cancelled) onDoneRef.current?.();
      });

    return () => {
      cancelled = true;
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [text, enabled, voiceId, voiceSpeed, volume]);
}

/**
 * Tek seferlik manuel TTS oynatma — kullanıcı butonuna basınca text seslendirir.
 *
 * Promise döndürür: ses tamamlanınca veya hata olunca resolve eder.
 */
export async function speakText(
  text: string,
  options: { voiceId?: string; voiceSpeed?: number; volume?: number } = {},
): Promise<void> {
  const url = await getCachedTts(text, options.voiceId, options.voiceSpeed ?? 1.0);
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.volume = Math.max(0, Math.min(1, options.volume ?? 1.0));
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error('audio_failed'));
    audio.play().catch(reject);
  });
}
