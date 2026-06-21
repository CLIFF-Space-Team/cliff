/**
 * Per-preset cinematic narration scripts.
 *
 * Each entry is a list of { startProgress (0..1), text } captions that the
 * NarrationOverlay reveals in sync with the timeline. The visualization also
 * reads `effects` to enable scene props (city / forest / atmospheric blanket).
 */

export type SceneEffect =
  | 'city' // Small cubes near impact; collapse when shockwave reaches
  | 'forest' // Radial fallen-tree pattern (Tunguska)
  | 'atmospheric_blanket' // Earth-wide dust haze (Chicxulub)
  | 'glass_shatter' // White flash radial crack pattern (Chelyabinsk)
  | 'mega_dust'; // Large rising dust column (giant impacts)

export interface NarrationCaption {
  /** 0..1 timeline cursor at which this caption appears. */
  start: number;
  /** Up to ~140 chars; keep punchy and operational. */
  text: string;
}

export interface NarrativeScript {
  /** Required: narration captions in timeline order. */
  captions: NarrationCaption[];
  /** Scene effects to enable for this preset. */
  effects: SceneEffect[];
  /** Optional: override generic phase labels with event-specific ones. */
  phaseLabels?: { [progress: number]: string };
}

export const NARRATIVES: Record<string, NarrativeScript> = {
  chelyabinsk: {
    effects: ['city', 'glass_shatter'],
    captions: [
      { start: 0.0, text: '15 Şubat 2013, 03:20 UTC. Çelyabinsk semalarına yaklaşan ~20 m taşlı bir cisim.' },
      { start: 0.45, text: 'Atmosfere 19 km/s hızla, 18° sığ açıyla giriş. Plazma alevi 30 km görünür.' },
      { start: 0.62, text: '29.7 km irtifada infilak. ~440 kt enerji — 30 Hiroşima.' },
      { start: 0.72, text: 'Şok dalgası 90 saniye sonra yere ulaşır. 7300 bina hasar gördü.' },
      { start: 0.85, text: '~1500 yaralı, çoğu kırılan camlardan. Yer çarpışması yok.' },
    ],
  },
  tunguska: {
    effects: ['forest'],
    captions: [
      { start: 0.0, text: '30 Haziran 1908, sabah saat 07:17. Sibirya, Podkamennaya Tunguska Nehri.' },
      { start: 0.4, text: '~60 m taşlı/buzul cisim, 27 km/s. Atmosfere 30° açıyla dalış.' },
      { start: 0.62, text: '5–10 km irtifada infilak. ~12 Mt enerji — Hiroşima\'nın 800 katı.' },
      { start: 0.7, text: 'Kelebek deseni: 2150 km² orman düz yatırıldı, 80 milyon ağaç.' },
      { start: 0.88, text: 'Krater yok. Şehir vurmadığı için kayıp neredeyse sıfır.' },
    ],
  },
  apophis: {
    effects: ['city', 'mega_dust'],
    captions: [
      { start: 0.0, text: '99942 Apophis — 13 Nisan 2029 yaklaşımı. Hipotetik temas senaryosu.' },
      { start: 0.4, text: '370 m S-tipi silikat, 12.6 km/s. Atmosferi neredeyse hiç yavaşlatamaz.' },
      { start: 0.62, text: 'Yer çarpması: ~750 Mt eşdeğeri. 50.000 Hiroşima.' },
      { start: 0.7, text: '5+ km krater, 50 km termal yarıçap. Şehir ölçeğinde silinme.' },
      { start: 0.88, text: 'Sismik M7+, 100 km yarıçapta yapısal çöküş. Bölgesel felaket.' },
    ],
  },
  bennu: {
    effects: ['city', 'mega_dust'],
    captions: [
      { start: 0.0, text: '101955 Bennu — OSIRIS-REx hedefi. 2182\'de %0.04 çarpma riski.' },
      { start: 0.4, text: '490 m C-tipi rubble pile. 7 km/s — yavaş ama kütle 7 × 10¹⁰ kg.' },
      { start: 0.62, text: '~1200 Mt enerji. Apophis\'ten ağır.' },
      { start: 0.78, text: '6+ km krater, atmosfere milyarlarca ton toz.' },
      { start: 0.9, text: 'İklimsel etki: aylarca güneş ışığı azalması, mahsul kıtlığı.' },
    ],
  },
  'meteor-crater': {
    effects: [],
    captions: [
      { start: 0.0, text: 'Arizona, Meteor Crater. Yaklaşık 50.000 yıl önce.' },
      { start: 0.4, text: '50 m demir-nikel cisim, 12 km/s, 45°. Atmosferi delip geçer.' },
      { start: 0.62, text: 'Yer çarpması: ~10 Mt enerji.' },
      { start: 0.78, text: '1.2 km çaplı, 170 m derinlikte krater. Hâlâ ayakta.' },
      { start: 0.9, text: 'O dönemde insan nüfusu azdı. Bugün benzer çarpma → şehir yıkımı.' },
    ],
  },
  chicxulub: {
    effects: ['mega_dust', 'atmospheric_blanket'],
    captions: [
      { start: 0.0, text: '66 milyon yıl önce. Yucatán Yarımadası, Geç Kretase.' },
      { start: 0.35, text: '10 km karbonlu cisim, 20 km/s, 60°. Atmosfer hiçbir şey değil.' },
      { start: 0.62, text: 'Çarpma: ~100 milyon Mt — 7 milyar Hiroşima.' },
      { start: 0.7, text: '180 km krater. Tsunami 100+ m. Küresel ateş yağmuru.' },
      { start: 0.85, text: 'Atmosfer kararır. Fotosentez yıllarca durur. K-Pg yok oluşu.' },
      { start: 0.95, text: 'Dinozor çağı sona erer. Memeliler yükselişe geçer.' },
    ],
  },
  // ── Türkiye senaryoları (yerel preset'ler) ──
  // Demir küçük cisim + su/tsunami senaryosu ödünç anlatımlara uymaz
  // (meteor-crater 50 m/1.2 km krater der, apophis kara çarpması der),
  // bu yüzden bunlara özel doğru anlatım.
  'tr-hoba-adana': {
    effects: [],
    captions: [
      { start: 0.0, text: 'Hoba senaryosu — dünyanın en büyük tek meteoriti boyutunda demir bir cisim, bu kez Adana üzerinde.' },
      { start: 0.4, text: '~2.7 m demir-nikel kütle, 10 km/s, 60° dik iniş. Demir yoğunluğu atmosferi delip geçmesini sağlar.' },
      { start: 0.62, text: 'Yüzeye temas. Düşük hız ve küçük kütle → mütevazı enerji, ama tamamen yerel.' },
      { start: 0.78, text: 'Onlarca metre çaplı bir çarpma çukuru. Yapısal hasar birkaç yüz metreyle sınırlı.' },
      { start: 0.9, text: 'Hava patlaması yok; enerji noktasal. Geniş alan etkisi minimal — yerel bir olay.' },
    ],
  },
  'tr-apophis-izmir': {
    effects: ['mega_dust'],
    captions: [
      { start: 0.0, text: '99942 Apophis büyüklüğünde bir cisim — hipotetik olarak İzmir Körfezi\'ne.' },
      { start: 0.4, text: '370 m S-tipi silikat, 12.6 km/s, 45°. Atmosfer onu kayda değer yavaşlatamaz.' },
      { start: 0.62, text: 'Su yüzeyine çarpma. Dev bir su sütunu ve buhar bulutu yükselir.' },
      { start: 0.75, text: 'Halkasal tsunami dalgaları kıyıya yürür — Çeşme ve Karaburun yarımadası ilk hat.' },
      { start: 0.9, text: 'Kıyı şeridi boyunca sular basar; iç kesimler sismik sarsıntı hisseder.' },
    ],
  },
};

