#!/usr/bin/env python3
"""
Backend API Endpoints Test Script
Tüm API endpoint'lerini test eden comprehensive test suite
"""

import asyncio
import aiohttp
import json
import traceback
from datetime import datetime
from typing import Dict, Any, List, Optional

# API Base URL
BASE_URL = "http://localhost:8000"
API_V1 = f"{BASE_URL}/api/v1"

class APITester:
    def __init__(self):
        self.results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.detailed_errors = []
        
    def add_result(self, endpoint: str, method: str, success: bool, details: str, 
                   error_details: Optional[Dict] = None):
        """Test sonucu ekle"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = "[+] PASSED"
        else:
            status = "[-] FAILED"
            if error_details:
                self.detailed_errors.append({
                    'endpoint': endpoint,
                    'method': method,
                    'error': error_details
                })
        
        self.results.append({
            'endpoint': endpoint,
            'method': method,
            'status': status,
            'details': details,
            'error_details': error_details
        })
        
        print(f"{status} | {method:6} | {endpoint:40} | {details}")
        
        # Hata durumunda detaylı log yazdır
        if not success and error_details:
            print(f"    [ERROR DETAILS]")
            print(f"    --> Request URL: {error_details.get('url', 'N/A')}")
            print(f"    --> HTTP Status: {error_details.get('status', 'N/A')}")
            if error_details.get('params'):
                print(f"    --> Parameters: {json.dumps(error_details.get('params'), indent=2)}")
            if error_details.get('data'):
                print(f"    --> Request Data: {json.dumps(error_details.get('data'), indent=2)}")
            if error_details.get('response_body'):
                response_str = str(error_details.get('response_body'))
                if len(response_str) > 500:
                    response_str = response_str[:500] + "... (truncated)"
                print(f"    --> Response Body: {response_str}")
            if error_details.get('exception'):
                print(f"    --> Exception: {error_details.get('exception')}")
            if error_details.get('traceback'):
                print(f"    --> Traceback:\n{error_details.get('traceback')}")
    
    async def test_endpoint(self, session: aiohttp.ClientSession, method: str, endpoint: str, 
                           data: Dict = None, params: Dict = None) -> Dict[str, Any]:
        """Tek bir endpoint'i test et"""
        url = f"{API_V1}{endpoint}"
        error_details = {
            'url': url,
            'params': params,
            'data': data,
            'method': method
        }
        
        try:
            print(f"\n  [TESTING] {method} {url}")
            if params:
                print(f"    --> With params: {params}")
            if data:
                print(f"    --> With data: {data}")
            
            if method == "GET":
                async with session.get(url, params=params) as response:
                    status = response.status
                    error_details['status'] = status
                    
                    # Response body'yi al
                    try:
                        response_data = await response.json()
                        error_details['response_body'] = response_data
                    except:
                        response_text = await response.text()
                        error_details['response_body'] = response_text
                        response_data = response_text
                    
                    # Başarı durumu
                    if status == 200:
                        print(f"    --> [OK] Status 200 OK")
                        return {
                            'status': status,
                            'success': True,
                            'data': response_data
                        }
                    else:
                        print(f"    --> [FAIL] Status {status}")
                        print(f"    --> Response: {response_data}")
                        return {
                            'status': status,
                            'success': False,
                            'data': response_data,
                            'error_details': error_details
                        }
                        
            elif method == "POST":
                async with session.post(url, json=data) as response:
                    status = response.status
                    error_details['status'] = status
                    
                    # Response body'yi al
                    try:
                        response_data = await response.json()
                        error_details['response_body'] = response_data
                    except:
                        response_text = await response.text()
                        error_details['response_body'] = response_text
                        response_data = response_text
                    
                    # Başarı durumu
                    if status in [200, 201]:
                        print(f"    --> [OK] Status {status} OK")
                        return {
                            'status': status,
                            'success': True,
                            'data': response_data
                        }
                    else:
                        print(f"    --> [FAIL] Status {status}")
                        print(f"    --> Response: {response_data}")
                        return {
                            'status': status,
                            'success': False,
                            'data': response_data,
                            'error_details': error_details
                        }
            else:
                error_details['exception'] = 'Unsupported method'
                return {
                    'status': 0, 
                    'success': False, 
                    'data': 'Unsupported method',
                    'error_details': error_details
                }
                
        except aiohttp.ClientError as e:
            error_details['exception'] = str(e)
            error_details['exception_type'] = type(e).__name__
            error_details['traceback'] = traceback.format_exc()
            print(f"    --> [ERROR] Client Error: {e}")
            return {
                'status': 0, 
                'success': False, 
                'data': str(e),
                'error_details': error_details
            }
        except Exception as e:
            error_details['exception'] = str(e)
            error_details['exception_type'] = type(e).__name__
            error_details['traceback'] = traceback.format_exc()
            print(f"    --> [ERROR] Unexpected Error: {e}")
            return {
                'status': 0, 
                'success': False, 
                'data': str(e),
                'error_details': error_details
            }
    
    async def run_tests(self):
        """Tüm testleri çalıştır"""
        print("=" * 80)
        print("BACKEND API ENDPOINTS TEST SUITE - ENHANCED WITH DETAILED LOGGING")
        print("=" * 80)
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Base URL: {API_V1}")
        print("-" * 80)
        
        async with aiohttp.ClientSession() as session:
            # Test 1: Health Check
            print("\n[HEALTH CHECK]")
            result = await self.test_endpoint(session, "GET", "/health")
            self.add_result("/health", "GET", result['success'], 
                          f"Status: {result['status']}", 
                          result.get('error_details'))
            
            # Test 2: Threats Endpoints
            print("\n[THREATS API]")
            
            # Get threats overview
            result = await self.test_endpoint(session, "GET", "/threats")
            self.add_result("/threats", "GET", result['success'],
                          f"Status: {result['status']}",
                          result.get('error_details'))
            
            # Get asteroids
            result = await self.test_endpoint(session, "GET", "/threats/asteroids")
            self.add_result("/threats/asteroids", "GET", result['success'],
                          f"Status: {result['status']}",
                          result.get('error_details'))
            
            # Get specific asteroid
            result = await self.test_endpoint(session, "GET", "/threats/asteroids/2024%20AA")
            self.add_result("/threats/asteroids/{id}", "GET", result['success'],
                          f"Status: {result['status']}",
                          result.get('error_details'))
            
            # Get space weather
            result = await self.test_endpoint(session, "GET", "/threats/space-weather")
            self.add_result("/threats/space-weather", "GET", result['success'],
                          f"Status: {result['status']}",
                          result.get('error_details'))
            
            # Get current threat level
            result = await self.test_endpoint(session, "GET", "/threats/current")
            self.add_result("/threats/current", "GET", result['success'],
                          f"Status: {result['status']}",
                          result.get('error_details'))
            
            # Get threat alerts
            result = await self.test_endpoint(session, "GET", "/threats/alerts")
            self.add_result("/threats/alerts", "GET", result['success'],
                          f"Status: {result['status']}",
                          result.get('error_details'))
            
            # Test 3: Educational AI Endpoints
            print("\n[EDUCATIONAL AI API]")
            
            # Generate content
            content_data = {
                "topic": "asteroids",
                "level": "beginner",
                "language": "en"
            }
            result = await self.test_endpoint(session, "POST", "/educational/generate", data=content_data)
            self.add_result("/educational/generate", "POST", result['success'],
                          f"Status: {result['status']}",
                          result.get('error_details'))
            
            # Get learning path
            result = await self.test_endpoint(session, "GET", "/educational/learning-path",
                                            params={"topic": "space exploration"})
            self.add_result("/educational/learning-path", "GET", result['success'],
                          f"Status: {result['status']}",
                          result.get('error_details'))
            
            # Chat endpoint
            chat_data = {
                "message": "What is an asteroid?",
                "context": []
            }
            result = await self.test_endpoint(session, "POST", "/educational/chat", data=chat_data)
            self.add_result("/educational/chat", "POST", result['success'],
                          f"Status: {result['status']}",
                          result.get('error_details'))
            
            # Test 4: Voice Processing Endpoints
            print("\n[VOICE API]")
            
            # Process voice command
            voice_data = {
                "command": "Show me near earth asteroids",
                "language": "en"
            }
            result = await self.test_endpoint(session, "POST", "/voice/process", data=voice_data)
            self.add_result("/voice/process", "POST", result['success'],
                          f"Status: {result['status']}",
                          result.get('error_details'))
            
            # Get voice settings
            result = await self.test_endpoint(session, "GET", "/voice/settings")
            self.add_result("/voice/settings", "GET", result['success'],
                          f"Status: {result['status']}",
                          result.get('error_details'))
            
            # Test 5: NASA Services Endpoints (if implemented)
            print("\n[NASA SERVICES API]")
            
            # CAD API
            result = await self.test_endpoint(session, "GET", "/nasa/cad")
            self.add_result("/nasa/cad", "GET", result['success'],
                          f"Status: {result['status']}",
                          result.get('error_details'))
            
            # Fireball API
            result = await self.test_endpoint(session, "GET", "/nasa/fireballs")
            self.add_result("/nasa/fireballs", "GET", result['success'],
                          f"Status: {result['status']}",
                          result.get('error_details'))
            
            # Scout API
            result = await self.test_endpoint(session, "GET", "/nasa/scout")
            self.add_result("/nasa/scout", "GET", result['success'],
                          f"Status: {result['status']}",
                          result.get('error_details'))
            
            # NHATS API
            result = await self.test_endpoint(session, "GET", "/nasa/nhats")
            self.add_result("/nasa/nhats", "GET", result['success'],
                          f"Status: {result['status']}",
                          result.get('error_details'))
            
            # Exoplanets API
            result = await self.test_endpoint(session, "GET", "/nasa/exoplanets")
            self.add_result("/nasa/exoplanets", "GET", result['success'],
                          f"Status: {result['status']}",
                          result.get('error_details'))
            
            # Images API
            result = await self.test_endpoint(session, "GET", "/nasa/images",
                                            params={"query": "asteroid"})
            self.add_result("/nasa/images", "GET", result['success'],
                          f"Status: {result['status']}",
                          result.get('error_details'))
            
            # TLE API
            result = await self.test_endpoint(session, "GET", "/nasa/tle/iss")
            self.add_result("/nasa/tle/iss", "GET", result['success'],
                          f"Status: {result['status']}",
                          result.get('error_details'))
            
            # Test 6: WebSocket Status
            print("\n[WEBSOCKET API]")
            
            # WebSocket info endpoint
            result = await self.test_endpoint(session, "GET", "/ws/info")
            self.add_result("/ws/info", "GET", result['success'],
                          f"Status: {result['status']}",
                          result.get('error_details'))
            
            # Test 7: Database Status
            print("\n[DATABASE API]")
            
            # Database health
            result = await self.test_endpoint(session, "GET", "/db/health")
            self.add_result("/db/health", "GET", result['success'],
                          f"Status: {result['status']}",
                          result.get('error_details'))
            
            # Test 8: Documentation
            print("\n[DOCUMENTATION]")
            
            # Swagger UI
            try:
                async with session.get(f"{BASE_URL}/docs") as response:
                    success = response.status == 200
                    error_details = None
                    if not success:
                        error_details = {
                            'url': f"{BASE_URL}/docs",
                            'status': response.status,
                            'response_body': await response.text()
                        }
                    self.add_result("/docs", "GET", success,
                                  f"Swagger UI - Status: {response.status}",
                                  error_details)
            except Exception as e:
                self.add_result("/docs", "GET", False,
                              f"Swagger UI - Error: {str(e)}",
                              {'exception': str(e), 'traceback': traceback.format_exc()})
            
            # ReDoc
            try:
                async with session.get(f"{BASE_URL}/redoc") as response:
                    success = response.status == 200
                    error_details = None
                    if not success:
                        error_details = {
                            'url': f"{BASE_URL}/redoc",
                            'status': response.status,
                            'response_body': await response.text()
                        }
                    self.add_result("/redoc", "GET", success,
                                  f"ReDoc - Status: {response.status}",
                                  error_details)
            except Exception as e:
                self.add_result("/redoc", "GET", False,
                              f"ReDoc - Error: {str(e)}",
                              {'exception': str(e), 'traceback': traceback.format_exc()})
            
            # OpenAPI Schema
            try:
                async with session.get(f"{BASE_URL}/openapi.json") as response:
                    success = response.status == 200
                    error_details = None
                    if not success:
                        error_details = {
                            'url': f"{BASE_URL}/openapi.json",
                            'status': response.status,
                            'response_body': await response.text()
                        }
                    self.add_result("/openapi.json", "GET", success,
                                  f"OpenAPI Schema - Status: {response.status}",
                                  error_details)
            except Exception as e:
                self.add_result("/openapi.json", "GET", False,
                              f"OpenAPI Schema - Error: {str(e)}",
                              {'exception': str(e), 'traceback': traceback.format_exc()})
        
        # Print detailed error summary
        if self.detailed_errors:
            print("\n" + "=" * 80)
            print("DETAILED ERROR ANALYSIS")
            print("=" * 80)
            for idx, error in enumerate(self.detailed_errors, 1):
                print(f"\n[ERROR #{idx}] {error['method']} {error['endpoint']}")
                print("-" * 40)
                err_details = error['error']
                if err_details.get('status'):
                    print(f"HTTP Status Code: {err_details['status']}")
                if err_details.get('exception'):
                    print(f"Exception: {err_details['exception']}")
                if err_details.get('response_body'):
                    body_str = str(err_details['response_body'])
                    if len(body_str) > 200:
                        body_str = body_str[:200] + "..."
                    print(f"Response Body: {body_str}")
        
        # Print summary
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        if self.total_tests > 0:
            print(f"Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%")
        
        # Group results by status
        print("\n[PASSED ENDPOINTS]")
        for result in self.results:
            if "PASSED" in result['status']:
                print(f"  [+] {result['method']:6} {result['endpoint']}")
        
        print("\n[FAILED ENDPOINTS]")
        for result in self.results:
            if "FAILED" in result['status']:
                print(f"  [-] {result['method']:6} {result['endpoint']}")
        
        # Overall assessment
        print("\n" + "=" * 80)
        if self.total_tests == 0:
            print("[ERROR!] No tests were run.")
        elif self.passed_tests == self.total_tests:
            print("[EXCELLENT!] All API endpoints are working perfectly!")
        elif self.passed_tests >= self.total_tests * 0.8:
            print("[GOOD!] Most API endpoints are functional.")
        elif self.passed_tests >= self.total_tests * 0.5:
            print("[WARNING!] Some endpoints need attention.")
        else:
            print("[CRITICAL!] Many endpoints are failing.")
        
        print(f"\nCompleted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)

async def main():
    """Ana test fonksiyonu"""
    tester = APITester()
    
    # Check if server is running
    print("Checking if backend server is running...")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BASE_URL}/") as response:
                if response.status == 200:
                    print(f"[+] Backend server is running at {BASE_URL}")
                else:
                    print(f"[!] Backend returned status {response.status}")
    except Exception as e:
        print(f"[-] Cannot connect to backend at {BASE_URL}")
        print(f"    Error: {e}")
        print(f"    Error Type: {type(e).__name__}")
        print(f"    Traceback:\n{traceback.format_exc()}")
        print("\nPlease make sure the backend server is running:")
        print("  cd backend && python main.py")
        return
    
    # Run tests
    await tester.run_tests()

if __name__ == "__main__":
    asyncio.run(main())