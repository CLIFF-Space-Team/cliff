from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
class SimpleThreatResponse(BaseModel):
    
    threat_level: str = Field(..., description="Tehdit seviyesi: Düşük, Orta, Yüksek")
    color: str = Field(..., description="Renk kodu")
    description: str = Field(..., description="Durum açıklaması")
    confidence: float = Field(..., description="Güvenilirlik (0-1)")
    last_updated: datetime = Field(..., description="Son güncelleme")
class SimpleAlert(BaseModel):
    
    id: str = Field(..., description="Uyarı ID")
    level: str = Field(..., description="Uyarı seviyesi: Düşük, Orta, Yüksek")
    title: str = Field(..., description="Uyarı başlığı")
    message: str = Field(..., description="Uyarı mesajı")
    type: str = Field(..., description="Uyarı türü: asteroid, earth_event, space_weather")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Oluşturulma zamanı")
    expires_at: Optional[datetime] = Field(None, description="Geçerlilik süresi")
class ThreatStatistics(BaseModel):
    
    total_asteroids: int = Field(default=0, description="Toplam asteroit sayısı")
    hazardous_asteroids: int = Field(default=0, description="Tehlikeli asteroit sayısı")
    active_earth_events: int = Field(default=0, description="Aktif doğal olay sayısı")
    space_weather_events: int = Field(default=0, description="Uzay hava olayı sayısı")
    threat_distribution: Dict[str, int] = Field(default_factory=dict, description="Tehdit dağılımı")
class SimplifiedThreatAssessment(BaseModel):
    
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Değerlendirme zamanı")
    overall_level: str = Field(..., description="Genel seviye: Düşük, Orta, Yüksek")
    confidence: float = Field(default=0.8, description="Güvenilirlik")
    statistics: ThreatStatistics = Field(..., description="İstatistikler")
    recommendations: List[str] = Field(default_factory=list, description="Öneriler")
    data_sources: List[str] = Field(default_factory=list, description="Kullanılan veri kaynakları")
    next_assessment: datetime = Field(..., description="Sonraki değerlendirme")
class SimpleAlertDocument(BaseModel):
    
    alert_id: str = Field(..., description="Uyarı ID")
    level: str = Field(..., description="Seviye: Düşük, Orta, Yüksek")
    title: str = Field(..., description="Başlık")
    message: str = Field(..., description="Mesaj")
    alert_type: str = Field(..., description="Tür")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Oluşturulma")
    expires_at: Optional[datetime] = Field(None, description="Geçerlilik")
    acknowledged: bool = Field(default=False, description="Okundu mu?")
    source_data: Optional[Dict[str, Any]] = Field(None, description="Kaynak veri")
class ThreatLevelResponse(BaseModel):
    
    overall_threat_level: str = Field(..., description="Genel tehdit seviyesi")
    risk_score: float = Field(default=50.0, description="Risk skoru (0-100)")
    active_threats_count: int = Field(default=0, description="Aktif tehdit sayısı")
    last_updated: datetime = Field(default_factory=datetime.utcnow, description="Son güncelleme")
    data_sources: List[str] = Field(default_factory=list, description="Veri kaynakları")
    confidence_score: float = Field(default=0.8, description="Güvenilirlik")
class ThreatDetail(BaseModel):
    
    threat_id: str = Field(..., description="Tehdit ID")
    threat_type: str = Field(..., description="Tehdit türü")
    severity: str = Field(..., description="Önem: Düşük, Orta, Yüksek")
    title: str = Field(..., description="Başlık")
    description: str = Field(..., description="Açıklama")
    impact_probability: float = Field(default=0.1, description="Etki olasılığı")
    time_to_impact: Optional[str] = Field(None, description="Etki zamanı")
    recommended_actions: List[str] = Field(default_factory=list, description="Öneriler")
    data_source: str = Field(default="CLIFF", description="Veri kaynağı")
    coordinates: Optional[Dict[str, float]] = Field(None, description="Koordinatlar")
    ai_analysis: Optional[Dict[str, Any]] = Field(None, description="AI analizi")
