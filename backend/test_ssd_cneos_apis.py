#!/usr/bin/env python3
"""
SSD/CNEOS API Test Script
NASA Small-Body Database (SSD) ve Center for Near Earth Object Studies (CNEOS) API'lerini test eder
"""

import asyncio
import aiohttp
import json
import ssl
from datetime import datetime, timedelta

# SSL context oluştur (test için)
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# SSD/CNEOS API URLs
SSD_BASE_URL = "https://ssd-api.jpl.nasa.gov"
CAD_API_URL = f"{SSD_BASE_URL}/cad.api"
SENTRY_API_URL = f"{SSD_BASE_URL}/sentry.api"  
SCOUT_API_URL = f"{SSD_BASE_URL}/scout.api"
FIREBALL_API_URL = f"{SSD_BASE_URL}/fireball.api"
NHATS_API_URL = f"{SSD_BASE_URL}/nhats.api"

async def test_cad_api():
    """Close Approach Data API Test"""
    print("\n[*] Testing CAD API (Close Approach Data)...")
    
    connector = aiohttp.TCPConnector(ssl=ssl_context)
    async with aiohttp.ClientSession(connector=connector) as session:
        try:
            params = {
                'dist-max': '0.05',  # 0.05 AU maksimum mesafe
                'date-min': datetime.now().strftime('%Y-%m-%d'),
                'date-max': (datetime.now() + timedelta(days=60)).strftime('%Y-%m-%d'),
                'limit': 10,
                'sort': 'date'
            }
            
            async with session.get(CAD_API_URL, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    count = len(data.get('data', []))
                    print(f"    [+] SUCCESS: {count} yaklasim bulundu")
                    if count > 0:
                        print(f"    [i] Ilk yaklasim: {data.get('data', [[]])[0][:3] if data.get('data') else 'N/A'}")
                    return True
                else:
                    print(f"    [-] ERROR: HTTP {response.status}")
                    error_text = await response.text()
                    print(f"    [i] Response: {error_text[:100]}...")
                    return False
                    
        except Exception as e:
            print(f"    [-] EXCEPTION: {str(e)}")
            return False

async def test_sentry_api():
    """Sentry Risk Assessment API Test"""
    print("\n[*] Testing Sentry API (Impact Risk)...")
    
    connector = aiohttp.TCPConnector(ssl=ssl_context)
    async with aiohttp.ClientSession(connector=connector) as session:
        try:
            params = {'mode': 'S'}  # Summary mode
            
            async with session.get(SENTRY_API_URL, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    count = len(data.get('data', []))
                    print(f"    [+] SUCCESS: {count} risk degerlendirmesi")
                    if count > 0:
                        print(f"    [i] Risk objesi ornegi: {data.get('data', [[]])[0][:2] if data.get('data') else 'N/A'}")
                    return True
                else:
                    print(f"    [-] ERROR: HTTP {response.status}")
                    error_text = await response.text()
                    print(f"    [i] Response: {error_text[:100]}...")
                    return False
                    
        except Exception as e:
            print(f"    [-] EXCEPTION: {str(e)}")
            return False

async def test_scout_api():
    """Scout Real-time NEO Tracking API Test"""
    print("\n[*] Testing Scout API (Real-time NEO Tracking)...")
    
    connector = aiohttp.TCPConnector(ssl=ssl_context)
    async with aiohttp.ClientSession(connector=connector) as session:
        try:
            params = {'limit': 5}
            
            async with session.get(SCOUT_API_URL, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    count = len(data.get('data', []))
                    print(f"    [+] SUCCESS: {count} gercek zamanli takip")
                    return True
                else:
                    print(f"    [-] ERROR: HTTP {response.status}")
                    error_text = await response.text()
                    print(f"    [i] Response: {error_text[:100]}...")
                    return False
                    
        except Exception as e:
            print(f"    [-] EXCEPTION: {str(e)}")
            return False

async def test_fireball_api():
    """Fireball API Test"""
    print("\n[*] Testing Fireball API (Meteor Impacts)...")
    
    connector = aiohttp.TCPConnector(ssl=ssl_context)
    async with aiohttp.ClientSession(connector=connector) as session:
        try:
            params = {'limit': 5, 'sort': '-date'}
            
            async with session.get(FIREBALL_API_URL, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    count = len(data.get('data', []))
                    print(f"    [+] SUCCESS: {count} meteor carpmasi")
                    if count > 0:
                        print(f"    [i] Son carpma ornegi: {data.get('data', [[]])[0][:2] if data.get('data') else 'N/A'}")
                    return True
                else:
                    print(f"    [-] ERROR: HTTP {response.status}")
                    error_text = await response.text()
                    print(f"    [i] Response: {error_text[:100]}...")
                    return False
                    
        except Exception as e:
            print(f"    [-] EXCEPTION: {str(e)}")
            return False

async def test_nhats_api():
    """NHATS Human-Accessible NEO API Test"""
    print("\n[*] Testing NHATS API (Human Accessible NEOs)...")
    
    connector = aiohttp.TCPConnector(ssl=ssl_context)
    async with aiohttp.ClientSession(connector=connector) as session:
        try:
            params = {'limit': 5}
            
            async with session.get(NHATS_API_URL, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    count = len(data.get('data', []))
                    print(f"    [+] SUCCESS: {count} erisilebilir NEO")
                    return True
                else:
                    print(f"    [-] ERROR: HTTP {response.status}")
                    error_text = await response.text()
                    print(f"    [i] Response: {error_text[:100]}...")
                    return False
                    
        except Exception as e:
            print(f"    [-] EXCEPTION: {str(e)}")
            return False

async def main():
    """Ana test fonksiyonu"""
    print("SSD/CNEOS API Test Suite")
    print("=" * 50)
    print("[!] SSL verification disabled for testing")
    
    # Tum API'leri test et
    results = []
    
    results.append(await test_cad_api())
    results.append(await test_sentry_api())
    results.append(await test_scout_api())
    results.append(await test_fireball_api())
    results.append(await test_nhats_api())
    
    # Sonuclari ozetle
    success_count = sum(results)
    total_count = len(results)
    
    print("\n" + "=" * 50)
    print(f"Test Sonuclari: {success_count}/{total_count} API basarili")
    
    if success_count == total_count:
        print("[+] Tum SSD/CNEOS API'leri calisiyor!")
    elif success_count > 0:
        print("[!] Bazi API'lerde sorun var, iyilestirme gerekli")
    else:
        print("[-] Hicbir API calismiyor, acil mudahale gerekli!")
    
    return success_count, total_count

if __name__ == "__main__":
    asyncio.run(main())