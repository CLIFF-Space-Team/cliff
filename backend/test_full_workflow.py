#!/usr/bin/env python3
"""
Test full AI analysis workflow including results retrieval
"""
import asyncio
import aiohttp
import time

async def test_full_workflow():
    """Test complete workflow from start to results"""
    base_url = "http://localhost:8000"
    
    print("CLIFF AI Analysis - Full Workflow Test")
    print("=" * 50)
    
    session_id = None
    
    async with aiohttp.ClientSession() as session:
        
        # Step 1: Start new analysis
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
                    print(f"SUCCESS: New analysis started")
                    print(f"Session ID: {session_id}")
                    print(f"Results endpoint will be: {base_url}/api/v1/ai-analysis/results/{session_id}")
                else:
                    error = await response.text()
                    print(f"FAILED to start analysis: {error}")
                    return
        except Exception as e:
            print(f"Error starting analysis: {e}")
            return
        
        if not session_id:
            print("No session ID received, aborting...")
            return
        
        # Step 2: Wait for completion while monitoring
        print(f"\n2. Monitoring analysis progress...")
        max_polls = 15
        poll_count = 0
        
        while poll_count < max_polls:
            try:
                status_url = f"{base_url}/api/v1/ai-analysis/status/{session_id}"
                async with session.get(status_url) as response:
                    if response.status == 200:
                        status_data = await response.json()
                        current_status = status_data.get("status", {})
                        
                        progress = current_status.get("progress_percentage", 0)
                        phase = current_status.get("current_phase", "unknown")
                        
                        print(f"Poll {poll_count + 1}: {phase} - {progress}%")
                        
                        if current_status.get("status") == "completed":
                            print("Analysis COMPLETED!")
                            break
                    else:
                        print(f"Status check failed: {response.status}")
                        
            except Exception as e:
                print(f"Error checking status: {e}")
            
            await asyncio.sleep(5)
            poll_count += 1
        
        # Step 3: Test both result endpoints
        print(f"\n3. Testing result endpoints...")
        await asyncio.sleep(2)  # Give a moment for results to be ready
        
        # Test original endpoint format
        print("\nA. Testing /results/{session_id}")
        try:
            results_url = f"{base_url}/api/v1/ai-analysis/results/{session_id}"
            async with session.get(results_url) as response:
                print(f"Status: {response.status}")
                if response.status == 200:
                    data = await response.json()
                    print("SUCCESS: Results retrieved from /results/ endpoint")
                    
                    summary = data.get("summary", {})
                    print(f"Summary: {summary}")
                    
                    insights = data.get("key_insights", [])
                    if insights:
                        print(f"Insights: {insights[:2]}")  # First 2 insights
                        
                else:
                    error = await response.text()
                    print(f"FAILED: {error}")
        except Exception as e:
            print(f"Error testing /results/ endpoint: {e}")
        
        # Test alternative endpoint format  
        print(f"\nB. Testing /analysis/results/{session_id}")
        try:
            alt_results_url = f"{base_url}/api/v1/ai-analysis/analysis/results/{session_id}"
            async with session.get(alt_results_url) as response:
                print(f"Status: {response.status}")
                if response.status == 200:
                    data = await response.json()
                    print("SUCCESS: Results retrieved from /analysis/results/ endpoint")
                    
                    summary = data.get("summary", {})
                    print(f"Summary: {summary}")
                        
                else:
                    error = await response.text()
                    print(f"FAILED: {error}")
        except Exception as e:
            print(f"Error testing /analysis/results/ endpoint: {e}")
        
        # Step 4: Test different format options
        print(f"\n4. Testing different result formats...")
        
        for format_type in ["summary", "detailed", "export"]:
            try:
                format_url = f"{base_url}/api/v1/ai-analysis/results/{session_id}?format={format_type}"
                async with session.get(format_url) as response:
                    print(f"Format '{format_type}': Status {response.status}")
                    if response.status == 200:
                        data = await response.json()
                        print(f"  Data keys: {list(data.keys())}")
            except Exception as e:
                print(f"Error testing format {format_type}: {e}")
    
    print(f"\n" + "=" * 50)
    print("Workflow test completed!")
    if session_id:
        print(f"Your working session ID: {session_id}")
        print(f"Use this URL to test manually:")
        print(f"  {base_url}/api/v1/ai-analysis/results/{session_id}")

if __name__ == "__main__":
    asyncio.run(test_full_workflow())