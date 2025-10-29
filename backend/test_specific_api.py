#!/usr/bin/env python3
"""
Test specific API endpoint for results retrieval
"""
import asyncio
import aiohttp

async def test_api_endpoint():
    """Test the specific API endpoint"""
    session_id = "analysis_20251022_205906"
    base_url = "http://localhost:8000"
    
    print(f"Testing API endpoint for session: {session_id}")
    print("=" * 50)
    
    async with aiohttp.ClientSession() as session:
        
        # Test 1: Original path (should work now)
        print("\n1. Testing original path:")
        url1 = f"{base_url}/api/v1/ai-analysis/results/{session_id}"
        print(f"URL: {url1}")
        
        try:
            async with session.get(url1) as response:
                print(f"Status: {response.status}")
                if response.status == 200:
                    data = await response.json()
                    print(f"Result: {data}")
                else:
                    error = await response.text()
                    print(f"Error: {error}")
        except Exception as e:
            print(f"Exception: {e}")
        
        # Test 2: Alternative path (new endpoint)
        print("\n2. Testing alternative path:")
        url2 = f"{base_url}/api/v1/ai-analysis/analysis/results/{session_id}"
        print(f"URL: {url2}")
        
        try:
            async with session.get(url2) as response:
                print(f"Status: {response.status}")
                if response.status == 200:
                    data = await response.json()
                    print(f"Result: {data}")
                else:
                    error = await response.text()
                    print(f"Error: {error}")
        except Exception as e:
            print(f"Exception: {e}")
        
        # Test 3: Check if session exists at all
        print("\n3. Testing status endpoint:")
        url3 = f"{base_url}/api/v1/ai-analysis/status/{session_id}"
        print(f"URL: {url3}")
        
        try:
            async with session.get(url3) as response:
                print(f"Status: {response.status}")
                if response.status == 200:
                    data = await response.json()
                    print(f"Session Status: {data}")
                else:
                    error = await response.text()
                    print(f"Error: {error}")
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_api_endpoint())