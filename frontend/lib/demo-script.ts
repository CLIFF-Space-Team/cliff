/**
 * Demo Tour 2.2 — 6 step, dashboard merkezli.
 *
 * Sayfalar: /, /dashboard, /impact, /sinematik, /
 * Her step caption + sayfa-içi otomasyon + spotlight ile dolu.
 */

import type { DemoActionPayload } from './demo-event-bus';

export interface ScheduledAction {
  delayS: number;
  payload: DemoActionPayload;
}

export interface DemoStep {
  path: string;
  shortLabel: string;
  caption: string;
  durationS?: number;
  actions?: ScheduledAction[];
}

const TTS_CHARS_PER_SECOND_AT_1X = 17;
const TTS_SPEED_MULTIPLIER = 1.12;
const PAUSE_BUFFER_S = 2.5;

export function estimateStepDuration(caption: string): number {
  const speakingS =
    caption.length / (TTS_CHARS_PER_SECOND_AT_1X * TTS_SPEED_MULTIPLIER);
  return Math.max(10, Math.ceil(speakingS + PAUSE_BUFFER_S));
}

export const DEMO_SCRIPT: readonly DemoStep[] = [
  {
    path: '/?demo=1',
    shortLabel: 'Hoş geldiniz',
    caption:
      'CLIFF\'e hoş geldiniz. Bu site, uzaydan gelen asteroitleri izler. NASA ve Türkiye\'deki kurumlardan canlı veri alır. Birazdan size Mission Control sayfasını gezdireceğim.',
    actions: [
      {
        delayS: 1.5,
        payload: {
          type: 'spotlight',
          selector: '#cliff-hero-cta',
          label: "Mission Control'a girmek için tıklanır",
          zoom: 1.05,
        },
      },
    ],
  },
  {
    path: '/dashboard?demo=1',
    shortLabel: 'Mission Control',
    caption:
      'Mission Control sayfasındayız. Ortadaki üç boyutlu Güneş Sistemi modelinde her küçük nokta bir asteroit. Renkleri tehlike seviyesini gösterir: yeşil az, kırmızı çok. Sağdaki panelde Türkiye için canlı veri: şehir durum kartı, gözlemlenebilir asteroitler ve uzay istasyonu geçişleri. Şimdi en tehlikeli asteroidi yakın çekime alıyorum.',
    actions: [
      {
        delayS: 1.5,
        payload: {
          type: 'spotlight',
          selector: 'section.relative',
          label: 'Üç boyutlu Güneş Sistemi',
          zoom: 1.0,
        },
      },
      { delayS: 8, payload: { type: 'spotlight-clear' } },
      { delayS: 8.5, payload: { type: 'dashboard:focus-top-threat' } },
      {
        delayS: 14,
        payload: {
          type: 'turkey:cycle-cities',
          cities: [16, 34, 6, 35, 1],
          intervalMs: 3500,
        },
      },
    ],
  },
  {
    path: '/impact?preset=tr-tunguska-istanbul&view=map&demo=1',
    shortLabel: 'Çarpma Simülatörü',
    caption:
      'Şimdi en etkileyici kısma geldik: Çarpma Simülatörü. Burada Tunguska büyüklüğünde bir meteor İstanbul üzerine düşse ne olur diye baktık. Haritadaki turuncu halkalar etki bölgesini gösteriyor. En içteki tam yıkım, dışa doğru hasar azalır. Üst sağ köşede etkilenen şehir sayısı yazıyor.',
    actions: [
      {
        delayS: 6,
        payload: { type: 'impact:set-view', view: 'three' },
      },
      {
        delayS: 14,
        payload: { type: 'impact:set-view', view: 'map' },
      },
    ],
  },
  {
    path: '/sinematik?demo=1',
    shortLabel: 'Sinematik Tur',
    caption:
      'Sinematik tur, otuz saniyelik kısa bir kamera yolculuğu. Güneş\'in yanından başlar, gezegenleri geçer, sonra Dünya\'ya iner. Sağ üstteki Klip Kaydet düğmesine basarsanız video olarak telefonunuza iner. Sosyal medyada paylaşmaya uygun.',
  },
  {
    path: '/?demo=1',
    shortLabel: 'Kapanış',
    caption:
      'Tur burada bitti. QR kodunu telefonunuza okutursanız, sayfayı kendiniz gezebilirsiniz. Asteroitleri izlemek hepimizin işi. Bizi ziyaret ettiğiniz için teşekkürler.',
  },
];

export const DEMO_TTS_VOICE_SPEED = 1.12;
