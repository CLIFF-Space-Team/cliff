from beanie import Document
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
class SimpleEarthEventModel(BaseModel):
    
    id: str = Field(..., description="Olay ID")
    title: str = Field(..., description="Olay başlığı")
    category: str = Field(..., description="Kategori (Türkçe)")
    severity: str = Field(..., description="Önem derecesi: Düşük, Orta, Yüksek")
    date: str = Field(..., description="Olay tarihi")
    location: Optional[str] = Field(None, description="Konum")
    description: Optional[str] = Field(None, description="Kısa açıklama")
    source: Optional[str] = Field(default="NASA EONET", description="Veri kaynağı")
    coordinates: Optional[Dict[str, float]] = Field(None, description="Koordinatlar (lat, lon)")
    class Config:
        json_schema_extra = {
            "example": {
                "id": "EONET_12345",
                "title": "Etna Yanardağı Aktivitesi",
                "category": "Yanardağ",
                "severity": "Orta",
                "date": "2025-01-15",
                "location": "İtalya, Sicilya",
                "description": "Etna yanardağında artan aktivite gözlemleniyor",
                "coordinates": {"lat": 37.734, "lon": 15.004}
            }
        }
class EarthEventStatistics(BaseModel):
    
    total_events: int = Field(default=0, description="Toplam olay sayısı")
    active_events: int = Field(default=0, description="Aktif olay sayısı")
    by_category: Dict[str, int] = Field(default_factory=dict, description="Kategoriye göre dağılım")
    by_severity: Dict[str, int] = Field(default_factory=dict, description="Önem derecesine göre")
    by_region: Dict[str, int] = Field(default_factory=dict, description="Bölgeye göre")
class EarthEventDocument(Document):
    
    event_id: str = Field(..., description="Unique event ID")
    title: str = Field(..., description="Event title")
    category: str = Field(..., description="Event category in Turkish")
    severity: str = Field(..., description="Severity level: Düşük, Orta, Yüksek")
    event_date: datetime = Field(..., description="Event occurrence date")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Record creation time")
    last_updated: datetime = Field(default_factory=datetime.utcnow, description="Last update time")
    location_name: Optional[str] = Field(None, description="Location name")
    coordinates: Optional[Dict[str, float]] = Field(None, description="Geographic coordinates")
    country: Optional[str] = Field(None, description="Country name")
    region: Optional[str] = Field(None, description="Geographic region")
    description: Optional[str] = Field(None, description="Event description")
    source_url: Optional[str] = Field(None, description="Source URL")
    magnitude: Optional[float] = Field(None, description="Event magnitude/intensity")
    is_active: bool = Field(default=True, description="Is event still active")
    is_closed: bool = Field(default=False, description="Is event closed")
    data_source: str = Field(default="NASA EONET", description="Data source")
    raw_data: Optional[Dict[str, Any]] = Field(None, description="Original raw data")
    class Settings:
        name = "earth_events"
    @property
    def turkish_category(self) -> str:
        
        category_mapping = {
            "Volcanoes": "Yanardağ",
            "Wildfires": "Orman Yangını", 
            "Severe Storms": "Şiddetli Fırtına",
            "Floods": "Sel",
            "Drought": "Kuraklık",
            "Dust and Haze": "Toz ve Duman",
            "Earthquakes": "Deprem",
            "Landslides": "Heyelan",
            "Manmade": "İnsan Kaynaklı",
            "Sea and Lake Ice": "Deniz ve Göl Buzları",
            "Snow": "Kar",
            "Temperature Extremes": "Aşırı Sıcaklıklar"
        }
        return category_mapping.get(self.category, self.category)
    @property 
    def severity_color(self) -> str:
        
        colors = {
            "Düşük": "#22c55e",    # Yeşil
            "Orta": "#f59e0b",     # Turuncu
            "Yüksek": "#ef4444"    # Kırmızı
        }
        return colors.get(self.severity, "#6b7280")  # Gri default
