"""Single-source category metadata for the unified Earth-event pipeline.

Every consumer (severity calculator, API `/earth/categories`, frontend
chip filter, 3D marker color, 2D map stroke, detail-panel icon) reads
from `EARTH_CATEGORIES` so the visual treatment stays consistent.

`severity_thresholds` are the ascending boundaries between
LOW → MODERATE → HIGH → CRITICAL for whichever metric the category uses
(area for fires, wind speed for storms, magnitude for quakes, …). A
metric below all thresholds resolves to LOW; above the last threshold,
CRITICAL. If `metric_key` is missing for an event, severity defaults to
INFO and only escalates via `min_default_severity` (e.g. earthquakes are
inherently scored ≥ MODERATE because they're always significant when
they appear in EONET's feed).
"""

from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class EarthCategoryMeta(BaseModel):
    code: str
    label_tr: str
    label_en: str
    icon: str  # Lucide icon name — frontend resolves it via EventCategoryIcon
    accent_hex: str  # Hex color for 3D marker, 2D stroke, chip border
    description_tr: str  # Plain-language one-liner shown above explainer
    metric_key: Optional[str] = None  # e.g. "area_km2", "wind_kts", "mw"
    metric_unit: Optional[str] = None  # display unit
    metric_label_tr: Optional[str] = None  # detail panel label
    severity_thresholds: List[float] = Field(default_factory=list)
    min_default_severity: str = "info"  # one of EventSeverity values
    eonet_codes: List[str] = Field(default_factory=list)
    sort_priority: int = 50  # lower = shown earlier in chip rail


