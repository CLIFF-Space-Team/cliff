"""
🌌 CLIFF Threat Assessment API Endpoints - Basitleştirilmiş Versiyon
Kullanıcı dostu tehdit izleme sistemi
"""

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Path
import structlog

from app.services.nasa_services import (
    get_simplified_nasa_services, 
    SimplifiedNASAServices, 
    NASAServices,
    get_full_nasa_service
)
from app.services.ai_services import get_ai_services, VertexAIServices
from app.models.threat import SimpleThreatResponse, SimpleAlert

# Setup logging
logger = structlog.get_logger(__name__)

# Create router
router = APIRouter()

# Dependency injection fonksiyonları
async def get_nasa_service() -> NASAServices:
    """NASA Services dependency injection"""
    return NASAServices()

async def get_simplified_nasa_service() -> SimplifiedNASAServices:
    """Simplified NASA Services dependency injection"""
    return get_simplified_nasa_services()

# =============================================================================
# BASITLEŞTIRILMIŞ THREAT ENDPOINTS
# =============================================================================

@router.get("/alerts")
async def get_threat_alerts(
    limit: int = Query(20, ge=1, le=100, description="Maksimum alert sayısı"),
    severity: Optional[str] = Query(None, description="Severity filter"),
    nasa_services: SimplifiedNASAServices = Depends(get_simplified_nasa_services)
) -> List[Dict[str, Any]]:
    """
    Aktif tehdit alertlerini al
    """
    try:
        logger.info(f"Tehdit alertleri alınıyor (limit: {limit})...")
        
        # Basit alert listesi oluştur - mevcut sistemdeki verilerden
        alerts = []
        
        # Asteroit tehditlerini al
        try:
            asteroids = await nasa_services.get_simple_asteroids(days_ahead=7)
            for ast in asteroids[:5]:  # İlk 5 asteroit
                if ast.threat_level in ["Yüksek", "Orta"]:
                    alert_level = "CRITICAL" if ast.threat_level == "Yüksek" else "WARNING"
                    alerts.append({
                        "alert_id": f"asteroid-{ast.id}",
                        "alert_level": alert_level,
                        "message": f"Asteroit {ast.name} yaklaşıyor",
                        "threat_details": {
                            "threat_id": ast.id,
                            "threat_type": "asteroid", 
                            "severity": ast.threat_level.upper(),
                            "title": f"Asteroit: {ast.name}",
                            "description": f"{ast.approach_date} tarihinde {ast.distance_km:,.0f} km mesafeden geçecek",
                            "impact_probability": 0.1 if ast.is_hazardous else 0.01,
                            "recommended_actions": ["Yakın takip", "Güvenlik değerlendirmesi"],
                            "data_source": "NASA NEO API"
                        },
                        "created_at": datetime.utcnow().isoformat(),
                        "expires_at": (datetime.utcnow() + timedelta(days=1)).isoformat()
                    })
        except Exception as e:
            logger.warning(f"Asteroit alertleri alınamadı: {str(e)}")
        
        # Doğal olay tehditlerini al
        try:
            events = await nasa_services.get_simple_earth_events(limit=5)
            for event in events:
                if event.severity in ["Yüksek", "Orta"]:
                    alert_level = "CRITICAL" if event.severity == "Yüksek" else "WARNING"
                    alerts.append({
                        "alert_id": f"earth-{event.id}",
                        "alert_level": alert_level,
                        "message": f"{event.category}: {event.title[:50]}",
                        "threat_details": {
                            "threat_id": event.id,
                            "threat_type": "earth_event",
                            "severity": event.severity.upper(),
                            "title": event.title,
                            "description": event.description or "Doğal afet bildirimi",
                            "impact_probability": 0.8 if event.severity == "Yüksek" else 0.4,
                            "recommended_actions": ["Bölge takibi", "Erken uyarı"],
                            "data_source": "NASA EONET"
                        },
                        "created_at": datetime.utcnow().isoformat(),
                        "expires_at": (datetime.utcnow() + timedelta(days=2)).isoformat()
                    })
        except Exception as e:
            logger.warning(f"Doğal olay alertleri alınamadı: {str(e)}")
        
        # Uzay hava durumu tehditlerini al
        try:
            weather = await nasa_services.get_simple_space_weather()
            for w in weather[:3]:  # İlk 3 olay
                if w.intensity in ["Yüksek", "Orta"]:
                    alert_level = "CRITICAL" if w.intensity == "Yüksek" else "WARNING"
                    alerts.append({
                        "alert_id": f"space-{w.id}",
                        "alert_level": alert_level,
                        "message": f"Uzay Hava Durumu: {w.type}",
                        "threat_details": {
                            "threat_id": w.id,
                            "threat_type": "space_weather",
                            "severity": w.intensity.upper(),
                            "title": f"Güneş Aktivitesi: {w.type}",
                            "description": w.impact or "Uzay hava durumu etkisi",
                            "impact_probability": 0.6,
                            "recommended_actions": ["Uydu sistemleri izleme", "Radyo kesintisi uyarısı"],
                            "data_source": "NOAA SWPC"
                        },
                        "created_at": w.start_time.isoformat(),
                        "expires_at": (w.start_time + timedelta(hours=12)).isoformat()
                    })
        except Exception as e:
            logger.warning(f"Uzay hava durumu alertleri alınamadı: {str(e)}")
        
        # Severity filter uygula
        if severity:
            severity_map = {"critical": "CRITICAL", "warning": "WARNING", "info": "INFO"}
            target_severity = severity_map.get(severity.lower())
            if target_severity:
                alerts = [a for a in alerts if a["alert_level"] == target_severity]
        
        # Tarihe göre sırala ve limit uygula
        alerts.sort(key=lambda x: x["created_at"], reverse=True)
        alerts = alerts[:limit]
        
        logger.info(f"Tehdit alertleri hazırlandı: {len(alerts)} adet")
        return alerts
        
    except Exception as e:
        logger.error(f"Tehdit alertleri alınamadı: {str(e)}")
        # Güvenli varsayılan değer
        return []


