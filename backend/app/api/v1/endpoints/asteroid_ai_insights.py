from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Path, Query, Body
from pydantic import BaseModel
import structlog
import json

from app.services.simple_threat_processor import get_simple_threat_processor
from app.services.user_friendly_ai_explainer import get_user_friendly_explainer
from app.services.nasa_services import get_nasa_services
from app.services.openai_compatible_service import get_openai_compatible_service
from app.services.google_search_ai_service import get_google_search_ai_service

logger = structlog.get_logger(__name__)
router = APIRouter()

class ChatRequest(BaseModel):
    question: str

async def get_real_asteroid_data(asteroid_id: str) -> Dict[str, Any]:
    """NASA API'den gerçek asteroid verilerini çeker"""
    try:
        nasa_service = get_nasa_services()
        
        # NEO by ID ile detaylı bilgi çek
        neo_result = await nasa_service.get_neo_by_id(asteroid_id)
        
        if neo_result.get("status") != "success":
            # ID ile bulunamadıysa, feed'den ara
            feed_result = await nasa_service.get_neo_feed(detailed=True)
            if feed_result.get("status") == "success":
                # Feed içinde asteroid'i ara
                data = feed_result.get("data", {})
                near_earth_objects = data.get("near_earth_objects", {})
                
                for date, objects in near_earth_objects.items():
                    for obj in objects:
                        if obj.get("id") == asteroid_id or obj.get("name", "").replace(" ", "") == asteroid_id:
                            return {"status": "success", "data": obj}
            
            return {"status": "not_found", "error": f"Asteroid {asteroid_id} not found"}
        
        return neo_result
        
    except Exception as e:
        logger.error(f"Real asteroid data fetch error for {asteroid_id}: {str(e)}")
        return {"status": "failed", "error": str(e)}

async def create_comprehensive_ai_prompt(asteroid_data: Dict[str, Any], question: str = None) -> str:
    """Asteroid için optimize edilmiş JSON formatlı AI prompt'u oluşturur"""
    
    # Temel asteroid bilgileri
    name = asteroid_data.get("name", "Bilinmeyen")
    neo_id = asteroid_data.get("id", "N/A")
    
    prompt = f"""Sen uzman bir asteroid analiz uzmanısın. Aşağıdaki asteroid hakkında Google'da araştırma yap ve sonuçları JSON formatında sun.

ASTEROID: {name} (ID: {neo_id})

GÖREVİN:
1. Google'da bu asteroid hakkında kapsamlı araştırma yap (NASA JPL, Sentry, bilimsel kaynaklar).
2. Elde ettiğin bilgileri analiz ederek aşağıdaki JSON formatını doldur.
3. SADECE JSON çıktısı ver. Markdown veya ek metin yazma.

İSTENEN JSON FORMATI:
{{
  "risk_score": 0-10 arası bir sayı (0: Tamamen Güvenli, 10: Kesin Çarpışma/Kıyamet),
  "risk_label": "GÜVENLİ", "DÜŞÜK", "ORTA", "YÜKSEK" veya "KRİTİK",
  "impact_probability": "Çarpma olasılığı (Örn: %0, 1/1000, %2.5 gibi)",
  "impact_energy": "Çarparsa ortaya çıkacak enerji kıyaslaması (Örn: 15x Hiroşima, 2 Megaton TNT)",
  "impact_area": "Etki alanı büyüklüğü (Örn: Futbol Sahası, Bir Şehir, Tüm Ülke)",
  "size_comparison": "Boyut kıyaslaması (Örn: Bir Otobüs, Eyfel Kulesi, Everest Dağı)",
  "speed_comparison": "Hız kıyaslaması (Örn: Mermiden 20 kat hızlı, F-16'dan 15 kat hızlı)",
  "summary": "2-3 cümlelik kısa, net ve anlaşılır bir özet değerlendirme."
}}

DİKKAT:
- Veriler somut ve kıyaslamalı olsun (insanların gözünde canlanabilsin).
- Eğer kesin veri bulamazsan bilimsel tahminlere dayanarak en gerçekçi senaryoyu yaz.
- "Bilinmiyor" yazmaktan kaçın, "Tahminen X" şeklinde belirt.
- Türkçe yanıtla.
"""
    
    if question:
        prompt += f"\n**Kullanıcı Sorusu**: {question}\n"
        prompt += "Yukarıdaki soruyu da dikkate alarak JSON içindeki 'summary' alanını buna göre şekillendir.\n"
    
    return prompt

