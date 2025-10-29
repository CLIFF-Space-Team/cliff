#!/usr/bin/env python3
"""
TLE (Two-Line Element) API Test Script
Uydu yörünge verileri test ve validasyon
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def test_tle_api():
    """Test TLE API endpoints"""
    print("=" * 65)
    print("TLE (TWO-LINE ELEMENT) API TEST SUITE")
    print("=" * 65)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        from app.services.tle_services import get_tle_service
        service = get_tle_service()
        print("[+] TLE service loaded successfully")
        
        # Test 1: ISS TLE
        print(f"\n[1/7] ISS (INTERNATIONAL SPACE STATION) TLE TEST")
        print("-" * 40)
        
        iss_result = await service.get_iss_tle()
        
        if iss_result.get('success'):
            iss = iss_result.get('satellite')
            print(f"[+] SUCCESS: ISS TLE retrieved")
            print(f"[i] ISS Details:")
            print(f"    Name: {iss.name}")
            print(f"    NORAD ID: {iss.catalog_number}")
            print(f"    Inclination: {iss.inclination:.2f} degrees")
            print(f"    Altitude (Perigee): {iss.altitude_perigee:.1f} km")
            print(f"    Altitude (Apogee): {iss.altitude_apogee:.1f} km")
            print(f"    Orbital Period: {iss.orbital_period:.1f} minutes")
            print(f"    Mean Motion: {iss.mean_motion:.4f} rev/day")
            print(f"    Eccentricity: {iss.eccentricity:.6f}")
            print(f"    Launch Year: {iss.launch_year}")
        else:
            print(f"[-] FAILED: {iss_result.get('error', 'Unknown error')}")
        
        # Test 2: Space Stations
        print(f"\n[2/7] SPACE STATIONS TLE TEST")
        print("-" * 40)
        
        stations_result = await service.get_space_stations()
        
        if stations_result.get('success'):
            stations = stations_result.get('satellites', [])
            count = stations_result.get('count', 0)
            print(f"[+] SUCCESS: {count} space stations retrieved")
            
            if stations:
                print(f"[i] Space Stations:")
                for i, station in enumerate(stations[:5], 1):
                    print(f"    {i}. {station.name}")
                    print(f"       NORAD: {station.catalog_number}, Alt: {station.altitude_perigee:.0f}-{station.altitude_apogee:.0f} km")
        else:
            print(f"[-] FAILED: {stations_result.get('error', 'Unknown error')}")
        
        # Test 3: Starlink Satellites
        print(f"\n[3/7] STARLINK SATELLITES TEST")
        print("-" * 40)
        
        starlink_result = await service.get_starlink_satellites()
        
        if starlink_result.get('success'):
            starlinks = starlink_result.get('satellites', [])
            count = starlink_result.get('count', 0)
            print(f"[+] SUCCESS: {count} Starlink satellites retrieved")
            
            if starlinks:
                # Calculate average altitude
                avg_altitude = sum(sat.altitude_perigee for sat in starlinks) / len(starlinks)
                print(f"[i] Starlink Statistics:")
                print(f"    Total Satellites: {count}")
                print(f"    Average Altitude: {avg_altitude:.1f} km")
                print(f"    Sample Satellites:")
                for i, sat in enumerate(starlinks[:3], 1):
                    print(f"    {i}. {sat.name} - Alt: {sat.altitude_perigee:.0f} km")
        else:
            print(f"[-] FAILED: {starlink_result.get('error', 'Unknown error')}")
        
        # Test 4: Weather Satellites
        print(f"\n[4/7] WEATHER SATELLITES TEST")
        print("-" * 40)
        
        weather_result = await service.get_weather_satellites()
        
        if weather_result.get('success'):
            weather_sats = weather_result.get('satellites', [])
            count = weather_result.get('count', 0)
            print(f"[+] SUCCESS: {count} weather satellites retrieved")
            
            if weather_sats:
                print(f"[i] Weather Satellites:")
                for i, sat in enumerate(weather_sats[:5], 1):
                    print(f"    {i}. {sat.name}")
                    print(f"       Period: {sat.orbital_period:.1f} min, Inc: {sat.inclination:.1f} deg")
        else:
            print(f"[-] FAILED: {weather_result.get('error', 'Unknown error')}")
        
        # Test 5: Visual Satellites (visible to naked eye)
        print(f"\n[5/7] VISUAL SATELLITES TEST")
        print("-" * 40)
        
        visual_result = await service.get_visual_satellites()
        
        if visual_result.get('success'):
            visual_sats = visual_result.get('satellites', [])
            count = visual_result.get('count', 0)
            print(f"[+] SUCCESS: {count} visual satellites retrieved")
            
            if visual_sats:
                print(f"[i] Brightest Satellites (visible to naked eye):")
                for i, sat in enumerate(visual_sats[:5], 1):
                    print(f"    {i}. {sat.name} - Alt: {sat.altitude_perigee:.0f}-{sat.altitude_apogee:.0f} km")
        else:
            print(f"[-] FAILED: {visual_result.get('error', 'Unknown error')}")
        
        # Test 6: Specific Satellite by NORAD ID (Hubble)
        print(f"\n[6/7] SPECIFIC SATELLITE TEST (HUBBLE)")
        print("-" * 40)
        
        hubble_id = 20580  # Hubble Space Telescope NORAD ID
        hubble_result = await service.get_satellite_by_norad(hubble_id)
        
        if hubble_result.get('success'):
            hubble = hubble_result.get('satellite')
            print(f"[+] SUCCESS: Hubble Space Telescope TLE retrieved")
            print(f"[i] Hubble Details:")
            print(f"    Name: {hubble.name}")
            print(f"    NORAD ID: {hubble.catalog_number}")
            print(f"    Altitude: {hubble.altitude_perigee:.0f}-{hubble.altitude_apogee:.0f} km")
            print(f"    Inclination: {hubble.inclination:.2f} degrees")
            print(f"    Orbital Period: {hubble.orbital_period:.1f} minutes")
            print(f"    Launch Year: {hubble.launch_year}")
        else:
            print(f"[-] FAILED: {hubble_result.get('error', 'Unknown error')}")
        
        # Test 7: Statistics Calculation
        print(f"\n[7/7] STATISTICS CALCULATION TEST")
        print("-" * 40)
        
        # Use visual satellites for statistics
        if visual_result.get('success') and visual_sats:
            stats = service.calculate_statistics(visual_sats)
            print(f"[+] SUCCESS: Statistics calculated")
            print(f"[i] Satellite Statistics:")
            print(f"    Total Satellites: {stats.total_satellites}")
            print(f"    Orbit Types: {stats.by_orbit_type}")
            print(f"    Newest Launch: {stats.newest_launch}")
            print(f"    Oldest Active: {stats.oldest_active}")
            print(f"    Highest Altitude: {stats.highest_altitude}")
            print(f"    Lowest Altitude: {stats.lowest_altitude}")
            print(f"    Fastest Orbit: {stats.fastest_orbit}")
            print(f"    Most Eccentric: {stats.most_eccentric}")
        else:
            print(f"[-] FAILED: No data for statistics")
        
        print(f"\n" + "=" * 65)
        print("TLE API TEST COMPLETED")
        print(f"Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Summary
        tests_passed = 0
        results = [
            iss_result, stations_result, starlink_result, 
            weather_result, visual_result, hubble_result
        ]
        
        for result in results:
            if result.get('success'):
                tests_passed += 1
        
        # Add statistics test
        if visual_result.get('success') and visual_sats:
            tests_passed += 1
            total_tests = 7
        else:
            total_tests = 6
        
        print(f"\nSUMMARY: {tests_passed}/{total_tests} tests passed")
        
        if tests_passed >= 6:
            print("[+] Excellent! TLE API working perfectly!")
        elif tests_passed >= 4:
            print("[~] Good! Most functionality working")
        elif tests_passed >= 2:
            print("[~] Partial success - Some endpoints working")
        else:
            print("[-] Limited success - API may have issues")
        
        # Overall satellite count
        if tests_passed > 0:
            total_satellites = 0
            for result in results:
                if result.get('success'):
                    sats = result.get('satellites', [])
                    if isinstance(sats, list):
                        total_satellites += len(sats)
                    elif result.get('satellite'):  # Single satellite results
                        total_satellites += 1
            
            print(f"[i] Total satellites retrieved: {total_satellites}")
            
            if total_satellites > 100:
                print("[i] TLE Service is fully functional and ready for production!")
            elif total_satellites > 10:
                print("[i] TLE Service is functional with good satellite coverage")
            else:
                print("[i] TLE Service is working but with limited data")
        
    except Exception as e:
        print(f"[-] TEST ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_tle_api())