@router.get("/current")
async def get_current_threat_level(
    nasa_services: SimplifiedNASAServices = Depends(get_simplified_nasa_services)
) -> Dict[str, Any]:
    """
    Güncel tehdit seviyesini al - Basit 3 seviyeli sistem
    """
    try:
        logger.info("Güncel tehdit seviyesi alınıyor...")
        
        # Basit tehdit özetini al
        summary = await nasa_services.get_simple_threat_summary()
        
        # Türkçe renk kodlaması
        color_map = {
            "Düşük": "#22c55e",    # Yeşil
            "Orta": "#f59e0b",     # Sarı
            "Yüksek": "#ef4444"    # Kırmızı
        }
        
        response = {
            "threat_level": summary.overall_level,
            "color": color_map.get(summary.overall_level, "#22c55e"),
            "description": _get_level_description(summary.overall_level),
            "active_threats": {
                "asteroids": summary.asteroid_count,
                "earth_events": summary.earth_events_count,
                "space_weather": summary.space_weather_count
            },
            "recommendations": summary.recommendations,
            "last_updated": summary.last_updated.isoformat(),
            "confidence": 0.85
        }
        
        logger.info(f"Tehdit seviyesi: {summary.overall_level}")
        return response
        
    except Exception as e:
        logger.error(f"Tehdit seviyesi alınamadı: {str(e)}")
        # Güvenli varsayılan değer
        return {
            "threat_level": "Düşük",
            "color": "#22c55e",
            "description": "Sistem geçici olarak kullanılamıyor",
            "active_threats": {"asteroids": 0, "earth_events": 0, "space_weather": 0},
            "recommendations": ["Daha sonra tekrar deneyin"],
            "last_updated": datetime.utcnow().isoformat(),
            "confidence": 0.5
        }


