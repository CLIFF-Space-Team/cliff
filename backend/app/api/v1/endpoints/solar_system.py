from fastapi import APIRouter
from typing import List
from app.models.celestial_body import CelestialBody
from app.services.solar_system_service import get_all_celestial_bodies
router = APIRouter()
@router.get("/bodies", response_model=List[CelestialBody])
def read_celestial_bodies():
    return get_all_celestial_bodies()