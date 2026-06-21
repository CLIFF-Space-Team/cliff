import type { ImpactInput } from './impact-physics';

export type ImpactPresetKind = 'historical' | 'active_neo';

export interface ImpactPreset {
  id: string;
  name: string;
  subtitle: string;
  era: string;
  context: string;
  input: ImpactInput;
  kind: ImpactPresetKind;
  source: string;
  last_updated: string | null;
}

export interface ImpactPresetsResponse {
  items: ImpactPreset[];
  fetched_at: string;
  source: string;
}

/** Default preset id selected on page load. */
export const DEFAULT_PRESET_ID = 'apophis';

/**
 * Fallback input used while the live preset list is loading. Mirrors the
 * Apophis default sent by the backend so the simulator can render a sensible
 * scene immediately on cold mount; gets replaced as soon as `useImpactPresets`
 * resolves.
 */
export const FALLBACK_INPUT: ImpactInput = {
  diameterM: 370,
  velocityKms: 12.6,
  angleDeg: 45,
  composition: 'stony',
  targetType: 'crystalline',
  impactAzimuthDeg: 90,
};

export function findPreset(
  presets: ImpactPreset[] | undefined,
  id: string | null,
): ImpactPreset | undefined {
  if (!presets || !id) return undefined;
  return presets.find((p) => p.id === id);
}

/**
 * Türkiye'ye yatık ön-tanımlı senaryolar — etkinlikte "Çelyabinsk Ankara'ya
 * gelse" gibi yerel bağlamla ders verecek presetler. Frontend'e gömülü;
 * backend'in `useImpactPresets` listesi ile birleştirilerek gösterilir.
 *
 * Tüm input'lar tarihsel olayların gerçek değerlerinden türetilmiş — yalnızca
 * çarpma konumu Türkiye şehirleridir. Görsel ve eğitsel; gerçek tehdit
 * göstergesi değildir.
 */
export const LOCAL_TR_PRESETS: ImpactPreset[] = [
  {
    id: 'tr-chelyabinsk-ankara',
    name: 'Çelyabinsk Ankara\'ya Gelse',
    subtitle: '20 m taşlı meteoroit · 19 km/s · 18°',
    era: '15 Şubat 2013 senaryosu',
    context:
      '2013\'te Rusya Çelyabinsk üzerinde patlayan meteorun aynısının Ankara semalarında patlaması durumu. ~30 km irtifada hava patlaması, ~7000 binanın penceresi kırılır.',
    input: {
      diameterM: 20,
      velocityKms: 19,
      angleDeg: 18,
      composition: 'stony',
      targetType: 'crystalline',
      impactAzimuthDeg: 90,
    },
    kind: 'historical',
    source: 'Tarihsel olay (Çelyabinsk 2013) · Ankara konumu',
    last_updated: null,
  },
  {
    id: 'tr-tunguska-istanbul',
    name: 'Tunguska İstanbul\'a Gelse',
    subtitle: '60 m taşlı meteoroit · 27 km/s · 30°',
    era: '30 Haziran 1908 senaryosu',
    context:
      '1908\'de Sibirya\'da 2000 km² ormanı yıkan Tunguska olayı. Aynı meteor İstanbul üstünde patlasaydı Marmara çevresinde camlar kırılır, geniş yangınlar başlardı.',
    input: {
      diameterM: 60,
      velocityKms: 27,
      angleDeg: 30,
      composition: 'stony',
      targetType: 'crystalline',
      impactAzimuthDeg: 135,
    },
    kind: 'historical',
    source: 'Tarihsel olay (Tunguska 1908) · İstanbul konumu',
    last_updated: null,
  },
  {
    id: 'tr-hoba-adana',
    name: 'Hoba Adana\'ya Düşse',
    subtitle: '2.7 m demir meteoriti · 10 km/s · 60°',
    era: 'Tarihsel-yapay senaryo',
    context:
      'Namibya\'da bulunan Hoba (Dünya\'nın en büyük tek meteoriti, 60 ton) boyutunda demir bir cisim. Atmosferi delip yere ulaşır, küçük bir krater açar.',
    input: {
      diameterM: 2.7,
      velocityKms: 10,
      angleDeg: 60,
      composition: 'iron',
      targetType: 'sedimentary',
      impactAzimuthDeg: 90,
    },
    kind: 'historical',
    source: 'Hoba meteoriti (Namibya) · Adana konumu',
    last_updated: null,
  },
  {
    id: 'tr-apophis-izmir',
    name: 'Apophis İzmir Körfezi\'ne',
    subtitle: '370 m taşlı NEO · 12.6 km/s · 45°',
    era: 'Tarihsel-yapay (Apophis gerçekte gelmeyecek)',
    context:
      'Apophis 13 Nisan 2029\'da Dünya\'ya 32.000 km mesafeden geçecek; çarpmayacak. Hipotetik olarak körfeze düşmesi tsunami senaryosu olur — Çeşme ve Karaburun yarımadası riskli.',
    input: {
      diameterM: 370,
      velocityKms: 12.6,
      angleDeg: 45,
      composition: 'stony',
      targetType: 'water',
      impactAzimuthDeg: 270,
    },
    kind: 'active_neo',
    source: 'NASA JPL · 99942 Apophis',
    last_updated: null,
  },
];

/**
 * Türkiye preset id'sinden hedef koordinat çıkar. Preset'ler kendi
 * şehirlerine sabitlenmiştir (Çelyabinsk-Ankara → Ankara koordinatı).
 */
export const TR_PRESET_TARGETS: Record<string, { lat: number; lng: number }> = {
  'tr-chelyabinsk-ankara': { lat: 39.9334, lng: 32.8597 },
  'tr-tunguska-istanbul': { lat: 41.0082, lng: 28.9784 },
  'tr-hoba-adana': { lat: 37.0, lng: 35.3213 },
  'tr-apophis-izmir': { lat: 38.4192, lng: 27.1287 },
};
