/**
 * Asteroit / NEO terimler sözlüğü — Türkçe.
 *
 * `<GlossaryTerm>` component'i bu sözlüğe başvurur. Yeni terim eklemek için:
 * id (kebab-case), Türkçe başlık, kısa açıklama (2-3 cümle).
 */

export interface GlossaryEntry {
  id: string;
  /** UI'da gösterilen ana terim */
  term: string;
  /** Eşanlamlı kısaltmalar — `<GlossaryTerm of="moid">` gibi aramalar için */
  aliases?: string[];
  /** İlgili konu kategorisi */
  category: 'orbit' | 'risk' | 'physics' | 'mission' | 'observation';
  /** Türkçe açıklama, 2-3 cümle */
  definition: string;
  /** Opsiyonel ek context — hover sonrası "daha fazla bilgi" için */
  more?: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  neo: {
    id: 'neo',
    term: 'NEO',
    aliases: ['near earth object', 'yer-yakın cisim'],
    category: 'orbit',
    definition:
      "Near-Earth Object — Yer-yakın gök cisimleri. Güneş'e Dünya'dan ~1.3 AB içinde yaklaşan asteroitler ve kometler.",
  },
  pha: {
    id: 'pha',
    term: 'PHA',
    aliases: ['potansiyel tehlikeli'],
    category: 'risk',
    definition:
      "Potentially Hazardous Asteroid — Dünya'ya en yakın geçişi 0.05 AB (~7.5M km) altında, parlaklığı 22'den parlak (yani >140m) olan NEO'lar.",
    more: 'Bu eşik, çarpsa bölgesel hasar yaratabilecek boyutu hedefler.',
  },
  moid: {
    id: 'moid',
    term: 'MOID',
    aliases: ['minimum orbit intersection distance'],
    category: 'orbit',
    definition:
      "Minimum Orbit Intersection Distance — İki yörünge arasındaki en kısa mesafe. Dünya MOID'i ~0.05 AB altıysa cisim PHA sayılır.",
  },
  torino: {
    id: 'torino',
    term: 'Torino Skalası',
    aliases: ['torino scale'],
    category: 'risk',
    definition:
      "0-10 arası tek sayılık halka açık çarpma riski skalası. 0 = risk yok (yeşil), 10 = kesin küresel felaket (kırmızı). Apophis kısa süre 4'e ulaşmıştı.",
    more: 'Renk kodlu — gazete manşeti tarzı sade iletişim için tasarlandı.',
  },
  palermo: {
    id: 'palermo',
    term: 'Palermo Skalası',
    aliases: ['palermo scale'],
    category: 'risk',
    definition:
      'Logaritmik teknik risk ölçeği. 0 = arka plan riskine eşit, +ve = arka plandan tehlikeli, -ve = ihmal edilebilir.',
    more: 'JPL Sentry tablosu Palermo skoru ile sıralanır.',
  },
  sigma: {
    id: 'sigma',
    term: 'σ (Sigma)',
    aliases: ['sigma', 'belirsizlik'],
    category: 'physics',
    definition:
      'Standart sapma — bir tahminin etrafındaki belirsizliğin ölçütü. Yakın geçiş tahminlerinde ~3σ, %99.7 güvenle kapsanan aralığı tanımlar.',
  },
  meteor_meteoroit_meteorit: {
    id: 'meteor_meteoroit_meteorit',
    term: 'Meteor / Meteoroit / Meteorit',
    aliases: ['meteor', 'meteoroit', 'meteorit'],
    category: 'physics',
    definition:
      'Meteoroit: uzaydaki taş. Meteor: atmosferde yanan ışık izi. Meteorit: yere ulaşan parça. Aynı cisim sırasıyla bu üç ismi alır.',
  },
  asteroit_komet: {
    id: 'asteroit_komet',
    term: 'Asteroit vs Komet',
    aliases: ['asteroid', 'comet'],
    category: 'physics',
    definition:
      "Asteroit: çoğunlukla taş ve metal, iç güneş sistemi. Komet: buz ve toz, dış güneş sistemi; Güneş'e yaklaşınca kuyruk oluşturur.",
  },
  ephemeris: {
    id: 'ephemeris',
    term: 'Efemeris',
    aliases: ['ephemeris'],
    category: 'orbit',
    definition:
      'Bir gök cisminin tahmini konum tablosu — zaman, RA/Dec ve mesafe sütunlarıyla. JPL Horizons servisinden çekilir.',
  },
  ra_dec: {
    id: 'ra_dec',
    term: 'RA / Dec',
    aliases: ['right ascension', 'declination'],
    category: 'observation',
    definition:
      "RA (sağ açıklık, 0-24 saat) ve Dec (eğim, ±90°) — gök yüzünde konum belirten Dünya'daki enlem-boylam'ın karşılığı.",
  },
  apparent_magnitude: {
    id: 'apparent_magnitude',
    term: 'Görsel Parlaklık',
    aliases: ['apparent magnitude', 'magnitude', 'kadir'],
    category: 'observation',
    definition:
      "Bir cismin Dünya'dan görünen parlaklığı. Düşük sayı = daha parlak. Çıplak gözle ~6, dolunay -12, Güneş -27.",
  },
  ab_au: {
    id: 'ab_au',
    term: 'AB (Astronomik Birim)',
    aliases: ['au', 'astronomical unit'],
    category: 'orbit',
    definition:
      "1 AB = Dünya'nın Güneş'e ortalama mesafesi (~150 milyon km). Güneş sistemi içi mesafeleri ölçmek için pratik birim.",
  },
  monte_carlo: {
    id: 'monte_carlo',
    term: 'Monte Carlo Simülasyonu',
    category: 'risk',
    definition:
      'Bir olayın olası sonuçlarını binlerce rastgele örnekleme ile tahmin etme yöntemi. Yörünge belirsizliği için kullanılır — her örneklem biraz farklı başlangıç koşullarıyla simüle edilir.',
  },
  airburst: {
    id: 'airburst',
    term: 'Hava Patlaması',
    aliases: ['airburst'],
    category: 'physics',
    definition:
      'Yere ulaşmadan atmosferde patlayan meteoroit. Çelyabinsk (30 km) ve Tunguska (5-10 km) hava patlamasıydı; krater açmadan büyük hasar verir.',
  },
  hybrid_score: {
    id: 'hybrid_score',
    term: 'Hibrit Risk Skoru',
    category: 'risk',
    definition:
      'CLIFF\'in 0-1 ölçeğindeki birleşik risk göstergesi. Monte Carlo + ML sınıflandırıcı + Sentry kaydı sinyallerini harmanlar.',
  },
  sentry: {
    id: 'sentry',
    term: 'JPL Sentry',
    category: 'mission',
    definition:
      "NASA JPL'nin otomatik çarpma riski izleme sistemi. Yeni keşfedilen NEO'ları 100 yıl ileriye projekte eder, riskli olanları listeler.",
  },
  jpl_horizons: {
    id: 'jpl_horizons',
    term: 'JPL Horizons',
    category: 'mission',
    definition:
      'NASA JPL\'nin yüksek hassasiyetli efemeris servisi. Asteroit, komet ve uzay aracı konumlarını binlerce yıl ileriye/geriye hesaplar.',
  },
  perihel_aphel: {
    id: 'perihel_aphel',
    term: 'Perihel / Aphel',
    aliases: ['perihelion', 'aphelion'],
    category: 'orbit',
    definition:
      "Perihel: yörüngede Güneş'e en yakın nokta. Aphel: en uzak nokta. NEO'lar genellikle perihelinde Yer yörüngesini keser.",
  },
  eccentricity: {
    id: 'eccentricity',
    term: 'Dış-merkezlik (e)',
    aliases: ['eccentricity'],
    category: 'orbit',
    definition:
      'Yörüngenin daireden ne kadar saptığı. e=0 dairedir, e<1 elipstir. Apophis e≈0.19, Halley kometi e≈0.97.',
  },
  inclination: {
    id: 'inclination',
    term: 'Eğiklik (i)',
    aliases: ['inclination'],
    category: 'orbit',
    definition:
      "Yörünge düzleminin Yer yörünge düzleminden (ekliptik) sapma açısı. Çoğu asteroit i<10°, bazı uzun-kuyruklu kometler i>30°.",
  },
  apollo_aten_amor: {
    id: 'apollo_aten_amor',
    term: 'Apollo / Aten / Amor / Atira',
    category: 'orbit',
    definition:
      "NEO yörünge sınıfları. Apollo: Yer yörüngesini geçer ama yarı-büyük eksen >1AB. Aten: <1AB. Amor: yörüngesi Yer'e yaklaşır ama kesmez. Atira: tamamen Yer yörüngesi içinde.",
  },
  spectral_type: {
    id: 'spectral_type',
    term: 'Spektral Tip',
    aliases: ['spektral sınıf'],
    category: 'physics',
    definition:
      "Asteroidin yansıttığı ışık spektrumuna göre bileşim sınıfı. C-tipi (karbonlu, %75), S-tipi (silikat, %17), M-tipi (metalik, geri kalanı).",
  },
  ground_coupling: {
    id: 'ground_coupling',
    term: 'Yer Bağlanımı',
    aliases: ['ground coupling'],
    category: 'physics',
    definition:
      'Çarpmanın açığa çıkardığı enerjinin yere ne kadarının ulaştığı oranı (0-1). Hava patlamasında düşük (Tunguska ~0.05), yer çarpışmasında yüksek (~1).',
  },
  rubble_pile: {
    id: 'rubble_pile',
    term: 'Moloz Yığını',
    aliases: ['rubble pile'],
    category: 'physics',
    definition:
      'Tek katı parça olmayan, zayıf yerçekimiyle birarada duran taş ve toz parçacıklarından oluşan asteroit. Bennu ve Ryugu örnekleridir.',
  },
  tnt_megaton: {
    id: 'tnt_megaton',
    term: 'TNT Megaton',
    category: 'physics',
    definition:
      "Patlama enerjisi birimi. 1 megaton TNT = 4.184×10¹⁵ J. Hiroşima ~15 kt; Çelyabinsk 440 kt; Tsar Bomba 50 Mt; Apophis çarpması ~1500 Mt'a yaklaşırdı.",
  },
  delta_v: {
    id: 'delta_v',
    term: 'Δv (Delta-V)',
    aliases: ['delta-v', 'hız değişimi'],
    category: 'mission',
    definition:
      "Bir uzay aracının yörüngesini değiştirmek için gereken hız değişimi (km/s). Uzay misyonlarının 'maliyet' birimidir; düşük Δv hedefleri ucuz.",
  },
  impact_diameter: {
    id: 'impact_diameter',
    term: 'Çap',
    aliases: ['diameter'],
    category: 'physics',
    definition:
      'Asteroidin küresel yaklaşımdaki çapı (m). 20m=Çelyabinsk, 60m=Tunguska, 1km=şehir-yıkıcı, 10km+=kitlesel yok-oluş.',
  },
  impact_velocity: {
    id: 'impact_velocity',
    term: 'Hız',
    aliases: ['velocity'],
    category: 'physics',
    definition:
      'Atmosfere giriş hızı (km/s). Tipik aralık 11-72 km/s, ortalama 17 km/s. Enerji hızın karesiyle artar.',
  },
  impact_angle: {
    id: 'impact_angle',
    term: 'Geliş açısı',
    aliases: ['angle'],
    category: 'physics',
    definition:
      'Yatayla yapılan açı. 90°=dikey, 18°=Çelyabinsk benzeri sıyırma. Düşük açıda atmosfer içinde uzun süre kalır.',
  },
  impact_azimuth: {
    id: 'impact_azimuth',
    term: 'Geliş yönü',
    aliases: ['azimuth'],
    category: 'physics',
    definition:
      'Kuzeyden saat yönü açı (0-360°). 0°=Kuzey, 90°=Doğu, 180°=Güney, 270°=Batı. Sahnedeki krater asimetrisi ve enkaz yönü için.',
  },
  impact_composition: {
    id: 'impact_composition',
    term: 'Bileşim',
    aliases: ['composition'],
    category: 'physics',
    definition:
      '4 temel tip: demir (yoğun, atmosfere dirençli), taşlı (en yaygın, S-tipi), karbonlu (gevşek, kolay parçalanır), buzul (komet, hava patlamasına yatkın).',
  },
  impact_target: {
    id: 'impact_target',
    term: 'Hedef yüzey',
    aliases: ['target type'],
    category: 'physics',
    definition:
      'Çarpma alanı tipi: tortul (yumuşak), sert kaya (granit/bazalt), okyanus (tsunami üretir). Krater boyutu ve etki şiddeti yüzeye bağlıdır.',
  },
};

/** Term ID veya alias ile bulma. */
export function findGlossaryEntry(query: string): GlossaryEntry | null {
  const norm = query.toLocaleLowerCase('tr-TR').trim();
  const direct = GLOSSARY[norm];
  if (direct) return direct;
  for (const entry of Object.values(GLOSSARY)) {
    if (entry.aliases?.some((a) => a.toLocaleLowerCase('tr-TR') === norm)) {
      return entry;
    }
  }
  return null;
}

export const GLOSSARY_ENTRIES = Object.values(GLOSSARY);