EARTH_CATEGORIES: Dict[str, EarthCategoryMeta] = {
    "earthquakes-tr": EarthCategoryMeta(
        code="earthquakes-tr",
        label_tr="Türkiye Depremleri",
        label_en="Türkiye Earthquakes",
        icon="activity",
        accent_hex="#ff3b3b",
        description_tr=(
            "AFAD canlı sismograf ağından gelen Türkiye merkezli depremler. "
            "Magnitüd Mw ölçeğinde, derinlik km cinsinden raporlanır."
        ),
        metric_key="mw",
        metric_unit="Mw",
        metric_label_tr="Büyüklük",
        severity_thresholds=[3.5, 4.5, 5.5, 6.5],
        min_default_severity="low",
        sort_priority=5,
    ),
    "earthquakes": EarthCategoryMeta(
        code="earthquakes",
        label_tr="Depremler",
        label_en="Earthquakes",
        icon="activity",
        accent_hex="#fb7185",
        description_tr=(
            "EONET tarafından doğrulanmış global deprem etkinlikleri. "
            "Düşük yoğunluklu sallantılar genelde liste dışında kalır."
        ),
        metric_key="mw",
        metric_unit="Mw",
        metric_label_tr="Büyüklük",
        severity_thresholds=[4.0, 5.0, 6.0, 7.0],
        min_default_severity="low",
        eonet_codes=["earthquakes"],
        sort_priority=10,
    ),
    "wildfires": EarthCategoryMeta(
        code="wildfires",
        label_tr="Yangınlar",
        label_en="Wildfires",
        icon="flame",
        accent_hex="#ff5630",
        description_tr=(
            "Aktif orman/arazi yangını cepheleri. Boyut bilgisi varsa "
            "alan km² cinsinden raporlanır; yoksa konum yoğunluğu dikkate alınır."
        ),
        metric_key="area_km2",
        metric_unit="km²",
        metric_label_tr="Alan",
        severity_thresholds=[10, 50, 200, 1000],
        min_default_severity="low",
        eonet_codes=["wildfires"],
        sort_priority=15,
    ),
    "volcanoes": EarthCategoryMeta(
        code="volcanoes",
        label_tr="Volkanlar",
        label_en="Volcanoes",
        icon="mountain-snow",
        accent_hex="#ff8a3c",
        description_tr=(
            "Patlama, kül bulutu veya lav akışı raporlanan aktif volkanlar. "
            "Magnitüd VEI proxy'si ile yaklaşık olarak ölçeklenir."
        ),
        metric_key="vei_proxy",
        metric_unit="VEI",
        metric_label_tr="Patlayıcılık",
        severity_thresholds=[1, 2, 3, 4],
        min_default_severity="moderate",
        eonet_codes=["volcanoes"],
        sort_priority=20,
    ),
    "severeStorms": EarthCategoryMeta(
        code="severeStorms",
        label_tr="Şiddetli Fırtınalar",
        label_en="Severe Storms",
        icon="cloud-lightning",
        accent_hex="#a78bfa",
        description_tr=(
            "Tropikal siklon, hortum ve süper fırtına cepheleri. " "Saffir-Simpson rüzgâr hız sınıflarına göre kademelenir."
        ),
        metric_key="wind_kts",
        metric_unit="kts",
        metric_label_tr="Rüzgâr",
        severity_thresholds=[34, 64, 96, 137],  # TS, Cat-1, Cat-3, Cat-5
        min_default_severity="moderate",
        eonet_codes=["severeStorms"],
        sort_priority=25,
    ),
    "floods": EarthCategoryMeta(
        code="floods",
        label_tr="Seller",
        label_en="Floods",
        icon="droplets",
        accent_hex="#38bdf8",
        description_tr=("Aktif sel ve taşkın olayları. Etkilenen alan yoksa " "yerel etkili olarak listelenir."),
        metric_key="area_km2",
        metric_unit="km²",
        metric_label_tr="Etki Alanı",
        severity_thresholds=[10, 100, 500, 2000],
        min_default_severity="low",
        eonet_codes=["floods"],
        sort_priority=30,
    ),
    "drought": EarthCategoryMeta(
        code="drought",
        label_tr="Kuraklık",
        label_en="Drought",
        icon="sun",
        accent_hex="#f59e0b",
        description_tr=("Uzayan kurak periyot raporları. Olay süresi gün cinsinden " "belirleyici sayılır."),
        metric_key="duration_days",
        metric_unit="gün",
        metric_label_tr="Süre",
        severity_thresholds=[30, 90, 180, 365],
        min_default_severity="low",
        eonet_codes=["drought"],
        sort_priority=35,
    ),
    "tempExtremes": EarthCategoryMeta(
        code="tempExtremes",
        label_tr="Sıcaklık Uçları",
        label_en="Temperature Extremes",
        icon="thermometer-sun",
        accent_hex="#f97316",
        description_tr=("Aşırı sıcak veya soğuk dalgaları. EONET tarafından " "uyarı seviyesinde işaretlenir."),
        min_default_severity="low",
        eonet_codes=["tempExtremes"],
        sort_priority=40,
    ),
    "snow": EarthCategoryMeta(
        code="snow",
        label_tr="Yoğun Kar",
        label_en="Heavy Snow",
        icon="snowflake",
        accent_hex="#bae6fd",
        description_tr=("Olağandışı yağış miktarına ulaşan kar fırtınaları."),
        min_default_severity="low",
        eonet_codes=["snow"],
        sort_priority=45,
    ),
    "seaLakeIce": EarthCategoryMeta(
        code="seaLakeIce",
        label_tr="Deniz/Göl Buzu",
        label_en="Sea & Lake Ice",
        icon="snowflake",
        accent_hex="#7dd3fc",
        description_tr=("Olağandışı buzul sürüklenmesi ya da kıyıya yakın " "buz birikim haritalama olayları."),
        min_default_severity="info",
        eonet_codes=["seaLakeIce"],
        sort_priority=50,
    ),
    "landslides": EarthCategoryMeta(
        code="landslides",
        label_tr="Heyelanlar",
        label_en="Landslides",
        icon="mountain",
        accent_hex="#a3a3a3",
        description_tr=("Toprak/kaya hareketleri. Yoğun yağış ya da deprem sonrası " "raporlanır."),
        min_default_severity="moderate",
        eonet_codes=["landslides"],
        sort_priority=55,
    ),
    "dustHaze": EarthCategoryMeta(
        code="dustHaze",
        label_tr="Toz / Kum Fırtınası",
        label_en="Dust & Haze",
        icon="wind",
        accent_hex="#d4a373",
        description_tr=("Kıtalararası taşınan toz ve sis bulutları. Hava kalitesi " "uyarısı eşliğinde gelir."),
        min_default_severity="info",
        eonet_codes=["dustHaze"],
        sort_priority=60,
    ),
    "manmade": EarthCategoryMeta(
        code="manmade",
        label_tr="İnsan Kaynaklı",
        label_en="Manmade",
        icon="factory",
        accent_hex="#94a3b8",
        description_tr=("Petrol sızıntısı, sanayi kazası gibi insan kaynaklı " "atmosferik veya çevresel olaylar."),
        min_default_severity="info",
        eonet_codes=["manmade"],
        sort_priority=65,
    ),
    "waterColor": EarthCategoryMeta(
        code="waterColor",
        label_tr="Su Rengi Anomalisi",
        label_en="Water Color",
        icon="waves",
        accent_hex="#5eead4",
        description_tr=("Alg patlaması, sediment akıntısı veya kimyasal sızıntı " "kaynaklı renk değişimleri."),
        min_default_severity="info",
        eonet_codes=["waterColor"],
        sort_priority=70,
    ),
}


