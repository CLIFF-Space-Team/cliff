#!/usr/bin/env python3
"""
Fixed Orbital Mechanics Engine Test Script
CAD API parsing sorunları çözülmüş versiyonu test eder
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def test_fixed_orbital_engine():
    """Fixed orbital mechanics engine test"""
    print("=" * 60)
    print("FIXED ORBITAL MECHANICS ENGINE TEST")
    print("=" * 60)
    print(f"Başlangıç: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Import fixed engine
        from app.services.orbital_mechanics_engine_fixed import get_fixed_orbital_mechanics_engine
        engine = get_fixed_orbital_mechanics_engine()
        
        print("[+] Fixed orbital mechanics engine yüklendi")
        
        # Get real NASA API data
        print("\n[*] Gerçek NASA API verilerini alıyor...")
        
        import aiohttp
        import ssl
        
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        
        async with aiohttp.ClientSession(connector=connector) as session:
            # CAD API call
            cad_params = {
                'dist-max': '0.05',  # 0.05 AU max distance
                'date-min': datetime.now().strftime('%Y-%m-%d'),
                'limit': 10,
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
            
            # Fireball API call  
            fireball_params = {'limit': 5, 'sort': '-date'}
            
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
        print("[*] FIXED ENGINE ANALYSIS BAŞLIYOR...")
        
        if cad_success:
            # Test different asteroid scenarios
            test_scenarios = [
                {"name": "Küçük Asteroid", "diameter_km": 0.05, "desc": "50m çapında asteroid"},
                {"name": "Orta Asteroid", "diameter_km": 0.5, "desc": "500m çapında asteroid"},
                {"name": "Büyük Asteroid", "diameter_km": 1.2, "desc": "1.2km çapında asteroid"},
            ]
            
            for i, scenario in enumerate(test_scenarios, 1):
                print(f"\n[{i}/3] {scenario['name']} Test ({scenario['desc']})...")
                
                analysis_result = engine.calculate_comprehensive_analysis(
                    cad_data=cad_data,
                    fireball_data=fireball_data,
                    asteroid_diameter_km=scenario['diameter_km']
                )
                
                if analysis_result.get('success'):
                    print(f"    [+] ✅ Analiz başarılı ({analysis_result['calculation_time_seconds']:.2f}s)")
                    
                    # Closest approach details
                    closest = analysis_result['closest_approach']
                    print(f"    [i] 🎯 En yakın: {closest['designation']}")
                    print(f"    [i] 📅 Tarih: {closest['date'][:16]}")
                    print(f"    [i] 📏 Mesafe: {closest['distance_km']:,.0f} km ({closest['distance_au']:.4f} AU)")
                    print(f"    [i] 🚀 Hız: {closest['velocity_kms']:.1f} km/s")
                    print(f"    [i] 🎯 Belirsizlik: {closest['uncertainty_km']:,.0f} km")
                    
                    # Orbital elements
                    orbital = analysis_result['orbital_elements']
                    if orbital.get('semi_major_axis_au'):
                        print(f"    [i] 🔄 Semi-major axis: {orbital['semi_major_axis_au']:.3f} AU")
                        print(f"    [i] 🔄 Eccentricity: {orbital.get('eccentricity', 0):.3f}")
                        print(f"    [i] ⏰ Orbital period: {orbital.get('orbital_period_years', 0):.1f} years")
                        
                        if orbital.get('perihelion_distance_au'):
                            print(f"    [i] 🔥 Perihelion: {orbital['perihelion_distance_au']:.3f} AU")
                        if orbital.get('aphelion_distance_au'):
                            print(f"    [i] ❄️ Aphelion: {orbital['aphelion_distance_au']:.3f} AU")
                    
                    # Risk assessment
                    risk = analysis_result['risk_assessment']
                    threat_level = risk['threat_level'].upper()
                    impact_prob = risk['impact_probability'] * 100
                    priority = risk['monitoring_priority']
                    
                    # Threat level emoji
                    threat_emoji = {
                        'MINIMAL': '🟢', 'LOW': '🟡', 'MODERATE': '🟠', 
                        'HIGH': '🔴', 'CRITICAL': '🚨'
                    }.get(threat_level, '⚪')
                    
                    print(f"    [!] {threat_emoji} THREAT LEVEL: {threat_level}")
                    print(f"    [!] 💥 Impact probability: {impact_prob:.4f}%")
                    print(f"    [!] 📊 Monitoring priority: {priority}/5")
                    
                    if risk.get('impact_energy_megatons'):
                        energy = risk['impact_energy_megatons']
                        print(f"    [!] ⚡ Potential energy: {energy:.1f} megatons TNT")
                    
                    if risk.get('damage_radius_km'):
                        damage = risk['damage_radius_km']
                        print(f"    [!] 💥 Damage radius: {damage:.1f} km")
                    
                    # Statistics
                    stats = analysis_result['statistics']
                    print(f"    [i] 📈 Total approaches: {stats['total_approaches']}")
                    print(f"    [i] 📈 Future approaches: {analysis_result['future_approaches_count']}")
                    print(f"    [i] 📏 Average distance: {stats['average_distance_km']:,.0f} km")
                    print(f"    [i] 🚀 Average velocity: {stats['average_velocity_kms']:.1f} km/s")
                    
                    # Threat distribution
                    threat_dist = stats['threat_distribution']
                    print(f"    [i] 📊 Threat distribution:")
                    for level, count in threat_dist.items():
                        if count > 0:
                            emoji = {
                                'minimal': '🟢', 'low': '🟡', 'moderate': '🟠',
                                'high': '🔴', 'critical': '🚨'
                            }.get(level, '⚪')
                            print(f"        {emoji} {level.upper()}: {count}")
                    
                else:
                    print(f"    [-] ❌ Analiz hatası: {analysis_result.get('error', 'Unknown error')}")
            
            # Fireball context
            if fireball_success:
                print(f"\n[*] 🔥 Fireball Historical Context...")
                # Get from last successful analysis
                if 'analysis_result' in locals() and analysis_result.get('success'):
                    fireball_context = analysis_result.get('fireball_context', {})
                    if fireball_context.get('recent_events_count'):
                        count = fireball_context['recent_events_count']
                        print(f"    [i] 🔥 Recent fireballs: {count} events")
                        if fireball_context.get('average_energy_kilotons'):
                            avg_energy = fireball_context['average_energy_kilotons']
                            print(f"    [i] ⚡ Average energy: {avg_energy:.1f} kilotons TNT")
                        print(f"    [i] 📝 Analysis: {fireball_context.get('analysis', 'No analysis')}")
                    else:
                        print(f"    [i] 📝 {fireball_context.get('analysis', 'No fireball data')}")
                else:
                    print(f"    [i] 📝 Fireball analysis unavailable")
            
        else:
            print("[-] ❌ CAD verisi olmadığı için analysis yapılamadı")
            
            # Test with mock data
            print("\n[*] 🔧 Mock data ile test...")
            mock_cad_data = {
                'fields': ['des', 'orbit_id', 'cd', 'dist', 'dist_min', 'dist_max', 'v_rel', 'v_inf'],
                'data': [
                    ['2025 TestA', '1', '2025-Oct-05 12:30', '0.02', '0.018', '0.022', '25.5', '24.8'],
                    ['2025 TestB', '2', '2025-Oct-06 08:15', '0.035', '0.03', '0.04', '18.2', '17.9'],
                    ['2025 TestC', '3', '2025-Oct-07 18:45', '0.048', '0.045', '0.051', '22.1', '21.5']
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
            
            print("    [i] 🔧 Mock CAD data: 3 yaklaşım")
            print("    [i] 🔧 Mock Fireball data: 3 event")
            
            mock_result = engine.calculate_comprehensive_analysis(
                cad_data=mock_cad_data,
                fireball_data=mock_fireball_data,
                asteroid_diameter_km=0.15  # 150m asteroid
            )
            
            if mock_result.get('success'):
                print(f"    [+] ✅ Mock analysis başarılı ({mock_result['calculation_time_seconds']:.2f}s)")
                closest = mock_result['closest_approach']
                risk = mock_result['risk_assessment']
                stats = mock_result['statistics']
                
                print(f"    [i] 🎯 Mock en yakın: {closest['designation']}")
                print(f"    [i] 📏 Mock mesafe: {closest['distance_km']:,.0f} km")
                print(f"    [!] 🟠 Mock threat: {risk['threat_level'].upper()}")
                print(f"    [i] 📈 Mock total: {stats['total_approaches']} approaches")
            else:
                print(f"    [-] ❌ Mock analysis hatası: {mock_result.get('error')}")
        
        print("\n" + "=" * 60)
        print("🎉 FIXED ORBITAL ENGINE TEST TAMAMLANDI!")
        print(f"⏰ Bitiş: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
    except Exception as e:
        print(f"[-] ❌ TEST HATASI: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_fixed_orbital_engine())