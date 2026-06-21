/**
 * Per-category copy resolver.
 *
 * Builds the sidebar text — severity band, plain-language verdict,
 * scene legend bullets, AI prompt — based on the category code and the
 * event's primary metric. One pure function per category to keep
 * additions trivial.
 */

import type { EarthEvent } from '@/lib/earth-types';

import type { SeverityBand, SimulationCopy } from './types';

// ──────────────────────────────────────────────────────────────────
// Wildfires — area in km² (after normalizer's unit conversion).
// ──────────────────────────────────────────────────────────────────

const WILDFIRE_BANDS: SeverityBand[] = [
  { band: 'I',   range: '< 10 km²',     tr: 'Lokal yangın. İtfaiye müdahalesiyle saatler içinde kontrole alınabilir.' },
  { band: 'II',  range: '10 – 50 km²',  tr: 'Bölgesel yangın. Hava desteği gerektirir; köyler tahliye edilebilir.' },
  { band: 'III', range: '50 – 200 km²', tr: 'Büyük yangın. Geniş cephe, günler süren mücadele, yoğun duman dağılımı.' },
  { band: 'IV',  range: '200 – 1 000',  tr: 'Mega-yangın. Birden fazla cephe, ulusal seferberlik, uluslararası destek.' },
  { band: 'V',   range: '> 1 000 km²',  tr: 'Felaket boyutunda. Atmosferik etki, haftalar süren yanma, geniş tahliyeler.' },
];

const WILDFIRE_HISTORY = [
  { year: 2003, place: 'Avustralya — Black Christmas',  metricKm2: 16_000 },
  { year: 2018, place: 'California — Camp Fire',         metricKm2: 620 },
  { year: 2021, place: 'Türkiye — Manavgat',             metricKm2: 600 },
  { year: 2023, place: 'Kanada — McDougall Creek',       metricKm2: 12_000 },
  { year: 2024, place: 'Pantanal, Brezilya',              metricKm2: 32_000 },
];

function wildfireCopy(event: EarthEvent): SimulationCopy {
  const km2 = event.primary_metric?.value ?? null;
  const band = pickBand(WILDFIRE_BANDS, km2, [10, 50, 200, 1000]);
  const verdict = verdictByThresholds(km2, [10, 50, 200, 1000], [
    { tone: 'low' as const,      label: 'LOKAL' },
    { tone: 'moderate' as const, label: 'BÖLGESEL' },
    { tone: 'high' as const,     label: 'BÜYÜK' },
    { tone: 'high' as const,     label: 'MEGA-YANGIN' },
    { tone: 'critical' as const, label: 'FELAKET' },
  ]);
  const ref = closestNumeric(WILDFIRE_HISTORY, km2 ?? 0, (h) => h.metricKm2);

  return {
    verdictLabel: verdict.label,
    verdictTone: verdict.tone,
    band,
    historicalReference: ref
      ? { year: ref.year, place: ref.place, metric: `${ref.metricKm2.toLocaleString('tr-TR')} km²` }
      : undefined,
    legend: [
      'Alev parçacıkları rüzgâr yönüne göre sürüklenir.',
      'Duman bulutları yangının yoğun olduğu cepheden yukarı yükselir.',
      'Kömürleşmiş ağaçlar sönen bölgeyi gösterir; aktif cepheler kırmızı tonlardadır.',
      `Alanın yarıçapı ${km2 ? Math.sqrt(km2 / Math.PI).toFixed(1) : '?'} km olarak ölçeklenmiştir.`,
    ],
    aiPrompt:
      `${event.title} yangınını 4-6 cümleyle açıkla. ` +
      (km2 ? `Yaklaşık ${km2.toLocaleString('tr-TR')} km² alana yayılmış, ` : '') +
      `bu büyüklükte yangınlar genelde ne tür ekosistem hasarı yapar, ` +
      `iklim değişikliği bağlamında nasıl değerlendirilir, ` +
      `söndürmek için kaç gün gerekebilir? Sade ve eğitici bir Türkçe ile yaz.`,
  };
}

// ──────────────────────────────────────────────────────────────────
// Volcanoes — magnitude proxy (VEI 0..8).
// ──────────────────────────────────────────────────────────────────

