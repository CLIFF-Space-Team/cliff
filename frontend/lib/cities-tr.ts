/**
 * Türkiye'nin 81 ilinin merkez koordinatları + tahmini nüfus.
 *
 * Plaka sırasında. Koordinatlar valilik/büyükşehir belediye merkezleri,
 * nüfuslar TÜİK 2023 ADNKS yıllık tahminlerinden yuvarlanmış.
 *
 * Etki simülasyonu, gözlem evi haritası ve şehir-bazlı risk kartı bu
 * tek listeden besleniyor.
 */

export interface TurkishCity {
  /** İl plaka kodu (1-81) */
  plate: number;
  /** İlin Türkçe adı */
  name: string;
  /** Bölge */
  region:
    | 'marmara'
    | 'ege'
    | 'akdeniz'
    | 'ic-anadolu'
    | 'karadeniz'
    | 'dogu-anadolu'
    | 'guneydogu-anadolu';
  /** Merkez enlem */
  lat: number;
  /** Merkez boylam */
  lng: number;
  /** Yaklaşık il nüfusu (milyon değil, kişi sayısı) */
  population: number;
  /** Büyükşehir belediyesi mi? */
  metropolitan: boolean;
}

export const TURKISH_CITIES: readonly TurkishCity[] = [
  { plate: 1, name: 'Adana', region: 'akdeniz', lat: 37.0, lng: 35.3213, population: 2270000, metropolitan: true },
  { plate: 2, name: 'Adıyaman', region: 'guneydogu-anadolu', lat: 37.7642, lng: 38.2766, population: 635000, metropolitan: false },
  { plate: 3, name: 'Afyonkarahisar', region: 'ege', lat: 38.7569, lng: 30.5388, population: 750000, metropolitan: false },
  { plate: 4, name: 'Ağrı', region: 'dogu-anadolu', lat: 39.7191, lng: 43.0503, population: 511000, metropolitan: false },
  { plate: 5, name: 'Amasya', region: 'karadeniz', lat: 40.6499, lng: 35.8353, population: 339000, metropolitan: false },
  { plate: 6, name: 'Ankara', region: 'ic-anadolu', lat: 39.9334, lng: 32.8597, population: 5800000, metropolitan: true },
  { plate: 7, name: 'Antalya', region: 'akdeniz', lat: 36.8841, lng: 30.7056, population: 2700000, metropolitan: true },
  { plate: 8, name: 'Artvin', region: 'karadeniz', lat: 41.1828, lng: 41.8183, population: 169000, metropolitan: false },
  { plate: 9, name: 'Aydın', region: 'ege', lat: 37.856, lng: 27.8416, population: 1150000, metropolitan: true },
  { plate: 10, name: 'Balıkesir', region: 'marmara', lat: 39.6484, lng: 27.8826, population: 1265000, metropolitan: true },
  { plate: 11, name: 'Bilecik', region: 'marmara', lat: 40.1451, lng: 29.9793, population: 230000, metropolitan: false },
  { plate: 12, name: 'Bingöl', region: 'dogu-anadolu', lat: 38.8855, lng: 40.4966, population: 285000, metropolitan: false },
  { plate: 13, name: 'Bitlis', region: 'dogu-anadolu', lat: 38.4006, lng: 42.1095, population: 354000, metropolitan: false },
  { plate: 14, name: 'Bolu', region: 'karadeniz', lat: 40.7395, lng: 31.6111, population: 320000, metropolitan: false },
  { plate: 15, name: 'Burdur', region: 'akdeniz', lat: 37.7203, lng: 30.2906, population: 274000, metropolitan: false },
  { plate: 16, name: 'Bursa', region: 'marmara', lat: 40.1828, lng: 29.0665, population: 3215000, metropolitan: true },
  { plate: 17, name: 'Çanakkale', region: 'marmara', lat: 40.1553, lng: 26.4142, population: 562000, metropolitan: false },
  { plate: 18, name: 'Çankırı', region: 'ic-anadolu', lat: 40.6013, lng: 33.6134, population: 196000, metropolitan: false },
  { plate: 19, name: 'Çorum', region: 'karadeniz', lat: 40.5506, lng: 34.9556, population: 530000, metropolitan: false },
  { plate: 20, name: 'Denizli', region: 'ege', lat: 37.7765, lng: 29.0864, population: 1080000, metropolitan: true },
  { plate: 21, name: 'Diyarbakır', region: 'guneydogu-anadolu', lat: 37.9144, lng: 40.2306, population: 1805000, metropolitan: true },
  { plate: 22, name: 'Edirne', region: 'marmara', lat: 41.6764, lng: 26.5557, population: 414000, metropolitan: false },
  { plate: 23, name: 'Elazığ', region: 'dogu-anadolu', lat: 38.681, lng: 39.2264, population: 595000, metropolitan: false },
  { plate: 24, name: 'Erzincan', region: 'dogu-anadolu', lat: 39.75, lng: 39.5, population: 240000, metropolitan: false },
  { plate: 25, name: 'Erzurum', region: 'dogu-anadolu', lat: 39.9043, lng: 41.2679, population: 750000, metropolitan: true },
  { plate: 26, name: 'Eskişehir', region: 'ic-anadolu', lat: 39.7767, lng: 30.5206, population: 910000, metropolitan: true },
  { plate: 27, name: 'Gaziantep', region: 'guneydogu-anadolu', lat: 37.0662, lng: 37.3833, population: 2150000, metropolitan: true },
  { plate: 28, name: 'Giresun', region: 'karadeniz', lat: 40.9128, lng: 38.3895, population: 450000, metropolitan: false },
  { plate: 29, name: 'Gümüşhane', region: 'karadeniz', lat: 40.4604, lng: 39.4814, population: 145000, metropolitan: false },
  { plate: 30, name: 'Hakkari', region: 'dogu-anadolu', lat: 37.5774, lng: 43.7361, population: 287000, metropolitan: false },
  { plate: 31, name: 'Hatay', region: 'akdeniz', lat: 36.4018, lng: 36.3498, population: 1660000, metropolitan: true },
  { plate: 32, name: 'Isparta', region: 'akdeniz', lat: 37.7626, lng: 30.5537, population: 444000, metropolitan: false },
  { plate: 33, name: 'Mersin', region: 'akdeniz', lat: 36.8121, lng: 34.6415, population: 1925000, metropolitan: true },
  { plate: 34, name: 'İstanbul', region: 'marmara', lat: 41.0082, lng: 28.9784, population: 15800000, metropolitan: true },
  { plate: 35, name: 'İzmir', region: 'ege', lat: 38.4192, lng: 27.1287, population: 4470000, metropolitan: true },
  { plate: 36, name: 'Kars', region: 'dogu-anadolu', lat: 40.6013, lng: 43.0975, population: 274000, metropolitan: false },
  { plate: 37, name: 'Kastamonu', region: 'karadeniz', lat: 41.3887, lng: 33.7827, population: 380000, metropolitan: false },
  { plate: 38, name: 'Kayseri', region: 'ic-anadolu', lat: 38.7312, lng: 35.4787, population: 1450000, metropolitan: true },
  { plate: 39, name: 'Kırklareli', region: 'marmara', lat: 41.7351, lng: 27.225, population: 369000, metropolitan: false },
  { plate: 40, name: 'Kırşehir', region: 'ic-anadolu', lat: 39.1425, lng: 34.1709, population: 245000, metropolitan: false },
  { plate: 41, name: 'Kocaeli', region: 'marmara', lat: 40.8533, lng: 29.8815, population: 2080000, metropolitan: true },
  { plate: 42, name: 'Konya', region: 'ic-anadolu', lat: 37.8714, lng: 32.4847, population: 2300000, metropolitan: true },
  { plate: 43, name: 'Kütahya', region: 'ege', lat: 39.4242, lng: 29.9833, population: 580000, metropolitan: false },
  { plate: 44, name: 'Malatya', region: 'dogu-anadolu', lat: 38.3552, lng: 38.3095, population: 813000, metropolitan: true },
  { plate: 45, name: 'Manisa', region: 'ege', lat: 38.6191, lng: 27.4289, population: 1470000, metropolitan: true },
  { plate: 46, name: 'Kahramanmaraş', region: 'akdeniz', lat: 37.5858, lng: 36.9371, population: 1180000, metropolitan: true },
  { plate: 47, name: 'Mardin', region: 'guneydogu-anadolu', lat: 37.3212, lng: 40.7245, population: 870000, metropolitan: true },
  { plate: 48, name: 'Muğla', region: 'ege', lat: 37.2153, lng: 28.3636, population: 1050000, metropolitan: true },
  { plate: 49, name: 'Muş', region: 'dogu-anadolu', lat: 38.7432, lng: 41.5065, population: 410000, metropolitan: false },
  { plate: 50, name: 'Nevşehir', region: 'ic-anadolu', lat: 38.6939, lng: 34.6857, population: 310000, metropolitan: false },
  { plate: 51, name: 'Niğde', region: 'ic-anadolu', lat: 37.9696, lng: 34.6797, population: 365000, metropolitan: false },
  { plate: 52, name: 'Ordu', region: 'karadeniz', lat: 40.9839, lng: 37.8764, population: 770000, metropolitan: true },
  { plate: 53, name: 'Rize', region: 'karadeniz', lat: 41.0201, lng: 40.5234, population: 348000, metropolitan: false },
  { plate: 54, name: 'Sakarya', region: 'marmara', lat: 40.7889, lng: 30.4053, population: 1080000, metropolitan: true },
  { plate: 55, name: 'Samsun', region: 'karadeniz', lat: 41.2867, lng: 36.33, population: 1370000, metropolitan: true },
  { plate: 56, name: 'Siirt', region: 'guneydogu-anadolu', lat: 37.9333, lng: 41.95, population: 335000, metropolitan: false },
  { plate: 57, name: 'Sinop', region: 'karadeniz', lat: 42.0231, lng: 35.1531, population: 222000, metropolitan: false },
  { plate: 58, name: 'Sivas', region: 'ic-anadolu', lat: 39.7477, lng: 37.0179, population: 638000, metropolitan: false },
  { plate: 59, name: 'Tekirdağ', region: 'marmara', lat: 40.9833, lng: 27.5167, population: 1170000, metropolitan: true },
  { plate: 60, name: 'Tokat', region: 'karadeniz', lat: 40.3167, lng: 36.5544, population: 600000, metropolitan: false },
  { plate: 61, name: 'Trabzon', region: 'karadeniz', lat: 41.0027, lng: 39.7168, population: 820000, metropolitan: true },
  { plate: 62, name: 'Tunceli', region: 'dogu-anadolu', lat: 39.1079, lng: 39.5401, population: 84000, metropolitan: false },
  { plate: 63, name: 'Şanlıurfa', region: 'guneydogu-anadolu', lat: 37.1591, lng: 38.7969, population: 2170000, metropolitan: true },
  { plate: 64, name: 'Uşak', region: 'ege', lat: 38.6823, lng: 29.4082, population: 375000, metropolitan: false },
  { plate: 65, name: 'Van', region: 'dogu-anadolu', lat: 38.4942, lng: 43.38, population: 1130000, metropolitan: true },
  { plate: 66, name: 'Yozgat', region: 'ic-anadolu', lat: 39.82, lng: 34.8083, population: 425000, metropolitan: false },
  { plate: 67, name: 'Zonguldak', region: 'karadeniz', lat: 41.4564, lng: 31.7987, population: 590000, metropolitan: false },
  { plate: 68, name: 'Aksaray', region: 'ic-anadolu', lat: 38.3686, lng: 34.029, population: 437000, metropolitan: false },
  { plate: 69, name: 'Bayburt', region: 'karadeniz', lat: 40.255, lng: 40.2249, population: 85000, metropolitan: false },
  { plate: 70, name: 'Karaman', region: 'ic-anadolu', lat: 37.1759, lng: 33.2287, population: 260000, metropolitan: false },
  { plate: 71, name: 'Kırıkkale', region: 'ic-anadolu', lat: 39.8468, lng: 33.5153, population: 285000, metropolitan: false },
  { plate: 72, name: 'Batman', region: 'guneydogu-anadolu', lat: 37.8812, lng: 41.1351, population: 645000, metropolitan: false },
  { plate: 73, name: 'Şırnak', region: 'guneydogu-anadolu', lat: 37.5164, lng: 42.4611, population: 570000, metropolitan: false },
  { plate: 74, name: 'Bartın', region: 'karadeniz', lat: 41.6358, lng: 32.3375, population: 205000, metropolitan: false },
  { plate: 75, name: 'Ardahan', region: 'dogu-anadolu', lat: 41.1105, lng: 42.7022, population: 92000, metropolitan: false },
  { plate: 76, name: 'Iğdır', region: 'dogu-anadolu', lat: 39.9237, lng: 44.045, population: 203000, metropolitan: false },
  { plate: 77, name: 'Yalova', region: 'marmara', lat: 40.65, lng: 29.2667, population: 297000, metropolitan: false },
  { plate: 78, name: 'Karabük', region: 'karadeniz', lat: 41.2061, lng: 32.6204, population: 252000, metropolitan: false },
  { plate: 79, name: 'Kilis', region: 'guneydogu-anadolu', lat: 36.7184, lng: 37.1212, population: 142000, metropolitan: false },
  { plate: 80, name: 'Osmaniye', region: 'akdeniz', lat: 37.0742, lng: 36.2462, population: 559000, metropolitan: false },
  { plate: 81, name: 'Düzce', region: 'karadeniz', lat: 40.8438, lng: 31.1565, population: 410000, metropolitan: false },
];

export const REGION_LABELS: Record<TurkishCity['region'], string> = {
  marmara: 'Marmara',
  ege: 'Ege',
  akdeniz: 'Akdeniz',
  'ic-anadolu': 'İç Anadolu',
  karadeniz: 'Karadeniz',
  'dogu-anadolu': 'Doğu Anadolu',
  'guneydogu-anadolu': 'Güneydoğu Anadolu',
};

/** Plaka koduna göre bul. */
export function findCityByPlate(plate: number): TurkishCity | undefined {
  return TURKISH_CITIES.find((c) => c.plate === plate);
}

/** Slug benzeri arama (tr lowercase + accents). */
export function findCityByName(name: string): TurkishCity | undefined {
  const norm = name.toLocaleLowerCase('tr-TR').trim();
  return TURKISH_CITIES.find((c) => c.name.toLocaleLowerCase('tr-TR') === norm);
}

/** Bir noktaya en yakın N şehir — etki yarıçapı uyarısı için. */
export function nearestCities(lat: number, lng: number, n = 3): TurkishCity[] {
  return [...TURKISH_CITIES]
    .map((c) => ({ city: c, d: haversineKm(c.lat, c.lng, lat, lng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.city);
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
