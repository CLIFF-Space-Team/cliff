/**
 * Browser Text-to-Speech (Web Speech API) — Turkish narration with no backend
 * or API key. Used as the demo-tour voice and as a fallback when the optional
 * server TTS (`/api/v1/ai/tts`) is not configured.
 *
 * - Always speaks Turkish: picks a `tr-TR` voice when the OS has one (e.g.
 *   "Microsoft Tolga"); otherwise still forces `lang = "tr-TR"` so the engine
 *   reads it with Turkish phonetics rather than an English voice.
 * - Works around the Chrome bug where utterances longer than ~15 s get cut off
 *   (periodic pause()/resume() keep-alive).
 * - Requires a prior user gesture (the "Otomatik Tur" button click) to start,
 *   per browser autoplay policy.
 */

export function browserTtsAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

let voicesCache: SpeechSynthesisVoice[] | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!browserTtsAvailable()) return Promise.resolve([]);
  const synth = window.speechSynthesis;
  const ready = synth.getVoices();
  if (ready.length) {
    voicesCache = ready;
    return Promise.resolve(ready);
  }
  if (voicesCache) return Promise.resolve(voicesCache);
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      voicesCache = synth.getVoices();
      resolve(voicesCache);
    };
    synth.addEventListener('voiceschanged', finish, { once: true });
    // Some browsers never fire `voiceschanged`; don't hang the tour.
    window.setTimeout(finish, 1200);
  });
}

async function pickTurkishVoice(): Promise<SpeechSynthesisVoice | null> {
  const voices = await loadVoices();
  return (
    voices.find((v) => v.lang === 'tr-TR') ??
    voices.find((v) => v.lang?.toLowerCase().startsWith('tr')) ??
    voices.find((v) => /t[üu]rk|tolga|yelda|filiz|emel|seda/i.test(v.name)) ??
    null
  );
}

export interface BrowserSpeakOptions {
  /** Speaking rate (0.5–1.5). Demo uses ~1.12. */
  rate?: number;
  /** Volume 0–1. */
  volume?: number;
  /** Fires when speech starts; passes a rough duration estimate (seconds). */
  onStart?: (estDurationS: number) => void;
  /** Fires when speech finishes, errors, or is cancelled. */
  onEnd?: () => void;
}

let keepAlive: number | null = null;
let current: SpeechSynthesisUtterance | null = null;

function stopKeepAlive(): void {
  if (keepAlive !== null) {
    window.clearInterval(keepAlive);
    keepAlive = null;
  }
}

/** Speak `text` in Turkish. Fire-and-forget; progress is reported via callbacks. */
export async function speakBrowser(
  text: string,
  opts: BrowserSpeakOptions = {},
): Promise<void> {
  if (!browserTtsAvailable() || !text.trim()) {
    opts.onEnd?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel(); // drop anything currently queued/speaking
  stopKeepAlive();

  const voice = await pickTurkishVoice();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'tr-TR';
  if (voice) utter.voice = voice;
  const rate = Math.max(0.5, Math.min(1.5, opts.rate ?? 1));
  utter.rate = rate;
  utter.volume = Math.max(0, Math.min(1, opts.volume ?? 1));
  utter.pitch = 1;
  current = utter;

  // Rough duration estimate (~15 chars/sec at 1× Turkish speech).
  const estDurationS = text.length / (15 * rate);

  const done = () => {
    if (current === utter) current = null;
    stopKeepAlive();
    opts.onEnd?.();
  };
  utter.onstart = () => opts.onStart?.(estDurationS);
  utter.onend = done;
  utter.onerror = done;

  synth.speak(utter);
  // Chrome cuts off long utterances at ~15 s — pause/resume keeps it going.
  keepAlive = window.setInterval(() => {
    if (!synth.speaking) {
      stopKeepAlive();
      return;
    }
    synth.pause();
    synth.resume();
  }, 9000);
}

/** Stop any in-flight browser speech. */
export function cancelBrowser(): void {
  stopKeepAlive();
  current = null;
  if (browserTtsAvailable()) window.speechSynthesis.cancel();
}
