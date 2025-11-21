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
logger = structlog.get_logger(__name__)
router = APIRouter()
async def get_nasa_service() -> NASAServices:
    """NASA Services dependency injection"""
    return NASAServices()
async def get_simplified_nasa_service() -> SimplifiedNASAServices:
    """Simplified NASA Services dependency injection"""
    return get_simplified_nasa_services()
@router.get("/alerts")
async def get_threat_alerts(
    limit: int = Query(20, ge=1, le=100, description="Maksimum alert sayýsý"),
    severity: Optional[str] = Query(None, description="Severity filter"),
    nasa_services: SimplifiedNASAServices = Depends(get_simplified_nasa_services)
) -> List[Dict[str, Any]]:
    """
    Aktif tehdit alertlerini al
    """
    try:
        logger.info(f"Tehdit alertleri alýnýyor (limit: {limit})...")
        alerts = []
        try:
            asteroids = await nasa_services.get_simple_asteroids(days_ahead=7)
            for ast in asteroids[:5]:  # Ýlk 5 asteroit
                is_hazardous = ast.get("is_hazardous", False)
                if is_hazardous:
                    alert_level = "CRITICAL" if is_hazardous else "WARNING"
                    alerts.append({
                        "alert_id": f"asteroid-{ast.get('id', 'unknown')}",
                        "alert_level": alert_level,
                        "message": f"Asteroit {ast.get('name', 'Bilinmeyen')} yaklaþýyor",
                        "threat_details": {
                            "threat_id": ast.get('id', 'unknown'),
                            "threat_type": "asteroid", 
                            "severity": "CRITICAL" if is_hazardous else "MODERATE",
                            "title": f"Asteroit: {ast.get('name', 'Bilinmeyen')}",
                            "description": f"{ast.get('close_approach_date', 'Bilinmeyen')} tarihinde {ast.get('miss_distance_km', 0):,.0f} km mesafeden geçecek",
                            "impact_probability": 0.1 if is_hazardous else 0.01,
                            "recommended_actions": ["Yakýn takip", "Güvenlik deðerlendirmesi"],
                            "data_source": "NASA NEO API"
                        },
                        "created_at": datetime.utcnow().isoformat(),
                        "expires_at": (datetime.utcnow() + timedelta(days=1)).isoformat()
                    })
        except Exception as e:
            logger.warning(f"Asteroit alertleri alýnamadý: {str(e)}")
        try:
            events = await nasa_services.get_simple_earth_events(limit=5)
            for event in events:
                category = event.get("category", "Unknown")
                critical_categories = ["Wildfires", "Severe Storms", "Volcanoes"]
                is_critical = category in critical_categories
                alert_level = "CRITICAL" if is_critical else "WARNING"
                
                alerts.append({
                    "alert_id": f"earth-{event.get('id', 'unknown')}",
                    "alert_level": alert_level,
                    "message": f"{category}: {event.get('title', 'Bilinmeyen')[:50]}",
                    "threat_details": {
                        "threat_id": event.get('id', 'unknown'),
                        "threat_type": "earth_event",
                        "severity": "CRITICAL" if is_critical else "MODERATE",
                        "title": event.get('title', 'Bilinmeyen'),
                        "description": f"Kategori: {category}",
                        "impact_probability": 0.8 if is_critical else 0.4,
                        "recommended_actions": ["Bölge takibi", "Erken uyarý"],
                        "data_source": "NASA EONET"
                    },
                    "created_at": datetime.utcnow().isoformat(),
                    "expires_at": (datetime.utcnow() + timedelta(days=2)).isoformat()
                })
        except Exception as e:
            logger.warning(f"Doðal olay alertleri alýnamadý: {str(e)}")
        if severity:
            severity_map = {"critical": "CRITICAL", "warning": "WARNING", "info": "INFO"}
            target_severity = severity_map.get(severity.lower())
            if target_severity:
                alerts = [a for a in alerts if a["alert_level"] == target_severity]
        alerts.sort(key=lambda x: x["created_at"], reverse=True)
        alerts = alerts[:limit]
        logger.info(f"Tehdit alertleri hazýrlandý: {len(alerts)} adet")
        return alerts
    except Exception as e:
        logger.error(f"Tehdit alertleri alýnamadý: {str(e)}")
        return []
