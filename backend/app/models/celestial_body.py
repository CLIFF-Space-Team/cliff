from pydantic import BaseModel
from typing import Optional

class CelestialBody(BaseModel):
    name: str
    type: str
    mass: str
    radius: str
    orbital_period: str
    parent_body: Optional[str] = None