const VOLCANO_BANDS: SeverityBand[] = [
  { band: 'VEI 0', range: 'efüzyon',  tr: 'Sakin lav akışı. Patlayıcı değil; ada/koni büyür.' },
  { band: 'VEI 1', range: 'hafif',    tr: 'Hafif strombolyen patlama. Yerel kül serpintisi.' },
  { band: 'VEI 2', range: 'orta',     tr: 'Orta düzey patlama. Plüm 1-5 km, bölgesel kül etkisi.' },
  { band: 'VEI 3', range: 'şiddetli', tr: 'Şiddetli patlama. Plüm 3-15 km, hava trafiği etkilenir.' },
  { band: 'VEI 4', range: 'felaketsel',tr: 'Felaketsel patlama. Plüm 10-25 km, tahliyeler, kıtasal kül.' },
  { band: 'VEI 5+',range: 'kıtasal',  tr: 'Süper-patlama. Stratosferik etki, küresel iklim sapması.' },
];

const VOLCANO_HISTORY = [
  { year: 2010, place: 'Eyjafjallajökull — İzlanda', metric: 4 },
  { year: 1991, place: 'Pinatubo — Filipinler',        metric: 6 },
  { year: 1980, place: 'Mount St. Helens — ABD',       metric: 5 },
  { year: 2022, place: 'Hunga Tonga',                  metric: 5 },
  { year: 2018, place: 'Kīlauea — Hawaii',             metric: 1 },
];

function volcanoCopy(event: EarthEvent): SimulationCopy {
  const vei = event.primary_metric?.value ?? null;
  const band = pickBand(VOLCANO_BANDS, vei, [0.5, 1.5, 2.5, 3.5, 4.5]);
  const verdict = verdictByThresholds(vei, [1, 2, 3, 4, 5], [
    { tone: 'low' as const,      label: 'EFÜZYON' },
    { tone: 'low' as const,      label: 'HAFİF' },
    { tone: 'moderate' as const, label: 'ORTA' },
    { tone: 'high' as const,     label: 'ŞİDDETLİ' },
    { tone: 'critical' as const, label: 'FELAKETSEL' },
    { tone: 'critical' as const, label: 'KIITASAL' },
  ]);
  const ref = closestNumeric(VOLCANO_HISTORY, vei ?? 0, (h) => h.metric);

  return {
    verdictLabel: verdict.label,
    verdictTone: verdict.tone,
    band,
    historicalReference: ref
      ? { year: ref.year, place: ref.place, metric: `VEI ${ref.metric}` }
      : undefined,
    legend: [
      'Koni yükseklik VEI proxy değerine göre ölçeklenir.',
      'Lav akışı koniden aşağı kırmızı/turuncu spline boyunca akar.',
      'Kül plümü stratosferik tabakaya doğru yükselir; rüzgâr yönüne savrulur.',
      'Plümün yoğunluğu patlayıcı sınıfıyla orantılıdır.',
    ],
    aiPrompt:
      `${event.title} volkanik aktivitesini 4-6 cümleyle açıkla. ` +
      (vei ? `Tahmini patlayıcılık ${vei.toFixed(1)} VEI civarında. ` : '') +
      `Bu büyüklükteki patlamalar genelde ne tür hava trafiği veya iklim ` +
      `etkisine yol açar, en yakın benzer tarihi olay hangisi, ` +
      `ölçek ve risk hakkında okuyucuyu bilgilendir. Türkçe yaz.`,
  };
}

// ──────────────────────────────────────────────────────────────────
// Severe Storms — Saffir-Simpson knots.
// ──────────────────────────────────────────────────────────────────

const STORM_BANDS: SeverityBand[] = [
  { band: 'Tropikal Depresyon', range: '< 34 kts',    tr: 'Düşük basınçlı sistem. Yağmur ve hafif rüzgâr.' },
  { band: 'Tropikal Fırtına',   range: '34 – 63 kts', tr: 'Adlandırılmış fırtına. Şiddetli yağış, kıyıda dalga.' },
  { band: 'Kategori 1',         range: '64 – 82 kts', tr: 'Hafif kasırga. Çatı hasarı, ağaç yıkılması, elektrik kesintileri.' },
  { band: 'Kategori 2',         range: '83 – 95 kts', tr: 'Orta kasırga. Geniş çatı hasarı, elektrik haftalarca gelmeyebilir.' },
  { band: 'Kategori 3',         range: '96 – 112 kts', tr: 'Büyük kasırga. Yapısal hasar, tahliye zorunlu kıyı bölgeleri.' },
  { band: 'Kategori 4',         range: '113 – 136 kts',tr: 'Aşırı kasırga. Çoğu konut çatısı kaybolur, ağaçlar kırılır.' },
  { band: 'Kategori 5',         range: '> 137 kts',    tr: 'Felaket kasırga. Toplu yıkım, aylar süren toparlanma.' },
];