async def get_ai_analysis(prompt: str, use_google_search: bool = True) -> str:
    """Google Search AI servisi ile analiz alır"""
    try:
        # Google Search AI servisini kullan
        ai_service = await get_google_search_ai_service()
        
        messages = [
            {
                "role": "system",
                "content": "Sen JSON formatında yanıt veren uzman bir asteroid analistisin. Sadece geçerli JSON döndür."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
        
        response = await ai_service.chat_completion(
            messages=messages,
            temperature=0.3,
            max_tokens=1024,
            google_search=use_google_search,
            url_context=use_google_search
        )
        
        # Markdown temizliği (bazı modeller ```json ... ``` içinde veriyor)
        response = response.replace("```json", "").replace("```", "").strip()
        
        return response
        
    except Exception as e:
        logger.error(f"AI analysis error: {str(e)}")
        # Hata durumunda basit bir JSON döndür
        return json.dumps({
            "risk_score": 5,
            "risk_label": "BELİRSİZ",
            "impact_probability": "Bilinmiyor",
            "impact_energy": "Veri Alınamadı",
            "impact_area": "Veri Alınamadı",
            "size_comparison": "Veri Alınamadı",
            "speed_comparison": "Veri Alınamadı",
            "summary": f"AI analizi sırasında bir hata oluştu: {str(e)}"
        })

@router.get("/asteroid/{asteroid_id}/ai-insight")
async def get_asteroid_ai_insight(
    asteroid_id: str = Path(..., description="Asteroid ID or NEO ID"),
    include_recommendations: bool = Query(True, description="Include AI recommendations"),
    language: str = Query("tr", description="Response language (tr/en)")
) -> Dict[str, Any]:
    """
    Tek bir asteroid için gerçek NASA verileri ve AI görüşü (Google Search ile)
    """
    try:
        logger.info(f"Real AI insight requested for asteroid: {asteroid_id}")
        
        # Gerçek NASA verileri çek
        asteroid_result = await get_real_asteroid_data(asteroid_id)
        
        if asteroid_result.get("status") != "success":
            error_msg = asteroid_result.get("error", "Asteroid verisi alınamadı")
            logger.warning(f"Asteroid data not found: {error_msg}")
            raise HTTPException(
                status_code=404,
                detail=f"Asteroid {asteroid_id} bulunamadı: {error_msg}"
            )
        
        asteroid_data = asteroid_result["data"]
        
        # AI için optimize edilmiş prompt oluştur
        ai_prompt = await create_comprehensive_ai_prompt(asteroid_data)
        
        # AI'den gerçek analiz al (Google Search aktif)
        ai_analysis_json_str = await get_ai_analysis(ai_prompt, use_google_search=True)
        
        try:
            ai_analysis_data = json.loads(ai_analysis_json_str)
        except json.JSONDecodeError:
            # JSON parse hatası durumunda manuel yapı oluştur
            logger.error(f"JSON parse error for output: {ai_analysis_json_str}")
            ai_analysis_data = {
                "risk_score": 0,
                "risk_label": "HATA",
                "summary": "AI yanıtı işlenemedi."
            }

        # Temel verilerden hızlı değerlendirme
        close_approach_data = asteroid_data.get("close_approach_data", [])
        closest_approach = None
        if close_approach_data:
            closest_approach = min(close_approach_data,
                                 key=lambda x: abs((datetime.fromisoformat(x.get("close_approach_date", "2000-01-01").replace("Z", "")) - datetime.now()).days))
        
        # Çap bilgileri
        diameter_data = asteroid_data.get("estimated_diameter", {})
        diameter_km = diameter_data.get("kilometers", {})
        max_diameter = diameter_km.get("estimated_diameter_max", 0)
        
        # Risk seviyesi belirleme (basit fallback)
        is_hazardous = asteroid_data.get("is_potentially_hazardous_asteroid", False)
        miss_distance_ld = float(closest_approach.get("miss_distance", {}).get("lunar", 999)) if closest_approach else 999
        
        # Response yapısı
        ai_insight = {
            "asteroid_id": asteroid_id,
            "asteroid_name": asteroid_data.get("name", "Bilinmeyen"),
            "analysis_timestamp": datetime.now().isoformat(),
            "ai_analysis": ai_analysis_data,  # Artık JSON obje
            "quick_insights": {
                "distance": f"{miss_distance_ld:.2f} LD" if closest_approach else "Bilinmiyor",
                "velocity": f"{float(closest_approach.get('relative_velocity', {}).get('kilometers_per_second', 0)):.2f} km/s" if closest_approach else "Bilinmiyor",
                "diameter": f"{max_diameter:.3f} km" if max_diameter > 0 else "Belirsiz",
                "is_potentially_hazardous": is_hazardous,
            }
        }
        
        return {
            "success": True,
            "ai_insight": ai_insight,
            "data_source": "NASA Real-time + Google Search AI",
            "generated_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Real AI insight generation failed for {asteroid_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Gerçek AI analizi oluşturulamadı: {str(e)}"
        )

@router.post("/asteroid/{asteroid_id}/ai-chat")
async def chat_with_ai_about_asteroid(
    asteroid_id: str = Path(..., description="Asteroid ID"),
    chat_request: ChatRequest = Body(...)
) -> Dict[str, Any]:
    """
    Sohbet endpointi (Metin tabanlı kalabilir veya hibrit yapılabilir)
    """
    try:
        question = chat_request.question
        
        # Gerçek NASA verileri çek
        asteroid_result = await get_real_asteroid_data(asteroid_id)
        
        # Sohbet için JSON zorunluluğu yok, doğal dil istiyoruz
        if asteroid_result.get("status") != "success":
             prompt = f"Kullanıcı {asteroid_id} hakkında '{question}' diye sordu ama veritabanında yok. Google'da ara ve yanıtla."
        else:
             asteroid_data = asteroid_result["data"]
             prompt = f"Kullanıcı {asteroid_data.get('name')} ({asteroid_id}) hakkında '{question}' diye sordu. Google'da araştır ve kısa, net yanıtla."

        ai_response = await get_ai_analysis(prompt, use_google_search=True)
        
        return {
            "success": True,
            "ai_response": {
                "answer": ai_response,
                "sources": ["Google Search AI"]
            }
        }
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

__all__ = ["router"]
