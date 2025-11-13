from typing import Optional, Dict, Any
from fastapi import APIRouter, Query
from app.services.nasa_horizons_service import get_horizons_service

router = APIRouter()


@router.get("/api/v1/horizons/asteroid/{object_id}/ephemeris", tags=["NASA Horizons"])
async def get_ephemeris(
	object_id: str,
	start: Optional[str] = Query(default=None, description="Start date (YYYY-MM-DD)"),
	stop: Optional[str] = Query(default=None, description="Stop date (YYYY-MM-DD)"),
	step: str = Query(default="1 d", description="Step size, e.g., '1 d', '12 h'"),
	quantities: str = Query(default="1,9,20,23,24,29", description="Horizons QUANTITIES list"),
) -> Dict[str, Any]:
	"""
	Fetch ephemeris data from NASA/JPL Horizons for a given target object.
	"""
	service = get_horizons_service()
	return await service.get_ephemeris(
		object_command=object_id,
		start_date=start,
		stop_date=stop,
		step_size=step,
		quantities=quantities,
	)


@router.get("/api/v1/horizons/asteroid/{object_id}/future-positions", tags=["NASA Horizons"])
async def get_future_positions(
	object_id: str,
	days: int = Query(default=30, ge=1, le=365, description="Days ahead"),
	step: str = Query(default="1 d", description="Step size"),
) -> Dict[str, Any]:
	"""
	Convenience endpoint to get future positions for the next N days.
	"""
	service = get_horizons_service()
	return await service.get_future_positions(object_command=object_id, days_ahead=days, step_size=step)


@router.get("/api/v1/horizons/asteroid/{object_id}/uncertainty", tags=["NASA Horizons"])
async def get_uncertainty_hint(
	object_id: str,
	days: int = Query(default=30, ge=1, le=365),
) -> Dict[str, Any]:
	"""
	Returns a basic uncertainty seed derived from Horizons ranges.
	Note: Full uncertainty analysis will be provided by the hybrid engine.
	"""
	service = get_horizons_service()
	return await service.get_basic_uncertainty_hint(object_command=object_id, days_ahead=days)


