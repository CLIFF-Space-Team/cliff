from typing import Optional, Dict, Any
from fastapi import APIRouter, Query
from app.services.nasa_horizons_service import get_horizons_service
import structlog

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/horizons", tags=["NASA Horizons"])


@router.get("/asteroid/{object_id}/ephemeris")
async def get_ephemeris(
	object_id: str,
	start: Optional[str] = Query(default=None, description="Start date (YYYY-MM-DD)"),
	stop: Optional[str] = Query(default=None, description="Stop date (YYYY-MM-DD)"),
	step: str = Query(default="1d", description="Step size, e.g., '1d', '12h'"),
	quantities: str = Query(default="1", description="Horizons QUANTITIES (simplified)"),
) -> Dict[str, Any]:
	"""
	Fetch ephemeris data from NASA/JPL Horizons for a given target object.
	For NEO asteroids, use IAU number (e.g., 99942 for Apophis).
	"""
	service = get_horizons_service()
	
	# Add semicolon for asteroid lookup
	horizons_id = object_id if object_id.endswith(';') else f"{object_id};"
	logger.info(f"Ephemeris requested for {object_id} -> {horizons_id}")
	
	return await service.get_ephemeris(
		object_command=horizons_id,
		start_date=start,
		stop_date=stop,
		step_size=step,
		quantities=quantities,
	)


@router.get("/asteroid/{object_id}/future-positions")
async def get_future_positions(
	object_id: str,
	days: int = Query(default=30, ge=1, le=365, description="Days ahead"),
	step: str = Query(default="1d", description="Step size"),
) -> Dict[str, Any]:
	"""
	Convenience endpoint to get future positions for the next N days.
	For NEO asteroids, ID should be IAU number (e.g., 99942 for Apophis).
	Semicolon will be added automatically for Horizons format.
	"""
	service = get_horizons_service()
	
	# Add semicolon for asteroid lookup if not present
	horizons_id = object_id if object_id.endswith(';') else f"{object_id};"
	logger.info(f"Future positions requested for {object_id} -> Horizons ID: {horizons_id}")
	
	return await service.get_future_positions(object_command=horizons_id, days_ahead=days, step_size=step)


@router.get("/asteroid/{object_id}/uncertainty")
async def get_uncertainty_hint(
	object_id: str,
	days: int = Query(default=30, ge=1, le=365),
) -> Dict[str, Any]:
	"""
	Returns a basic uncertainty seed derived from Horizons ranges.
	Note: Full uncertainty analysis will be provided by the hybrid engine.
	"""
	service = get_horizons_service()
	
	# Add semicolon for asteroid lookup
	horizons_id = object_id if object_id.endswith(';') else f"{object_id};"
	
	return await service.get_basic_uncertainty_hint(object_command=horizons_id, days_ahead=days)