@router.get("/summary")
async def get_threat_summary(
    nasa_services: SimplifiedNASAServices = Depends(get_simplified_nasa_services)
) -> Dict[str, Any]:
    """
    Basit tehdit özeti
    """
    try:
        logger.info("Tehdit özeti hazırlanıyor...")
        
        # Paralel veri toplama
        asteroids, earth_events, space_weather = await asyncio.gather(
            nasa_services.get_simple_asteroids(days_ahead=7),
            nasa_services.get_simple_earth_events(limit=10),
            nasa_services.get_simple_space_weather(),
            return_exceptions=True
        )
        
        # Hata kontrolü
        if isinstance(asteroids, Exception):
            asteroids = []
        if isinstance(earth_events, Exception):
            earth_events = []
        if isinstance(space_weather, Exception):
            space_weather = []
        
        # Kategorilere ayır
        high_priority = []
        medium_priority = []
        
        # Yüksek öncelikli tehditleri topla
        for ast in asteroids:
            if ast.threat_level == "Yüksek":
                high_priority.append({
                    "type": "asteroid",
                    "title": f"Asteroit: {ast.name}",
                    "description": f"{ast.approach_date} tarihinde yaklaşacak",
                    "level": "Yüksek"
                })
            elif ast.threat_level == "Orta":
                medium_priority.append({
                    "type": "asteroid",
                    "title": f"Asteroit: {ast.name}",
                    "level": "Orta"
                })
        
        for event in earth_events:
            if event.severity == "Yüksek":
                high_priority.append({
                    "type": "earth_event",
                    "title": f"{event.category}: {event.title[:50]}...",
                    "description": event.location or "Global",
                    "level": "Yüksek"
                })
            elif event.severity == "Orta":
                medium_priority.append({
                    "type": "earth_event",
                    "title": f"{event.category}: {event.title[:30]}...",
                    "level": "Orta"
                })
        
        for weather in space_weather:
            if weather.intensity == "Yüksek":
                high_priority.append({
                    "type": "space_weather",
                    "title": "Güçlü Güneş Patlaması",
                    "description": weather.impact,
                    "level": "Yüksek"
                })
        
        # Genel durum değerlendirmesi
        overall_status = "normal"
        if len(high_priority) >= 2:
            overall_status = "elevated"
        elif len(high_priority) >= 1:
            overall_status = "watch"
        
        summary = {
            "overall_status": overall_status,
            "high_priority_threats": high_priority[:5],  # Maksimum 5 adet
            "medium_priority_threats": medium_priority[:10],  # Maksimum 10 adet
            "statistics": {
                "total_asteroids": len(asteroids),
                "hazardous_asteroids": sum(1 for a in asteroids if a.is_hazardous),
                "active_earth_events": len(earth_events),
                "space_weather_events": len(space_weather)
            },
            "last_updated": datetime.utcnow().isoformat()
        }
        
        logger.info(f"Tehdit özeti hazırlandı: {overall_status} durumu")
        return summary
        
    except Exception as e:
        logger.error(f"Tehdit özeti hazırlanamadı: {str(e)}")
        return {
            "overall_status": "error",
            "high_priority_threats": [],
            "medium_priority_threats": [],
            "statistics": {"total_asteroids": 0, "hazardous_asteroids": 0, "active_earth_events": 0, "space_weather_events": 0},
            "last_updated": datetime.utcnow().isoformat()
        }


@router.get("/asteroids")
async def get_asteroid_threats(
    limit: int = Query(10, ge=1, le=50, description="Maksimum asteroit sayısı"),
    nasa_services: SimplifiedNASAServices = Depends(get_simplified_nasa_services)
) -> Dict[str, Any]:
    """
    Basit asteroit tehditleri listesi
    """
    try:
        logger.info(f"Asteroit tehditleri alınıyor (limit: {limit})...")
        
        # days_ahead parametresi 7'den fazla olmasın
        asteroids = await nasa_services.get_simple_asteroids(days_ahead=7)  # 30'dan 7'ye düşür
        
        # Tehdit seviyesine göre sırala
        asteroids.sort(key=lambda x: {"Yüksek": 3, "Orta": 2, "Düşük": 1}.get(x.threat_level, 0), reverse=True)
        
        # İlk N tanesini al
        limited_asteroids = asteroids[:limit]
        
        # Basit format
        asteroid_list = []
        for ast in limited_asteroids:
            asteroid_info = {
                "id": ast.id,
                "name": ast.name,
                "threat_level": ast.threat_level,
                "is_hazardous": ast.is_hazardous,
                "approach_date": ast.approach_date,
                "estimated_diameter": f"{ast.diameter_km:.1f} km" if ast.diameter_km else "Bilinmiyor",
                "distance": f"{ast.distance_km:,.0f} km" if ast.distance_km else "Bilinmiyor",
                "velocity": f"{ast.velocity_kmh:,.0f} km/h" if ast.velocity_kmh else "Bilinmiyor",
                "orbital_data": ast.orbital_data
            }
            asteroid_list.append(asteroid_info)
        
        response = {
            "asteroids": asteroid_list,
            "total_count": len(asteroids),
            "hazardous_count": sum(1 for a in asteroids if a.is_hazardous),
            "threat_distribution": {
                "high": sum(1 for a in asteroids if a.threat_level == "Yüksek"),
                "medium": sum(1 for a in asteroids if a.threat_level == "Orta"),
                "low": sum(1 for a in asteroids if a.threat_level == "Düşük")
            },
            "last_updated": datetime.utcnow().isoformat()
        }
        
        logger.info(f"Asteroit listesi hazırlandı: {len(asteroid_list)} adet")
        return response
        
    except Exception as e:
        logger.error(f"Asteroit tehditleri alınamadı: {str(e)}")
        return {
            "asteroids": [],
            "total_count": 0,
            "hazardous_count": 0,
            "threat_distribution": {"high": 0, "medium": 0, "low": 0},
            "last_updated": datetime.utcnow().isoformat()
        }


