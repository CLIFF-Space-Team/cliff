import asyncio
import aiohttp
import ssl
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import logging
from collections import Counter
logger = logging.getLogger(__name__)
@dataclass
class NASAImageData:
    
    nasa_id: str
    title: str
    description: Optional[str]
    media_type: str  # image, video, audio
    keywords: List[str]
    date_created: Optional[str]
    photographer: Optional[str]
    location: Optional[str]
    center: Optional[str]  # NASA center
    thumb_url: Optional[str]
    preview_url: Optional[str]
    original_url: Optional[str]
    manifest_url: Optional[str]
    secondary_creator: Optional[str]
    description_508: Optional[str]  # Accessibility description
@dataclass  
class ImageSearchParams:
    
    query: Optional[str] = None
    center: Optional[str] = None  # NASA center filter
    description: Optional[str] = None
    keywords: Optional[str] = None
    location: Optional[str] = None
    media_type: str = 'image'  # image, video, audio
    photographer: Optional[str] = None
    secondary_creator: Optional[str] = None
    title: Optional[str] = None
    year_start: Optional[str] = None
    year_end: Optional[str] = None
    page: int = 1
    page_size: int = 100
@dataclass
class ImageCollectionStats:
    
    total_hits: int
    returned_items: int
    media_types: Dict[str, int]
    centers: Dict[str, int]
    keywords_frequency: Dict[str, int]
    date_range: Dict[str, str]
class RateLimiter:
    
    def __init__(self, requests_per_second: float = 2):
        self.requests_per_second = requests_per_second
        self.last_request_time = 0
    async def acquire(self):
        
        current_time = asyncio.get_event_loop().time()
        time_since_last_request = current_time - self.last_request_time
        min_interval = 1.0 / self.requests_per_second
        if time_since_last_request < min_interval:
            await asyncio.sleep(min_interval - time_since_last_request)
        self.last_request_time = asyncio.get_event_loop().time()
