#!/usr/bin/env python3
"""
Test the user-friendly AI explainer system
"""
import asyncio
import aiohttp
import json

async def test_user_friendly_ai():
    """Test user-friendly AI explanations"""
    base_url = "http://localhost:8000"
    
    print("User-Friendly AI Explainer Test")
    print("=" * 40)
    
    # Start new analysis
    session_id = None
    
    async with aiohttp.ClientSession() as session:
        # Step 1: Start analysis
        print("1. Starting new AI analysis...")
        try:
            url = f"{base_url}/api/v1/ai-analysis/analysis/comprehensive"
            payload = {
                "sources": ["nasa_neo", "nasa_eonet"],
                "lookback_days": 3,
                "include_predictions": True
            }
            
            async with session.post(url, json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    session_id = data.get("session_id")
                    print(f"SUCCESS: Analysis started - {session_id}")
                else:
                    print(f"FAILED: {response.status}")
                    return
        except Exception as e:
            print(f"Error: {e}")
            return
        
        if not session_id:
            return
            
        # Step 2: Wait for completion
        print("\n2. Waiting for analysis completion...")
        max_polls = 10
        poll_count = 0
        
        while poll_count < max_polls:
            try:
                status_url = f"{base_url}/api/v1/ai-analysis/status/{session_id}"
                async with session.get(status_url) as response:
                    if response.status == 200:
                        status_data = await response.json()
                        current_status = status_data.get("status", {})
                        
                        if current_status.get("status") == "completed":
                            print("Analysis COMPLETED!")
                            break
                            
            except Exception as e:
                print(f"Status error: {e}")
            
            await asyncio.sleep(5)
            poll_count += 1
        
        # Step 3: Get user-friendly results
        print("\n3. Testing User-Friendly Results...")
        await asyncio.sleep(3)
        
        try:
            results_url = f"{base_url}/api/v1/ai-analysis/results/{session_id}?format=summary"
            async with session.get(results_url) as response:
                print(f"Results Status: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    
                    # Test user-friendly data
                    user_friendly = data.get("user_friendly", {})
                    
                    print("\n=== USER-FRIENDLY AI EXPLANATION ===")
                    print(f"Main Explanation:")
                    print(f"  {user_friendly.get('main_explanation', 'No explanation')}")
                    
                    print(f"\nSimple Summary:")
                    simple_summary = user_friendly.get("simple_summary", {})
                    for key, value in simple_summary.items():
                        print(f"  {key}: {value}")
                    
                    print(f"\nAutomatic Q&A:")
                    auto_qa = user_friendly.get("automatic_qa", {})
                    for question, answer in list(auto_qa.items())[:3]:  # First 3 Q&A
                        print(f"  Q: {question}")
                        print(f"  A: {answer}")
                        print()
                    
                    print(f"Status Indicator:")
                    status_indicator = user_friendly.get("status_indicator", {})
                    print(f"  {status_indicator.get('icon', '')} {status_indicator.get('text', 'Unknown')}")
                    
                    print(f"\nImportant Notes:")
                    for note in user_friendly.get("important_notes", []):
                        print(f"  • {note}")
                    
                    print("\n=== TEST COMPLETED SUCCESSFULLY ===")
                    
                else:
                    error = await response.text()
                    print(f"FAILED: {error}")
                    
        except Exception as e:
            print(f"Results error: {e}")

if __name__ == "__main__":
    asyncio.run(test_user_friendly_ai())