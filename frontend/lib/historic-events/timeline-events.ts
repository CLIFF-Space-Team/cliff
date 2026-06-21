/**
 * Asteroit zaman makinesi olay veritabanı.
 *
 * Geçmiş ve gelecek (öngörülen) NEO olaylarının küratör listesi. Tarih
 * slider'ında ilerlerken bunlar birer birer öne çıkar.
 */

export type EventCategory =
  | 'impact' // Yer/atmosfer çarpması
  | 'flyby' // Yakın geçiş
  | 'discovery' // Keşif
  | 'mission'; // Uzay aracı misyonu

export interface TimelineEvent {
  id: string;
  /** ISO tarihi (mümkünse gerçek, yoksa yıl-ay-gün yaklaşık) */
  date: string;
  year: number;
  title: string;
  category: EventCategory;
  /** Gerçekleşmiş mi yoksa öngörülen/beklenen mi? */
  occurred: boolean;
  /** Çap (m), bilinmiyorsa null */
  diameterM: number | null;
  /** Kısa açıklama — Türkçe, 2-3 cümle */
  description: string;
  /** UI'da öne çıkma seviyesi: 1=küçük, 3=büyük (timeline marker boyutu) */
  significance: 1 | 2 | 3;
  /** İlgili konum (lat/lng) — varsa harita gösterimi için */
  location?: { lat: number; lng: number; place: string };
}