@router.get("/earth-events")
async def get_earth_event_threats(
    limit: int = Query(15, ge=1, le=50, description="Maksimum olay sayısı"),
    nasa_services: SimplifiedNASAServices = Depends(get_simplified_nasa_services)
) -> Dict[str, Any]:
    """
    Basit doğal olay tehditleri
    """
    try:
        logger.info(f"Doğal olay tehditleri alınıyor (limit: {limit})...")
        
        events = await nasa_services.get_simple_earth_events(limit=limit)
        
        # Önem derecesine göre sırala
        events.sort(key=lambda x: {"Yüksek": 3, "Orta": 2, "Düşük": 1}.get(x.severity, 0), reverse=True)
        
        # Basit format
        event_list = []
        for event in events:
            event_info = {
                "id": event.id,
                "title": event.title,
                "category": event.category,
                "severity": event.severity,
                "date": event.date,
                "location": event.location or "Global",
                "description": event.description[:100] + "..." if event.description and len(event.description) > 100 else event.description
            }
            event_list.append(event_info)
        
        # Kategorilere göre grupla
        category_counts = {}
        for event in events:
            category_counts[event.category] = category_counts.get(event.category, 0) + 1
        
        response = {
            "events": event_list,
            "total_count": len(events),
            "severity_distribution": {
                "high": sum(1 for e in events if e.severity == "Yüksek"),
                "medium": sum(1 for e in events if e.severity == "Orta"),
                "low": sum(1 for e in events if e.severity == "Düşük")
            },
            "category_distribution": category_counts,
            "last_updated": datetime.utcnow().isoformat()
        }
        
        logger.info(f"Doğal olay listesi hazırlandı: {len(event_list)} adet")
        return response
        
    except Exception as e:
        logger.error(f"Doğal olay tehditleri alınamadı: {str(e)}")
        return {
            "events": [],
            "total_count": 0,
            "severity_distribution": {"high": 0, "medium": 0, "low": 0},
            "category_distribution": {},
            "last_updated": datetime.utcnow().isoformat()
        }


@router.get("/space-weather")
async def get_space_weather_threats(
    nasa_services: SimplifiedNASAServices = Depends(get_simplified_nasa_services)
) -> Dict[str, Any]:
    """
    Basit uzay hava durumu tehditleri
    """
    try:
        logger.info("Uzay hava durumu tehditleri alınıyor...")
        
        weather_events = await nasa_services.get_simple_space_weather()
        
        # Şiddete göre sırala
        weather_events.sort(key=lambda x: {"Yüksek": 3, "Orta": 2, "Düşük": 1}.get(x.intensity, 0), reverse=True)
        
        # Basit format
        weather_list = []
        for weather in weather_events:
            weather_info = {
                "id": weather.id,
                "type": weather.type,
                "intensity": weather.intensity,
                "start_time": weather.start_time.isoformat(),
                "impact": weather.impact,
                "duration": _calculate_duration(weather.start_time)
            }
            weather_list.append(weather_info)
        
        # Son 24 saatteki yüksek şiddetli olayları say
        recent_high = sum(1 for w in weather_events 
                         if w.intensity == "Yüksek" and 
                         (datetime.utcnow() - w.start_time).days == 0)
        
        response = {
            "events": weather_list,
            "total_count": len(weather_events),
            "intensity_distribution": {
                "high": sum(1 for w in weather_events if w.intensity == "Yüksek"),
                "medium": sum(1 for w in weather_events if w.intensity == "Orta"),
                "low": sum(1 for w in weather_events if w.intensity == "Düşük")
            },
            "recent_high_activity": recent_high,
            "current_condition": _assess_space_weather_condition(weather_events),
            "last_updated": datetime.utcnow().isoformat()
        }
        
        logger.info(f"Uzay hava durumu listesi hazırlandı: {len(weather_list)} adet")
        return response
        
    except Exception as e:
        logger.error(f"Uzay hava durumu tehditleri alınamadı: {str(e)}")
        return {
            "events": [],
            "total_count": 0,
            "intensity_distribution": {"high": 0, "medium": 0, "low": 0},
            "recent_high_activity": 0,
            "current_condition": "Bilinmiyor",
            "last_updated": datetime.utcnow().isoformat()
        }


