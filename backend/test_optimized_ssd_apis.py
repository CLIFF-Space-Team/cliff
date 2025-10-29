#!/usr/bin/env python3
"""
Optimized SSD/CNEOS API Test Script
Optimize edilmiş NASA servisleri ile SSD/CNEOS API'lerini test eder
"""

import asyncio
import sys
import os

# Add the parent directory to the path to import the modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime

# Doğru import - NASAServices sınıfını direkt import edelim
try:
    from app.services.nasa_services import NASAServices
    print("NASAServices sinifi basariyla import edildi")
except ImportError as e:
    print(f"Import hatasi: {e}")
    # Alternatif import
    import importlib.util
    spec = importlib.util.spec_from_file_location("nasa_services", 
        os.path.join(os.path.dirname(__file__), "app", "services", "nasa_services.py"))
    nasa_services_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(nasa_services_module)
    NASAServices = nasa_services_module.NASAServices

async def test_optimized_apis():
    """Optimize edilmiş API'leri test et"""
    print("=" * 60)
    print("OPTIMIZED SSD/CNEOS API TEST SUITE")
    print("=" * 60)
    print(f"Baslangic: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # NASA Services instance - Doğru sınıfı kullan
    nasa_service = NASAServices()
    
    try:
        # Session'ı kontrol et
        if hasattr(nasa_service, 'get_comprehensive_ssd_data'):
            print("[+] get_comprehensive_ssd_data metodu mevcut")
        else:
            print("[-] get_comprehensive_ssd_data metodu bulunamadi")
            print(f"Mevcut metodlar: {[method for method in dir(nasa_service) if not method.startswith('_')]}")
            return
            
        print("\n[*] Comprehensive SSD Data Test...")
        comprehensive_result = await nasa_service.get_comprehensive_ssd_data()
        
        if comprehensive_result.get('success'):
            print(f"    [+] SUCCESS: {comprehensive_result['successful_apis']}/5 API calisiyor")
            print(f"    [i] Toplam obje: {comprehensive_result['total_objects']}")
            
            # API durumlarini goster
            api_status = comprehensive_result['api_status']
            for api_name, status in api_status.items():
                status_icon = "[+]" if status else "[-]"
                print(f"    {status_icon} {api_name.upper()}: {'BASARILI' if status else 'BASARISIZ'}")
            
            # Ozet istatistikler
            summary = comprehensive_result['summary']
            print(f"\n    [i] OZET ISTATISTIKLER:")
            print(f"        Close Approaches: {summary['close_approaches']}")
            print(f"        Risk Objects: {summary['risk_objects']}")
            print(f"        Scout Objects: {summary['scout_objects']}")
            print(f"        Fireball Events: {summary['fireball_events']}")
            print(f"        Accessible NEOs: {summary['accessible_neos']}")
            
        else:
            print(f"    [-] ERROR: {comprehensive_result.get('error', 'Bilinmeyen hata')}")
        
        print("\n" + "=" * 60)
        
        # Bireysel API testleri
        print("\n[*] Individual API Tests...")
        
        # Test CAD API
        print("\n[1/5] CAD API Test...")
        cad_result = await nasa_service.get_close_approach_data(limit=10)
        if cad_result.get('success'):
            print(f"    [+] CAD API: {cad_result['count']} yaklasim")
        else:
            print(f"    [-] CAD API: {cad_result.get('error', 'Hata')}")
        
        # Test Fireball API
        print("\n[2/5] Fireball API Test...")
        fireball_result = await nasa_service.get_fireball_data(limit=10)
        if fireball_result.get('success'):
            print(f"    [+] Fireball API: {fireball_result['count']} meteor")
        else:
            print(f"    [-] Fireball API: {fireball_result.get('error', 'Hata')}")
        
        # Test Sentry API
        print("\n[3/5] Sentry API Test...")
        sentry_result = await nasa_service.get_sentry_risk_data()
        if sentry_result.get('success'):
            print(f"    [+] Sentry API: {sentry_result['count']} risk")
        else:
            print(f"    [-] Sentry API: {sentry_result.get('error', 'Hata')}")
        
        # Test Scout API
        print("\n[4/5] Scout API Test...")
        scout_result = await nasa_service.get_scout_data()
        if scout_result.get('success'):
            print(f"    [+] Scout API: {scout_result['count']} takip")
        else:
            print(f"    [-] Scout API: {scout_result.get('error', 'Hata')}")
        
        # Test NHATS API
        print("\n[5/5] NHATS API Test...")
        nhats_result = await nasa_service.get_nhats_data()
        if nhats_result.get('success'):
            print(f"    [+] NHATS API: {nhats_result['count']} NEO")
        else:
            print(f"    [-] NHATS API: {nhats_result.get('error', 'Hata')}")
        
        print("\n" + "=" * 60)
        print(f"Bitis: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("TEST TAMAMLANDI")
        
    except Exception as e:
        print(f"    [-] GENEL HATA: {str(e)}")
        import traceback
        traceback.print_exc()
        
    finally:
        # Session'i kapat - Eğer method varsa
        if hasattr(nasa_service, 'close_session'):
            await nasa_service.close_session()
        else:
            print("close_session metodu bulunamadi")

if __name__ == "__main__":
    asyncio.run(test_optimized_apis())