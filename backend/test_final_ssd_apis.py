#!/usr/bin/env python3
"""
Final SSD/CNEOS API Test Script - Doğru sınıfla test
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def test_final_ssd_apis():
    """Final SSD/CNEOS API test"""
    print("=" * 60)
    print("FINAL SSD/CNEOS API TEST SUITE")
    print("=" * 60)
    print(f"Baslangic: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Direkt olarak doğru sınıfı import ve kullan
    try:
        # Import the module and get the correct class
        from app.services import nasa_services
        
        # Direkt orjinal sınıfın instance'ını oluştur (alias kullanma)
        # nasa_services.py dosyasında iki sınıf var:
        # 1. NASAServices (line 41-459) - SSD/CNEOS metodları burada
        # 2. SimplifiedNASAServices (line 513-1249) - NEO metodları burada
        
        # Orjinal NASAServices sınıfını elle import et
        original_nasa_service = type('NASAServices', (), {})
        
        # Doğrudan modülden orjinal sınıfı al
        for attr_name in dir(nasa_services):
            attr = getattr(nasa_services, attr_name)
            if (isinstance(attr, type) and 
                hasattr(attr, 'get_close_approach_data') and
                hasattr(attr, 'get_comprehensive_ssd_data')):
                original_nasa_service = attr
                print(f"[+] Dogru sinif bulundu: {attr.__name__}")
                break
        
        # Instance oluştur
        nasa_service = original_nasa_service()
        
        # SSD/CNEOS metodları test et
        tests = [
            ('CAD API', nasa_service.get_close_approach_data, {'limit': 10}),
            ('Fireball API', nasa_service.get_fireball_data, {'limit': 10}), 
            ('Sentry API', nasa_service.get_sentry_risk_data, {}),
            ('Scout API', nasa_service.get_scout_data, {}),
            ('NHATS API', nasa_service.get_nhats_data, {}),
        ]
        
        results = []
        
        print("\n[*] Individual API Tests...")
        for i, (test_name, method, kwargs) in enumerate(tests, 1):
            print(f"\n[{i}/5] {test_name} Test...")
            try:
                result = await method(**kwargs)
                if result.get('success'):
                    count = result.get('count', 0)
                    print(f"    [+] {test_name}: {count} veri alindi")
                    results.append(True)
                else:
                    error = result.get('error', 'Bilinmeyen hata')
                    print(f"    [-] {test_name}: {error}")
                    results.append(False)
            except Exception as e:
                print(f"    [-] {test_name}: Exception - {str(e)}")
                results.append(False)
        
        # Kapsamlı test
        print("\n[*] Comprehensive Test...")
        try:
            comprehensive_result = await nasa_service.get_comprehensive_ssd_data()
            if comprehensive_result.get('success'):
                print(f"    [+] Comprehensive: {comprehensive_result['successful_apis']}/5 API")
                print(f"    [i] Toplam obje: {comprehensive_result['total_objects']}")
                
                # API durumlari
                api_status = comprehensive_result['api_status']
                for api_name, status in api_status.items():
                    status_icon = "[+]" if status else "[-]"
                    print(f"    {status_icon} {api_name.upper()}: {'OK' if status else 'FAIL'}")
            else:
                print(f"    [-] Comprehensive: {comprehensive_result.get('error')}")
        except Exception as e:
            print(f"    [-] Comprehensive: Exception - {str(e)}")
        
        # Sonuc ozeti
        success_count = sum(results)
        total_tests = len(results)
        
        print("\n" + "=" * 60)
        print(f"SONUC: {success_count}/{total_tests} API basarili")
        
        if success_count == total_tests:
            print("[+] TUM SSD/CNEOS API'LERI CALISIYOR!")
        elif success_count > 0:
            print("[!] BAZI API'LERDE SORUN VAR")
        else:
            print("[-] HICBIR API CALISMIYOR")
            
        print(f"Bitis: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
    except Exception as e:
        print(f"[-] IMPORT HATASI: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_final_ssd_apis())