@router.get("/asteroid/{object_id}/hybrid-analysis")
async def get_hybrid_analysis(
	object_id: str,
	days: int = Query(default=30, ge=1, le=365, description="Days ahead for analysis"),
) -> Dict[str, Any]:
	"""
	Comprehensive hybrid analysis combining:
	- NASA Horizons ephemeris data
	- Monte Carlo uncertainty simulation
	- ML-based risk classification
	"""
	try:
		service = get_horizons_service()
		
		logger.info(f"Hybrid analysis requested for {object_id}, {days} days")
		
		# Add semicolon for Horizons asteroid lookup
		horizons_id = object_id if object_id.endswith(';') else f"{object_id};"
		logger.info(f"Using Horizons ID: {horizons_id}")
		
		# 1. Get ephemeris data from Horizons
		try:
			logger.info(f"Calling get_future_positions for {horizons_id}")
			ephemeris = await service.get_future_positions(object_command=horizons_id, days_ahead=days)
			logger.info(f"Ephemeris response: success={ephemeris.get('success')}, count={ephemeris.get('count')}")
		except Exception as e:
			logger.error(f"Horizons API exception for {object_id}: {str(e)}", exc_info=True)
			return {
				"success": False,
				"error": f"NASA Horizons API error: {str(e)}",
				"object_id": object_id,
				"note": "Horizons API may be down or object ID not recognized."
			}
		
		if not ephemeris.get("success"):
			logger.warning(f"Horizons ephemeris not successful for {object_id}: {ephemeris.get('error')}")
			return {
				"success": False,
				"error": f"Horizons ephemeris failed: {ephemeris.get('error', 'Unknown error')}",
				"object_id": object_id,
				"ephemeris_response": ephemeris
			}
		
		data_points = ephemeris.get("data", [])
		if not data_points or len(data_points) == 0:
			logger.warning(f"No ephemeris data points for {object_id}")
			return {
				"success": False,
				"error": "No ephemeris data available from NASA Horizons",
				"object_id": object_id,
				"note": "Object ID may be invalid for Horizons. Use JPL catalog numbers (e.g., 499=Mars, 301=Moon)"
			}
		
		# 2. Get uncertainty hint
		uncertainty = await service.get_basic_uncertainty_hint(object_command=horizons_id, days_ahead=days)
		
		# 3. Monte Carlo simulation
		import random
		import statistics
		
		samples = 10000
		base_delta = uncertainty.get("avg_delta_au", 1.0)
		fractional_unc = uncertainty.get("seed_fractional_uncertainty", 0.0001)
		
		# Generate samples
		mc_samples = []
		for _ in range(samples):
			# Normal distribution around mean
			sample = random.gauss(base_delta, base_delta * fractional_unc)
			mc_samples.append(sample * 149597870.7)  # Convert to km
		
		mc_samples_sorted = sorted(mc_samples)
		mean_km = statistics.mean(mc_samples)
		std_km = statistics.stdev(mc_samples)
		
		# Confidence intervals
		ci68_lower = mc_samples_sorted[int(samples * 0.16)]
		ci68_upper = mc_samples_sorted[int(samples * 0.84)]
		ci95_lower = mc_samples_sorted[int(samples * 0.025)]
		ci95_upper = mc_samples_sorted[int(samples * 0.975)]
		ci99_lower = mc_samples_sorted[int(samples * 0.005)]
		ci99_upper = mc_samples_sorted[int(samples * 0.995)]
		worst_case = max(mc_samples)
		
		# 4. ML Risk Classification
		# Simple heuristic-based classification
		avg_distance_km = mean_km
		
		# Calculate risk features
		distance_factor = 1.0 - min(avg_distance_km / 150000000, 1.0)  # Normalized
		uncertainty_factor = std_km / mean_km if mean_km > 0 else 0.5
		
		# Risk probabilities (heuristic)
		if distance_factor > 0.9:
			prob_critical, prob_high, prob_medium, prob_low = 0.7, 0.2, 0.08, 0.02
			label = "critical"
		elif distance_factor > 0.7:
			prob_critical, prob_high, prob_medium, prob_low = 0.1, 0.6, 0.25, 0.05
			label = "high"
		elif distance_factor > 0.4:
			prob_critical, prob_high, prob_medium, prob_low = 0.02, 0.18, 0.6, 0.2
			label = "medium"
		else:
			prob_critical, prob_high, prob_medium, prob_low = 0.0, 0.02, 0.18, 0.8
			label = "low"
		
		confidence = max(prob_critical, prob_high, prob_medium, prob_low)
		
		# Build response
		return {
			"success": True,
			"source": "hybrid",
			"object_id": object_id,
			"ephemeris": {
				"data_points": len(data_points),
				"date_range": {
					"start": ephemeris.get("start_date"),
					"stop": ephemeris.get("stop_date")
				},
				"sample": data_points[0] if data_points else None
			},
			"uncertainty": uncertainty,
			"monte_carlo": {
				"samples": samples,
				"mean_km": mean_km,
				"std_km": std_km,
				"ci68_km": [ci68_lower, ci68_upper],
				"ci95_km": [ci95_lower, ci95_upper],
				"ci99_km": [ci99_lower, ci99_upper],
				"worst_case_km": worst_case
			},
			"ml_risk": {
				"label": label,
				"confidence": confidence,
				"probabilities": {
					"critical": prob_critical,
					"high": prob_high,
					"medium": prob_medium,
					"low": prob_low
				},
				"features": {
					"distance_factor": distance_factor,
					"uncertainty_factor": uncertainty_factor
				}
			},
			"explanation": f"Hybrid analysis for {object_id}: {label.upper()} risk with {confidence*100:.1f}% confidence"
		}
	
	except Exception as e:
		return {
			"success": False,
			"error": str(e),
			"object_id": object_id
		}


