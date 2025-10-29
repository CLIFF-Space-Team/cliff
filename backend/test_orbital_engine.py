#!/usr/bin/env python3
"""
Orbital Mechanics Engine Test Script
Gerçek CAD ve Fireball verileriyle orbital hesaplama motorunu test eder
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def test_orbital_engine():
    """Orbital mechanics engine test"""
    print("=" * 60)
    print("ORBITAL MECHANICS ENGINE TEST SUITE")
    print("=" * 60)
    print(f"Baslangic: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Import engine
        from app.services.orbital_mechanics_engine import get_orbital_mechanics_engine
        engine = get_orbital_mechanics_engine()
        
        print("[+] Orbital mechanics engine yuklendi")
        
        # Gerçek API verilerini al
        print("\n[*] Gerçek NASA API verilerini alıyor...")
        
        # Get real CAD data
        import aiohttp
        import ssl
        
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        
        async with aiohttp.ClientSession(connector=connector) as session:
            # CAD API çağrısı
            cad_params = {
                'dist-max': '0.05',  # 0.05 AU maksimum mesafe
                'date-min': datetime.now().strftime('%Y-%m-%d'),
                'limit': 15,
                'sort': 'date'
            }
            
            print("\n[1/2] CAD API verilerini alıyor...")
            async with session.get("https://ssd-api.jpl.nasa.gov/cad.api", params=cad_params) as response:
                if response.status == 200:
                    cad_data = await response.json()
                    cad_count = len(cad_data.get('data', []))
                    print(f"    [+] CAD API: {cad_count} yaklaşım verisi alındı")
                    cad_success = True
                else:
                    print(f"    [-] CAD API hatası: HTTP {response.status}")
                    cad_data = {'success': False, 'error': f'HTTP {response.status}'}
                    cad_success = False
            
            # Fireball API çağrısı  
            fireball_params = {'limit': 10, 'sort': '-date'}
            
            print("\n[2/2] Fireball API verilerini alıyor...")
            async with session.get("https://ssd-api.jpl.nasa.gov/fireball.api", params=fireball_params) as response:
                if response.status == 200:
                    fireball_raw_data = await response.json()
                    fireball_count = len(fireball_raw_data.get('data', []))
                    print(f"    [+] Fireball API: {fireball_count} meteor verisi alındı")
                    fireball_data = {'success': True, 'data': fireball_raw_data}
                    fireball_success = True
                else:
                    print(f"    [-] Fireball API hatası: HTTP {response.status}")
                    fireball_data = {'success': False, 'error': f'HTTP {response.status}'}
                    fireball_success = False
        
        print("\n" + "=" * 60)
        print("[*] ORBITAL ENGINE ANALYSIS BAŞLATIYOR...")
        
        if cad_success:
            # Comprehensive analysis
            print("\n[*] Kapsamlı asteroid analizi yapılıyor...")
            
            # Test with different asteroid sizes
            test_scenarios = [
                {"name": "Small Asteroid", "diameter_km": 0.05},    # 50m
                {"name": "Medium Asteroid", "diameter_km": 0.5},    # 500m  
                {"name": "Large Asteroid", "diameter_km": 1.5},     # 1.5km
                {"name": "Unknown Size", "diameter_km": None}       # Size unknown
            ]
            
            for i, scenario in enumerate(test_scenarios, 1):
                print(f"\n[{i}/4] {scenario['name']} Scenario...")
                
                analysis_result = engine.calculate_comprehensive_analysis(
                    cad_data=cad_data,
                    fireball_data=fireball_data,
                    asteroid_diameter_km=scenario['diameter_km']
                )
                
                if analysis_result.get('success'):
                    print(f"    [+] Analiz tamamlandı ({analysis_result['calculation_time_seconds']:.2f}s)")
                    
                    # En yakın yaklaşım
                    closest = analysis_result['closest_approach']
                    print(f"    [i] En yakın yaklaşım: {closest['distance_km']:,.0f} km ({closest['date'][:10]})")
                    print(f"    [i] Hız: {closest['velocity_kms']:.1f} km/s")
                    
                    # Orbital elements
                    orbital = analysis_result['orbital_elements']
                    if orbital.get('semi_major_axis_au'):
                        print(f"    [i] Semi-major axis: {orbital['semi_major_axis_au']:.3f} AU")
                        print(f"    [i] Eccentricity: {orbital.get('eccentricity', 0):.3f}")
                        print(f"    [i] Orbital period: {orbital.get('orbital_period_years', 0):.1f} years")
                    
                    # Risk assessment
                    risk = analysis_result['risk_assessment']
                    threat_level = risk['threat_level'].upper()
                    impact_prob = risk['impact_probability'] * 100
                    priority = risk['monitoring_priority']
                    
                    print(f"    [!] THREAT LEVEL: {threat_level}")
                    print(f"    [!] Impact probability: {impact_prob:.3f}%")
                    print(f"    [!] Monitoring priority: {priority}/5")
                    
                    if risk.get('impact_energy_megatons'):
                        energy = risk['impact_energy_megatons']
                        print(f"    [!] Potential energy: {energy:.1f} megatons TNT")
                    
                    if risk.get('damage_radius_km'):
                        damage = risk['damage_radius_km']
                        print(f"    [!] Damage radius: {damage:.1f} km")
                    
                    # İstatistikler
                    stats = analysis_result['statistics']
                    print(f"    [i] Total approaches: {stats['total_approaches']}")
                    print(f"    [i] Future approaches: {analysis_result['future_approaches_count']}")
                    
                    # Öneriler
                    recommendations = analysis_result.get('recommendations', [])
                    if recommendations:
                        print(f"    [>] Öneriler:")
                        for rec in recommendations[:3]:  # İlk 3 öneri
                            print(f"        - {rec}")
                    
                else:
                    print(f"    [-] Analiz hatası: {analysis_result.get('error', 'Unknown error')}")
            
            # Fireball context analysis
            if fireball_success:
                print(f"\n[*] Fireball Historical Context...")
                fireball_analysis = analysis_result.get('fireball_context', {})
                if fireball_analysis.get('recent_events_count'):
                    count = fireball_analysis['recent_events_count']
                    avg_energy = fireball_analysis.get('average_energy_kilotons', 0)
                    print(f"    [i] Recent fireballs: {count} events")
                    print(f"    [i] Average energy: {avg_energy:.1f} kilotons TNT")
                    print(f"    [i] {fireball_analysis.get('analysis', 'No analysis')}")
                else:
                    print(f"    [i] Fireball analysis: {fireball_analysis.get('analysis', 'No data')}")
            
        else:
            print("[-] CAD verisi olmadığı için analysis yapılamadı")
            
            # Fallback test with mock data
            print("\n[*] Mock data ile test yapılıyor...")
            mock_cad_data = {
                'fields': ['des', 'orbit_id', 'cd', 'dist', 'dist_min', 'dist_max', 'v_rel', 'v_inf'],
                'data': [
                    ['2025 Test', '1', '2460952.5', '0.02', '0.015', '0.025', '25.5', '24.8'],
                    ['2025 Mock', '2', '2460960.0', '0.05', '0.04', '0.06', '18.2', '17.9']
                ]
            }
            
            mock_fireball_data = {
                'success': True,
                'data': {
                    'data': [
                        ['2025-09-15 12:30:00', '12.5'],
                        ['2025-09-10 08:15:00', '8.3'],
                        ['2025-09-05 18:45:00', '15.1']
                    ]
                }
            }
            
            print("    [i] Mock CAD data: 2 yaklaşım")
            print("    [i] Mock Fireball data: 3 event")
            
            mock_result = engine.calculate_comprehensive_analysis(
                cad_data=mock_cad_data,
                fireball_data=mock_fireball_data,
                asteroid_diameter_km=0.1  # 100m asteroid
            )
            
            if mock_result.get('success'):
                print(f"    [+] Mock analysis başarılı ({mock_result['calculation_time_seconds']:.2f}s)")
                closest = mock_result['closest_approach']
                risk = mock_result['risk_assessment']
                print(f"    [i] Mock closest approach: {closest['distance_km']:,.0f} km")
                print(f"    [!] Mock threat level: {risk['threat_level'].upper()}")
            else:
                print(f"    [-] Mock analysis hatası: {mock_result.get('error')}")
        
        print("\n" + "=" * 60)
        print("ORBITAL ENGINE TEST TAMAMLANDI")
        print(f"Bitis: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
    except Exception as e:
        print(f"[-] TEST HATASI: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_orbital_engine())