@router.get("/current")
async def get_current_threat_level(
    nasa_services: SimplifiedNASAServices = Depends(get_simplified_nasa_services)
) -> Dict[str, Any]:
    """
    Güncel tehdit seviyesini al - Basit 3 seviyeli sistem
    """
    try:
        logger.info("Güncel tehdit seviyesi alýnýyor...")
        summary = await nasa_services.get_simple_threat_summary()
        color_map = {
            "Düþük": "#22c55e",    # Yeþil
            "Orta": "#f59e0b",     # Sarý
            "Yüksek": "#ef4444"    # Kýrmýzý
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
        logger.error(f"Tehdit seviyesi alýnamadý: {str(e)}")
        return {
            "threat_level": "Düþük",
            "color": "#22c55e",
            "description": "Sistem geçici olarak kullanýlamýyor",
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
        logger.info("Tehdit özeti hazýrlanýyor...")
        asteroids, earth_events = await asyncio.gather(
            nasa_services.get_simple_asteroids(days_ahead=7),
            nasa_services.get_simple_earth_events(limit=10),
            return_exceptions=True
        )
        if isinstance(asteroids, Exception):
            asteroids = []
        if isinstance(earth_events, Exception):
            earth_events = []
        space_weather = []
        high_priority = []
        medium_priority = []
        for ast in asteroids:
            is_hazardous = ast.get("is_hazardous", False)
            if is_hazardous:
                high_priority.append({
                    "type": "asteroid",
                    "title": f"Asteroit: {ast.get('name', 'Bilinmeyen')}",
                    "description": f"{ast.get('close_approach_date', 'Bilinmeyen')} tarihinde yaklaþacak",
                    "level": "Yüksek"
                })
        for event in earth_events:
            category = event.get("category", "Unknown")
            critical_categories = ["Wildfires", "Severe Storms", "Volcanoes"]
            if category in critical_categories:
                high_priority.append({
                    "type": "earth_event",
                    "title": f"{category}: {event.get('title', 'Bilinmeyen')[:50]}",
                    "description": "Kritik doðal olay",
                    "level": "Yüksek"
                })
            else:
                medium_priority.append({
                    "type": "earth_event",
                    "title": f"{category}: {event.get('title', 'Bilinmeyen')[:30]}",
                    "level": "Orta"
                })
        overall_status = "normal"
        if len(high_priority) >= 2:
            overall_status = "elevated"
        elif len(high_priority) >= 1:
            overall_status = "watch"
        
        logger.info(f"Tehdit özeti hazýrlandý: {len(asteroids)} asteroid, {len(earth_events)} event, {len(high_priority)} high priority")
        
        summary = {
            "overall_status": overall_status,
            "high_priority_threats": high_priority[:5],  # Maksimum 5 adet
            "medium_priority_threats": medium_priority[:10],  # Maksimum 10 adet
            "statistics": {
                "total_asteroids": len(asteroids),
                "hazardous_asteroids": sum(1 for a in asteroids if a.get("is_hazardous", False)),
                "active_earth_events": len(earth_events),
                "space_weather_events": len(space_weather)
            },
            "last_updated": datetime.utcnow().isoformat()
        }
        logger.info(f"Tehdit özeti hazýrlandý: {overall_status} durumu")
        return summary
    except Exception as e:
        logger.error(f"Tehdit özeti hazýrlanamadý: {str(e)}")
        return {
            "overall_status": "error",
            "high_priority_threats": [],
            "medium_priority_threats": [],
            "statistics": {"total_asteroids": 0, "hazardous_asteroids": 0, "active_earth_events": 0, "space_weather_events": 0},
            "last_updated": datetime.utcnow().isoformat()
        }
@router.get("/asteroids")
async def get_asteroid_threats(
    limit: int = Query(10, ge=1, le=50, description="Maksimum asteroit sayýsý"),
    nasa_services: SimplifiedNASAServices = Depends(get_simplified_nasa_services)
) -> Dict[str, Any]:
    """
    Basit asteroit tehditleri listesi
    """
    try:
        logger.info(f"Asteroit tehditleri alýnýyor (limit: {limit})...")
        asteroids = await nasa_services.get_simple_asteroids(days_ahead=7)  # 30'dan 7'ye düþür
        asteroids.sort(key=lambda x: {"Yüksek": 3, "Orta": 2, "Düþük": 1}.get(x.threat_level, 0), reverse=True)
        limited_asteroids = asteroids[:limit]
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
                "low": sum(1 for a in asteroids if a.threat_level == "Düþük")
            },
            "last_updated": datetime.utcnow().isoformat()
        }
        logger.info(f"Asteroit listesi hazýrlandý: {len(asteroid_list)} adet")
        return response
    except Exception as e:
        logger.error(f"Asteroit tehditleri alýnamadý: {str(e)}")
        return {
            "asteroids": [],
            "total_count": 0,
            "hazardous_count": 0,
            "threat_distribution": {"high": 0, "medium": 0, "low": 0},
            "last_updated": datetime.utcnow().isoformat()
        }
