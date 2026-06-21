"""Curated database of notable asteroid / impact / discovery events.

Used by the "Geçmişte Bugün" widget. Each entry has a fixed (month, day) so we
can match against today's date regardless of year. Years are spread across
millennia — from prehistoric impacts (Chicxulub) to modern meteor events
(Chelyabinsk-2013) to spacecraft milestones (OSIRIS-REx return-2023).

Data is editorial — sourced from NASA NEO history, JPL Sentry release notes,
and minor-planet discovery catalogues. Dates are best public-domain references.
"""

from __future__ import annotations

from typing import TypedDict


class HistoricalEvent(TypedDict):
    month: int  # 1..12
    day: int  # 1..31
    year: int
    title_tr: str
    title_en: str
    summary_tr: str
    summary_en: str
    category: str  # 'impact' | 'airburst' | 'discovery' | 'mission' | 'flyby' | 'milestone'
    severity: str  # 'critical' | 'high' | 'moderate' | 'low' | 'info'


HISTORICAL_EVENTS: list[HistoricalEvent] = [
    # ─── Major impact events ───────────────────────────────────────────
    {
        "month": 6,
        "day": 30,
        "year": 1908,
        "title_tr": "Tunguska Olayı",
        "title_en": "Tunguska Event",
        "summary_tr": (
            "Sibirya'nın Tunguska bölgesinde 60 m boyutunda bir cisim atmosferde "
            "patladı. Yaklaşık 12 megaton enerji açığa çıktı, 2.000 km² ormanı "
            "düzledi. 20. yüzyılın en büyük asteroid kaynaklı olayıdır."
        ),
        "summary_en": (
            "A ~60 m body airburst over Tunguska, Siberia, releasing ~12 Mt of "
            "energy and flattening 2,000 km² of forest. The largest asteroid "
            "event of the 20th century."
        ),
        "category": "airburst",
        "severity": "critical",
    },
    {
        "month": 2,
        "day": 15,
        "year": 2013,
        "title_tr": "Çelyabinsk Meteoru",
        "title_en": "Chelyabinsk Meteor",
        "summary_tr": (
            "Rusya'nın Çelyabinsk şehri üzerinde 20 m'lik bir asteroid 30 km "
            "irtifada patladı. Şok dalgası 1.500'den fazla kişiyi yaraladı, "
            "binlerce binanın camını kırdı. ~440 kt eşdeğeri enerji."
        ),
        "summary_en": (
            "A 20 m body airburst at 30 km altitude over Chelyabinsk, Russia. "
            "Shockwave injured 1,500+ people and broke thousands of windows. "
            "~440 kt energy."
        ),
        "category": "airburst",
        "severity": "high",
    },
    {
        "month": 1,
        "day": 18,
        "year": 2000,
        "title_tr": "Tagish Lake Düşüşü",
        "title_en": "Tagish Lake Meteorite Fall",
        "summary_tr": (
            "Kanada'da Tagish Lake üzerinde 56 ton tahminli bir cisim atmosfere "
            "girdi. Toplanan parçalar Güneş Sistemi'nin en eski organik "
            "moleküllerini içeriyor — yaşamın yapı taşları."
        ),
        "summary_en": (
            "A ~56-tonne body entered the atmosphere over Tagish Lake, Canada. "
            "Recovered fragments contain the oldest organic molecules in the "
            "Solar System — building blocks of life."
        ),
        "category": "impact",
        "severity": "moderate",
    },
    # ─── Famous discoveries ────────────────────────────────────────────
    {
        "month": 1,
        "day": 1,
        "year": 1801,
        "title_tr": "Ceres Keşfi",
        "title_en": "Discovery of Ceres",
        "summary_tr": (
            "Giuseppe Piazzi, asteroid kuşağındaki en büyük cismi (940 km çap) "
            "Ceres'i keşfetti. İlk ve en büyük asteroid; bugün cüce gezegen "
            "olarak sınıflandırılıyor. NASA Dawn misyonu 2015'te ziyaret etti."
        ),
        "summary_en": (
            "Giuseppe Piazzi discovered Ceres (940 km), the largest body in the "
            "asteroid belt. First-ever asteroid; now classified as a dwarf "
            "planet. Visited by NASA's Dawn mission in 2015."
        ),
        "category": "discovery",
        "severity": "info",
    },
    {
        "month": 3,
        "day": 28,
        "year": 1802,
        "title_tr": "Pallas Keşfi",
        "title_en": "Discovery of Pallas",
        "summary_tr": (
            "Heinrich Olbers, kuşaktaki üçüncü en büyük asteroid Pallas'ı "
            "(513 km) keşfetti. Athena'nın takma adı; B-tipi karbonlu yapısı "
            "ilkel Güneş Sistemi malzemesini koruyor."
        ),
        "summary_en": (
            "Heinrich Olbers discovered Pallas (513 km), the third-largest "
            "main-belt asteroid. Named after Athena's epithet; its B-type "
            "carbonaceous makeup preserves primordial Solar System material."
        ),
        "category": "discovery",
        "severity": "info",
    },
    {
        "month": 9,
        "day": 1,
        "year": 1804,
        "title_tr": "Juno Keşfi",
        "title_en": "Discovery of Juno",
        "summary_tr": (
            "Karl Harding, ana kuşaktaki üçüncü asteroid Juno'yu keşfetti (234 km). "
            "S-tipi taşlı bir cisim. İlk dört asteroid (Ceres, Pallas, Juno, "
            "Vesta) 'klasik' adıyla bilinir."
        ),
        "summary_en": (
            "Karl Harding discovered Juno (234 km), the third asteroid found in "
            "the main belt. S-type stony composition. The first four asteroids "
            "(Ceres, Pallas, Juno, Vesta) are known as the 'classical' four."
        ),
        "category": "discovery",
        "severity": "info",
    },
    {
        "month": 3,
        "day": 29,
        "year": 1807,
        "title_tr": "Vesta Keşfi",
        "title_en": "Discovery of Vesta",
        "summary_tr": (
            "Heinrich Olbers, kuşaktaki ikinci en büyük asteroid Vesta'yı "
            "(525 km) keşfetti. Çoğu Howardit-Eukrit-Diyojenit (HED) "
            "meteoritlerinin köken cismi. NASA Dawn misyonu 2011-2012'de "
            "yörüngeye girdi."
        ),
        "summary_en": (
            "Heinrich Olbers discovered Vesta (525 km), the second-largest "
            "main-belt asteroid. Source body of most HED (Howardite-Eucrite-"
            "Diogenite) meteorites. NASA Dawn orbited it in 2011-2012."
        ),
        "category": "discovery",
        "severity": "info",
    },
    {
        "month": 6,
        "day": 19,
        "year": 2004,
        "title_tr": "Apophis'in Keşfi",
        "title_en": "Discovery of Apophis",
        "summary_tr": (
            "99942 Apophis, Kitt Peak Gözlemevi'nde keşfedildi. ~370 m çapında bu "
            "asteroidin 2029'da Dünya'ya 31.000 km mesafeden geçeceği hesaplandı "
            "— jeostasyoner uydulardan daha yakın. 21. yüzyılın en izlenen NEO'su."
        ),
        "summary_en": (
            "99942 Apophis discovered at Kitt Peak. The ~370 m body will pass "
            "Earth at 31,000 km in 2029 — closer than geostationary satellites. "
            "The most-watched NEO of the 21st century."
        ),
        "category": "discovery",
        "severity": "high",
    },
    {
        "month": 9,
        "day": 11,
        "year": 1999,
        "title_tr": "Bennu'nun Keşfi",
        "title_en": "Discovery of Bennu",
        "summary_tr": (
            "101955 Bennu, LINEAR teleskop araması tarafından keşfedildi. "
            "OSIRIS-REx misyonu 2018-2021 arasında bu 490 m karbonlu cisimden "
            "121 g örnek topladı; 2023'te Dünya'ya getirildi."
        ),
        "summary_en": (
            "101955 Bennu discovered by the LINEAR survey. NASA's OSIRIS-REx "
            "mission collected 121 g of sample from this 490 m carbonaceous "
            "body between 2018-2021; returned to Earth in 2023."
        ),
        "category": "discovery",
        "severity": "info",
    },
    # ─── Spacecraft milestones ─────────────────────────────────────────
    {
        "month": 9,
        "day": 24,
        "year": 2023,
        "title_tr": "OSIRIS-REx Örnek Dönüşü",
        "title_en": "OSIRIS-REx Sample Return",
        "summary_tr": (
            "NASA OSIRIS-REx, Bennu asteroidinden topladığı 121.6 g örnek "
            "kapsülü Utah çölüne indirdi. ABD'nin ilk asteroid örnek dönüşü; "
            "Hayabusa-1 (2010) ve Hayabusa-2 (2020)'den sonra 3. başarılı görev."
        ),
        "summary_en": (
            "NASA's OSIRIS-REx delivered a 121.6 g sample capsule from Bennu "
            "to the Utah desert. First U.S. asteroid sample return; the third "
            "successful mission after Hayabusa-1 (2010) and Hayabusa-2 (2020)."
        ),
        "category": "mission",
        "severity": "info",
    },
    {
        "month": 9,
        "day": 26,
        "year": 2022,
        "title_tr": "DART Çarpması",
        "title_en": "DART Impact",
        "summary_tr": (
            "NASA'nın DART uzay aracı, Didymos sisteminin ay'ı Dimorphos'a "
            "kasıtlı olarak çarptı. Yörüngesini 32 dakika kısalttı — "
            "**insanlığın ilk gezegen savunması testi** başarıyla sonuçlandı."
        ),
        "summary_en": (
            "NASA's DART spacecraft deliberately impacted Dimorphos, the moon "
            "of the Didymos system. Shortened its orbit by 32 minutes — the "
            "**first successful planetary defense test** in human history."
        ),
        "category": "mission",
        "severity": "info",
    },
    {
        "month": 11,
        "day": 23,
        "year": 2005,
        "title_tr": "Hayabusa Itokawa İnişi",
        "title_en": "Hayabusa Lands on Itokawa",
        "summary_tr": (
            "Japonya'nın JAXA Hayabusa uzay aracı, Itokawa asteroidine "
            "(535 m × 209 m) iki kez indi. İlk başarılı asteroid yüzeyi "
            "iniş+kalkış görevi. Örnekler 2010'da Avustralya'ya getirildi."
        ),
        "summary_en": (
            "JAXA's Hayabusa touched down on Itokawa (535 m × 209 m) twice — "
            "the first successful asteroid surface landing-and-departure. "
            "Samples returned to Australia in 2010."
        ),
        "category": "mission",
        "severity": "info",
    },
    {
        "month": 12,
        "day": 5,
        "year": 2020,
        "title_tr": "Hayabusa-2 Örnek Dönüşü",
        "title_en": "Hayabusa-2 Sample Return",
        "summary_tr": (
            "JAXA Hayabusa-2, Ryugu asteroidinden 5.4 g örnek kapsülü "
            "Avustralya'ya indirdi. C-tipi karbonlu cisim, Güneş Sistemi'nin "
            "en ilkel maddelerini içeriyor."
        ),
        "summary_en": (
            "JAXA's Hayabusa-2 delivered a 5.4 g sample capsule from Ryugu to "
            "Australia. The C-type carbonaceous body contains some of the "
            "Solar System's most primitive material."
        ),
        "category": "mission",
        "severity": "info",
    },
    {
        "month": 2,
        "day": 14,
        "year": 2000,
        "title_tr": "NEAR Eros Yörüngesinde",
        "title_en": "NEAR Enters Eros Orbit",
        "summary_tr": (
            "NASA'nın NEAR Shoemaker uzay aracı, asteroid Eros (16.8 km) "
            "yörüngesine girdi — bir asteroidi yörüngeleyen ilk uzay aracı. "
            "Bir yıl sonra yüzeye yumuşak iniş yaptı."
        ),
        "summary_en": (
            "NASA's NEAR Shoemaker entered orbit around asteroid Eros (16.8 km) — "
            "the first spacecraft to orbit an asteroid. Made a soft landing on "
            "its surface a year later."
        ),
        "category": "mission",
        "severity": "info",
    },
    # ─── Notable flybys ────────────────────────────────────────────────
    {
        "month": 4,
        "day": 13,
        "year": 2029,
        "title_tr": "Apophis'in Tarihi Yaklaşması",
        "title_en": "Apophis Historic Close Approach",
        "summary_tr": (
            "99942 Apophis (~370 m), Dünya'ya 31.000 km'den (jeostasyoner "
            "uydu yüksekliği) geçecek. Çıplak gözle görülebilen ilk asteroid "
            "yaklaşması. **Bu yüzyılın en büyük olayı**."
        ),
        "summary_en": (
            "99942 Apophis (~370 m) will pass Earth at 31,000 km — closer than "
            "geostationary satellites. **The largest such event of this "
            "century** and the first asteroid visible to the naked eye."
        ),
        "category": "flyby",
        "severity": "high",
    },
    {
        "month": 11,
        "day": 8,
        "year": 2011,
        "title_tr": "2005 YU55 Yaklaşması",
        "title_en": "2005 YU55 Close Approach",
        "summary_tr": (
            "400 m boyutundaki 2005 YU55 asteroidi, Ay'dan daha yakın "
            "(324.600 km) bir mesafede Dünya'yı geçti. Arecibo radar "
            "gözlemleri yüzeyini detaylı haritaladı."
        ),
        "summary_en": (
            "The 400 m asteroid 2005 YU55 passed within the Moon's orbit "
            "(324,600 km from Earth). Arecibo radar observations mapped its "
            "surface in detail."
        ),
        "category": "flyby",
        "severity": "moderate",
    },
    # ─── Programmatic milestones ───────────────────────────────────────
    {
        "month": 7,
        "day": 31,
        "year": 1998,
        "title_tr": "NASA NEO Programı Başlangıcı",
        "title_en": "NASA NEO Program Established",
        "summary_tr": (
            "ABD Kongresi, NASA'ya 10 yıl içinde 1 km'den büyük NEO'ların "
            "%90'ını keşfetme görevi verdi (Spaceguard hedefi). 2010'da "
            "tamamlandı — bugün 95%'in üzerinde keşif oranı."
        ),
        "summary_en": (
            "U.S. Congress directed NASA to discover 90% of NEOs ≥1 km within "
            "10 years (the Spaceguard goal). Completed in 2010 — today the "
            "discovery rate is over 95%."
        ),
        "category": "milestone",
        "severity": "info",
    },
    {
        "month": 7,
        "day": 14,
        "year": 2002,
        "title_tr": "JPL Sentry Sistemi Devreye Girdi",
        "title_en": "JPL Sentry System Online",
        "summary_tr": (
            "NASA JPL, asteroid çarpma riskini sürekli izlemek için Sentry "
            "otomatik sistemini başlattı. Bugün 1.700+ NEO'yu 100 yıl ileriye "
            "kadar takip ediyor."
        ),
        "summary_en": (
            "NASA JPL launched Sentry, an automated impact-monitoring system "
            "for asteroids. Today it tracks 1,700+ NEOs up to 100 years into "
            "the future."
        ),
        "category": "milestone",
        "severity": "info",
    },
    # ─── Prehistoric (anniversary date approximated) ───────────────────
    {
        "month": 6,
        "day": 30,
        "year": -65000000,
        "title_tr": "Chicxulub Çarpması",
        "title_en": "Chicxulub Impact",
        "summary_tr": (
            "10-15 km'lik bir cisim Yucatán Yarımadası'na çarptı; 180 km "
            "çapında krater açtı, K-Pg kitlesel yok oluşunu tetikledi. "
            "Dinozorlar dahil türlerin %75'i yok oldu."
        ),
        "summary_en": (
            "A 10-15 km body struck the Yucatán Peninsula, creating a 180 km "
            "crater and triggering the K-Pg mass extinction. 75% of species, "
            "including all non-avian dinosaurs, perished."
        ),
        "category": "impact",
        "severity": "critical",
    },
    {
        "month": 12,
        "day": 13,
        "year": 1920,
        "title_tr": "Hoba Meteoritinin Tanınması",
        "title_en": "Hoba Meteorite Identified",
        "summary_tr": (
            "Namibya'da bulunan Hoba meteoriti, Dünya'daki bilinen en büyük "
            "tek parça meteorittir — ~60 ton, %84 demir, %16 nikel. ~80.000 "
            "yıl önce düştüğü tahmin ediliyor."
        ),
        "summary_en": (
            "The Hoba meteorite in Namibia is the largest known single-piece "
            "meteorite on Earth — ~60 tonnes, 84% iron and 16% nickel. "
            "Estimated to have fallen ~80,000 years ago."
        ),
        "category": "impact",
        "severity": "info",
    },
    # ─── Modern misses & observations ──────────────────────────────────
    {
        "month": 4,
        "day": 13,
        "year": 2004,
        "title_tr": "Apophis İlk Risk Uyarısı",
        "title_en": "Apophis First Risk Alert",
        "summary_tr": (
            "Apophis için Torino skalasında 4 (sıra dışı dikkat) puanı "
            "verildi — bu skalada ulaşılan en yüksek değer. Daha sonraki "
            "gözlemler 2029 ve 2068 çarpma riskini ortadan kaldırdı."
        ),
        "summary_en": (
            "Apophis was assigned a Torino Scale rating of 4 (extraordinary "
            "attention) — the highest ever reached. Subsequent observations "
            "ruled out 2029 and 2068 impact risks."
        ),
        "category": "milestone",
        "severity": "high",
    },
    {
        "month": 8,
        "day": 10,
        "year": 1972,
        "title_tr": "Büyük Gündüz Ateş Topu",
        "title_en": "Great Daylight Fireball",
        "summary_tr": (
            "10 m'lik bir asteroid, ABD ve Kanada üzerinde 57 km irtifada "
            "atmosferden teğet geçti. Yer çekimi yörüngesini değiştirdi ama "
            "Dünya'ya çarpmadı — 'değdi-geçti' (Earth-grazing) olayı."
        ),
        "summary_en": (
            "A 10 m asteroid skipped through Earth's atmosphere at 57 km "
            "altitude over the U.S. and Canada. Earth's gravity bent its "
            "trajectory but it did not impact — an Earth-grazing event."
        ),
        "category": "flyby",
        "severity": "moderate",
    },
]


def events_for(month: int, day: int) -> list[HistoricalEvent]:
    """Return all events that match (month, day), sorted oldest-first."""
    matches = [e for e in HISTORICAL_EVENTS if e["month"] == month and e["day"] == day]
    matches.sort(key=lambda e: e["year"])
    return matches


def all_events() -> list[HistoricalEvent]:
    return list(HISTORICAL_EVENTS)
