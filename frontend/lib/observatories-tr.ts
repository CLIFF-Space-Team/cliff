/**
 * Türkiye'deki astronomik gözlem evleri.
 *
 * Manuel olarak küratör edilmiş — TÜBİTAK, üniversite ve amatör gruplar.
 * Her birinin koordinatı ve kısa Türkçe açıklaması var. Map üstünde
 * marker olarak çiziliyor; karta tıklayınca detay popover açılır.
 */

export interface Observatory {
  id: string;
  name: string;
  shortName: string;
  city: string;
  lat: number;
  lng: number;
  /** Deniz seviyesinden yükseklik (m) */
  altitudeM: number;
  /** Kuruluş yılı */
  founded: number;
  /** En büyük teleskop çapı (m) */
  largestTelescopeM: number | null;
  /** Kurum tipi */
  type: 'national' | 'university' | 'amateur';
  description: string;
  url: string | null;
}

export const TURKISH_OBSERVATORIES: readonly Observatory[] = [
  {
    id: 'tug',
    name: 'TÜBİTAK Ulusal Gözlemevi',
    shortName: 'TUG',
    city: 'Antalya',
    lat: 36.8244,
    lng: 30.3356,
    altitudeM: 2500,
    founded: 1997,
    largestTelescopeM: 1.5,
    type: 'national',
    description:
      "Türkiye'nin en büyük ulusal gözlemevi. Saklıkent (Bakırlıtepe) üzerinde kurulu, 1.5 m T100 teleskobu ile NEO takibi, fotometri ve spektroskopi yürütülür.",
    url: 'https://tug.tubitak.gov.tr',
  },
  {
    id: 'iuo',
    name: 'İstanbul Üniversitesi Gözlemevi',
    shortName: 'İÜO',
    city: 'İstanbul',
    lat: 41.0089,
    lng: 28.9667,
    altitudeM: 65,
    founded: 1936,
    largestTelescopeM: 0.45,
    type: 'university',
    description:
      "Türkiye'nin en eski üniversite gözlemevlerinden. Beyazıt kampüsünde, eğitim ve değişen yıldız fotometrisi ağırlıklı.",
    url: 'https://astronomy.istanbul.edu.tr',
  },
  {
    id: 'ankara-kreiken',
    name: 'Ankara Üniversitesi Kreiken Rasathanesi',
    shortName: 'AÜG (Kreiken)',
    city: 'Ankara',
    lat: 39.8447,
    lng: 32.7783,
    altitudeM: 1250,
    founded: 1963,
    largestTelescopeM: 0.4,
    type: 'university',
    description:
      'Ahlatlıbel sırtlarında, Ankara Üniversitesi Astronomi Bölümü öğretim ve gözlem aktivitelerinin merkezi. NEO ve değişen yıldız programları aktif.',
    url: 'https://kreiken.science.ankara.edu.tr',
  },
  {
    id: 'atasam',
    name: 'Atatürk Üniversitesi Astrofizik Araştırma ve Uygulama Merkezi',
    shortName: 'ATASAM',
    city: 'Erzurum',
    lat: 39.9047,
    lng: 41.2522,
    altitudeM: 1865,
    founded: 2005,
    largestTelescopeM: 0.6,
    type: 'university',
    description:
      "Doğu Anadolu'da yüksek irtifada konumlanmış, gökyüzü kalitesi yüksek bir merkez. NEO fotometrisi ve değişen yıldız çalışmaları yürütülür.",
    url: null,
  },
  {
    id: 'uzaybimer',
    name: 'Çanakkale Onsekiz Mart Üniversitesi Astrofizik Araştırma Merkezi',
    shortName: 'UZAYBİMER',
    city: 'Çanakkale',
    lat: 40.1003,
    lng: 26.4744,
    altitudeM: 410,
    founded: 2002,
    largestTelescopeM: 1.22,
    type: 'university',
    description:
      "Türkiye'nin önemli üniversite gözlemevlerinden. T122 teleskobu ile NEO ve değişen yıldız gözlemleri yapılır.",
    url: 'https://astrofizik.comu.edu.tr',
  },
  {
    id: 'akdeniz-uzay',
    name: 'Akdeniz Üniversitesi Uzay Bilimleri ve Teknolojileri Merkezi',
    shortName: 'AÜUZAYBİT',
    city: 'Antalya',
    lat: 36.8956,
    lng: 30.6604,
    altitudeM: 60,
    founded: 2012,
    largestTelescopeM: 0.5,
    type: 'university',
    description:
      'Akdeniz Üniversitesi kampüsünde, uzay teknolojileri ve astronomi eğitimi odaklı görece yeni bir merkez.',
    url: null,
  },
  {
    id: 'astrobay',
    name: 'ASTROBAY Amatör Astronomi Topluluğu',
    shortName: 'ASTROBAY',
    city: 'Konya',
    lat: 37.8714,
    lng: 32.4847,
    altitudeM: 1030,
    founded: 2008,
    largestTelescopeM: 0.3,
    type: 'amateur',
    description:
      'Türkiye amatör astronomi topluluklarının önde gelenlerinden. Halk gözlem etkinlikleri, meteor yağmuru takibi ve eğitim faaliyetleri düzenler.',
    url: null,
  },
];

export const OBSERVATORY_TYPE_LABELS: Record<Observatory['type'], string> = {
  national: 'Ulusal',
  university: 'Üniversite',
  amateur: 'Amatör',
};