@router.get("/earth-events")
async def get_earth_event_threats(
    limit: int = Query(15, ge=1, le=50, description="Maksimum olay sayýsý"),
    nasa_services: SimplifiedNASAServices = Depends(get_simplified_nasa_services)
) -> Dict[str, Any]:
    """
    Basit doðal olay tehditleri
    """
    try:
        logger.info(f"Doðal olay tehditleri alýnýyor (limit: {limit})...")
        events = await nasa_services.get_simple_earth_events(limit=limit)
        events.sort(key=lambda x: {"Yüksek": 3, "Orta": 2, "Düþük": 1}.get(x.severity, 0), reverse=True)
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
        category_counts = {}
        for event in events:
            category_counts[event.category] = category_counts.get(event.category, 0) + 1
        response = {
            "events": event_list,
            "total_count": len(events),
            "severity_distribution": {
                "high": sum(1 for e in events if e.severity == "Yüksek"),
                "medium": sum(1 for e in events if e.severity == "Orta"),
                "low": sum(1 for e in events if e.severity == "Düþük")
            },
            "category_distribution": category_counts,
            "last_updated": datetime.utcnow().isoformat()
        }
        logger.info(f"Doðal olay listesi hazýrlandý: {len(event_list)} adet")
        return response
    except Exception as e:
        logger.error(f"Doðal olay tehditleri alýnamadý: {str(e)}")
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
        logger.info("Uzay hava durumu tehditleri alýnýyor...")
        weather_list = []
        response = {
            "events": weather_list,
            "total_count": 0,
            "intensity_distribution": {
                "high": 0,
                "medium": 0,
                "low": 0
            },
            "recent_high_activity": 0,
            "current_condition": "NORMAL",  # Default condition
            "last_updated": datetime.utcnow().isoformat()
        }
        logger.info(f"Uzay hava durumu listesi hazýrlandý: {len(weather_list)} adet")
        return response
    except Exception as e:
        logger.error(f"Uzay hava durumu tehditleri alýnamadý: {str(e)}")
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
    page: int = Query(0, ge=0, description="Sayfa numarasý (0'dan baþlar)"),
    size: int = Query(20, ge=1, le=20, description="Sayfa boyutu"),
    nasa_services: SimplifiedNASAServices = Depends(get_simplified_nasa_services)
) -> Dict[str, Any]:
    """
    Asteroit veritabanýný tara - NEO Browse API
    """
    try:
        logger.info(f"Asteroit tarama baþlatýlýyor (sayfa: {page}, boyut: {size})")
        result = await nasa_services.browse_asteroids(page=page, size=size)
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
        logger.info(f"Asteroit tarama tamamlandý: {len(formatted_asteroids)} adet (sayfa {page})")
        return response
    except Exception as e:
        logger.error(f"Asteroit tarama hatasý: {str(e)}")
        return {
            "asteroids": [],
            "pagination": {"page": page, "size": size, "total_elements": 0, "total_pages": 0},
            "navigation_links": {},
            "error": "Asteroit tarama baþarýsýz",
            "message": "Teknik bir sorun oluþtu",
            "retrieved_at": datetime.utcnow().isoformat(),
            "total_in_page": 0
        }