export const TIMELINE_EVENTS: readonly TimelineEvent[] = [
  {
    id: 'tunguska-1908',
    date: '1908-06-30',
    year: 1908,
    title: 'Tunguska Olayı',
    category: 'impact',
    occurred: true,
    diameterM: 60,
    description:
      'Sibirya Tunguska bölgesi üzerinde ~60 m taşlı meteoroit ~5-10 km irtifada patladı. ~12 Mt enerji, 2000 km² orman tamamen yıkıldı.',
    significance: 3,
    location: { lat: 60.886, lng: 101.894, place: 'Tunguska, Rusya' },
  },
  {
    id: 'sikhote-alin-1947',
    date: '1947-02-12',
    year: 1947,
    title: 'Sikhote-Alin Demir Yağmuru',
    category: 'impact',
    occurred: true,
    diameterM: 5,
    description:
      'Rusya Uzakdoğu\'sunda ~70 ton demir meteoroit atmosferde parçalandı. 100\'den fazla küçük krater oluştu, 23 ton meteorit bulundu.',
    significance: 2,
    location: { lat: 46.158, lng: 134.658, place: 'Sikhote-Alin, Rusya' },
  },
  {
    id: 'apollo-1932',
    date: '1932-04-24',
    year: 1932,
    title: '1862 Apollo Keşfedildi',
    category: 'discovery',
    occurred: true,
    diameterM: 1700,
    description:
      'İlk Apollo grubu NEO. Karl Reinmuth tarafından keşfedildi. "Apollo asteroitleri" sınıfı bu cisimden adını aldı.',
    significance: 1,
  },
  {
    id: 'eros-discovery-1898',
    date: '1898-08-13',
    year: 1898,
    title: '433 Eros Keşfedildi',
    category: 'discovery',
    occurred: true,
    diameterM: 16800,
    description:
      'İlk Yer-yakın asteroit. NEAR Shoemaker 2001\'de yüzeyine indi. 16x34 km boyutunda S-tipi asteroit.',
    significance: 2,
  },
  {
    id: 'tc3-2008',
    date: '2008-10-07',
    year: 2008,
    title: '2008 TC3 — İlk Tespit Edilen Çarpan',
    category: 'impact',
    occurred: true,
    diameterM: 4,
    description:
      '~4 m\'lik asteroit, çarpmadan 19 saat önce tespit edildi. İnsanlık tarihinde ilk önceden uyarılan NEO çarpması. Sudan üstünde patladı.',
    significance: 2,
    location: { lat: 20.6, lng: 32.4, place: 'Sudan' },
  },
  {
    id: 'celyabinsk-2013',
    date: '2013-02-15',
    year: 2013,
    title: 'Çelyabinsk Meteoru',
    category: 'impact',
    occurred: true,
    diameterM: 20,
    description:
      '20 m taşlı meteoroit Rusya Çelyabinsk üzerinde 30 km irtifada patladı. ~440 kt enerji, 7300 binanın penceresi kırıldı, 1500 yaralı.',
    significance: 3,
    location: { lat: 54.83, lng: 61.18, place: 'Çelyabinsk, Rusya' },
  },
  {
    id: 'osiris-rex-launch-2016',
    date: '2016-09-08',
    year: 2016,
    title: 'OSIRIS-REx Fırlatıldı',
    category: 'mission',
    occurred: true,
    diameterM: null,
    description:
      'NASA\'nın Bennu asteroidine örnek getirme misyonu fırlatıldı. 2023\'te 250 g örnekle Dünya\'ya geri döndü.',
    significance: 2,
  },
  {
    id: 'hayabusa2-ryugu-2018',
    date: '2018-06-27',
    year: 2018,
    title: 'Hayabusa-2 Ryugu\'ya Vardı',
    category: 'mission',
    occurred: true,
    diameterM: null,
    description:
      'JAXA\'nın Hayabusa-2 sondası 162173 Ryugu asteroidine ulaştı. Toplam 5.4 g örnek 2020 sonunda Dünya\'ya getirildi.',
    significance: 2,
  },
  {
    id: 'dart-2022',
    date: '2022-09-26',
    year: 2022,
    title: 'DART Misyonu — İlk Gezegen Savunması',
    category: 'mission',
    occurred: true,
    diameterM: null,
    description:
      'NASA DART uzay aracı Dimorphos asteroidine kasıtlı olarak çarptı. Yörünge süresini 32 dakika değiştirdi — insanlık ilk gezegen savunma testi.',
    significance: 3,
    location: { lat: 0, lng: 0, place: 'Dimorphos · 11M km' },
  },
  {
    id: 'apophis-2029',
    date: '2029-04-13',
    year: 2029,
    title: 'Apophis Yakın Geçişi',
    category: 'flyby',
    occurred: false,
    diameterM: 340,
    description:
      '340 m\'lik 99942 Apophis Dünya\'ya 32.000 km mesafeden geçecek. Çıplak gözle görülecek; jeoduran uydulardan yakın.',
    significance: 3,
  },
  {
    id: 'apophis-2036',
    date: '2036-04-13',
    year: 2036,
    title: 'Apophis Sonraki Yaklaşımı',
    category: 'flyby',
    occurred: false,
    diameterM: 340,
    description:
      '2029\'dan sonraki Apophis yakın geçişi. 2029 sırasında Dünya çekimi yörüngeyi değiştirdiğinde bu mesafe netleşecek.',
    significance: 1,
  },
  {
    id: 'apophis-2068',
    date: '2068-04-12',
    year: 2068,
    title: 'Apophis 2068 Geçişi',
    category: 'flyby',
    occurred: false,
    diameterM: 340,
    description:
      'Apophis\'in 2068\'deki yakın geçişi. JPL Sentry önceki çarpma riskini 2021\'de takvimden çıkardı; artık güvenli.',
    significance: 1,
  },
  {
    id: 'bennu-2135',
    date: '2135-09-25',
    year: 2135,
    title: 'Bennu Yakın Geçişi',
    category: 'flyby',
    occurred: false,
    diameterM: 490,
    description:
      '490 m Bennu Dünya\'ya 750.000 km mesafeden geçecek (Dünya-Ay mesafesinin 2 katı). Sonraki geçişlerde olası çarpma riski %0.037.',
    significance: 2,
  },
  {
    id: 'bennu-2182',
    date: '2182-09-24',
    year: 2182,
    title: 'Bennu 2182 Geçişi',
    category: 'flyby',
    occurred: false,
    diameterM: 490,
    description:
      'JPL Sentry\'nin en yüksek skorlu öngörülen olayı: 1\'de 2700 çarpma olasılığı. OSIRIS-REx örnekleri bu projeksiyonu netleştirmek için kritik.',
    significance: 2,
  },
];

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  impact: 'Çarpma',
  flyby: 'Yakın Geçiş',
  discovery: 'Keşif',
  mission: 'Uzay Misyonu',
};

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  impact: 'hsl(0 84% 60%)', // critical
  flyby: 'hsl(48 96% 53%)', // moderate
  discovery: 'hsl(0 0% 64%)', // muted
  mission: 'hsl(142 71% 45%)', // low (positive event)
};

export const TIMELINE_MIN_YEAR = 1898;
export const TIMELINE_MAX_YEAR = 2200;
