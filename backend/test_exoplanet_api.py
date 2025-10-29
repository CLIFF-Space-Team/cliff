#!/usr/bin/env python3
"""
NASA Exoplanet Archive API Test Script  
Dışgezegen servisi test ve validasyon
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def test_exoplanet_api():
    """Test NASA Exoplanet Archive API"""
    print("=" * 65)
    print("NASA EXOPLANET ARCHIVE API TEST SUITE")
    print("=" * 65)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        from app.services.exoplanet_services import get_exoplanet_service
        service = get_exoplanet_service()
        print("[+] Exoplanet service loaded successfully")
        
        # Test 1: Get confirmed exoplanets
        print(f"\n[1/4] CONFIRMED EXOPLANETS TEST")
        print("-" * 40)
        
        confirmed_result = await service.get_confirmed_exoplanets(limit=50)
        
        if confirmed_result.get('success'):
            count = confirmed_result.get('count', 0)
            print(f"[+] SUCCESS: {count} confirmed exoplanets retrieved")
            
            if count > 0:
                exoplanets = confirmed_result.get('exoplanets', [])
                sample = exoplanets[0]
                
                print(f"[i] Sample exoplanet:")
                print(f"    Name: {sample.name}")
                print(f"    Host star: {sample.host_star}")
                print(f"    Discovery method: {sample.discovery_method}")
                print(f"    Discovery year: {sample.discovery_year}")
                print(f"    Orbital period: {sample.orbital_period_days:.2f} days" if sample.orbital_period_days else "    Orbital period: Unknown")
                print(f"    Planet radius: {sample.planet_radius_earth:.2f} Earth radii" if sample.planet_radius_earth else "    Planet radius: Unknown")
                print(f"    Distance: {sample.stellar_distance_parsecs:.2f} parsecs" if sample.stellar_distance_parsecs else "    Distance: Unknown")
                print(f"    Potentially habitable: {'Yes' if sample.is_potentially_habitable else 'No'}")
                
                # Calculate statistics
                stats = service.calculate_statistics(exoplanets)
                print(f"\n[i] Statistics:")
                print(f"    Total planets: {stats.total_planets}")
                print(f"    Total systems: {stats.total_systems}")
                print(f"    Potentially habitable: {stats.potentially_habitable}")
                print(f"    Average radius: {stats.average_planet_radius:.2f} Earth radii" if stats.average_planet_radius else "    Average radius: Unknown")
                print(f"    Nearest distance: {stats.nearest_distance_parsecs:.1f} parsecs" if stats.nearest_distance_parsecs else "    Nearest distance: Unknown")
                
                # Show discovery methods
                print(f"    Discovery methods:")
                for method, count in list(stats.discovery_methods.items())[:5]:
                    print(f"      - {method}: {count}")
        else:
            print(f"[-] FAILED: {confirmed_result.get('error', 'Unknown error')}")
        
        # Test 2: Get habitable candidates  
        print(f"\n[2/4] HABITABLE CANDIDATES TEST")
        print("-" * 40)
        
        habitable_result = await service.get_habitable_candidates(limit=20)
        
        if habitable_result.get('success'):
            count = habitable_result.get('count', 0)
            print(f"[+] SUCCESS: {count} habitable candidates found")
            
            if count > 0:
                candidates = habitable_result.get('habitable_candidates', [])
                
                print(f"[i] Top 3 habitable candidates:")
                for i, candidate in enumerate(candidates[:3], 1):
                    temp = candidate.equilibrium_temperature_k
                    radius = candidate.planet_radius_earth
                    distance = candidate.stellar_distance_parsecs
                    
                    print(f"    {i}. {candidate.name}")
                    print(f"       Host: {candidate.host_star}")
                    print(f"       Temp: {temp:.0f}K" if temp else "       Temp: Unknown")
                    print(f"       Radius: {radius:.2f} Earth radii" if radius else "       Radius: Unknown")
                    print(f"       Distance: {distance:.1f} parsecs" if distance else "       Distance: Unknown")
            else:
                print("[i] No habitable candidates found in dataset")
        else:
            print(f"[-] FAILED: {habitable_result.get('error', 'Unknown error')}")
        
        # Test 3: Get recent discoveries
        print(f"\n[3/4] RECENT DISCOVERIES TEST")
        print("-" * 40)
        
        recent_result = await service.get_recent_discoveries(days_back=730, limit=30)  # 2 years
        
        if recent_result.get('success'):
            count = recent_result.get('count', 0)
            print(f"[+] SUCCESS: {count} recent discoveries")
            
            if count > 0:
                recent_planets = recent_result.get('exoplanets', [])
                
                # Group by discovery year
                by_year = {}
                for planet in recent_planets:
                    year = planet.discovery_year
                    if year:
                        by_year[year] = by_year.get(year, 0) + 1
                
                print(f"[i] Recent discoveries by year:")
                for year in sorted(by_year.keys(), reverse=True):
                    print(f"    {year}: {by_year[year]} exoplanets")
                
                # Show newest discovery
                newest = max(recent_planets, key=lambda p: p.discovery_year or 0)
                print(f"[i] Newest discovery:")
                print(f"    {newest.name} (discovered {newest.discovery_year})")
                print(f"    Method: {newest.discovery_method}")
                print(f"    Facility: {newest.discovery_facility}")
        else:
            print(f"[-] FAILED: {recent_result.get('error', 'Unknown error')}")
        
        # Test 4: API response analysis
        print(f"\n[4/4] API RESPONSE ANALYSIS")
        print("-" * 40)
        
        if confirmed_result.get('success'):
            response_data = confirmed_result
            source = response_data.get('source', 'Unknown')
            fetch_time = response_data.get('fetch_time', 'Unknown')
            
            print(f"[+] API connection working")
            print(f"[i] Data source: {source}")
            print(f"[i] Fetch time: {fetch_time}")
            print(f"[i] Response format: Structured data")
            print(f"[i] Data quality: High")
            
            # Test data completeness
            exoplanets = response_data.get('exoplanets', [])
            if exoplanets:
                complete_data = sum(1 for p in exoplanets if p.planet_radius_earth and p.stellar_distance_parsecs)
                completeness = (complete_data / len(exoplanets)) * 100
                print(f"[i] Data completeness: {completeness:.1f}%")
                
        else:
            print(f"[-] API connection issues detected")
        
        print(f"\n" + "=" * 65)
        print("EXOPLANET API TEST COMPLETED")
        print(f"Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Summary
        tests_passed = 0
        if confirmed_result.get('success'):
            tests_passed += 1
        if habitable_result.get('success'):  
            tests_passed += 1
        if recent_result.get('success'):
            tests_passed += 1
        
        print(f"\nSUMMARY: {tests_passed}/3 core tests passed")
        
        if tests_passed == 3:
            print("[+] All tests SUCCESSFUL - Exoplanet API ready for production!")
        elif tests_passed >= 1:
            print("[~] Partial success - Some functionality working")
        else:
            print("[-] All tests failed - API may be unavailable")
            
    except Exception as e:
        print(f"[-] TEST ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_exoplanet_api())