@router.get("/asteroids/browse/")
async def browse_asteroids(
    page: int = Query(0, ge=0, description="Sayfa numarası (0'dan başlar)"),
    size: int = Query(20, ge=1, le=20, description="Sayfa boyutu"),
    nasa_services: SimplifiedNASAServices = Depends(get_simplified_nasa_services)
) -> Dict[str, Any]:
    """
    Asteroit veritabanını tara - NEO Browse API
    """
    try:
        logger.info(f"Asteroit tarama başlatılıyor (sayfa: {page}, boyut: {size})")
        
        result = await nasa_services.browse_asteroids(page=page, size=size)
        
        # Asteroit listesini formatla
        formatted_asteroids = []
        for asteroid in result["asteroids"]:
            formatted_asteroids.append({
                "id": asteroid.id,
                "name": asteroid.name,
                "threat_level": asteroid.threat_level,
                "is_hazardous": asteroid.is_hazardous,
                "approach_date": asteroid.approach_date,
                "estimated_diameter": f"{asteroid.diameter_km:.1f} km" if asteroid.diameter_km else "Bilinmiyor",
                "distance": f"{asteroid.distance_km:,.0f} km" if asteroid.distance_km else "Bilinmiyor",
                "velocity": f"{asteroid.velocity_kmh:,.0f} km/h" if asteroid.velocity_kmh else "Bilinmiyor"
            })
        
        response = {
            "asteroids": formatted_asteroids,
            "pagination": result["pagination"],
            "navigation_links": result["links"],
            "retrieved_at": datetime.utcnow().isoformat(),
            "total_in_page": len(formatted_asteroids)
        }
        
        logger.info(f"Asteroit tarama tamamlandı: {len(formatted_asteroids)} adet (sayfa {page})")
        return response
        
    except Exception as e:
        logger.error(f"Asteroit tarama hatası: {str(e)}")
        return {
            "asteroids": [],
            "pagination": {"page": page, "size": size, "total_elements": 0, "total_pages": 0},
            "navigation_links": {},
            "error": "Asteroit tarama başarısız",
            "message": "Teknik bir sorun oluştu",
            "retrieved_at": datetime.utcnow().isoformat(),
            "total_in_page": 0
        }


@router.get("/nasa/apod")
async def get_astronomy_picture(
    date: Optional[str] = Query(None, description="Tarih (YYYY-MM-DD formatında, boş bırakılırsa bugün)"),
    nasa_services: SimplifiedNASAServices = Depends(get_simplified_nasa_services)
) -> Dict[str, Any]:
    """
    NASA Astronomy Picture of the Day - Günün Astronomi Resmi
    """
    try:
        logger.info(f"APOD verisi isteniyor (tarih: {date or 'bugün'})")
        
        apod_data = await nasa_services.get_astronomy_picture_of_day(date=date)
        
        response = {
            "apod": apod_data,
            "retrieved_at": datetime.utcnow().isoformat(),
            "status": "success"
        }
        
        logger.info(f"APOD verisi döndürüldü: {apod_data['title']}")
        return response
        
    except Exception as e:
        logger.error(f"APOD verisi alınamadı: {str(e)}")
        return {
            "apod": {
                "title": "APOD Verisi Alınamadı",
                "explanation": "Teknik sorun nedeniyle günün astronomi resmi alınamadı",
                "date": date or datetime.utcnow().strftime("%Y-%m-%d"),
                "media_type": "error",
                "url": "",
                "hdurl": "",
                "copyright": "NASA"
            },
            "retrieved_at": datetime.utcnow().isoformat(),
            "status": "error",
            "message": "APOD verisi alınamadı"
        }


