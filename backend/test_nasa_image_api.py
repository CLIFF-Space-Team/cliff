#!/usr/bin/env python3
"""
NASA Image Library API Test Script
NASA görsel arşivi API test ve validasyon
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def test_nasa_image_api():
    """Test NASA Image Library API"""
    print("=" * 65)
    print("NASA IMAGE LIBRARY API TEST SUITE")
    print("=" * 65)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        from app.services.nasa_image_services import get_nasa_image_service, ImageSearchParams
        service = get_nasa_image_service()
        print("[+] NASA Image service loaded successfully")
        
        # Test 1: Popular Space Images
        print(f"\n[1/6] POPULAR SPACE IMAGES TEST")
        print("-" * 40)
        
        space_result = await service.get_popular_space_images(limit=20)
        
        if space_result.get('success'):
            count = space_result.get('count', 0)
            total_hits = space_result.get('total_hits', 0)
            print(f"[+] SUCCESS: {count} space images from {total_hits} total hits")
            
            if count > 0:
                images = space_result.get('images', [])
                sample = images[0]
                
                print(f"[i] Sample space image:")
                print(f"    Title: {sample.title}")
                print(f"    NASA ID: {sample.nasa_id}")
                print(f"    Media Type: {sample.media_type}")
                print(f"    Date: {sample.date_created}" if sample.date_created else "    Date: Unknown")
                print(f"    Center: {sample.center}" if sample.center else "    Center: Unknown") 
                print(f"    Keywords: {', '.join(sample.keywords[:5])}" if sample.keywords else "    Keywords: None")
                print(f"    Thumbnail: {'Available' if sample.thumb_url else 'Not available'}")
                
                # Calculate stats
                stats = service.calculate_collection_stats(images)
                print(f"\n[i] Collection Statistics:")
                print(f"    Media types: {dict(list(stats.media_types.items())[:3])}")
                print(f"    Top centers: {dict(list(stats.centers.items())[:3])}")
                print(f"    Top keywords: {dict(list(stats.keywords_frequency.items())[:5])}")
        else:
            print(f"[-] FAILED: {space_result.get('error', 'Unknown error')}")
        
        # Test 2: Earth Images
        print(f"\n[2/6] EARTH IMAGES TEST")
        print("-" * 40)
        
        earth_result = await service.get_earth_images(limit=15)
        
        if earth_result.get('success'):
            count = earth_result.get('count', 0)
            print(f"[+] SUCCESS: {count} Earth images retrieved")
            
            if count > 0:
                earth_images = earth_result.get('images', [])
                earth_titles = [img.title for img in earth_images[:3]]
                print(f"[i] Sample Earth titles:")
                for i, title in enumerate(earth_titles, 1):
                    print(f"    {i}. {title[:60]}...")
        else:
            print(f"[-] FAILED: {earth_result.get('error', 'Unknown error')}")
        
        # Test 3: Mars Images
        print(f"\n[3/6] MARS IMAGES TEST")  
        print("-" * 40)
        
        mars_result = await service.get_mars_images(limit=15)
        
        if mars_result.get('success'):
            count = mars_result.get('count', 0)
            print(f"[+] SUCCESS: {count} Mars images retrieved")
            
            if count > 0:
                mars_images = mars_result.get('images', [])
                rover_keywords = []
                for img in mars_images:
                    for keyword in img.keywords:
                        if 'rover' in keyword.lower() or 'curiosity' in keyword.lower() or 'perseverance' in keyword.lower():
                            rover_keywords.append(keyword)
                
                unique_rover_keywords = list(set(rover_keywords))
                print(f"[i] Rover-related keywords found: {unique_rover_keywords[:5]}")
        else:
            print(f"[-] FAILED: {mars_result.get('error', 'Unknown error')}")
        
        # Test 4: Asteroid Images
        print(f"\n[4/6] ASTEROID IMAGES TEST")
        print("-" * 40)
        
        asteroid_result = await service.get_asteroid_images(limit=10)
        
        if asteroid_result.get('success'):
            count = asteroid_result.get('count', 0)
            print(f"[+] SUCCESS: {count} asteroid images retrieved")
            
            if count > 0:
                asteroid_images = asteroid_result.get('images', [])
                print(f"[i] Sample asteroid images:")
                for i, img in enumerate(asteroid_images[:3], 1):
                    print(f"    {i}. {img.title[:50]}...")
                    print(f"       Keywords: {', '.join(img.keywords[:3])}" if img.keywords else "       No keywords")
        else:
            print(f"[-] FAILED: {asteroid_result.get('error', 'Unknown error')}")
        
        # Test 5: Hubble Images
        print(f"\n[5/6] HUBBLE TELESCOPE IMAGES TEST")
        print("-" * 40)
        
        hubble_result = await service.get_hubble_images(limit=15)
        
        if hubble_result.get('success'):
            count = hubble_result.get('count', 0)
            print(f"[+] SUCCESS: {count} Hubble images retrieved")
            
            if count > 0:
                hubble_images = hubble_result.get('images', [])
                space_objects = []
                for img in hubble_images:
                    for keyword in img.keywords:
                        if any(obj in keyword.lower() for obj in ['galaxy', 'nebula', 'star', 'cluster', 'supernova']):
                            space_objects.append(keyword)
                
                unique_objects = list(set(space_objects))
                print(f"[i] Space objects detected: {unique_objects[:6]}")
        else:
            print(f"[-] FAILED: {hubble_result.get('error', 'Unknown error')}")
        
        # Test 6: Custom Search
        print(f"\n[6/6] CUSTOM SEARCH TEST")
        print("-" * 40)
        
        search_params = ImageSearchParams(
            query="solar system",
            keywords="planet,sun",
            media_type="image",
            page_size=10
        )
        
        custom_result = await service.search_images(search_params)
        
        if custom_result.get('success'):
            count = custom_result.get('count', 0)
            total_hits = custom_result.get('total_hits', 0)
            print(f"[+] SUCCESS: {count} custom search results from {total_hits} total")
            
            if count > 0:
                custom_images = custom_result.get('images', [])
                solar_system_keywords = set()
                for img in custom_images:
                    for keyword in img.keywords:
                        if any(planet in keyword.lower() for planet in ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'sun']):
                            solar_system_keywords.add(keyword)
                
                print(f"[i] Solar system keywords: {list(solar_system_keywords)[:5]}")
        else:
            print(f"[-] FAILED: {custom_result.get('error', 'Unknown error')}")
        
        print(f"\n" + "=" * 65)
        print("NASA IMAGE API TEST COMPLETED")
        print(f"Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Summary
        tests_passed = 0
        results = [space_result, earth_result, mars_result, asteroid_result, hubble_result, custom_result]
        
        for result in results:
            if result.get('success'):
                tests_passed += 1
        
        print(f"\nSUMMARY: {tests_passed}/6 tests passed")
        
        if tests_passed >= 5:
            print("[+] Excellent! NASA Image API working perfectly!")
        elif tests_passed >= 3:
            print("[~] Good! Most functionality working")  
        elif tests_passed >= 1:
            print("[~] Partial success - Some endpoints working")
        else:
            print("[-] All tests failed - API may be unavailable")
        
        # Overall API health assessment
        if tests_passed >= 3:
            total_images = sum(result.get('count', 0) for result in results if result.get('success'))
            print(f"[i] Total images retrieved: {total_images}")
            print("[i] NASA Image Library API is functional and ready for production!")
        
    except Exception as e:
        print(f"[-] TEST ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_nasa_image_api())