class NASAImageLibraryService:
    
    def __init__(self):
        self.base_url = "https://images-api.nasa.gov"
        self.search_endpoint = "/search"
        self.asset_endpoint = "/asset"
        self.metadata_endpoint = "/metadata"
        self.ssl_context = ssl.create_default_context()
        self.ssl_context.check_hostname = False
        self.ssl_context.verify_mode = ssl.CERT_NONE
        self.rate_limiter = RateLimiter(requests_per_second=2)
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'Referer': 'https://images.nasa.gov/'
        }
    async def _make_request(self, session: aiohttp.ClientSession, url: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        
        await self.rate_limiter.acquire()
        try:
            async with session.get(url, params=params, headers=self.headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        'success': True,
                        'data': data,
                        'status_code': response.status
                    }
                else:
                    error_text = await response.text()
                    print(f"API request failed: HTTP {response.status} - {error_text[:200]}...")
                    return {
                        'success': False,
                        'error': f'HTTP {response.status}',
                        'status_code': response.status,
                        'details': error_text[:500]
                    }
        except asyncio.TimeoutError:
            return {
                'success': False,
                'error': 'Request timeout',
                'status_code': 408
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Request failed: {str(e)}',
                'status_code': 500
            }
    def _build_search_params(self, search_params: ImageSearchParams) -> Dict[str, str]:
        
        params = {}
        if search_params.query:
            params['q'] = search_params.query
        if search_params.center:
            params['center'] = search_params.center
        if search_params.description:
            params['description'] = search_params.description
        if search_params.keywords:
            params['keywords'] = search_params.keywords
        if search_params.location:
            params['location'] = search_params.location
        if search_params.media_type:
            params['media_type'] = search_params.media_type
        if search_params.photographer:
            params['photographer'] = search_params.photographer
        if search_params.secondary_creator:
            params['secondary_creator'] = search_params.secondary_creator
        if search_params.title:
            params['title'] = search_params.title
        if search_params.year_start:
            params['year_start'] = search_params.year_start
        if search_params.year_end:
            params['year_end'] = search_params.year_end
        params['page'] = str(search_params.page)
        params['page_size'] = str(min(search_params.page_size, 100))  # API limit
        return params
    def _parse_image_item(self, item: Dict[str, Any]) -> Optional[NASAImageData]:
        
        try:
            data = item.get('data', [{}])[0]  # First data item
            links = item.get('links', [])
            if not data:
                return None
            nasa_id = data.get('nasa_id', '')
            if not nasa_id:
                return None
            title = data.get('title', '')
            description = data.get('description', '')
            media_type = data.get('media_type', 'image')
            date_created = data.get('date_created', '')
            keywords_raw = data.get('keywords', [])
            if isinstance(keywords_raw, list):
                keywords = keywords_raw
            elif isinstance(keywords_raw, str):
                keywords = [kw.strip() for kw in keywords_raw.split(',') if kw.strip()]
            else:
                keywords = []
            photographer = data.get('photographer', '')
            location = data.get('location', '')
            center = data.get('center', '')
            secondary_creator = data.get('secondary_creator', '')
            description_508 = data.get('description_508', '')
            thumb_url = None
            preview_url = None
            original_url = None
            for link in links:
                href = link.get('href', '')
                rel = link.get('rel', '')
                if rel == 'preview':
                    thumb_url = href
                elif rel == 'captions' or 'thumb' in href.lower():
                    if not thumb_url:
                        thumb_url = href
                else:
                    if not preview_url:
                        preview_url = href
            manifest_url = f"{self.base_url}{self.asset_endpoint}/{nasa_id}" if nasa_id else None
            return NASAImageData(
                nasa_id=nasa_id,
                title=title,
                description=description if description else None,
                media_type=media_type,
                keywords=keywords,
                date_created=date_created if date_created else None,
                photographer=photographer if photographer else None,
                location=location if location else None,
                center=center if center else None,
                thumb_url=thumb_url,
                preview_url=preview_url,
                original_url=original_url,
                manifest_url=manifest_url,
                secondary_creator=secondary_creator if secondary_creator else None,
                description_508=description_508 if description_508 else None
            )
        except Exception as e:
            logger.warning(f"Failed to parse image item: {str(e)}")
            return None
    async def search_images(self, search_params: ImageSearchParams) -> Dict[str, Any]:
        
        try:
            connector = aiohttp.TCPConnector(ssl=self.ssl_context)
            timeout = aiohttp.ClientTimeout(total=30)
            async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
                params = self._build_search_params(search_params)
                url = f"{self.base_url}{self.search_endpoint}"
                logger.info(f"Searching NASA images with query: {search_params.query}")
                response = await self._make_request(session, url, params)
                if 'success' in response and not response['success']:
                    return response
                data = response.get('data', {})
                collection = data.get('collection', {})
                items = collection.get('items', [])
                metadata = collection.get('metadata', {})
                images = []
                for item in items:
                    image_data = self._parse_image_item(item)
                    if image_data:
                        images.append(image_data)
                total_hits = metadata.get('total_hits', len(images))
                logger.info(f"Found {len(images)} images out of {total_hits} total hits")
                return {
                    'success': True,
                    'images': images,
                    'count': len(images),
                    'total_hits': total_hits,
                    'page': search_params.page,
                    'page_size': search_params.page_size,
                    'search_params': search_params,
                    'source': 'NASA Image Library',
                    'fetch_time': datetime.now().isoformat()
                }
        except Exception as e:
            logger.error(f"Search images error: {str(e)}")
            return {'success': False, 'error': str(e)}
    async def get_popular_space_images(self, limit: int = 50) -> Dict[str, Any]:
        
        search_params = ImageSearchParams(
            query="space",
            media_type="image",
            page_size=limit,
            page=1
        )
        result = await self.search_images(search_params)
        if result.get('success'):
            result['search_type'] = 'Popular Space Images'
        return result
    async def get_earth_images(self, limit: int = 30) -> Dict[str, Any]:
        
        search_params = ImageSearchParams(
            query="Earth",
            keywords="planet,observation,satellite",
            media_type="image",
            page_size=limit,
            page=1
        )
        result = await self.search_images(search_params)
        if result.get('success'):
            result['search_type'] = 'Earth Images'
        return result
    async def get_mars_images(self, limit: int = 30) -> Dict[str, Any]:
        
        search_params = ImageSearchParams(
            query="Mars",
            keywords="rover,surface,planet",
            media_type="image",
            page_size=limit,
            page=1
        )
        result = await self.search_images(search_params)
        if result.get('success'):
            result['search_type'] = 'Mars Images'
        return result
    async def get_asteroid_images(self, limit: int = 20) -> Dict[str, Any]:
        
        search_params = ImageSearchParams(
            query="asteroid",
            keywords="near earth object,NEO,impact,space rock",
            media_type="image",
            page_size=limit,
            page=1
        )
        result = await self.search_images(search_params)
        if result.get('success'):
            result['search_type'] = 'Asteroid Images'
        return result
    async def get_hubble_images(self, limit: int = 40) -> Dict[str, Any]:
        
        search_params = ImageSearchParams(
            query="Hubble",
            keywords="telescope,space,galaxy,nebula,star",
            media_type="image", 
            page_size=limit,
            page=1
        )
        result = await self.search_images(search_params)
        if result.get('success'):
            result['search_type'] = 'Hubble Images'
        return result
    async def get_recent_images(self, days_back: int = 30, limit: int = 50) -> Dict[str, Any]:
        
        end_year = datetime.now().year
        start_year = end_year - (days_back // 365) - 1
        search_params = ImageSearchParams(
            query="space mission",
            year_start=str(max(2020, start_year)),
            year_end=str(end_year),
            media_type="image",
            page_size=limit,
            page=1
        )
        result = await self.search_images(search_params)
        if result.get('success'):
            result['search_type'] = 'Recent Images'
        return result
    async def get_image_details(self, nasa_id: str) -> Dict[str, Any]:
        
        try:
            connector = aiohttp.TCPConnector(ssl=self.ssl_context)
            timeout = aiohttp.ClientTimeout(total=30)
            async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
                asset_url = f"{self.base_url}{self.asset_endpoint}/{nasa_id}"
                asset_response = await self._make_request(session, asset_url, {})
                if 'success' in asset_response and not asset_response['success']:
                    return asset_response
                metadata_url = f"{self.base_url}{self.metadata_endpoint}/{nasa_id}"
                metadata_response = await self._make_request(session, metadata_url, {})
                return {
                    'success': True,
                    'nasa_id': nasa_id,
                    'assets': asset_response,
                    'metadata': metadata_response if 'success' not in metadata_response else None,
                    'fetch_time': datetime.now().isoformat()
                }
        except Exception as e:
            logger.error(f"Get image details error: {str(e)}")
            return {'success': False, 'error': str(e)}
    def calculate_collection_stats(self, images: List[NASAImageData]) -> ImageCollectionStats:
        
        try:
            if not images:
                return ImageCollectionStats(
                    total_hits=0, returned_items=0, media_types={},
                    centers={}, keywords_frequency={}, date_range={}
                )
            media_types = {}
            for image in images:
                media_type = image.media_type or 'unknown'
                media_types[media_type] = media_types.get(media_type, 0) + 1
            centers = {}
            for image in images:
                center = image.center or 'unknown'
                centers[center] = centers.get(center, 0) + 1
            keywords_freq = {}
            for image in images:
                for keyword in image.keywords:
                    keyword = keyword.lower().strip()
                    if keyword:
                        keywords_freq[keyword] = keywords_freq.get(keyword, 0) + 1
            dates = [img.date_created for img in images if img.date_created]
            date_range = {}
            if dates:
                date_range['earliest'] = min(dates)
                date_range['latest'] = max(dates)
            return ImageCollectionStats(
                total_hits=len(images),
                returned_items=len(images),
                media_types=media_types,
                centers=centers,
                keywords_frequency=dict(list(keywords_freq.items())[:10]),  # Top 10 keywords
                date_range=date_range
            )
        except Exception as e:
            logger.error(f"Statistics calculation error: {str(e)}")
            return ImageCollectionStats(
                total_hits=0, returned_items=0, media_types={},
                centers={}, keywords_frequency={}, date_range={}
            )
_nasa_image_service_instance = None
def get_nasa_image_service() -> NASAImageLibraryService:
    
    global _nasa_image_service_instance
    if _nasa_image_service_instance is None:
        _nasa_image_service_instance = NASAImageLibraryService()
    return _nasa_image_service_instance