/**
 * Yerel TR preset id'lerini birebir aynı olayın bare narration anahtarına
 * eşler. Yalnızca temiz tarihsel eşleşmeler için — bileşim/hedef farkı olan
 * hoba (demir) ve apophis-izmir (su) NARRATIVES'te kendi girdilerine sahip.
 */
const TR_PRESET_NARRATIVE_ALIASES: Record<string, string> = {
  'tr-chelyabinsk-ankara': 'chelyabinsk',
  'tr-tunguska-istanbul': 'tunguska',
};

export const DEFAULT_NARRATIVE: NarrativeScript = {
  effects: ['city'],
  captions: [
    { start: 0.0, text: 'Asteroidin yörünge kesişimi. Atmosfere yaklaşıyor.' },
    { start: 0.45, text: 'Atmosfer girişi. Plazma kuyruğu oluşuyor.' },
    { start: 0.62, text: 'Çarpma anı. Enerji bir anda salınıyor.' },
    { start: 0.7, text: 'Ateş topu yükseliyor. Şok dalgası yayılıyor.' },
    { start: 0.85, text: 'Hasar zone\'ları yerleşiyor.' },
  ],
};

export function getNarrative(presetId: string | null | undefined): NarrativeScript {
  if (!presetId) return DEFAULT_NARRATIVE;
  // Önce doğrudan (bare event id + özel TR girdileri), sonra alias, sonra default.
  const direct = NARRATIVES[presetId];
  if (direct) return direct;
  const alias = TR_PRESET_NARRATIVE_ALIASES[presetId];
  if (alias && NARRATIVES[alias]) return NARRATIVES[alias];
  return DEFAULT_NARRATIVE;
}

export function getActiveCaption(
  script: NarrativeScript,
  progress: number,
): NarrationCaption | null {
  const sorted = [...script.captions].sort((a, b) => a.start - b.start);
  let active: NarrationCaption | null = null;
  for (const cap of sorted) {
    if (progress >= cap.start) active = cap;
  }
  return active;
}
