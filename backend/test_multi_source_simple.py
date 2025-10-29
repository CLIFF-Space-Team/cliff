#!/usr/bin/env python3
"""
Basit Multi-Source Data Integrator testi
"""
import asyncio
from app.services.multi_source_data_integrator import multi_source_data_integrator

async def test_multi_source():
    """Multi-source veri entegrasyonunu test et"""
    print("BASLANGIC: Multi-Source Data Integrator testi basliyor...")
    
    try:
        async with multi_source_data_integrator as integrator:
            threats = await integrator.fetch_all_threat_data(
                lookback_days=3
            )
            
            print(f"BASARILI: Toplam tehdit sayisi: {len(threats)}")
            
            if threats:
                print("\nIlk 5 tehdit:")
                for i, threat in enumerate(threats[:5], 1):
                    print(f"{i}. {threat.title} ({threat.threat_type.value})")
                    print(f"   Kaynak: {threat.source.value}")
                    print(f"   Siddet: {threat.severity}")
                    print(f"   Guven Skoru: {threat.confidence_score:.2f}")
                    print()
            else:
                print("HATA: Hic tehdit verisi alinamadi!")
    
    except Exception as e:
        print(f"HATA: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_multi_source())