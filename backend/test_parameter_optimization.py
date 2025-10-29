#!/usr/bin/env python3
"""
NASA SSD/CNEOS Parameter Optimization Test
Sentry, Scout, NHATS API'lerinin HTTP 400 hatalarını çözmeye yönelik parameter testi
"""

import asyncio
import aiohttp
import ssl
import json
from datetime import datetime, timedelta


class ParameterOptimizer:
    """NASA API parameter optimization"""
    
    def __init__(self):
        # SSL context for Windows
        self.ssl_context = ssl.create_default_context()
        self.ssl_context.check_hostname = False
        self.ssl_context.verify_mode = ssl.CERT_NONE
        self.connector = aiohttp.TCPConnector(ssl=self.ssl_context)
        
        # API base URLs
        self.apis = {
            'sentry': 'https://ssd-api.jpl.nasa.gov/sentry.api',
            'scout': 'https://ssd-api.jpl.nasa.gov/scout.api', 
            'nhats': 'https://ssd-api.jpl.nasa.gov/nhats.api'
        }
    
    async def test_api_with_params(self, session, api_name, url, params_set):
        """Test API with different parameter combinations"""
        results = []
        
        for i, params in enumerate(params_set, 1):
            try:
                print(f"  [{i}/{len(params_set)}] Testing {api_name} with params: {params}")
                
                async with session.get(url, params=params, timeout=10) as response:
                    status = response.status
                    
                    if status == 200:
                        try:
                            data = await response.json()
                            count = len(data.get('data', [])) if isinstance(data.get('data'), list) else 'N/A'
                            print(f"    [+] SUCCESS: HTTP 200 - {count} records")
                            results.append({
                                'params': params,
                                'status': status,
                                'success': True,
                                'data_count': count,
                                'response': data
                            })
                        except json.JSONDecodeError:
                            text = await response.text()
                            print(f"    [+] SUCCESS: HTTP 200 - Non-JSON response ({len(text)} chars)")
                            results.append({
                                'params': params,
                                'status': status,
                                'success': True,
                                'response_text': text[:200]
                            })
                    else:
                        text = await response.text()
                        print(f"    [-] FAILED: HTTP {status} - {text[:100]}")
                        results.append({
                            'params': params,
                            'status': status,
                            'success': False,
                            'error': text[:200]
                        })
                        
            except asyncio.TimeoutError:
                print(f"    [-] TIMEOUT: Request timed out")
                results.append({
                    'params': params,
                    'status': 'timeout',
                    'success': False,
                    'error': 'Request timeout'
                })
            except Exception as e:
                print(f"    [-] ERROR: {str(e)}")
                results.append({
                    'params': params,
                    'status': 'error',
                    'success': False,
                    'error': str(e)
                })
                
            # Small delay between requests
            await asyncio.sleep(0.5)
        
        return results
    
    def generate_sentry_params(self):
        """Generate Sentry API parameter combinations"""
        # Sentry API tracks objects with impact risk
        param_sets = [
            # Minimal parameters
            {},
            
            # Basic filtering
            {'removed': 'false'},
            {'removed': 'true'},
            
            # Probability filtering
            {'ps-min': '1e-10'},
            {'ps-max': '0.01'},
            {'ps-min': '1e-10', 'ps-max': '0.01'},
            
            # Energy filtering  
            {'energy-min': '0.1'},
            {'energy-max': '1000'},
            {'energy-min': '0.1', 'energy-max': '1000'},
            
            # Diameter filtering
            {'diameter-min': '1'},
            {'diameter-max': '1000'},
            {'diameter-min': '1', 'diameter-max': '1000'},
            
            # Date filtering
            {'date-min': '2020-01-01'},
            {'date-max': '2030-01-01'},
            {'date-min': '2020-01-01', 'date-max': '2030-01-01'},
            
            # Limit and sort
            {'limit': '10'},
            {'limit': '50'},
            {'sort': 'date'},
            {'sort': '-date'},
            {'sort': 'ps'},
            {'sort': '-ps'},
            
            # Combined reasonable parameters
            {'removed': 'false', 'limit': '10'},
            {'removed': 'false', 'ps-min': '1e-10', 'limit': '20'},
            {'removed': 'false', 'date-min': '2020-01-01', 'limit': '15'},
        ]
        
        return param_sets
    
    def generate_scout_params(self):
        """Generate Scout API parameter combinations"""
        # Scout API tracks recently discovered objects
        param_sets = [
            # Minimal parameters
            {},
            
            # Plot parameters
            {'plot': 'false'},
            {'plot': 'true'},
            
            # Time filtering
            {'tof-min': '1'},
            {'tof-max': '365'},
            {'tof-min': '1', 'tof-max': '100'},
            
            # Magnitude filtering
            {'h-min': '15'},
            {'h-max': '30'},
            {'h-min': '18', 'h-max': '25'},
            
            # Uncertainty filtering
            {'unc-min': '0'},
            {'unc-max': '9'},
            {'unc-min': '0', 'unc-max': '6'},
            
            # NEO parameters
            {'neo': 'true'},
            {'neo': 'false'},
            
            # Limit and sort
            {'limit': '10'},
            {'limit': '25'},
            {'sort': 'score'},
            {'sort': '-score'},
            {'sort': 'time'},
            {'sort': '-time'},
            
            # Combined parameters
            {'plot': 'false', 'limit': '10'},
            {'neo': 'true', 'limit': '15'},
            {'tof-max': '30', 'limit': '20'},
            {'unc-max': '5', 'neo': 'true', 'limit': '10'},
        ]
        
        return param_sets
    
    def generate_nhats_params(self):
        """Generate NHATS API parameter combinations"""
        # NHATS API tracks human-accessible Near-Earth objects
        param_sets = [
            # Minimal parameters
            {},
            
            # Delta-V filtering (km/s)
            {'dv': '12'},
            {'dv': '15'},
            {'dv': '10'},
            {'dv': '8'},
            
            # Duration filtering (days)
            {'dur': '450'},
            {'dur': '600'},
            {'dur': '300'},
            
            # Stay time filtering (days)
            {'stay': '8'},
            {'stay': '15'},
            {'stay': '30'},
            
            # Launch window
            {'launch': '2025-2030'},
            {'launch': '2025-2035'},
            {'launch': '2030-2040'},
            
            # Magnitude filtering
            {'h': '28'},
            {'h': '25'},
            {'h': '30'},
            
            # Object diameter (meters)
            {'occ': '140'},
            {'occ': '100'},
            {'occ': '200'},
            
            # Sort options
            {'sort': 'dv'},
            {'sort': '-dv'},
            {'sort': 'dur'},
            {'sort': '-dur'},
            {'sort': 'launch'},
            {'sort': '-launch'},
            
            # Combined reasonable parameters
            {'dv': '12', 'dur': '450'},
            {'dv': '10', 'stay': '15'},
            {'launch': '2025-2030', 'h': '25'},
            {'dv': '15', 'dur': '600', 'stay': '8'},
            {'occ': '140', 'dv': '12'},
        ]
        
        return param_sets
    
    async def optimize_parameters(self):
        """Run parameter optimization for all APIs"""
        print("=" * 70)
        print("NASA SSD/CNEOS PARAMETER OPTIMIZATION")
        print("=" * 70)
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        async with aiohttp.ClientSession(connector=self.connector) as session:
            results = {}
            
            # Test Sentry API
            print(f"\n[1/3] SENTRY API OPTIMIZATION")
            print("-" * 50)
            sentry_params = self.generate_sentry_params()
            results['sentry'] = await self.test_api_with_params(
                session, 'sentry', self.apis['sentry'], sentry_params
            )
            
            # Test Scout API  
            print(f"\n[2/3] SCOUT API OPTIMIZATION")
            print("-" * 50)
            scout_params = self.generate_scout_params()
            results['scout'] = await self.test_api_with_params(
                session, 'scout', self.apis['scout'], scout_params
            )
            
            # Test NHATS API
            print(f"\n[3/3] NHATS API OPTIMIZATION")
            print("-" * 50)  
            nhats_params = self.generate_nhats_params()
            results['nhats'] = await self.test_api_with_params(
                session, 'nhats', self.apis['nhats'], nhats_params
            )
            
        # Analyze results
        self.analyze_results(results)
        
        return results
    
    def analyze_results(self, results):
        """Analyze optimization results"""
        print("\n" + "=" * 70)
        print("PARAMETER OPTIMIZATION RESULTS")
        print("=" * 70)
        
        for api_name, api_results in results.items():
            print(f"\n[{api_name.upper()} API ANALYSIS]")
            print("-" * 30)
            
            total_tests = len(api_results)
            successful_tests = [r for r in api_results if r['success']]
            failed_tests = [r for r in api_results if not r['success']]
            
            success_rate = len(successful_tests) / total_tests * 100
            
            print(f"Total tests: {total_tests}")
            print(f"Successful: {len(successful_tests)} ({success_rate:.1f}%)")
            print(f"Failed: {len(failed_tests)} ({100-success_rate:.1f}%)")
            
            if successful_tests:
                print(f"\n✅ WORKING PARAMETER COMBINATIONS:")
                for i, result in enumerate(successful_tests[:5], 1):
                    params_str = ', '.join([f"{k}={v}" for k, v in result['params'].items()]) or "No parameters"
                    data_info = f" ({result.get('data_count', 'Unknown')} records)" if 'data_count' in result else ""
                    print(f"  {i}. {params_str}{data_info}")
                
                if len(successful_tests) > 5:
                    print(f"  ... and {len(successful_tests) - 5} more working combinations")
            else:
                print(f"\n❌ NO WORKING COMBINATIONS FOUND")
            
            if failed_tests:
                # Analyze common errors
                status_codes = {}
                for result in failed_tests:
                    status = result.get('status', 'unknown')
                    status_codes[status] = status_codes.get(status, 0) + 1
                
                print(f"\n❌ COMMON ERROR PATTERNS:")
                for status, count in status_codes.items():
                    print(f"  - {status}: {count} times")
                
                # Show sample errors
                print(f"\n📋 SAMPLE ERRORS:")
                for result in failed_tests[:3]:
                    params_str = ', '.join([f"{k}={v}" for k, v in result['params'].items()]) or "No parameters"
                    error = result.get('error', 'Unknown error')[:50]
                    print(f"  - {params_str} → {error}")


async def main():
    """Main optimization function"""
    optimizer = ParameterOptimizer()
    
    try:
        results = await optimizer.optimize_parameters()
        
        print(f"\n⏰ Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 70)
        
        # Summary
        total_success = sum(len([r for r in api_results if r['success']]) for api_results in results.values())
        total_tests = sum(len(api_results) for api_results in results.values())
        
        print(f"OVERALL SUMMARY: {total_success}/{total_tests} successful parameter combinations found")
        
        if total_success > 0:
            print("✅ Parameter optimization completed - working combinations found!")
        else:
            print("❌ No working parameter combinations found - APIs may have issues")
            
    except Exception as e:
        print(f"❌ Optimization failed: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())