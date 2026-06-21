/**
 * Türkçe basında / kurumsal kaynaklarda asteroit haberleri.
 *
 * Manuel küratör. Etkinlikten önce demo öncesi gözden geçirilmesi gerekir.
 * Tarihler ISO 8601 (YYYY-MM-DD) — frontend formatlar.
 */

export interface PressItem {
  id: string;
  date: string;
  title: string;
  source: string;
  url: string;
  /** Konu etiketi — kart üzerinde küçük rozet */
  topic:
    | 'cep-yakin-gecis'
    | 'tarihsel-olay'
    | 'misyon'
    | 'savunma'
    | 'gozlem'
    | 'egitim';
  /** Kısa Türkçe özet (2-3 cümle) */
  summary: string;
}

export const TURKISH_PRESS: readonly PressItem[] = [
  {
    id: 'tug-neo-2024',
    date: '2024-09-15',
    title: 'TÜBİTAK Ulusal Gözlemevi 2024 Yakın Geçişlerini İzledi',
    source: 'TÜBİTAK',
    url: 'https://tug.tubitak.gov.tr',
    topic: 'gozlem',
    summary:
      "TÜG'deki T100 teleskobu ile 2024 yılı boyunca yakın geçen NEO'ların fotometrisi yapıldı. Sonuçlar IAU Minor Planet Center'a raporlandı.",
  },
  {
    id: 'apophis-2029',
    date: '2024-04-13',
    title: '99942 Apophis 2029\'da Dünya\'ya Yakın Geçecek',
    source: 'NASA Türkçe',
    url: 'https://science.nasa.gov',
    topic: 'cep-yakin-gecis',
    summary:
      'Yaklaşık 340 metre çapındaki Apophis, 13 Nisan 2029\'da Dünya\'ya 32.000 km mesafeden geçecek. Çıplak gözle görülebilen ilk asteroit olacak.',
  },
  {
    id: 'dart-2022',
    date: '2022-09-26',
    title: 'NASA DART Misyonu Asteroidi Saptırdı',
    source: 'BBC Türkçe',
    url: 'https://www.bbc.com/turkce',
    topic: 'savunma',
    summary:
      "NASA'nın DART uzay aracı, Dimorphos asteroidine başarıyla çarparak yörüngesini değiştirdi. İnsanlık tarihinde ilk gezegen savunması testi.",
  },
  {
    id: 'celyabinsk-2013',
    date: '2013-02-15',
    title: 'Çelyabinsk Meteoru: 7000 Bina Hasar Gördü',
    source: 'TRT Haber',
    url: 'https://www.trthaber.com',
    topic: 'tarihsel-olay',
    summary:
      'Rusya Çelyabinsk üzerinde 20 metrelik meteoroit atmosfere girdiğinde Hiroşima\'nın 30 katı enerji açığa çıktı. Şokdalgası 7000 binanın penceresini kırdı, 1500 kişi yaralandı.',
  },
  {
    id: 'tunguska-1908',
    date: '1908-06-30',
    title: 'Tunguska Olayı: 2000 km² Orman Yıkıldı',
    source: 'Bilim ve Teknik',
    url: 'https://www.bilimveteknik.tubitak.gov.tr',
    topic: 'tarihsel-olay',
    summary:
      'Sibirya Tunguska\'da gerçekleşen patlama, 80 metrelik bir asteroidin atmosferde parçalanmasıyla oluştu. 2000 km² orman tamamen yıkıldı.',
  },
  {
    id: 'osiris-rex-2023',
    date: '2023-09-24',
    title: 'OSIRIS-REx Bennu Örneklerini Dünyaya Getirdi',
    source: 'Anadolu Ajansı',
    url: 'https://www.aa.com.tr',
    topic: 'misyon',
    summary:
      'NASA OSIRIS-REx misyonu, Bennu asteroidinden topladığı 250 gram örnekleri Utah çölüne indirdi. Güneş Sistemi\'nin oluşumuna ışık tutması bekleniyor.',
  },
  {
    id: 'hayabusa2-2020',
    date: '2020-12-06',
    title: 'Hayabusa-2 Ryugu Asteroidinden Örnek Getirdi',
    source: 'Hürriyet Bilim',
    url: 'https://www.hurriyet.com.tr',
    topic: 'misyon',
    summary:
      'Japonya JAXA Hayabusa-2 sondası, Ryugu asteroidinden topladığı yaklaşık 5.4 gram örneği Avustralya çölüne başarıyla indirdi.',
  },
  {
    id: 'mpc-egitim',
    date: '2023-11-20',
    title: 'IAU Minor Planet Center Türk Gözlemcileri Tanıdı',
    source: 'TÜBİTAK Bilim Genç',
    url: 'https://bilimgenc.tubitak.gov.tr',
    topic: 'egitim',
    summary:
      'Uluslararası Astronomi Birliği (IAU) Minor Planet Center, Türk amatör ve profesyonel gözlemcilerin NEO takibine önemli katkı sağladığını duyurdu.',
  },
];

export const PRESS_TOPIC_LABELS: Record<PressItem['topic'], string> = {
  'cep-yakin-gecis': 'Yakın Geçiş',
  'tarihsel-olay': 'Tarihsel Olay',
  misyon: 'Uzay Misyonu',
  savunma: 'Gezegen Savunması',
  gozlem: 'Gözlem',
  egitim: 'Eğitim',
};
