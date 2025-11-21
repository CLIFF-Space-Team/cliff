import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
import httpx

class _TTLCache:
	_def_ttl_seconds: int
	_store: Dict[str, Tuple[float, Any]]

	def __init__(self, default_ttl_seconds: int = 3600) -> None:
		self._def_ttl_seconds = default_ttl_seconds
		self._store = {}

	def _now(self) -> float:
		return datetime.now().timestamp()

	def get(self, key: str) -> Optional[Any]:
		entry = self._store.get(key)
		if not entry:
			return None
		expires_at, value = entry
		if self._now() > expires_at:
			self._store.pop(key, None)
			return None
		return value

	def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
		ttl = ttl_seconds if ttl_seconds is not None else self._def_ttl_seconds
		self._store[key] = (self._now() + ttl, value)


class NASAHorizonsService:
	

	_base_url: str = "https://ssd.jpl.nasa.gov/api/horizons.api"
	_cache: _TTLCache

	def __init__(self, cache_ttl_seconds: int = 3600) -> None:
		self._cache = _TTLCache(default_ttl_seconds=cache_ttl_seconds)
		self._cache._store = {}

	def _cache_key(self, params: Dict[str, str]) -> str:
		parts = [f"{k}={v}" for k, v in sorted(params.items())]
		return "&".join(parts)

	def _default_params(
		self,
		command: str,
		start_time: str,
		stop_time: str,
		step_size: str = "1d",  # BoÅŸluksuz format (URL encoding sorunu yok)
		quantities: str = "1",  # Sadece RA/DEC (en basit)
	) -> Dict[str, str]:
		
		return {
			"format": "json",  # JSON format for reliable parsing
			"COMMAND": f"'{command}'",  # NEO asteroid: '99942;' for Apophis
			"OBJ_DATA": "YES",
			"MAKE_EPHEM": "YES",
			"EPHEM_TYPE": "OBSERVER",
			"CENTER": "500@399",  # geocentric (observer at Earth center)
			"START_TIME": start_time,
			"STOP_TIME": stop_time,
			"STEP_SIZE": step_size,
			"QUANTITIES": quantities,
			"CSV_FORMAT": "NO",  # JSON format doesn't use CSV
		}

	async def _request(self, params: Dict[str, str]) -> str:
		cache_key = self._cache_key(params)
		cached = self._cache.get(cache_key)
		if cached is not None:
			import structlog
			logger = structlog.get_logger(__name__)
			logger.debug(f"Cache hit for Horizons query")
			return cached
		
		import structlog
		logger = structlog.get_logger(__name__)
		
		from urllib.parse import quote
		
		url_parts = []
		for key, value in params.items():
			encoded_val = quote(str(value), safe='')
			url_parts.append(f"{key}={encoded_val}")
		
		full_url = f"{self._base_url}?{'&'.join(url_parts)}"
		logger.info(f"Horizons API request: {params.get('COMMAND', 'unknown')}")
		logger.debug(f"Full URL: {full_url[:200]}...")
		
		async with httpx.AsyncClient(timeout=60) as client:
			resp = await client.get(full_url)
			resp.raise_for_status()
			text = resp.text
			
		logger.info(f"Horizons API response: {len(text)} bytes")
		
		if "INPUT ERROR" in text:
			logger.error(f"Horizons INPUT ERROR: {text[:300]}")
		
		self._cache.set(cache_key, text, ttl_seconds=3600)
		return text

	@staticmethod
	def _extract_table_lines(raw_text: str) -> List[str]:
		
		lines = raw_text.splitlines()
		start_idx = None
		end_idx = None
		for i, line in enumerate(lines):
			if line.strip() == "$$SOE":
				start_idx = i + 1
			if line.strip() == "$$EOE":
				end_idx = i
				break
		if start_idx is None or end_idx is None or end_idx <= start_idx:
			import structlog
			logger = structlog.get_logger(__name__)
			logger.warning(f"No $$SOE/$$EOE markers found. Start: {start_idx}, End: {end_idx}")
			logger.debug("Raw text preview:", lines=lines[:20] if len(lines) > 20 else lines)
			return []
		extracted = [l for l in lines[start_idx:end_idx] if l.strip()]
		import structlog
		logger = structlog.get_logger(__name__)
		logger.info(f"Extracted {len(extracted)} data lines from Horizons response")
		return extracted

	@staticmethod
	def _parse_csv_line(csv_line: str) -> Dict[str, Any]:
		
		parts = csv_line.split()
		data: Dict[str, Any] = {}
		
		if len(parts) >= 2:
			data["datetime_utc"] = f"{parts[0]} {parts[1]}"
		
		if len(parts) >= 5:
			data["ra_icrf"] = f"{parts[2]} {parts[3]} {parts[4]}"
		
		if len(parts) >= 8:
			data["dec_icrf"] = f"{parts[5]} {parts[6]} {parts[7]}"
			
		data["apparent_mag"] = None
		data["surface_brightness"] = None
		data["delta_au"] = None
		data["deldot_kms"] = None
		data["s_o_t_deg"] = None
		data["s_t_o_deg"] = None
		data["constellation"] = None
		
		return data

	@staticmethod
	def _to_float(value: Optional[str]) -> Optional[float]:
		if value is None:
			return None
		s = value.strip()
		if not s or s.lower() == "n.a.":
			return None
		try:
			return float(s)
		except Exception:
			try:
				return float(s.split()[0])
			except Exception:
				return None

	def _default_range(self, days: int) -> Tuple[str, str]:
		start = datetime.utcnow()
		stop = start + timedelta(days=days)
		return (start.strftime("%Y-%m-%d"), stop.strftime("%Y-%m-%d"))

	async def get_ephemeris_raw(
		self,
		object_command: str,
		start_date: Optional[str] = None,
		stop_date: Optional[str] = None,
		step_size: str = "1 d",
		quantities: str = "1",  # FIXED: Sadece RA/DEC
	) -> str:
		
		if not start_date or not stop_date:
			s, e = self._default_range(days=30)
			start_date = start_date or s
			stop_date = stop_date or e
		params = self._default_params(
			command=object_command,
			start_time=start_date,
			stop_time=stop_date,
			step_size=step_size,
			quantities=quantities,
		)
		return await self._request(params)

	async def get_ephemeris(
		self,
		object_command: str,
		start_date: Optional[str] = None,
		stop_date: Optional[str] = None,
		step_size: str = "1 d",
		quantities: str = "1",  # Sadece RA/DEC
	) -> Dict[str, Any]:
		
		import json
		import structlog
		logger = structlog.get_logger(__name__)
		
		if not start_date or not stop_date:
			s, e = self._default_range(days=30)
			start_date = start_date or s
			stop_date = stop_date or e
			
		params = self._default_params(
			command=object_command,
			start_time=start_date,
			stop_time=stop_date,
			step_size=step_size,
			quantities=quantities,
		)
		
		raw = await self._request(params)
		
		try:
			json_data = json.loads(raw)
			logger.debug(f"JSON keys: {list(json_data.keys())}")
			
			if "result" in json_data:
				result_text = json_data["result"]
				
				if "ERROR" in result_text.upper() or "error loading" in result_text.lower():
					logger.error(f"Horizons returned error for {object_command}: {result_text[:200]}")
					return {
						"success": False,
						"error": "Horizons API error",
						"object": object_command,
						"raw": result_text[:500]
					}
				
				rows = self._extract_table_lines(result_text)
				parsed = [self._parse_csv_line(r) for r in rows]
				
				logger.info(f"Parsed {len(parsed)} ephemeris points for {object_command}")
				
				return {
					"success": True,
					"source": "NASA/JPL Horizons",
					"model": "DE441",
					"object": object_command,
					"start_date": start_date,
					"stop_date": stop_date,
					"step_size": step_size,
					"count": len(parsed),
					"data": parsed,
					"raw": result_text,
				}
			else:
				logger.error("Unexpected JSON structure from Horizons")
				return {
					"success": False,
					"error": "Unexpected response format",
					"object": object_command
				}
				
		except json.JSONDecodeError as e:
			logger.error(f"Failed to parse Horizons JSON: {e}")
			return {
				"success": False,
				"error": "JSON parse error",
				"object": object_command,
				"raw": raw[:500]
			}

	async def get_future_positions(
		self,
		object_command: str,
		days_ahead: int = 30,
		step_size: str = "1d",  # FIXED: BoÅŸluksuz format
	) -> Dict[str, Any]:
		
		start, stop = self._default_range(days=days_ahead)
		return await self.get_ephemeris(
			object_command=object_command,
			start_date=start,
			stop_date=stop,
			step_size=step_size,
		)

	async def get_basic_uncertainty_hint(
		self,
		object_command: str,
		days_ahead: int = 30,
	) -> Dict[str, Any]:
		
		ephem = await self.get_future_positions(object_command=object_command, days_ahead=days_ahead)
		data = ephem.get("data") or []
		if not data:
			return {"success": False, "message": "No ephemeris entries available"}
		ranges = [d.get("delta_au") for d in data if d.get("delta_au") is not None]
		if not ranges:
			return {"success": False, "message": "No range data to derive uncertainty"}
		avg_delta = sum(ranges) / len(ranges)
		fractional = 1e-4
		return {
			"success": True,
			"object": object_command,
			"days": days_ahead,
			"avg_delta_au": avg_delta,
			"seed_fractional_uncertainty": fractional,
		}


_horizons_instance: Optional[NASAHorizonsService] = None


def get_horizons_service() -> NASAHorizonsService:
	global _horizons_instance
	if _horizons_instance is None:
		_horizons_instance = NASAHorizonsService()
	return _horizons_instance