def severity_for_metric(category_code: str, value: Optional[float]) -> str:
    """Bucket `value` into a severity tier using the category's thresholds.

    Returns the EventSeverity value name. If thresholds aren't defined or
    `value` is None, falls back to `min_default_severity`.
    """
    meta = EARTH_CATEGORIES.get(category_code)
    if meta is None:
        return "info"
    if value is None or not meta.severity_thresholds:
        return meta.min_default_severity

    severities = ["low", "moderate", "high", "critical"]
    tier = "low"
    for boundary, label in zip(meta.severity_thresholds, severities):
        if value >= boundary:
            tier = label
        else:
            break

    # Honor min_default_severity (so e.g. volcano always ≥ moderate even
    # at low VEI).
    rank = {"info": 0, "low": 1, "moderate": 2, "high": 3, "critical": 4}
    if rank.get(tier, 0) < rank.get(meta.min_default_severity, 0):
        tier = meta.min_default_severity
    return tier


def severity_score(severity: str, metric_value: Optional[float] = None) -> float:
    """Map (severity, optional raw metric) → [0,1] sort score.

    Tier dominates so a CRITICAL low-metric event ranks above a HIGH
    high-metric event. Within a tier the metric value provides a smooth
    intra-bucket sort so the "biggest fire of the day" floats up.
    """
    base = {
        "info": 0.0,
        "low": 0.2,
        "moderate": 0.45,
        "high": 0.7,
        "critical": 0.9,
    }.get(severity, 0.0)
    bonus = 0.0
    if metric_value is not None and metric_value > 0:
        # log-ish dampener so very large values don't blow the score.
        # We keep the bonus capped at 0.099 so the tier ordering stays.
        import math

        bonus = min(0.099, math.log10(metric_value + 1.0) / 50.0)
    return min(1.0, base + bonus)


def list_categories() -> List[EarthCategoryMeta]:
    """Stable iteration order — frontend renders chips in this order."""
    return sorted(EARTH_CATEGORIES.values(), key=lambda m: (m.sort_priority, m.code))


def category_for_eonet(code: str) -> Optional[str]:
    """Map a NASA EONET category code (e.g. 'wildfires') → our internal key.

    Most are 1:1 but we leave room for renames/mappings here so the
    normalizer stays clean.
    """
    code_lower = code.lower() if isinstance(code, str) else ""
    for key, meta in EARTH_CATEGORIES.items():
        if any(c.lower() == code_lower for c in meta.eonet_codes):
            return key
    return None


__all__ = [
    "EarthCategoryMeta",
    "EARTH_CATEGORIES",
    "severity_for_metric",
    "severity_score",
    "list_categories",
    "category_for_eonet",
]