@router.get("/nasa/apod")
async def get_astronomy_picture(
    date: Optional[str] = Query(None, description="Tarih (YYYY-MM-DD formatýnda, boþ býrakýlýrsa bugün)"),
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
        logger.error(f"APOD verisi alýnamadý: {str(e)}")
        return {
            "apod": {
                "title": "APOD Verisi Alýnamadý",
                "explanation": "Teknik sorun nedeniyle günün astronomi resmi alýnamadý",
                "date": date or datetime.utcnow().strftime("%Y-%m-%d"),
                "media_type": "error",
                "url": "",
                "hdurl": "",
                "copyright": "NASA"
            },
            "retrieved_at": datetime.utcnow().isoformat(),
            "status": "error",
            "message": "APOD verisi alýnamadý"
        }
@router.get("/nasa/earth-images")
async def get_earth_images(
    date: Optional[str] = Query(None, description="Tarih (YYYY-MM-DD formatýnda, boþ býrakýlýrsa dün)"),
    nasa_services: SimplifiedNASAServices = Depends(get_simplified_nasa_services)
) -> Dict[str, Any]:
    """
    NASA EPIC - Dünya'nýn uzaydan görüntüleri
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
        logger.error(f"EPIC verisi alýnamadý: {str(e)}")
        return {
            "earth_images": [],
            "total_images": 0,
            "date": date or (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "retrieved_at": datetime.utcnow().isoformat(),
            "status": "error",
            "message": "Dünya görüntüleri alýnamadý"
        }
@router.get("/nasa/mars-photos")
async def get_mars_rover_photos(
    rover: str = Query("curiosity", description="Mars gezgini (curiosity, opportunity, spirit)"),
    sol: int = Query(1000, ge=1, description="Sol (Mars günü)"),
    nasa_services: SimplifiedNASAServices = Depends(get_simplified_nasa_services)
) -> Dict[str, Any]:
    """
    NASA Mars Rover Photos - Mars gezgini fotoðraflarý
    """
    try:
        logger.info(f"Mars Rover fotoðraflarý isteniyor ({rover}, sol {sol})")
        mars_photos = await nasa_services.get_mars_rover_photos(rover=rover.lower(), sol=sol)
        response = {
            "mars_photos": mars_photos,
            "total_photos": len(mars_photos),
            "rover": rover.title(),
            "sol": sol,
            "retrieved_at": datetime.utcnow().isoformat(),
            "status": "success" if mars_photos else "no_data"
        }
        logger.info(f"Mars fotoðraflarý döndürüldü: {len(mars_photos)} adet ({rover})")
        return response
    except Exception as e:
        logger.error(f"Mars Rover verisi alýnamadý: {str(e)}")
        return {
            "mars_photos": [],
            "total_photos": 0,
            "rover": rover.title(),
            "sol": sol,
            "retrieved_at": datetime.utcnow().isoformat(),
            "status": "error",
            "message": f"Mars gezgini ({rover}) fotoðraflarý alýnamadý"
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
        logger.info("Tehdit verileri yenilenmeye baþlanýyor...")
        background_tasks.add_task(_refresh_data_background, nasa_services)
        return {
            "message": "Tehdit verileri arka planda yenileniyor",
            "status": "started",
            "initiated_at": datetime.utcnow().isoformat(),
            "estimated_completion": (datetime.utcnow() + timedelta(minutes=2)).isoformat()
        }
    except Exception as e:
        logger.error(f"Veri yenileme baþlatýlamadý: {str(e)}")
        raise HTTPException(status_code=500, detail="Veri yenileme baþlatýlamadý")
def _get_level_description(level: str) -> str:
    """Seviye açýklamasý"""
    descriptions = {
        "Düþük": "Normal koþullar. Rutin gözlem devam ediyor.",
        "Orta": "Artmýþ aktivite gözlemleniyor. Dikkatli takip gerekli.",
        "Yüksek": "Yüksek riskli durumlar tespit edildi. Yakýn takip öneriliyor."
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
    """Uzay hava durumu genel deðerlendirmesi"""
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
        logger.info("BACKGROUND: Veri yenileme baþladý")
        summary = await nasa_services.get_simple_threat_summary()
        logger.info(f"BACKGROUND: Veri yenileme tamamlandý - {summary.overall_level} seviye")
    except Exception as e:
        logger.error(f"BACKGROUND: Veri yenileme hatasý: {str(e)}")
@router.get("/asteroids/close-approaches", 
           summary="Asteroid Yaklaþým Verileri",
           description="JPL SSD CAD API - Asteroid ve komet yaklaþým verileri")
async def get_close_approaches(
    limit: int = Query(20, ge=1, le=100, description="Maksimum sonuç sayýsý"),
    days_ahead: int = Query(60, ge=1, le=365, description="Gelecekteki gün sayýsý"),
    nasa_service: NASAServices = Depends(get_full_nasa_service)
):
    """
    Dünya'ya yaklaþan asteroid ve kometlerin verilerini döndürür
    0.05 AU (Astronomical Unit) mesafeden daha yakýn yaklaþýmlarý listeler
    """
    try:
        logger.info(f"CAD API - Yaklaþým verileri alýnýyor (limit: {limit}, {days_ahead} gün)")
        result = await nasa_service.get_close_approach_data(limit, days_ahead)
        if not result.get('success'):
            raise HTTPException(
                status_code=503,
                detail=f"CAD API hatasý: {result.get('error', 'Bilinmeyen hata')}"
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
        logger.error(f"CAD API endpoint hatasý: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sunucu hatasý: {str(e)}")
@router.get("/asteroids/impact-risk", 
           summary="Çarpma Risk Deðerlendirmesi",
           description="CNEOS Sentry API - Dünya çarpma risk analizi")
async def get_impact_risk(
    mode: str = Query('S', regex="^[SOVR]$", description="S=özet, O=detay, V=sanal çarpýcý, R=kaldýrýlan"),
    nasa_service: NASAServices = Depends(get_full_nasa_service)
):
    """
    CNEOS Sentry sisteminden çarpma risk deðerlendirmelerini döndürür
    """
    try:
        logger.info(f"Sentry API - Risk deðerlendirmesi alýnýyor (mode: {mode})")
        result = await nasa_service.get_sentry_risk_data(mode)
        if not result.get('success'):
            raise HTTPException(
                status_code=503,
                detail=f"Sentry API hatasý: {result.get('error', 'Bilinmeyen hata')}"
            )
        return {
            "status": "success",
            "data": result['data'],
            "count": result.get('count', 0),
            "mode": mode,
            "source": result.get('source', 'CNEOS Sentry'),
            "description": {
                'S': 'Özet tablo',
                'O': 'Nesne detaylarý',
                'V': 'Sanal çarpýcý verisi', 
                'R': 'Kaldýrýlmýþ nesneler'
            }.get(mode, 'Bilinmeyen mod')
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sentry API endpoint hatasý: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sunucu hatasý: {str(e)}")
@router.get("/asteroids/real-time-tracking", 
           summary="Gerçek Zamanlý Takip",
           description="CNEOS Scout API - Anlýk NEO takip verileri")
async def get_real_time_tracking(
    limit: int = Query(10, ge=1, le=50, description="Maksimum sonuç sayýsý"),
    nasa_service: NASAServices = Depends(get_full_nasa_service)
):
    """
    CNEOS Scout sisteminden gerçek zamanlý NEO takip verilerini döndürür
    """
    try:
        logger.info(f"Scout API - Gerçek zamanlý takip verisi alýnýyor (limit: {limit})")
        result = await nasa_service.get_scout_data(limit)
        if not result.get('success'):
            raise HTTPException(
                status_code=503,
                detail=f"Scout API hatasý: {result.get('error', 'Bilinmeyen hata')}"
            )
        return {
            "status": "success",
            "data": result['data'],
            "count": result.get('count', 0),
            "source": result.get('source', 'CNEOS Scout'),
            "parameters": {"limit": limit},
            "note": "Gerçek zamanlý NEO yörünge ve çarpma risk verileri"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Scout API endpoint hatasý: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sunucu hatasý: {str(e)}")
@router.get("/asteroids/fireball-events", 
           summary="Meteor Çarpma Olaylarý",
           description="JPL Fireball API - Atmosferik meteor çarpma verileri")
async def get_fireball_events(
    limit: int = Query(20, ge=1, le=100, description="Maksimum sonuç sayýsý"),
    nasa_service: NASAServices = Depends(get_full_nasa_service)
):
    """
    US Hükümeti sensörlerinden atmosferik meteor çarpma verilerini döndürür
    """
    try:
        logger.info(f"Fireball API - Meteor çarpma verileri alýnýyor (limit: {limit})")
        result = await nasa_service.get_fireball_data(limit)
        if not result.get('success'):
            raise HTTPException(
                status_code=503,
                detail=f"Fireball API hatasý: {result.get('error', 'Bilinmeyen hata')}"
            )
        return {
            "status": "success",
            "data": result['data'],
            "count": result.get('count', 0),
            "source": result.get('source', 'US Government Sensors'),
            "parameters": {"limit": limit},
            "note": "Atmosferik meteor çarpma olaylarý ve enerji verileri"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fireball API endpoint hatasý: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sunucu hatasý: {str(e)}")
@router.get("/asteroids/human-accessible", 
           summary="Ýnsan Eriþilebilir NEO'lar",
           description="CNEOS NHATS API - Uzay misyonlarý için eriþilebilir asteroidler")
async def get_human_accessible_neos(
    limit: int = Query(20, ge=1, le=100, description="Maksimum sonuç sayýsý"),
    nasa_service: NASAServices = Depends(get_full_nasa_service)
):
    """
    Ýnsan uzay misyonlarý için eriþilebilir Near Earth Objects'i döndürür
    """
    try:
        logger.info(f"NHATS API - Eriþilebilir NEO verileri alýnýyor (limit: {limit})")
        result = await nasa_service.get_nhats_data(limit)
        if not result.get('success'):
            raise HTTPException(
                status_code=503,
                detail=f"NHATS API hatasý: {result.get('error', 'Bilinmeyen hata')}"
            )
        return {
            "status": "success",
            "data": result['data'],
            "count": result.get('count', 0),
            "source": result.get('source', 'CNEOS NHATS'),
            "parameters": {"limit": limit},
            "note": "Ýnsan uzay misyonlarý için deðerlendirilen eriþilebilir asteroidler"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"NHATS API endpoint hatasý: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sunucu hatasý: {str(e)}")
@router.get("/asteroids/{asteroid_id}/orbital-analysis", 
           summary="Detaylý Yörünge Analizi",
           description="Asteroid için kapsamlý yörünge mekaniði hesaplamasý")
async def get_asteroid_orbital_analysis(
    asteroid_id: str = Path(..., description="Asteroid ID (örn: 2021277)"),
    nasa_service: NASAServices = Depends(get_full_nasa_service)
):
    """
    Belirli bir asteroid için detaylý yörünge mekaniði analizi
    NEO, CAD ve Sentry verilerini birleþtirerek kapsamlý hesaplama yapar
    """
    try:
        logger.info(f"Asteroid {asteroid_id} için yörünge analizi baþlatýlýyor")
        result = await nasa_service.calculate_asteroid_orbital_mechanics(asteroid_id)
        if not result.get('success'):
            raise HTTPException(
                status_code=404,
                detail=f"Asteroid {asteroid_id} için yörünge analizi yapýlamadý: {result.get('error', 'Veri bulunamadý')}"
            )
        return {
            "status": "success",
            "asteroid_id": asteroid_id,
            "orbital_data": result['data'],
            "calculation_method": result.get('calculation_method', 'SSD/CNEOS Combined'),
            "note": "NEO, CAD ve Sentry API'lerinden birleþtirilmiþ analiz"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Asteroid {asteroid_id} yörünge analizi hatasý: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sunucu hatasý: {str(e)}")
@router.get("/asteroids/{asteroid_id}")
async def get_asteroid_by_id(
    asteroid_id: str,
    nasa_services: SimplifiedNASAServices = Depends(get_simplified_nasa_services)
) -> Dict[str, Any]:
    """
    Belirli bir asteroiti ID ile sorgula - NEO Lookup API
    """
    try:
        logger.info(f"Asteroit detayý isteniyor: {asteroid_id}")
        if not asteroid_id.isdigit():
            raise HTTPException(
                status_code=400,
                detail="Invalid asteroid ID format"
            )
        asteroid = await nasa_services.get_asteroid_by_id(asteroid_id)
        if not asteroid:
            raise HTTPException(
                status_code=404,
                detail=f"Asteroit {asteroid_id} bulunamadý"
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
        logger.info(f"Asteroit detayý döndürüldü: {asteroid.name}")
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Asteroit detayý alýnamadý ({asteroid_id}): {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Asteroit detayý alýnýrken sunucu hatasý oluþtu"
        )
