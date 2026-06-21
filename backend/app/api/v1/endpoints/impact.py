"""Impact physics + presets endpoint.

`/calculate` is the per-scenario solver (Collins/Holsapple scaling). `/presets`
serves the impact-simulator picker as a hybrid list:
  - historical events (Tunguska, Chelyabinsk, …) — fixed parameters from
    `data/historical_impacts.json`, marked `kind="historical"`
  - active NEOs (Apophis, Bennu, …) — diameter pulled live from JPL Small-Body
    DB so the simulator stays in sync with the latest astrometric refinements,
    marked `kind="active_neo"`
"""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.logging import get_logger
from app.nasa import sbdb

log = get_logger(__name__)

router = APIRouter()

DATA_DIR = Path(__file__).resolve().parents[3] / "data"
HISTORICAL_IMPACTS_PATH = DATA_DIR / "historical_impacts.json"


# Active-NEO presets backed by JPL Small-Body DB. Static fields are
# editorial framing (subtitle/context); diameter + velocity get refreshed
# from SBDB on each /presets call (cached 24h server-side).
ACTIVE_NEO_PRESETS: List[Dict[str, Any]] = [
    {
        "id": "apophis",
        "designation": "99942",
        "name": "99942 Apophis",
        "subtitle": "13 Nisan 2029 yaklaşımı",
        "era": "NEO · canlı",
        "context_template": ("{diameter} m S-tipi, ~12.6 km/s. " "Yakın geçiş — temas senaryosu hipotetik."),
        "default_input": {
            "diameterM": 370,
            "velocityKms": 12.6,
            "angleDeg": 45,
            "composition": "stony",
            "targetType": "crystalline",
        },
    },
    {
        "id": "bennu",
        "designation": "101955",
        "name": "101955 Bennu",
        "subtitle": "OSIRIS-REx hedefi",
        "era": "NEO · canlı",
        "context_template": ("{diameter} m C-tipi rubble pile, ~7 km/s tipik. " "2182 yılında ~%0.04 risk."),
        "default_input": {
            "diameterM": 490,
            "velocityKms": 7.0,
            "angleDeg": 45,
            "composition": "carbonaceous",
            "targetType": "crystalline",
        },
    },
]


class ImpactRequest(BaseModel):
    diameter_m: float = Field(..., gt=0, le=100_000)
    velocity_kms: float = Field(..., gt=0, le=80)
    angle_deg: float = Field(45.0, ge=10, le=90)
    density_kg_m3: float = Field(3000.0, ge=500, le=10_000)
    target_density_kg_m3: float = Field(2750.0, ge=900, le=10_000)
    target_lat: Optional[float] = Field(None, ge=-90, le=90)
    target_lng: Optional[float] = Field(None, ge=-180, le=180)


class ImpactResult(BaseModel):
    energy_megatons: float
    crater_diameter_km: float
    crater_depth_km: float
    thermal_radius_km: float
    seismic_magnitude: float
    overpressure_radius_km: float
    estimated_casualties: int


@router.post("/calculate", response_model=ImpactResult)
async def calculate(request: ImpactRequest) -> ImpactResult:
    return _compute(request)


# --- Presets ----------------------------------------------------------------

PresetKind = Literal["historical", "active_neo"]


class PresetInput(BaseModel):
    diameterM: float
    velocityKms: float
    angleDeg: float
    composition: str
    targetType: str


class ImpactPreset(BaseModel):
    id: str
    name: str
    subtitle: str
    era: str
    context: str
    input: PresetInput
    kind: PresetKind
    source: str
    last_updated: Optional[datetime] = None


class PresetsResponse(BaseModel):
    items: List[ImpactPreset]
    fetched_at: datetime
    source: str = "JPL Small-Body DB + curated historical record"