const STORM_HISTORY = [
  { year: 2005, place: 'Katrina — ABD',            metric: 150 },
  { year: 2017, place: 'Maria — Porto Riko',       metric: 150 },
  { year: 2013, place: 'Haiyan — Filipinler',      metric: 170 },
  { year: 2019, place: 'Dorian — Bahamalar',       metric: 160 },
  { year: 2022, place: 'Ian — Florida',            metric: 135 },
];

function stormCopy(event: EarthEvent): SimulationCopy {
  const kts = event.primary_metric?.value ?? null;
  const band = pickBand(STORM_BANDS, kts, [34, 64, 83, 96, 113, 137]);
  const verdict = verdictByThresholds(kts, [34, 64, 96, 113, 137], [
    { tone: 'low' as const,      label: 'DEPRESYON' },
    { tone: 'moderate' as const, label: 'FIRTINA' },
    { tone: 'moderate' as const, label: 'KAT-1' },
    { tone: 'high' as const,     label: 'KAT-3' },
    { tone: 'high' as const,     label: 'KAT-4' },
    { tone: 'critical' as const, label: 'KAT-5' },
  ]);
  const ref = closestNumeric(STORM_HISTORY, kts ?? 0, (h) => h.metric);

  return {
    verdictLabel: verdict.label,
    verdictTone: verdict.tone,
    band,
    historicalReference: ref
      ? { year: ref.year, place: ref.place, metric: `${ref.metric} kts` }
      : undefined,
    legend: [
      'Spiral kollar siklon merkezi etrafında dönerek genişler.',
      'Göz (eye) merkezde sakin; göz duvarı (eyewall) en şiddetli rüzgârları taşır.',
      'Renk yoğunluğu rüzgâr hızına göre ölçeklenir; yağmur partikülleri spirali takip eder.',
      'Kategori, Saffir-Simpson knot eşikleriyle hesaplanır.',
    ],
    aiPrompt:
      `${event.title} fırtınasını 4-6 cümleyle açıkla. ` +
      (kts ? `Maks rüzgâr ${kts.toFixed(0)} knot (${(kts * 1.852).toFixed(0)} km/h). ` : '') +
      `Saffir-Simpson kategorisinin anlamı, kıyı taşkını riski, ` +
      `benzer büyüklükteki bir tarihi fırtına ve hazırlık önerileri. Türkçe yaz.`,
  };
}

// ──────────────────────────────────────────────────────────────────
// Floods — affected area km² (proxy if no data).
// ──────────────────────────────────────────────────────────────────

const FLOOD_BANDS: SeverityBand[] = [
  { band: 'I',  range: '< 10 km²',     tr: 'Lokal taşkın. Düşük arazide kısa süreli su birikmesi.' },
  { band: 'II', range: '10 – 100 km²', tr: 'Bölgesel sel. Yollar kapanır, alt katlar su altında.' },
  { band: 'III',range: '100 – 500 km²',tr: 'Büyük sel. Çoklu yerleşim alanı etkilenir, tahliyeler.' },
  { band: 'IV', range: '500 – 2 000',  tr: 'Kıyı/havza ölçeğinde sel. Köprüler, altyapı, tarım.' },
  { band: 'V',  range: '> 2 000 km²',  tr: 'Mega-sel. Bölgesel kriz, uzun toparlanma, tarımsal felaket.' },
];

const FLOOD_HISTORY = [
  { year: 2010, place: 'Pakistan (Indus Vadisi)', metric: 38_000 },
  { year: 2022, place: 'Pakistan',                 metric: 75_000 },
  { year: 2021, place: 'Almanya/Belçika',          metric: 1_200 },
  { year: 2023, place: 'Libya — Derna',            metric: 200 },
  { year: 2024, place: 'Brezilya — Rio Grande',    metric: 12_000 },
];

