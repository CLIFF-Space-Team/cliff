"""JPL Small-Body Database client.

Endpoint: https://ssd-api.jpl.nasa.gov/sbdb.api?sstr={designation}&phys-par=true

Returns up-to-date orbital + physical parameters for any small body
(asteroid or comet) catalogued by JPL. We use it to keep the impact-simulator
preset card live for active NEOs (Apophis, Bennu, …) — the diameter, density,
and orbital params can shift as new observations refine the orbit.

Long cache TTL: small-body parameters change on the order of weeks, not
minutes, so we don't need to hit JPL every request.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from app.core.config import settings
from app.core.logging import get_logger
from app.nasa import cache, http

log = get_logger(__name__)

CACHE_TTL_SECONDS = 24 * 60 * 60  # 24 h — physical params change slowly


async def get_body(designation: str) -> Optional[Dict[str, Any]]:
    """Return the raw SBDB payload for `designation` or None on failure."""
    key = f"sbdb:{designation.lower()}"

    async def loader() -> Dict[str, Any]:
        log.info("sbdb.fetch", designation=designation)
        try:
            return await http.request_json(
                "GET",
                f"{settings.NASA_SSD_BASE_URL}/sbdb.api",
                params={"sstr": designation, "phys-par": "true"},
                upstream_label="jpl.sbdb",
                max_retries=1,
            )
        except Exception as exc:
            log.warning("sbdb.fetch.failed", designation=designation, error=str(exc))
            return {"_unavailable": True}

    payload = await cache.get_or_fetch(key, CACHE_TTL_SECONDS, loader)
    if not isinstance(payload, dict) or payload.get("_unavailable"):
        return None
    return payload


def extract_physical(payload: Dict[str, Any]) -> Dict[str, Optional[float]]:
    """Pull diameter (km), albedo, density (g/cm³) out of an SBDB response.

    SBDB packs physical parameters as a list of {name, value, sigma, units}
    objects under `phys_par`. We hunt by name.
    """
    out: Dict[str, Optional[float]] = {
        "diameter_km": None,
        "albedo": None,
        "density_g_cm3": None,
        "rotation_period_h": None,
        "absolute_magnitude_h": None,
    }
    for entry in payload.get("phys_par", []) or []:
        name = (entry.get("name") or "").lower()
        try:
            val = float(entry.get("value"))
        except (TypeError, ValueError):
            continue
        if name == "diameter":
            out["diameter_km"] = val
        elif name == "albedo":
            out["albedo"] = val
        elif name == "density":
            out["density_g_cm3"] = val
        elif name == "rot_per":
            out["rotation_period_h"] = val
        elif name == "h":
            out["absolute_magnitude_h"] = val
    return out


def extract_orbit_summary(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Return a small subset of orbit data useful for the impact card."""
    orbit = payload.get("orbit") or {}
    elements = {e.get("name"): e for e in (orbit.get("elements") or [])}

    def _num(name: str) -> Optional[float]:
        e = elements.get(name)
        if not e:
            return None
        try:
            return float(e.get("value"))
        except (TypeError, ValueError):
            return None

    return {
        "semi_major_axis_au": _num("a"),
        "eccentricity": _num("e"),
        "inclination_deg": _num("i"),
        "perihelion_au": _num("q"),
        "aphelion_au": _num("ad"),
        "moid_au": _num("moid"),
    }
