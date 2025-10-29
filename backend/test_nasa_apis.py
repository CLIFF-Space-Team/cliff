#!/usr/bin/env python3
"""
NASA APIs Test Script - remaining_test_issues.md sorunlarını test et
"""

import asyncio
import httpx
import os
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

async def test_nasa_apis():
    """Test all problematic NASA APIs"""
    api_key = os.getenv('NASA_API_KEY', 'DEMO_KEY')
    print(f"API Key: {api_key[:10]}... (length: {len(api_key)})")
    
    headers = {
        "User-Agent": "CLIFF-SpaceApps/1.0.0 (https://cliff-app.com)",
        "Accept": "application/json",
    }
    
    async with httpx.AsyncClient(headers=headers, timeout=15.0) as client:
        
        # Test 1: NEO API (Near Earth Objects)
        print("\nTesting NEO API...")
        try:
            url = "https://api.nasa.gov/neo/rest/v1/feed"
            params = {
                "start_date": "2025-01-01",
                "end_date": "2025-01-02",
                "api_key": api_key,
                "detailed": "true"
            }
            response = await client.get(url, params=params)
            print(f"   Status: {response.status_code}")
            if response.status_code == 403:
                print("   [ERROR] 403 FORBIDDEN - API Key problem!")
                print(f"   Response: {response.text[:200]}...")
            elif response.status_code == 200:
                data = response.json()
                print(f"   [SUCCESS] Found {data.get('element_count', 0)} objects")
            else:
                print(f"   [WARNING] Unexpected status: {response.text[:100]}...")
        except Exception as e:
            print(f"   [ERROR] {e}")
        
        # Test 2: DONKI Solar Flares API
        print("\nTesting DONKI Solar Flares API...")
        try:
            url = "https://api.nasa.gov/DONKI/FLR"
            params = {
                "startDate": "2025-01-20",
                "endDate": "2025-01-25",
                "api_key": api_key
            }
            response = await client.get(url, params=params)
            print(f"   Status: {response.status_code}")
            if response.status_code == 403:
                print("   [ERROR] 403 FORBIDDEN - API Key problem!")
                print(f"   Response: {response.text[:200]}...")
            elif response.status_code == 200:
                data = response.json()
                print(f"   [SUCCESS] Found {len(data) if isinstance(data, list) else 'N/A'} solar flares")
            else:
                print(f"   [WARNING] Unexpected status: {response.text[:100]}...")
        except Exception as e:
            print(f"   [ERROR] {e}")
        
        # Test 3: DONKI CME API
        print("\nTesting DONKI CME API...")
        try:
            url = "https://api.nasa.gov/DONKI/CME"
            params = {
                "startDate": "2025-01-20", 
                "endDate": "2025-01-25",
                "api_key": api_key
            }
            response = await client.get(url, params=params)
            print(f"   Status: {response.status_code}")
            if response.status_code == 403:
                print("   [ERROR] 403 FORBIDDEN - API Key problem!")
                print(f"   Response: {response.text[:200]}...")
            elif response.status_code == 200:
                data = response.json()
                print(f"   [SUCCESS] Found {len(data) if isinstance(data, list) else 'N/A'} CME events")
            else:
                print(f"   [WARNING] Unexpected status: {response.text[:100]}...")
        except Exception as e:
            print(f"   [ERROR] {e}")
        
        # Test 4: DEMO_KEY test (to verify if key works at all)
        print("\nTesting with DEMO_KEY for comparison...")
        try:
            url = "https://api.nasa.gov/neo/rest/v1/feed"
            params = {
                "start_date": "2025-01-01",
                "end_date": "2025-01-02", 
                "api_key": "DEMO_KEY"
            }
            response = await client.get(url, params=params)
            print(f"   DEMO_KEY Status: {response.status_code}")
            if response.status_code == 200:
                print("   [SUCCESS] DEMO_KEY works (rate limited)")
            elif response.status_code == 403:
                print("   [ERROR] DEMO_KEY also blocked")
        except Exception as e:
            print(f"   [ERROR] DEMO_KEY ERROR: {e}")

if __name__ == "__main__":
    print("NASA APIs Test - Investigating 403 Forbidden Issues")
    print("=" * 60)
    asyncio.run(test_nasa_apis())
    print("\n" + "=" * 60)
    print("Test completed!")