function floodCopy(event: EarthEvent): SimulationCopy {
  const km2 = event.primary_metric?.value ?? null;
  const band = pickBand(FLOOD_BANDS, km2, [10, 100, 500, 2000]);
  const verdict = verdictByThresholds(km2, [10, 100, 500, 2000], [
    { tone: 'low' as const,      label: 'LOKAL' },
    { tone: 'moderate' as const, label: 'BÖLGESEL' },
    { tone: 'high' as const,     label: 'BÜYÜK' },
    { tone: 'high' as const,     label: 'KIYI/HAVZA' },
    { tone: 'critical' as const, label: 'MEGA-SEL' },
  ]);
  const ref = closestNumeric(FLOOD_HISTORY, km2 ?? 0, (h) => h.metric);

  return {
    verdictLabel: verdict.label,
    verdictTone: verdict.tone,
    band,
    historicalReference: ref
      ? { year: ref.year, place: ref.place, metric: `${ref.metric.toLocaleString('tr-TR')} km²` }
      : undefined,
    legend: [
      'Su seviyesi metrik veriye göre kademeli yükselir.',
      'Yağmur partikülleri zemin yağışını temsil eder; dalgalar sürekli akış gösterir.',
      'Yapılar batma yüksekliğine göre yarı/tam su altında kalır.',
      'Renk değişimi su yoğunluğunu (toprak karışımı) gösterir.',
    ],
    aiPrompt:
      `${event.title} sel olayını 4-6 cümleyle açıkla. ` +
      (km2 ? `Etkilenen alan yaklaşık ${km2.toLocaleString('tr-TR')} km². ` : '') +
      `Sel hangi tür hasarlara yol açar, iklim değişikliğiyle ilişkisi nedir, ` +
      `tarihi bir benzeriyle karşılaştır. Türkçe yaz.`,
  };
}

// ──────────────────────────────────────────────────────────────────
// Earthquakes (TR + global) — Mw scale.
// ──────────────────────────────────────────────────────────────────

const QUAKE_BANDS: SeverityBand[] = [
  { band: 'I-III',   range: 'M < 4',     tr: 'Hissedilmez veya çok hafif. Cisimler hareket etmez.' },
  { band: 'IV',      range: 'M 4 – 4.9', tr: 'Hafif. İçeride hissedilir, eşyalar tıkırdar.' },
  { band: 'V-VI',    range: 'M 5 – 5.9', tr: 'Orta. Çoğunluk hisseder, raflardan eşya düşer.' },
  { band: 'VII',     range: 'M 6 – 6.4', tr: 'Kuvvetli. Standart yapılarda hafif hasar.' },
  { band: 'VIII',    range: 'M 6.5 – 6.9',tr: 'Çok kuvvetli. Zayıf yapılarda ciddi hasar.' },
  { band: 'IX-X',    range: 'M 7 – 7.9', tr: 'Yıkıcı. Modern binalarda da hasar, yapı çökmeleri.' },
  { band: 'XI-XII',  range: 'M 8+',      tr: 'Felaket. Geniş alanda toplam yıkım.' },
];

const QUAKE_HISTORY = [
  { year: 2011, place: 'Tōhoku, Japonya',  metric: 9.1 },
  { year: 2010, place: 'Şili (Maule)',      metric: 8.8 },
  { year: 2023, place: 'Kahramanmaraş',     metric: 7.8 },
  { year: 1999, place: 'İzmit',             metric: 7.6 },
  { year: 1995, place: 'Kobe',              metric: 6.9 },
  { year: 1989, place: 'Loma Prieta',       metric: 6.9 },
];