@router.get("/nasa/earth-images")
async def get_earth_images(
    date: Optional[str] = Query(None, description="Tarih (YYYY-MM-DD formatında, boş bırakılırsa dün)"),
    nasa_services: SimplifiedNASAServices = Depends(get_simplified_nasa_services)
) -> Dict[str, Any]:
    """
    NASA EPIC - Dünya'nın uzaydan görüntüleri
    """
    try:
        logger.info(f"EPIC Dünya görüntüleri isteniyor (tarih: {date or 'dün'})")
        
        earth_images = await nasa_services.get_earth_images(date=date)
        
        response = {
            "earth_images": earth_images,
            "total_images": len(earth_images),
            "date": date or (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "retrieved_at": datetime.utcnow().isoformat(),
            "status": "success" if earth_images else "no_data"
        }
        
        logger.info(f"EPIC görüntüler döndürüldü: {len(earth_images)} adet")
        return response
        
    except Exception as e:
        logger.error(f"EPIC verisi alınamadı: {str(e)}")
        return {
            "earth_images": [],
            "total_images": 0,
            "date": date or (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "retrieved_at": datetime.utcnow().isoformat(),
            "status": "error",
            "message": "Dünya görüntüleri alınamadı"
        }


@router.get("/nasa/mars-photos")
async def get_mars_rover_photos(
    rover: str = Query("curiosity", description="Mars gezgini (curiosity, opportunity, spirit)"),
    sol: int = Query(1000, ge=1, description="Sol (Mars günü)"),
    nasa_services: SimplifiedNASAServices = Depends(get_simplified_nasa_services)
) -> Dict[str, Any]:
    """
    NASA Mars Rover Photos - Mars gezgini fotoğrafları
    """
    try:
        logger.info(f"Mars Rover fotoğrafları isteniyor ({rover}, sol {sol})")
        
        mars_photos = await nasa_services.get_mars_rover_photos(rover=rover.lower(), sol=sol)
        
        response = {
            "mars_photos": mars_photos,
            "total_photos": len(mars_photos),
            "rover": rover.title(),
            "sol": sol,
            "retrieved_at": datetime.utcnow().isoformat(),
            "status": "success" if mars_photos else "no_data"
        }
        
        logger.info(f"Mars fotoğrafları döndürüldü: {len(mars_photos)} adet ({rover})")
        return response
        
    except Exception as e:
        logger.error(f"Mars Rover verisi alınamadı: {str(e)}")
        return {
            "mars_photos": [],
            "total_photos": 0,
            "rover": rover.title(),
            "sol": sol,
            "retrieved_at": datetime.utcnow().isoformat(),
            "status": "error",
            "message": f"Mars gezgini ({rover}) fotoğrafları alınamadı"
        }


@router.post("/refresh", status_code=202)
async def refresh_threat_data(
    background_tasks: BackgroundTasks,
    nasa_services: SimplifiedNASAServices = Depends(get_simplified_nasa_services)
) -> Dict[str, Any]:
    """
    Tehdit verilerini yenile - Basit versiyon
    """
    try:
        logger.info("Tehdit verileri yenilenmeye başlanıyor...")
        
        # Arka planda veri yenilemesi başlat
        background_tasks.add_task(_refresh_data_background, nasa_services)
        
        return {
            "message": "Tehdit verileri arka planda yenileniyor",
            "status": "started",
            "initiated_at": datetime.utcnow().isoformat(),
            "estimated_completion": (datetime.utcnow() + timedelta(minutes=2)).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Veri yenileme başlatılamadı: {str(e)}")
        raise HTTPException(status_code=500, detail="Veri yenileme başlatılamadı")


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def _get_level_description(level: str) -> str:
    """Seviye açıklaması"""
    descriptions = {
        "Düşük": "Normal koşullar. Rutin gözlem devam ediyor.",
        "Orta": "Artmış aktivite gözlemleniyor. Dikkatli takip gerekli.",
        "Yüksek": "Yüksek riskli durumlar tespit edildi. Yakın takip öneriliyor."
    }
    return descriptions.get(level, "Bilinmeyen durum")


def _calculate_duration(start_time: datetime) -> str:
    """Süre hesaplama"""
    duration = datetime.utcnow() - start_time
    
    if duration.days > 0:
        return f"{duration.days} gün önce"
    elif duration.seconds > 3600:
        hours = duration.seconds // 3600
        return f"{hours} saat önce"
    elif duration.seconds > 60:
        minutes = duration.seconds // 60
        return f"{minutes} dakika önce"
    else:
        return "Az önce"


def _assess_space_weather_condition(events: List) -> str:
    """Uzay hava durumu genel değerlendirmesi"""
    if not events:
        return "Sakin"
    
    high_count = sum(1 for e in events if e.intensity == "Yüksek")
    recent_high = sum(1 for e in events 
                     if e.intensity == "Yüksek" and 
                     (datetime.utcnow() - e.start_time).days <= 1)
    
    if recent_high >= 2:
        return "Çok Aktif"
    elif high_count >= 1 or recent_high >= 1:
        return "Aktif"
    else:
        return "Sakin"


async def _refresh_data_background(nasa_services: SimplifiedNASAServices):
    """Arka plan veri yenileme"""
    try:
        logger.info("BACKGROUND: Veri yenileme başladı")
        
        # Basit veri yenileme - sadece özet bilgileri
        summary = await nasa_services.get_simple_threat_summary()
        
        logger.info(f"BACKGROUND: Veri yenileme tamamlandı - {summary.overall_level} seviye")
        
    except Exception as e:
        logger.error(f"BACKGROUND: Veri yenileme hatası: {str(e)}")

# ==================== SSD/CNEOS ENDPOINTS ====================

@router.get("/asteroids/close-approaches", 
           summary="Asteroid Yaklaşım Verileri",
           description="JPL SSD CAD API - Asteroid ve komet yaklaşım verileri")
async def get_close_approaches(
    limit: int = Query(20, ge=1, le=100, description="Maksimum sonuç sayısı"),
    days_ahead: int = Query(60, ge=1, le=365, description="Gelecekteki gün sayısı"),
    nasa_service: NASAServices = Depends(get_full_nasa_service)
):
    """
    Dünya'ya yaklaşan asteroid ve kometlerin verilerini döndürür
    0.05 AU (Astronomical Unit) mesafeden daha yakın yaklaşımları listeler
    """
    try:
        logger.info(f"CAD API - Yaklaşım verileri alınıyor (limit: {limit}, {days_ahead} gün)")
        
        result = await nasa_service.get_close_approach_data(limit, days_ahead)
        
        if not result.get('success'):
            raise HTTPException(
                status_code=503,
                detail=f"CAD API hatası: {result.get('error', 'Bilinmeyen hata')}"
            )
        
        return {
            "status": "success",
            "data": result['data'],
            "count": result.get('count', 0),
            "source": result.get('source', 'JPL/SSD'),
            "parameters": {"limit": limit, "days_ahead": days_ahead}
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CAD API endpoint hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sunucu hatası: {str(e)}")

@router.get("/asteroids/impact-risk", 
           summary="Çarpma Risk Değerlendirmesi",
           description="CNEOS Sentry API - Dünya çarpma risk analizi")
async def get_impact_risk(
    mode: str = Query('S', regex="^[SOVR]$", description="S=özet, O=detay, V=sanal çarpıcı, R=kaldırılan"),
    nasa_service: NASAServices = Depends(get_full_nasa_service)
):
    """
    CNEOS Sentry sisteminden çarpma risk değerlendirmelerini döndürür
    """
    try:
        logger.info(f"Sentry API - Risk değerlendirmesi alınıyor (mode: {mode})")
        
        result = await nasa_service.get_sentry_risk_data(mode)
        
        if not result.get('success'):
            raise HTTPException(
                status_code=503,
                detail=f"Sentry API hatası: {result.get('error', 'Bilinmeyen hata')}"
            )
        
        return {
            "status": "success",
            "data": result['data'],
            "count": result.get('count', 0),
            "mode": mode,
            "source": result.get('source', 'CNEOS Sentry'),
            "description": {
                'S': 'Özet tablo',
                'O': 'Nesne detayları',
                'V': 'Sanal çarpıcı verisi', 
                'R': 'Kaldırılmış nesneler'
            }.get(mode, 'Bilinmeyen mod')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sentry API endpoint hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sunucu hatası: {str(e)}")

@router.get("/asteroids/real-time-tracking", 
           summary="Gerçek Zamanlı Takip",
           description="CNEOS Scout API - Anlık NEO takip verileri")
async def get_real_time_tracking(
    limit: int = Query(10, ge=1, le=50, description="Maksimum sonuç sayısı"),
    nasa_service: NASAServices = Depends(get_full_nasa_service)
):
    """
    CNEOS Scout sisteminden gerçek zamanlı NEO takip verilerini döndürür
    """
    try:
        logger.info(f"Scout API - Gerçek zamanlı takip verisi alınıyor (limit: {limit})")
        
        result = await nasa_service.get_scout_data(limit)
        
        if not result.get('success'):
            raise HTTPException(
                status_code=503,
                detail=f"Scout API hatası: {result.get('error', 'Bilinmeyen hata')}"
            )
        
        return {
            "status": "success",
            "data": result['data'],
            "count": result.get('count', 0),
            "source": result.get('source', 'CNEOS Scout'),
            "parameters": {"limit": limit},
            "note": "Gerçek zamanlı NEO yörünge ve çarpma risk verileri"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Scout API endpoint hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sunucu hatası: {str(e)}")

@router.get("/asteroids/fireball-events", 
           summary="Meteor Çarpma Olayları",
           description="JPL Fireball API - Atmosferik meteor çarpma verileri")
async def get_fireball_events(
    limit: int = Query(20, ge=1, le=100, description="Maksimum sonuç sayısı"),
    nasa_service: NASAServices = Depends(get_full_nasa_service)
):
    """
    US Hükümeti sensörlerinden atmosferik meteor çarpma verilerini döndürür
    """
    try:
        logger.info(f"Fireball API - Meteor çarpma verileri alınıyor (limit: {limit})")
        
        result = await nasa_service.get_fireball_data(limit)
        
        if not result.get('success'):
            raise HTTPException(
                status_code=503,
                detail=f"Fireball API hatası: {result.get('error', 'Bilinmeyen hata')}"
            )
        
        return {
            "status": "success",
            "data": result['data'],
            "count": result.get('count', 0),
            "source": result.get('source', 'US Government Sensors'),
            "parameters": {"limit": limit},
            "note": "Atmosferik meteor çarpma olayları ve enerji verileri"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fireball API endpoint hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sunucu hatası: {str(e)}")

@router.get("/asteroids/human-accessible", 
           summary="İnsan Erişilebilir NEO'lar",
           description="CNEOS NHATS API - Uzay misyonları için erişilebilir asteroidler")
async def get_human_accessible_neos(
    limit: int = Query(20, ge=1, le=100, description="Maksimum sonuç sayısı"),
    nasa_service: NASAServices = Depends(get_full_nasa_service)
):
    """
    İnsan uzay misyonları için erişilebilir Near Earth Objects'i döndürür
    """
    try:
        logger.info(f"NHATS API - Erişilebilir NEO verileri alınıyor (limit: {limit})")
        
        result = await nasa_service.get_nhats_data(limit)
        
        if not result.get('success'):
            raise HTTPException(
                status_code=503,
                detail=f"NHATS API hatası: {result.get('error', 'Bilinmeyen hata')}"
            )
        
        return {
            "status": "success",
            "data": result['data'],
            "count": result.get('count', 0),
            "source": result.get('source', 'CNEOS NHATS'),
            "parameters": {"limit": limit},
            "note": "İnsan uzay misyonları için değerlendirilen erişilebilir asteroidler"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"NHATS API endpoint hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sunucu hatası: {str(e)}")

@router.get("/asteroids/{asteroid_id}/orbital-analysis", 
           summary="Detaylı Yörünge Analizi",
           description="Asteroid için kapsamlı yörünge mekaniği hesaplaması")
async def get_asteroid_orbital_analysis(
    asteroid_id: str = Path(..., description="Asteroid ID (örn: 2021277)"),
    nasa_service: NASAServices = Depends(get_full_nasa_service)
):
    """
    Belirli bir asteroid için detaylı yörünge mekaniği analizi
    NEO, CAD ve Sentry verilerini birleştirerek kapsamlı hesaplama yapar
    """
    try:
        logger.info(f"Asteroid {asteroid_id} için yörünge analizi başlatılıyor")
        
        result = await nasa_service.calculate_asteroid_orbital_mechanics(asteroid_id)
        
        if not result.get('success'):
            raise HTTPException(
                status_code=404,
                detail=f"Asteroid {asteroid_id} için yörünge analizi yapılamadı: {result.get('error', 'Veri bulunamadı')}"
            )
        
        return {
            "status": "success",
            "asteroid_id": asteroid_id,
            "orbital_data": result['data'],
            "calculation_method": result.get('calculation_method', 'SSD/CNEOS Combined'),
            "note": "NEO, CAD ve Sentry API'lerinden birleştirilmiş analiz"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Asteroid {asteroid_id} yörünge analizi hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sunucu hatası: {str(e)}")

@router.get("/asteroids/{asteroid_id}")
async def get_asteroid_by_id(
    asteroid_id: str,
    nasa_services: SimplifiedNASAServices = Depends(get_simplified_nasa_services)
) -> Dict[str, Any]:
    """
    Belirli bir asteroiti ID ile sorgula - NEO Lookup API
    """
    try:
        logger.info(f"Asteroit detayı isteniyor: {asteroid_id}")
        
        # Asteroit ID formatını doğrula (sadece sayısal olmalı)
        if not asteroid_id.isdigit():
            raise HTTPException(
                status_code=400,
                detail="Invalid asteroid ID format"
            )

        asteroid = await nasa_services.get_asteroid_by_id(asteroid_id)
        
        if not asteroid:
            raise HTTPException(
                status_code=404,
                detail=f"Asteroit {asteroid_id} bulunamadı"
            )
        
        response = {
            "asteroid": {
                "id": asteroid.id,
                "name": asteroid.name,
                "threat_level": asteroid.threat_level,
                "is_hazardous": asteroid.is_hazardous,
                "approach_date": asteroid.approach_date,
                "estimated_diameter": f"{asteroid.diameter_km:.1f} km" if asteroid.diameter_km else "Bilinmiyor",
                "distance": f"{asteroid.distance_km:,.0f} km" if asteroid.distance_km else "Bilinmiyor",
                "velocity": f"{asteroid.velocity_kmh:,.0f} km/h" if asteroid.velocity_kmh else "Bilinmiyor",
                "orbital_data": asteroid.orbital_data
            },
            "retrieved_at": datetime.utcnow().isoformat()
        }
        
        logger.info(f"Asteroit detayı döndürüldü: {asteroid.name}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Asteroit detayı alınamadı ({asteroid_id}): {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Asteroit detayı alınırken sunucu hatası oluştu"
        )