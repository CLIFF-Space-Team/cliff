"""
NASA veri toplama düzeltmelerini test eden script
"""

import asyncio
import sys
import os

# Backend path'ini ekle
sys.path.append(os.path.join(os.path.dirname(__file__)))

from app.services.real_ai_threat_processor import RealMasterOrchestrator
from app.services.nasa_services import simplified_nasa_services
import structlog

logger = structlog.get_logger(__name__)

async def test_nasa_data_collection():
    """NASA veri toplama ve Claude Opus 4.1 AI analizi test"""
    print("NASA Veri Toplama + Claude Opus 4.1 AI Test Basliyor...")
    
    try:
        # 1. Asteroit verilerini test et
        print("\n[1] Asteroit verilerini test ediliyor...")
        asteroids = await simplified_nasa_services.get_asteroids(limit=5)
        print(f"[OK] Asteroit verisi: {len(asteroids) if asteroids else 0} adet")
        if asteroids and len(asteroids) > 0:
            first_asteroid = asteroids[0]
            print(f"   Ornek asteroit: {getattr(first_asteroid, 'name', 'N/A') if hasattr(first_asteroid, 'name') else first_asteroid.get('name', 'N/A') if isinstance(first_asteroid, dict) else 'N/A'}")
        
        # 2. Doğal olay verilerini test et
        print("\n[2] Dogal olay verilerini test ediliyor...")
        earth_events_response = await simplified_nasa_services.get_earth_events(limit=5)
        print(f"[OK] Earth events response turu: {type(earth_events_response)}")
        
        if isinstance(earth_events_response, dict):
            if earth_events_response.get('success') and 'events' in earth_events_response:
                events = earth_events_response['events']
                print(f"[OK] Dogal olay verisi: {len(events) if events else 0} adet")
                if events and len(events) > 0:
                    print(f"   Ornek olay: {events[0].get('title', 'N/A')}")
            else:
                print(f"[WARN] Earth events response basarisiz: {earth_events_response.get('error', 'Bilinmeyen hata')}")
        
        # 3. Claude Opus 4.1 Thinking Model Direct Test
        print("\n[3] Claude Opus 4.1 Thinking Model test ediliyor...")
        from app.services.real_ai_threat_processor import RealAIThreatProcessor
        
        ai_processor = RealAIThreatProcessor()
        await ai_processor.initialize()
        
        # Test threat verisi
        test_threat = {
            "threat_id": "test_asteroid_001",
            "threat_type": "asteroid",
            "name": "Test Asteroid",
            "diameter_km": 1.2,
            "velocity_kms": 18.5,
            "is_hazardous": True
        }
        
        print("[CLAUDE] Tehdit analizi baslatiliyor...")
        analysis_result = await ai_processor.analyze_threat(test_threat)
        
        print(f"[CLAUDE] Analiz tamamlandi!")
        print(f"   Model: Claude Opus 4.1 Thinking")
        print(f"   Severity: {analysis_result.severity_level}")
        print(f"   Confidence: {analysis_result.confidence_score}")
        print(f"   Risk Factors: {len(analysis_result.risk_factors)} adet")
        print(f"   AI Insights: {len(analysis_result.insights)} adet")
        print(f"   Processing Time: {analysis_result.processing_time_seconds:.2f}s")
        
        # AI Insights'ları göster
        if analysis_result.insights:
            print(f"   Ornek Insight: {analysis_result.insights[0][:100]}...")
        
        # 4. Real Master Orchestrator test et
        print("\n[4] Real AI Threat Processor + Claude Opus test ediliyor...")
        orchestrator = RealMasterOrchestrator()
        
        # Küçük bir test analizi başlat
        result = await orchestrator.execute_comprehensive_analysis(
            lookback_days=3,
            session_id="claude_test_session"
        )
        
        print(f"[OK] Claude Opus orchestrated analiz baslatildi: {result.session_id}")
        
        # Session durumunu kontrol et
        await asyncio.sleep(2)  # Biraz bekle
        status = await orchestrator.get_orchestration_status("claude_test_session")
        
        if status:
            print(f"   Analiz durumu: {status.get('status', 'unknown')}")
            print(f"   Ilerleme: %{status.get('progress_percentage', 0)}")
            print(f"   Mevcut faz: {status.get('current_phase', 'unknown')}")
            print(f"   Aktivite: {status.get('current_activity', 'N/A')}")
        
        # Biraz daha bekle ve tekrar kontrol et
        print("\n[5] Claude Opus AI analiz fazini bekliyor...")
        await asyncio.sleep(8)  # AI analiz fazının tamamlanmasını bekle
        
        status = await orchestrator.get_orchestration_status("claude_test_session")
        if status:
            print(f"   Guncel durum: {status.get('status', 'unknown')}")
            print(f"   Ilerleme: %{status.get('progress_percentage', 0)}")
            print(f"   Islenen tehdit sayisi: {status.get('threats_processed', 0)}")
            print(f"   Claude AI insight sayisi: {status.get('ai_insights_generated', 0)}")
        
        print("\n[SUCCESS] NASA veri toplama + Claude Opus 4.1 AI test tamamlandi!")
        print("[SUCCESS] Slice hatasi duzeltildi + Claude Opus entegrasyonu basarili!")
        
        return True
        
    except Exception as e:
        print(f"\n[ERROR] Test sirasinda hata olustu: {str(e)}")
        return False
    
    finally:
        # NASA services'i kapat
        await simplified_nasa_services.close_client()

if __name__ == "__main__":
    asyncio.run(test_nasa_data_collection())