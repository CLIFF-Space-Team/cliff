"""
🎨 AI Image Generation System Integration Tests
Kapsamlı AI tabanlı görsel üretim sistemi test suite'i
"""

import asyncio
import json
import time
from typing import Dict, List, Any
import structlog
import httpx
from datetime import datetime

logger = structlog.get_logger(__name__)

class AIImageSystemTester:
    """AI Görsel Üretim Sistem Test Sınıfı"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=httpx.Timeout(60.0))
        self.test_results: List[Dict[str, Any]] = []
        
        # Test içerikleri
        self.test_contents = [
            "Uzayda süzülen parlak bir uzay gemisi, yıldızlarla dolu karanlık uzayda",
            "Mars yüzeyinde keşif yapan robot, kırmızı gezegen manzarası",
            "Galaksi merkezi, renkli nebula bulutları ve parlak yıldızlar",
            "Fantastik ejder, kristal dağ zirvesinde, fırtınalı hava"
        ]
        
        # Test parametreleri
        self.test_scenarios = [
            {
                "name": "Quick Generation - 2 Images",
                "params": {
                    "content": self.test_contents[0],
                    "image_count": 2,
                    "creativity_level": 0.7,
                    "quality_level": "medium",
                    "professional_grade": True
                }
            },
            {
                "name": "Full Generation - 4 Images",
                "params": {
                    "content": self.test_contents[1],
                    "image_count": 4,
                    "creativity_level": 0.8,
                    "quality_level": "high",
                    "professional_grade": True,
                    "visual_style": "cinematic"
                }
            },
            {
                "name": "Creative Generation - High Creativity",
                "params": {
                    "content": self.test_contents[2],
                    "image_count": 4,
                    "creativity_level": 1.0,
                    "quality_level": "high",
                    "professional_grade": True,
                    "visual_style": "fantasy"
                }
            },
            {
                "name": "Technical Content - Scientific",
                "params": {
                    "content": "Moleküler yapı görselleştirmesi, DNA helix modeli, bilimsel doğruluk",
                    "image_count": 3,
                    "creativity_level": 0.5,
                    "quality_level": "high",
                    "professional_grade": True,
                    "visual_style": "photorealistic",
                    "content_type": "scientific"
                }
            }
        ]
    
    async def test_service_health(self) -> Dict[str, Any]:
        """Servis sağlık durumu testi"""
        logger.info("🔍 Testing service health...")
        
        start_time = time.time()
        try:
            response = await self.client.get(f"{self.base_url}/api/v1/multi-image/service-status")
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                result = {
                    "test": "Service Health",
                    "status": "PASS",
                    "response_time_ms": response_time,
                    "service_status": data.get("status", "unknown"),
                    "details": {
                        "api_accessible": True,
                        "service_info": data.get("service_info", {}),
                        "performance_metrics": data.get("service_info", {}).get("performance_metrics", {})
                    }
                }
                logger.info(f"✅ Service health test passed in {response_time}ms")
            else:
                result = {
                    "test": "Service Health",
                    "status": "FAIL",
                    "response_time_ms": response_time,
                    "error": f"HTTP {response.status_code}"
                }
                logger.error(f"❌ Service health test failed: HTTP {response.status_code}")
                
        except Exception as e:
            result = {
                "test": "Service Health",
                "status": "ERROR",
                "error": str(e)
            }
            logger.error(f"❌ Service health test error: {str(e)}")
        
        self.test_results.append(result)
        return result
    
    async def test_content_analysis(self) -> Dict[str, Any]:
        """İçerik analizi testi"""
        logger.info("🧠 Testing content analysis...")
        
        start_time = time.time()
        try:
            test_content = self.test_contents[0]
            response = await self.client.post(
                f"{self.base_url}/api/v1/multi-image/analyze-content",
                json={"content": test_content}
            )
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                analysis = data.get("analysis", {})
                
                result = {
                    "test": "Content Analysis",
                    "status": "PASS",
                    "response_time_ms": response_time,
                    "details": {
                        "analysis_successful": data.get("success", False),
                        "main_theme": analysis.get("main_theme"),
                        "content_type": analysis.get("content_type"),
                        "confidence_score": analysis.get("confidence_score", 0),
                        "key_concepts_count": len(analysis.get("key_concepts", [])),
                        "visual_elements_count": len(analysis.get("visual_elements", [])),
                        "recommendations": data.get("generation_recommendations", {})
                    }
                }
                logger.info(f"✅ Content analysis test passed in {response_time}ms")
                logger.info(f"   Theme: {analysis.get('main_theme')}")
                logger.info(f"   Confidence: {analysis.get('confidence_score', 0):.2f}")
                
            else:
                result = {
                    "test": "Content Analysis",
                    "status": "FAIL",
                    "response_time_ms": response_time,
                    "error": f"HTTP {response.status_code}"
                }
                logger.error(f"❌ Content analysis test failed: HTTP {response.status_code}")
                
        except Exception as e:
            result = {
                "test": "Content Analysis",
                "status": "ERROR",
                "error": str(e)
            }
            logger.error(f"❌ Content analysis test error: {str(e)}")
        
        self.test_results.append(result)
        return result
    
    async def test_image_generation_scenario(self, scenario: Dict[str, Any]) -> Dict[str, Any]:
        """Görsel üretim senaryosu testi"""
        scenario_name = scenario["name"]
        params = scenario["params"]
        
        logger.info(f"🎨 Testing scenario: {scenario_name}")
        
        start_time = time.time()
        try:
            response = await self.client.post(
                f"{self.base_url}/api/v1/multi-image/generate-batch",
                json=params
            )
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                
                result = {
                    "test": f"Image Generation - {scenario_name}",
                    "status": "PASS" if data.get("success") else "FAIL",
                    "response_time_ms": response_time,
                    "scenario_params": params,
                    "details": {
                        "generation_successful": data.get("success", False),
                        "requested_images": params.get("image_count", 4),
                        "successful_generations": data.get("successful_generations", 0),
                        "failed_generations": data.get("failed_generations", 0),
                        "total_processing_time_ms": data.get("total_processing_time_ms", 0),
                        "average_generation_time_ms": data.get("average_generation_time_ms", 0),
                        "quality_metrics": data.get("quality_metrics", {}),
                        "has_suggestions": len(data.get("suggestions", [])) > 0,
                        "generated_images_info": [
                            {
                                "title": img.get("title", ""),
                                "purpose": img.get("purpose", ""),
                                "has_url": bool(img.get("image_url")),
                                "generation_time_ms": img.get("generation_time_ms", 0),
                                "enhancement_applied": img.get("enhancement_applied", False)
                            }
                            for img in data.get("generated_images", [])
                        ]
                    }
                }
                
                if data.get("success"):
                    logger.info(f"✅ {scenario_name} test passed in {response_time}ms")
                    logger.info(f"   Generated: {data.get('successful_generations', 0)}/{params.get('image_count', 4)} images")
                    logger.info(f"   Quality Score: {data.get('quality_metrics', {}).get('overall_quality_score', 0):.2f}")
                else:
                    logger.warning(f"⚠️ {scenario_name} test completed with issues")
                    logger.warning(f"   Error: {data.get('error_message', 'Unknown error')}")
                    
            else:
                result = {
                    "test": f"Image Generation - {scenario_name}",
                    "status": "FAIL",
                    "response_time_ms": response_time,
                    "scenario_params": params,
                    "error": f"HTTP {response.status_code}"
                }
                logger.error(f"❌ {scenario_name} test failed: HTTP {response.status_code}")
                
        except Exception as e:
            result = {
                "test": f"Image Generation - {scenario_name}",
                "status": "ERROR",
                "scenario_params": params,
                "error": str(e)
            }
            logger.error(f"❌ {scenario_name} test error: {str(e)}")
        
        self.test_results.append(result)
        return result
    
    async def test_supported_options(self) -> Dict[str, Any]:
        """Desteklenen seçenekler testi"""
        logger.info("📋 Testing supported options...")
        
        start_time = time.time()
        try:
            response = await self.client.get(f"{self.base_url}/api/v1/multi-image/supported-options")
            response_time = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                options = data.get("supported_options", {})
                
                result = {
                    "test": "Supported Options",
                    "status": "PASS",
                    "response_time_ms": response_time,
                    "details": {
                        "content_types_count": len(options.get("content_types", {}).get("values", [])),
                        "visual_styles_count": len(options.get("visual_styles", {}).get("values", [])),
                        "composition_styles_count": len(options.get("composition_styles", {}).get("values", [])),
                        "generation_parameters": options.get("generation_parameters", {}),
                        "professional_features_count": len(options.get("generation_parameters", {}).get("professional_features", []))
                    }
                }
                logger.info(f"✅ Supported options test passed in {response_time}ms")
                logger.info(f"   Content types: {len(options.get('content_types', {}).get('values', []))}")
                logger.info(f"   Visual styles: {len(options.get('visual_styles', {}).get('values', []))}")
                
            else:
                result = {
                    "test": "Supported Options",
                    "status": "FAIL",
                    "response_time_ms": response_time,
                    "error": f"HTTP {response.status_code}"
                }
                logger.error(f"❌ Supported options test failed: HTTP {response.status_code}")
                
        except Exception as e:
            result = {
                "test": "Supported Options",
                "status": "ERROR",
                "error": str(e)
            }
            logger.error(f"❌ Supported options test error: {str(e)}")
        
        self.test_results.append(result)
        return result
    
    async def test_performance_benchmark(self) -> Dict[str, Any]:
        """Performans benchmark testi"""
        logger.info("⚡ Testing performance benchmark...")
        
        # Concurrent generation test
        concurrent_requests = 3
        start_time = time.time()
        
        try:
            tasks = []
            for i in range(concurrent_requests):
                task = self.client.post(
                    f"{self.base_url}/api/v1/multi-image/quick-generate",
                    json={
                        "content": f"Test image {i+1}: {self.test_contents[i % len(self.test_contents)]}",
                        "count": 2,
                        "quality": "medium"
                    }
                )
                tasks.append(task)
            
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            total_time = int((time.time() - start_time) * 1000)
            
            successful_requests = 0
            failed_requests = 0
            total_images_generated = 0
            
            for response in responses:
                if isinstance(response, Exception):
                    failed_requests += 1
                elif response.status_code == 200:
                    successful_requests += 1
                    data = response.json()
                    total_images_generated += data.get("successful_generations", 0)
                else:
                    failed_requests += 1
            
            result = {
                "test": "Performance Benchmark",
                "status": "PASS" if successful_requests > 0 else "FAIL",
                "details": {
                    "concurrent_requests": concurrent_requests,
                    "successful_requests": successful_requests,
                    "failed_requests": failed_requests,
                    "total_response_time_ms": total_time,
                    "average_response_time_ms": int(total_time / concurrent_requests),
                    "total_images_generated": total_images_generated,
                    "requests_per_second": round(concurrent_requests / (total_time / 1000), 2)
                }
            }
            
            logger.info(f"✅ Performance benchmark completed in {total_time}ms")
            logger.info(f"   Successful: {successful_requests}/{concurrent_requests} requests")
            logger.info(f"   Images generated: {total_images_generated}")
            logger.info(f"   RPS: {result['details']['requests_per_second']}")
            
        except Exception as e:
            result = {
                "test": "Performance Benchmark",
                "status": "ERROR",
                "error": str(e)
            }
            logger.error(f"❌ Performance benchmark error: {str(e)}")
        
        self.test_results.append(result)
        return result
    
    async def run_comprehensive_test_suite(self) -> Dict[str, Any]:
        """Kapsamlı test suite'ini çalıştır"""
        logger.info("🚀 Starting comprehensive AI Image System test suite...")
        suite_start_time = time.time()
        
        # 1. Service Health Test
        await self.test_service_health()
        await asyncio.sleep(1)  # Rate limiting
        
        # 2. Content Analysis Test
        await self.test_content_analysis()
        await asyncio.sleep(1)
        
        # 3. Supported Options Test
        await self.test_supported_options()
        await asyncio.sleep(1)
        
        # 4. Image Generation Scenarios
        for scenario in self.test_scenarios:
            await self.test_image_generation_scenario(scenario)
            await asyncio.sleep(2)  # Longer pause between generations
        
        # 5. Performance Benchmark
        await self.test_performance_benchmark()
        
        # Calculate overall results
        total_suite_time = int((time.time() - suite_start_time) * 1000)
        
        passed_tests = len([r for r in self.test_results if r["status"] == "PASS"])
        failed_tests = len([r for r in self.test_results if r["status"] == "FAIL"])
        error_tests = len([r for r in self.test_results if r["status"] == "ERROR"])
        total_tests = len(self.test_results)
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        summary = {
            "test_suite": "AI Image Generation System",
            "timestamp": datetime.now().isoformat(),
            "total_suite_time_ms": total_suite_time,
            "summary": {
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "errors": error_tests,
                "success_rate": round(success_rate, 2)
            },
            "detailed_results": self.test_results
        }
        
        # Print summary
        logger.info("="*60)
        logger.info("🎯 AI IMAGE GENERATION SYSTEM TEST RESULTS")
        logger.info("="*60)
        logger.info(f"Total Tests: {total_tests}")
        logger.info(f"Passed: {passed_tests} ✅")
        logger.info(f"Failed: {failed_tests} ❌")
        logger.info(f"Errors: {error_tests} 🚨")
        logger.info(f"Success Rate: {success_rate:.1f}%")
        logger.info(f"Total Time: {total_suite_time/1000:.2f}s")
        logger.info("="*60)
        
        if success_rate >= 80:
            logger.info("🎉 TEST SUITE PASSED! System is ready for production.")
        elif success_rate >= 60:
            logger.warning("⚠️ TEST SUITE PARTIALLY PASSED. Some issues need attention.")
        else:
            logger.error("💥 TEST SUITE FAILED. Critical issues found!")
        
        return summary
    
    async def cleanup(self):
        """Test cleanup"""
        if self.client:
            await self.client.aclose()

async def main():
    """Ana test fonksiyonu"""
    logger.info("🎨 AI Image Generation System - Comprehensive Test Suite")
    logger.info("Starting system integration tests...")
    
    tester = AIImageSystemTester()
    
    try:
        results = await tester.run_comprehensive_test_suite()
        
        # Save results to file
        with open("test_results_ai_image_system.json", "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        logger.info("📊 Test results saved to test_results_ai_image_system.json")
        
        return results
        
    except KeyboardInterrupt:
        logger.info("Test suite interrupted by user")
        return None
    except Exception as e:
        logger.error(f"Test suite failed with error: {str(e)}")
        return None
    finally:
        await tester.cleanup()

if __name__ == "__main__":
    asyncio.run(main())