function quakeCopy(event: EarthEvent): SimulationCopy {
  const mw = event.primary_metric?.value ?? null;
  const band = pickBand(QUAKE_BANDS, mw, [4, 5, 6, 6.5, 7, 8]);
  const verdict = verdictByThresholds(mw, [4, 5, 6, 7], [
    { tone: 'low' as const,      label: 'HAFİF' },
    { tone: 'moderate' as const, label: 'ORTA' },
    { tone: 'moderate' as const, label: 'KUVVETLİ' },
    { tone: 'high' as const,     label: 'YIKICI' },
    { tone: 'critical' as const, label: 'FELAKET' },
  ]);
  const ref = closestNumeric(QUAKE_HISTORY, mw ?? 0, (h) => h.metric);

  return {
    verdictLabel: verdict.label,
    verdictTone: verdict.tone,
    band,
    historicalReference: ref
      ? { year: ref.year, place: ref.place, metric: `M${ref.metric.toFixed(1)}` }
      : undefined,
    legend: [
      'P-dalgası önce, S-dalgası sonra gelir; binalar yan-yana sallanır.',
      'Yüksek binalar daha geç tepki verir (rezonans).',
      'Magnitüde göre çökme olasılığı hesaplanır.',
      'Mercalli bandı yüzeydeki hissedilen şiddet için tahmindir.',
    ],
    aiPrompt:
      `${event.title} depremini 4-6 cümleyle açıkla. ` +
      (mw ? `M${mw.toFixed(1)} büyüklüğünde. ` : '') +
      `Bu büyüklük genelde ne yapar, bölgenin fay sistemine kısaca değin, ` +
      `benzer tarihi bir olayla karşılaştır. Sade ve eğitici Türkçe.`,
  };
}

// ──────────────────────────────────────────────────────────────────
// Generic fallback for the long-tail categories (drought, dustHaze,
// snow, seaLakeIce, landslides, manmade, waterColor, tempExtremes).
// ──────────────────────────────────────────────────────────────────

function genericCopy(event: EarthEvent): SimulationCopy {
  const tone = (
    {
      critical: 'critical',
      high: 'high',
      moderate: 'moderate',
      low: 'low',
      info: 'info',
    } as const
  )[event.severity];
  const label = (
    {
      critical: 'KRİTİK',
      high: 'YÜKSEK',
      moderate: 'ORTA',
      low: 'DÜŞÜK',
      info: 'BİLGİ',
    } as const
  )[event.severity];

  return {
    verdictLabel: label,
    verdictTone: tone,
    legend: [
      'Olay konumu yakınlaştırılmış uydu görüntüsü üstünde işaretlenir.',
      'Kırmızı/turuncu nabız etkilenen alanın kapsama yarıçapını gösterir.',
      'Animasyonlu radyal dalgalanma olayın güncelliğini temsil eder.',
      'Sağdaki bilim kartı ölçek ve süreyi açıklar.',
    ],
    aiPrompt:
      `${event.title} olayını 4-6 cümleyle açıkla. ` +
      `Olayın kategorisi: ${event.category}. ` +
      `Bu tür olayların genelde nasıl ölçüldüğünü, hangi etkilere yol açtığını ` +
      `ve okuyucu için ne anlam taşıdığını sade Türkçe ile anlat.`,
  };
}

// ──────────────────────────────────────────────────────────────────
// Resolver
// ──────────────────────────────────────────────────────────────────

export function buildCopy(event: EarthEvent): SimulationCopy {
  switch (event.category) {
    case 'wildfires':
      return wildfireCopy(event);
    case 'volcanoes':
      return volcanoCopy(event);
    case 'severeStorms':
      return stormCopy(event);
    case 'floods':
      return floodCopy(event);
    case 'earthquakes':
    case 'earthquakes-tr':
      return quakeCopy(event);
    default:
      return genericCopy(event);
  }
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

function pickBand(
  bands: SeverityBand[],
  value: number | null,
  thresholds: number[],
): SeverityBand | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  let idx = 0;
  for (let i = 0; i < thresholds.length; i++) {
    const t = thresholds[i];
    if (t === undefined) continue;
    if (value >= t) idx = i + 1;
  }
  return bands[Math.min(idx, bands.length - 1)];
}

function verdictByThresholds<T>(
  value: number | null,
  thresholds: number[],
  verdicts: T[],
): T {
  if (value == null) return verdicts[0] as T;
  let idx = 0;
  for (let i = 0; i < thresholds.length; i++) {
    const t = thresholds[i];
    if (t === undefined) continue;
    if (value >= t) idx = i + 1;
  }
  const last = verdicts[verdicts.length - 1];
  return (verdicts[Math.min(idx, verdicts.length - 1)] ?? last) as T;
}

function closestNumeric<T>(
  list: T[],
  target: number,
  pick: (item: T) => number,
): T | undefined {
  if (list.length === 0) return undefined;
  return list.slice().sort((a, b) => Math.abs(pick(a) - target) - Math.abs(pick(b) - target))[0];
}