@router.get("/presets", response_model=PresetsResponse)
async def list_presets() -> PresetsResponse:
    """Hybrid preset catalog: fixed historical events + live active NEOs."""
    items: List[ImpactPreset] = []

    # 1. Historical impacts — fixed (events that have already happened can't change).
    for raw in _load_historical_impacts():
        items.append(
            ImpactPreset(
                id=raw["id"],
                name=raw["name"],
                subtitle=raw["subtitle"],
                era=raw["era"],
                context=raw["context"],
                input=PresetInput(**raw["input"]),
                kind="historical",
                source="Curated historical record",
                last_updated=None,
            )
        )

    # 2. Active NEOs — refresh diameter/density from JPL SBDB on every call
    # (cached 24h server-side). Falls back to default_input on SBDB failure.
    now = datetime.now(timezone.utc)
    for preset in ACTIVE_NEO_PRESETS:
        merged_input = dict(preset["default_input"])
        source = "JPL SBDB"
        last_updated: Optional[datetime] = now
        body = await sbdb.get_body(preset["designation"])
        if body is not None:
            phys = sbdb.extract_physical(body)
            if phys.get("diameter_km"):
                merged_input["diameterM"] = phys["diameter_km"] * 1000
        else:
            source = "Cached fallback"
            last_updated = None

        diameter_int = int(round(merged_input["diameterM"]))
        context = preset["context_template"].format(diameter=f"{diameter_int:,}")

        items.append(
            ImpactPreset(
                id=preset["id"],
                name=preset["name"],
                subtitle=preset["subtitle"],
                era=preset["era"],
                context=context,
                input=PresetInput(**merged_input),
                kind="active_neo",
                source=source,
                last_updated=last_updated,
            )
        )

    return PresetsResponse(items=items, fetched_at=now)


def _load_historical_impacts() -> List[Dict[str, Any]]:
    try:
        with HISTORICAL_IMPACTS_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        log.warning("historical_impacts.missing", path=str(HISTORICAL_IMPACTS_PATH))
        return []
    if not isinstance(data, list):
        return []
    return data


# --- Reference implementation (Collins/Melosh-style scaling laws, simplified). ---

JOULES_PER_MEGATON = 4.184e15


def _compute(p: ImpactRequest) -> ImpactResult:
    # Mass from sphere
    radius_m = p.diameter_m / 2.0
    volume_m3 = (4.0 / 3.0) * math.pi * radius_m**3
    mass_kg = volume_m3 * p.density_kg_m3

    velocity_ms = p.velocity_kms * 1000.0
    energy_j = 0.5 * mass_kg * velocity_ms**2
    energy_mt = energy_j / JOULES_PER_MEGATON

    # Crater diameter (Holsapple π-scaling, simplified)
    g = 9.81
    sin_angle = max(0.05, math.sin(math.radians(p.angle_deg)))
    crater_d_m = (
        1.161
        * (p.density_kg_m3 / p.target_density_kg_m3) ** (1.0 / 3.0)
        * (p.diameter_m**0.78)
        * (velocity_ms**0.44)
        * (g**-0.22)
        * (sin_angle**0.33)
    )
    crater_diameter_km = crater_d_m / 1000.0
    crater_depth_km = crater_diameter_km * 0.2

    # Thermal radiation radius (visible burn / 3rd-degree)
    thermal_radius_km = 1.5 * (energy_mt**0.41)

    # Seismic magnitude (Schultz/Gault scaling)
    seismic_magnitude = 0.67 * math.log10(max(1.0, energy_j)) - 5.87

    # Overpressure radius for 5 psi (heavy structural damage)
    overpressure_radius_km = 2.2 * (energy_mt**0.33)

    # Crude population proxy (only meaningful with target population layer)
    impact_area = math.pi * (overpressure_radius_km**2) * 100  # km² → arbitrary
    estimated_casualties = int(min(1e9, max(0.0, impact_area * 5)))

    return ImpactResult(
        energy_megatons=round(energy_mt, 4),
        crater_diameter_km=round(crater_diameter_km, 3),
        crater_depth_km=round(crater_depth_km, 3),
        thermal_radius_km=round(thermal_radius_km, 2),
        seismic_magnitude=round(seismic_magnitude, 2),
        overpressure_radius_km=round(overpressure_radius_km, 2),
        estimated_casualties=estimated_casualties,
    )