class ComprehensiveAssessment(BaseModel):
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    overall_risk: ThreatLevelResponse = Field(...)
    active_threats: List[ThreatDetail] = Field(default_factory=list)
    threat_categories: Dict[str, int] = Field(default_factory=dict)
    geographic_hotspots: List[Dict[str, Any]] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    next_assessment: datetime = Field(...)
class ThreatAlert(BaseModel):
    
    alert_id: str = Field(...)
    alert_level: str = Field(..., description="Seviye: INFO, WARNING, CRITICAL -> Düşük, Orta, Yüksek")
    message: str = Field(...)
    threat_details: ThreatDetail = Field(...)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = Field(None)
class CurrentThreatResponse(BaseModel):
    
    threat_level: str = Field(..., description="Düşük, Orta, Yüksek")
    color: str = Field(..., description="Hex renk kodu")
    description: str = Field(..., description="Durum açıklaması")
    active_threats: Dict[str, int] = Field(..., description="Aktif tehdit sayıları")
    recommendations: List[str] = Field(..., description="Öneriler")
    last_updated: str = Field(..., description="Son güncelleme (ISO format)")
    confidence: float = Field(..., description="Güvenilirlik")
class ThreatSummaryResponse(BaseModel):
    
    overall_status: str = Field(..., description="normal, watch, elevated")
    high_priority_threats: List[Dict[str, Any]] = Field(..., description="Yüksek öncelik")
    medium_priority_threats: List[Dict[str, Any]] = Field(..., description="Orta öncelik")
    statistics: Dict[str, Any] = Field(..., description="İstatistikler")
    last_updated: str = Field(..., description="Son güncelleme")
class AsteroidThreatResponse(BaseModel):
    
    asteroids: List[Dict[str, Any]] = Field(..., description="Asteroit listesi")
    total_count: int = Field(..., description="Toplam sayı")
    hazardous_count: int = Field(..., description="Tehlikeli sayı")
    threat_distribution: Dict[str, int] = Field(..., description="Tehdit dağılımı")
    last_updated: str = Field(..., description="Son güncelleme")
class EarthEventResponse(BaseModel):
    
    events: List[Dict[str, Any]] = Field(..., description="Olay listesi")
    total_count: int = Field(..., description="Toplam sayı")
    severity_distribution: Dict[str, int] = Field(..., description="Önem dağılımı")
    category_distribution: Dict[str, int] = Field(..., description="Kategori dağılımı")
    last_updated: str = Field(..., description="Son güncelleme")
class SpaceWeatherResponse(BaseModel):
    
    events: List[Dict[str, Any]] = Field(..., description="Olay listesi")
    total_count: int = Field(..., description="Toplam sayı")
    intensity_distribution: Dict[str, int] = Field(..., description="Şiddet dağılımı")
    recent_high_activity: int = Field(..., description="Son yüksek aktivite")
    current_condition: str = Field(..., description="Mevcut durum")
    last_updated: str = Field(..., description="Son güncelleme")
def convert_old_severity_to_new(old_severity: str) -> str:
    
    mapping = {
        "LOW": "Düşük",
        "MODERATE": "Orta", 
        "HIGH": "Yüksek",
        "CRITICAL": "Yüksek",
        "INFO": "Düşük",
        "WARNING": "Orta",
        "CRITICAL": "Yüksek"
    }
    return mapping.get(old_severity.upper(), "Düşük")
def get_threat_color(level: str) -> str:
    
    colors = {
        "Düşük": "#22c55e",    # Yeşil
        "Orta": "#f59e0b",     # Sarı/Turuncu
        "Yüksek": "#ef4444"    # Kırmızı
    }
    return colors.get(level, "#22c55e")
def calculate_simple_risk_score(level: str, threat_count: int = 0) -> float:
    
    base_scores = {
        "Düşük": 25.0,
        "Orta": 50.0,
        "Yüksek": 75.0
    }
    base = base_scores.get(level, 25.0)
    adjustment = min(threat_count * 2.0, 20.0)
    return min(base + adjustment, 100.0)
