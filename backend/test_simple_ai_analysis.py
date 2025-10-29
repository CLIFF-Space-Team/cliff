#!/usr/bin/env python3
"""
CLIFF AI Threat Analysis System - Simple Test
Basic testing without Unicode characters
"""
import asyncio
import aiohttp
import json
import time
from datetime import datetime

class SimpleAITest:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session_id = None
        
    async def run_test(self):
        """Run comprehensive test"""
        print("CLIFF AI Threat Analysis Test")
        print("=" * 40)
        print(f"Start Time: {datetime.now()}")
        
        async with aiohttp.ClientSession() as session:
            # 1. Test health
            await self._test_health(session)
            
            # 2. Start analysis
            await self._start_analysis(session)
            
            # 3. Monitor progress
            if self.session_id:
                await self._monitor_progress(session)
                await self._get_results(session)
            
    async def _test_health(self, session):
        """Test system health"""
        print("\n1. Testing System Health...")
        try:
            url = f"{self.base_url}/api/v1/ai-analysis/system/health"
            async with session.get(url) as response:
                print(f"Health Check Status: {response.status}")
                if response.status == 200:
                    data = await response.json()
                    print(f"System Status: {data.get('status', 'Unknown')}")
                    print(f"Orchestrator: {data.get('orchestrator_status', 'Unknown')}")
                else:
                    print(f"Health check failed: {response.status}")
        except Exception as e:
            print(f"Health error: {e}")
    
    async def _start_analysis(self, session):
        """Start analysis"""
        print("\n2. Starting AI Analysis...")
        try:
            url = f"{self.base_url}/api/v1/ai-analysis/analysis/comprehensive"
            payload = {
                "sources": ["nasa_neo", "nasa_eonet"],
                "lookback_days": 5,
                "include_predictions": True
            }
            
            print(f"POST {url}")
            print(f"Payload: {payload}")
            
            async with session.post(url, json=payload) as response:
                print(f"Response Status: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    self.session_id = data.get("session_id")
                    print(f"SUCCESS: Analysis started")
                    print(f"Session ID: {self.session_id}")
                    print(f"Start Time: {data.get('start_time', 'Unknown')}")
                else:
                    error_text = await response.text()
                    print(f"FAILED: {response.status}")
                    print(f"Error: {error_text}")
                    
        except Exception as e:
            print(f"Start analysis error: {e}")
    
    async def _monitor_progress(self, session):
        """Monitor analysis progress"""
        print(f"\n3. Monitoring Progress (Session: {self.session_id})")
        print("-" * 50)
        
        max_polls = 20
        poll_count = 0
        
        while poll_count < max_polls:
            try:
                url = f"{self.base_url}/api/v1/ai-analysis/analysis/status/{self.session_id}"
                
                async with session.get(url) as response:
                    print(f"Status Poll {poll_count + 1}: HTTP {response.status}")
                    
                    if response.status == 200:
                        data = await response.json()
                        status = data.get("status", {})
                        
                        phase = status.get("current_phase", "unknown")
                        progress = status.get("progress_percentage", 0)
                        activity = status.get("current_activity", "Processing...")
                        threats = status.get("threats_processed", 0)
                        correlations = status.get("correlations_found", 0)
                        insights = status.get("ai_insights_generated", 0)
                        
                        print(f"Phase: {phase} | Progress: {progress}%")
                        print(f"Activity: {activity}")
                        print(f"Stats: {threats} threats, {correlations} correlations, {insights} insights")
                        
                        if status.get("status") == "completed":
                            print("ANALYSIS COMPLETED!")
                            return True
                        elif status.get("status") == "failed":
                            print(f"ANALYSIS FAILED: {status.get('error_message', 'Unknown')}")
                            return False
                            
                    else:
                        print(f"Status check failed: {response.status}")
                        
            except Exception as e:
                print(f"Progress error: {e}")
            
            print("Waiting 8 seconds...")
            await asyncio.sleep(8)
            poll_count += 1
        
        print("Polling timeout reached")
        return False
    
    async def _get_results(self, session):
        """Get analysis results"""
        print("\n4. Getting Results...")
        
        # Wait for results processing
        await asyncio.sleep(3)
        
        try:
            url = f"{self.base_url}/api/v1/ai-analysis/analysis/results/{self.session_id}"
            params = {"format": "summary", "top_threats": 10}
            
            async with session.get(url, params=params) as response:
                print(f"Results Status: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    
                    summary = data.get("summary", {})
                    print("\nANALYSIS RESULTS:")
                    print(f"Total Threats: {summary.get('total_threats_analyzed', 0)}")
                    print(f"High Priority: {summary.get('high_priority_threats', 0)}")
                    print(f"Correlations: {summary.get('critical_correlations', 0)}")
                    print(f"AI Recommendations: {summary.get('ai_recommendations_count', 0)}")
                    print(f"Risk Level: {summary.get('overall_risk_assessment', 'Unknown')}")
                    print(f"Confidence: {summary.get('confidence_score', 0)}")
                    
                    insights = data.get("key_insights", [])
                    if insights:
                        print(f"\nKey Insights ({len(insights)}):")
                        for i, insight in enumerate(insights[:3], 1):
                            print(f"{i}. {insight}")
                    
                    actions = data.get("immediate_actions", [])
                    if actions:
                        print(f"\nImmediate Actions ({len(actions)}):")
                        for i, action in enumerate(actions[:3], 1):
                            print(f"{i}. {action}")
                    
                    print("\nTEST COMPLETED SUCCESSFULLY!")
                    
                else:
                    error_text = await response.text()
                    print(f"Results failed: {response.status}")
                    print(f"Error: {error_text}")
                    
        except Exception as e:
            print(f"Results error: {e}")

async def main():
    print("CLIFF AI Analysis System Test")
    print("=" * 40)
    
    tester = SimpleAITest()
    
    try:
        await tester.run_test()
    except KeyboardInterrupt:
        print("\nTest interrupted")
    except Exception as e:
        print(f"Test error: {e}")
    finally:
        print(f"\nEnd Time: {datetime.now()}")

if __name__ == "__main__":
    asyncio.run(main())