EARTH_EVENT_CATEGORIES = {
    "volcanoes": {
        "turkish": "Yanardağ",
        "icon": "??",
        "description": "Volkanik aktivite ve patlamalar"
    },
    "wildfires": {
        "turkish": "Orman Yangını",
        "icon": "??", 
        "description": "Doğal ve insan kaynaklı yangınlar"
    },
    "severe_storms": {
        "turkish": "Şiddetli Fırtına",
        "icon": "??",
        "description": "Kasırga, tornado ve şiddetli fırtınalar"
    },
    "floods": {
        "turkish": "Sel",
        "icon": "??",
        "description": "Seller ve su baskınları"
    },
    "earthquakes": {
        "turkish": "Deprem", 
        "icon": "???",
        "description": "Sismik aktivite ve depremler"
    },
    "drought": {
        "turkish": "Kuraklık",
        "icon": "???",
        "description": "Uzun süreli kuraklık durumları"
    },
    "dust_haze": {
        "turkish": "Toz Fırtınası",
        "icon": "???", 
        "description": "Toz fırtınaları ve hava kirliliği"
    },
    "landslides": {
        "turkish": "Heyelan",
        "icon": "??",
        "description": "Toprak kaymaları ve heyelanlar"
    },
    "temperature_extremes": {
        "turkish": "Aşırı Sıcaklık",
        "icon": "???",
        "description": "Aşırı sıcak ve soğuk hava durumları"
    },
    "snow": {
        "turkish": "Kar Fırtınası", 
        "icon": "??",
        "description": "Kar fırtınaları ve buzlanma"
    }
}
def categorize_earth_event(original_category: str, title: str = "") -> tuple[str, str]:
    
    title_lower = title.lower()
    cat_lower = original_category.lower()
    if "volcano" in cat_lower or "yanardağ" in title_lower:
        category = "Yanardağ"
    elif "wildfire" in cat_lower or "fire" in cat_lower or "yangın" in title_lower:
        category = "Orman Yangını"
    elif "storm" in cat_lower or "hurricane" in cat_lower or "fırtına" in title_lower:
        category = "Şiddetli Fırtına"
    elif "flood" in cat_lower or "sel" in title_lower:
        category = "Sel"
    elif "earthquake" in cat_lower or "deprem" in title_lower:
        category = "Deprem"
    elif "drought" in cat_lower or "kuraklık" in title_lower:
        category = "Kuraklık"
    elif "dust" in cat_lower or "haze" in cat_lower or "toz" in title_lower:
        category = "Toz Fırtınası"
    elif "landslide" in cat_lower or "heyelan" in title_lower:
        category = "Heyelan"
    elif "temperature" in cat_lower or "heat" in cat_lower or "cold" in cat_lower:
        category = "Aşırı Sıcaklık"
    elif "snow" in cat_lower or "ice" in cat_lower or "kar" in title_lower:
        category = "Kar Fırtınası"
    else:
        category = "Diğer"
    severity = "Düşük"
    if any(keyword in title_lower for keyword in ["major", "severe", "extreme", "critical", "şiddetli", "büyük", "kritik"]):
        severity = "Yüksek"
    elif any(keyword in title_lower for keyword in ["moderate", "significant", "orta", "önemli"]):
        severity = "Orta"
    return category, severity
def get_region_from_coordinates(lat: float, lon: float) -> str:
    
    if lat >= 35 and lat <= 42 and lon >= 26 and lon <= 45:
        return "Türkiye"
    elif lat >= 40 and lat <= 70 and lon >= -10 and lon <= 40:
        return "Avrupa"
    elif lat >= 25 and lat <= 50 and lon >= -130 and lon <= -60:
        return "Kuzey Amerika"
    elif lat >= -40 and lat <= 15 and lon >= -80 and lon <= -35:
        return "Güney Amerika"
    elif lat >= -35 and lat <= 35 and lon >= 15 and lon <= 55:
        return "Afrika"
    elif lat >= 10 and lat <= 55 and lon >= 60 and lon <= 150:
        return "Asya"
    elif lat >= -50 and lat <= -10 and lon >= 110 and lon <= 180:
        return "Okyanusya"
    else:
        return "Diğer Bölgeler"
class EarthEventProcessor:
    
    @staticmethod
    def process_nasa_event(raw_event: Dict[str, Any]) -> SimpleEarthEventModel:
        
        try:
            event_id = raw_event.get("id", "unknown")
            title = raw_event.get("title", "Bilinmeyen Olay")
            category_data = raw_event.get("categories", [{}])
            original_category = category_data[0].get("title", "") if category_data else ""
            category, severity = categorize_earth_event(original_category, title)
            date = ""
            location = None
            coordinates = None
            geometry = raw_event.get("geometry", [])
            if geometry:
                last_geom = geometry[-1]
                date = last_geom.get("date", "")[:10]  # Sadece tarih kısmı
                if last_geom.get("coordinates"):
                    coords = last_geom["coordinates"]
                    if isinstance(coords, list) and len(coords) >= 2:
                        coordinates = {"lat": coords[1], "lon": coords[0]}
                        location = get_region_from_coordinates(coords[1], coords[0])
            description = raw_event.get("description", "")
            if description and len(description) > 150:
                description = description[:147] + "..."
            return SimpleEarthEventModel(
                id=event_id,
                title=title,
                category=category,
                severity=severity,
                date=date,
                location=location,
                description=description,
                coordinates=coordinates
            )
        except Exception as e:
            return SimpleEarthEventModel(
                id=raw_event.get("id", "error"),
                title="Veri İşleme Hatası",
                category="Diğer",
                severity="Düşük",
                date=""
            )
    @staticmethod
    def calculate_statistics(events: List[SimpleEarthEventModel]) -> EarthEventStatistics:
        
        if not events:
            return EarthEventStatistics()
        by_category = {}
        by_severity = {"Düşük": 0, "Orta": 0, "Yüksek": 0}
        by_region = {}
        for event in events:
            by_category[event.category] = by_category.get(event.category, 0) + 1
            by_severity[event.severity] += 1
            if event.location:
                by_region[event.location] = by_region.get(event.location, 0) + 1
        return EarthEventStatistics(
            total_events=len(events),
            active_events=len(events),  # Hepsi aktif kabul et
            by_category=by_category,
            by_severity=by_severity,
            by_region=by_region
        )
class EarthEvent(EarthEventDocument):
    
    pass
