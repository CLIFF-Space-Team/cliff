import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
import httpx

# Simple in-memory TTL cache for API responses
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
	"""
	Lightweight client for NASA/JPL Horizons API.
	Reference: https://ssd.jpl.nasa.gov/horizons/manual.html
	"""

	_base_url: str = "https://ssd.jpl.nasa.gov/api/horizons.api"
	_cache: _TTLCache

	def __init__(self, cache_ttl_seconds: int = 3600) -> None:
		self._cache = _TTLCache(default_ttl_seconds=cache_ttl_seconds)

	def _cache_key(self, params: Dict[str, str]) -> str:
		parts = [f"{k}={v}" for k, v in sorted(params.items())]
		return "&".join(parts)

	def _default_params(
		self,
		command: str,
		start_time: str,
		stop_time: str,
		step_size: str = "1 d",
		quantities: str = "1,9,20,23,24,29",
	) -> Dict[str, str]:
		"""
		Build default parameters for an observer-table query (geocentric).
		Using CSV output for easier parsing.
		"""
		return {
			"format": "text",
			"COMMAND": f"'{command}'",  # asteroid/comet/planet id or name; e.g. '499' for Mars
			"OBJ_DATA": "YES",
			"MAKE_EPHEM": "YES",
			"EPHEM_TYPE": "OBSERVER",
			"CENTER": "500@399",  # geocentric (observer at Earth center)
			"START_TIME": start_time,
			"STOP_TIME": stop_time,
			"STEP_SIZE": step_size,
			"QUANTITIES": quantities,
			"CSV_FORMAT": "YES",
		}

	async def _request(self, params: Dict[str, str]) -> str:
		cache_key = self._cache_key(params)
		cached = self._cache.get(cache_key)
		if cached is not None:
			return cached
		async with httpx.AsyncClient(timeout=60) as client:
			resp = await client.get(self._base_url, params=params)
			resp.raise_for_status()
			text = resp.text
		self._cache.set(cache_key, text)
		return text

	@staticmethod
	def _extract_table_lines(raw_text: str) -> List[str]:
		"""
		Extract table lines between $$SOE and $$EOE.
		When CSV_FORMAT=YES is set, lines will be comma-separated values.
		"""
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
			return []
		return [l for l in lines[start_idx:end_idx] if l.strip()]

	@staticmethod
	def _parse_csv_line(csv_line: str) -> Dict[str, Any]:
		"""
		Basic parser for Horizons CSV line with columns:
		  Date__(UT)__HR:MN, RA(ICRF), DEC, APmag, S-brt, delta(AU), deldot(km/s), S-O-T, S-T-O, Cnst
		Some columns may be missing depending on QUANTITIES; parser tries to be robust.
		"""
		parts = [p.strip() for p in csv_line.split(",")]
		data: Dict[str, Any] = {}
		if parts:
			data["datetime_utc"] = parts[0]
		# Heuristic mapping by typical column count
		# Try to locate delta and deldot near the end safely
		if len(parts) >= 6:
			# Common positions with QUANTITIES='1,9,20,23,24,29'
			# 0:date, 1:RA, 2:DEC, 3:APmag, 4:S-brt, 5:delta, 6:deldot, 7:S-O-T, 8:S-T-O, 9:Cnst
			data["ra_icrf"] = parts[1] if len(parts) > 1 else None
			data["dec_icrf"] = parts[2] if len(parts) > 2 else None
			data["apparent_mag"] = NASAHorizonsService._to_float(parts[3]) if len(parts) > 3 else None
			data["surface_brightness"] = NASAHorizonsService._to_float(parts[4]) if len(parts) > 4 else None
			data["delta_au"] = NASAHorizonsService._to_float(parts[5]) if len(parts) > 5 else None
			data["deldot_kms"] = NASAHorizonsService._to_float(parts[6]) if len(parts) > 6 else None
			data["s_o_t_deg"] = NASAHorizonsService._to_float(parts[7]) if len(parts) > 7 else None
			# parts[8] sometimes in format '120.6420 /T' when CSV is not strict; try split
			if len(parts) > 8 and parts[8]:
				try:
					data["s_t_o_deg"] = NASAHorizonsService._to_float(parts[8].split()[0])
				except Exception:
					data["s_t_o_deg"] = NASAHorizonsService._to_float(parts[8])
			if len(parts) > 9:
				data["constellation"] = parts[9]
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
			# Some fields may have trailing flags, attempt to strip
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
		quantities: str = "1,9,20,23,24,29",
	) -> str:
		"""
		Fetch raw Horizons ephemeris table (text, CSV-formatted rows between $$SOE/$$EOE).
		"""
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
		quantities: str = "1,9,20,23,24,29",
	) -> Dict[str, Any]:
		"""
		Return parsed ephemeris entries with useful fields.
		"""
		raw = await self.get_ephemeris_raw(
			object_command=object_command,
			start_date=start_date,
			stop_date=stop_date,
			step_size=step_size,
			quantities=quantities,
		)
		rows = self._extract_table_lines(raw)
		parsed = [self._parse_csv_line(r) for r in rows]
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
			"raw": raw,
		}

	async def get_future_positions(
		self,
		object_command: str,
		days_ahead: int = 30,
		step_size: str = "1 d",
	) -> Dict[str, Any]:
		"""
		Convenience wrapper to fetch next N days of ephemeris.
		"""
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
		"""
		Horizons observer table typically doesn't include covariance.
		This method returns a basic placeholder that downstream Monte Carlo
		can use as a seed (e.g., small percentage of range).
		"""
		ephem = await self.get_future_positions(object_command=object_command, days_ahead=days_ahead)
		data = ephem.get("data") or []
		if not data:
			return {"success": False, "message": "No ephemeris entries available"}
		ranges = [d.get("delta_au") for d in data if d.get("delta_au") is not None]
		if not ranges:
			return {"success": False, "message": "No range data to derive uncertainty"}
		avg_delta = sum(ranges) / len(ranges)
		# Assume nominal 0.01% fractional uncertainty as a conservative seed
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


