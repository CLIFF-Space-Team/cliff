/**
 * 15 Şubat 2013 Çelyabinsk meteor olayı — yeniden yaşatma için veri.
 *
 * Olay: ~20 m'lik taşlı meteoroit Rusya Çelyabinsk üzerinde atmosfere girdi,
 * ~30 km irtifada parçalandı. Açığa çıkan ~440 kt enerji ~30 Hiroşima
 * bombasına eşdeğer. Şokdalgası 7300 binanın penceresini kırdı, ~1500 kişi
 * yaralandı (çoğu cam kesiği).
 *
 * Tüm veriler kamuya açık akademik raporlardan ve resmi kayıtlardan
 * alınmıştır. Saatler UTC, koordinatlar WGS84.
 */

export interface ChelyabinskFrame {
  /** Saniye, t=0 atmosfere giriş anı (95 km irtifa). */
  t: number;
  /** Anlatım — Türkçe, kısa cümle (max ~80 char). */
  text: string;
  /** Yükseklik (km), 95 → 0. */
  altitudeKm: number;
  /** Görsel parlaklık (mutlak görsel magnitude, daha düşük = daha parlak).
   *  -27 ≈ Güneş kadar parlak. */
  visualMagnitude: number;
  /** Faz tipi — UI'da renk/ikon değişir. */
  phase: 'entry' | 'peak' | 'breakup' | 'shockwave' | 'damage' | 'aftermath';
  /** Şokdalgası yarıçapı km — sıfırsa henüz yer seviyesinde değil. */
  shockwaveRadiusKm: number;
}

export const CHELYABINSK_LOCATION = {
  /** Olayın merkezi — 54.83°N, 61.18°E, Çelyabinsk şehrinin yakınında. */
  lat: 54.83,
  lng: 61.18,
  city: 'Çelyabinsk',
  country: 'Rusya',
  date: '2013-02-15T03:20:33Z',
  /** Patlama yüksekliği (km). */
  burstAltitudeKm: 29.7,
};

export const CHELYABINSK_PHYSICS = {
  diameterM: 20,
  velocityKms: 19,
  angleDeg: 18,
  composition: 'stony' as const,
  massKg: 1.2e7, // ~12000 ton
  energyKt: 440,
  energyMt: 0.44,
  hiroshimaEquivalents: 30,
  peakBrightness: '-27.7 (Güneş kadar)',
};

export const CHELYABINSK_DAMAGE = {
  buildingsDamaged: 7320,
  injured: 1491,
  fatalities: 0,
  /** Cam kırılması yarıçapı (km, 1 psi sınırı). */
  glassBreakageRadiusKm: 80,
  /** Toplam yaralı bölgesi km². */
  affectedAreaKm2: 8400,
};

/**
 * 40 saniyelik dakika-bazlı timeline. Drag-to-scrub veya autoplay ile
 * kullanılır. Frame'ler arası interpolasyon UI tarafında yapılır.
 */
export const CHELYABINSK_TIMELINE: ChelyabinskFrame[] = [
  {
    t: 0,
    text: 'T-0: Meteoroit atmosfere giriyor (95 km irtifa, 19 km/s)',
    altitudeKm: 95,
    visualMagnitude: -3,
    phase: 'entry',
    shockwaveRadiusKm: 0,
  },
  {
    t: 6,
    text: 'T+6sn: Atmosfer sürtünmesi artıyor, parlaklık görünür hale geliyor',
    altitudeKm: 65,
    visualMagnitude: -10,
    phase: 'entry',
    shockwaveRadiusKm: 0,
  },
  {
    t: 13,
    text: 'T+13sn: Maksimum parlaklık — Güneş\'ten parlak, gündüz gölge oluşturuyor',
    altitudeKm: 45,
    visualMagnitude: -27.7,
    phase: 'peak',
    shockwaveRadiusKm: 0,
  },
  {
    t: 19,
    text: 'T+19sn: Hava patlaması başlıyor, meteor parçalanmaya başladı',
    altitudeKm: 35,
    visualMagnitude: -25,
    phase: 'breakup',
    shockwaveRadiusKm: 0,
  },
  {
    t: 22,
    text: 'T+22sn: Asıl patlama — 30 km irtifada 440 kt enerji açığa çıktı',
    altitudeKm: 30,
    visualMagnitude: -28,
    phase: 'breakup',
    shockwaveRadiusKm: 0,
  },
  {
    t: 30,
    text: 'T+30sn: Şokdalgası yere doğru iniyor, ses henüz duyulmadı',
    altitudeKm: 30,
    visualMagnitude: -10,
    phase: 'shockwave',
    shockwaveRadiusKm: 5,
  },
  {
    t: 90,
    text: 'T+1.5dk: İlk şokdalgası şehir merkezine ulaştı, camlar titremeye başladı',
    altitudeKm: 30,
    visualMagnitude: 0,
    phase: 'shockwave',
    shockwaveRadiusKm: 30,
  },
  {
    t: 130,
    text: 'T+2dk: Cam kırılması peak — binlerce pencere aynı anda kırıldı',
    altitudeKm: 30,
    visualMagnitude: 0,
    phase: 'damage',
    shockwaveRadiusKm: 60,
  },
  {
    t: 200,
    text: 'T+3.3dk: Şokdalgası 80 km yarıçapa ulaştı, cam hasarı tamamlandı',
    altitudeKm: 30,
    visualMagnitude: 0,
    phase: 'damage',
    shockwaveRadiusKm: 80,
  },
  {
    t: 300,
    text: 'T+5dk: Yaralılar hastanelere taşınmaya başladı; 1491 kişi tedavi gördü',
    altitudeKm: 30,
    visualMagnitude: 0,
    phase: 'aftermath',
    shockwaveRadiusKm: 80,
  },
];

/** Toplam timeline süresi (saniye). */
export const CHELYABINSK_DURATION_S = 300;

/**
 * Timeline'ı belirli bir t değerine göre interpoler — UI animasyonu için
 * frame'ler arasında yumuşak değer akışı sağlar.
 */
export function interpolateChelyabinskFrame(t: number): ChelyabinskFrame {
  const clamped = Math.max(0, Math.min(CHELYABINSK_DURATION_S, t));
  const frames = CHELYABINSK_TIMELINE;
  // Eşleşen ya da öncekini bul
  let prev = frames[0]!;
  let next = frames[frames.length - 1]!;
  for (let i = 0; i < frames.length - 1; i += 1) {
    const a = frames[i]!;
    const b = frames[i + 1]!;
    if (clamped >= a.t && clamped <= b.t) {
      prev = a;
      next = b;
      break;
    }
  }
  if (prev === next || prev.t === next.t) return prev;
  const ratio = (clamped - prev.t) / (next.t - prev.t);
  // Mix sayısal alanlar; metinsel alanlar yakın frame'den
  return {
    t: clamped,
    text: prev.text,
    altitudeKm: prev.altitudeKm + (next.altitudeKm - prev.altitudeKm) * ratio,
    visualMagnitude:
      prev.visualMagnitude +
      (next.visualMagnitude - prev.visualMagnitude) * ratio,
    phase: prev.phase,
    shockwaveRadiusKm:
      prev.shockwaveRadiusKm +
      (next.shockwaveRadiusKm - prev.shockwaveRadiusKm) * ratio,
  };
}
