import type { ImpactInput } from './impact-physics';

/**
 * Hızlı "cisim" ön-ayarları — sandbox/eğlence amaçlı. Tarihsel preset'lerden
 * (impact-presets.ts) farklı: bunlar gerçek bir olay değil, "ne kadar büyük?"
 * sezgisi için boyut-temelli çabuk seçimler. Boyutlar gerçek sınıflara dayanır
 * ama isimler sezgiseldir (TÜBİTAK izleyicisi için). Backend dokunulmaz —
 * yalnızca yerel ImpactInput üretir.
 */
export interface QuickImpactor {
  id: string;
  /** Kısa, sezgisel ad. */
  name: string;
  emoji: string;
  /** Tek satırlık ölçek ipucu. */
  blurb: string;
  input: ImpactInput;
}

export const QUICK_IMPACTORS: QuickImpactor[] = [
  {
    id: 'house',
    name: 'Ev boyu',
    emoji: '🏠',
    blurb: '~10 m taşlı — atmosferde patlar (Çelyabinsk sınıfı)',
    input: {
      diameterM: 10,
      velocityKms: 17,
      angleDeg: 45,
      composition: 'stony',
      targetType: 'crystalline',
      impactAzimuthDeg: 90,
    },
  },
  {
    id: 'stadium',
    name: 'Stadyum',
    emoji: '🏟️',
    blurb: '~150 m taşlı — şehir ölçeğinde krater',
    input: {
      diameterM: 150,
      velocityKms: 20,
      angleDeg: 45,
      composition: 'stony',
      targetType: 'crystalline',
      impactAzimuthDeg: 90,
    },
  },
  {
    id: 'city-killer',
    name: 'Şehir-yıkıcı',
    emoji: '🏙️',
    blurb: '~500 m demir — atmosferi delip ağır krater',
    input: {
      diameterM: 500,
      velocityKms: 25,
      angleDeg: 50,
      composition: 'iron',
      targetType: 'crystalline',
      impactAzimuthDeg: 90,
    },
  },
  {
    id: 'dino-killer',
    name: 'Dinozor-katili',
    emoji: '🦖',
    blurb: '~10 km karbonlu — K-Pg sınıfı küresel felaket',
    input: {
      diameterM: 10000,
      velocityKms: 20,
      angleDeg: 60,
      composition: 'carbonaceous',
      targetType: 'crystalline',
      impactAzimuthDeg: 90,
    },
  },
  {
    id: 'comet',
    name: 'Kuyrukluyıldız',
    emoji: '☄️',
    blurb: '~1 km buzlu — çok hızlı, koma + kuyruk, hava patlaması',
    input: {
      diameterM: 1000,
      velocityKms: 51,
      angleDeg: 45,
      composition: 'icy',
      targetType: 'crystalline',
      impactAzimuthDeg: 90,
    },
  },
];

export function findImpactor(id: string | null): QuickImpactor | undefined {
  if (!id) return undefined;
  return QUICK_IMPACTORS.find((q) => q.id === id);
}
