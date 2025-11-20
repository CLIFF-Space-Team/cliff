"""
Bilinen büyük ve tehlikeli asteroidler listesi
Horizons API'de mevcut olan asteroidler
"""

KNOWN_HAZARDOUS_ASTEROIDS = {
    "99942": {
        "name": "Apophis",
        "designation": "2004 MN4",
        "diameter_km": 0.34,
        "hazard_level": "CRITICAL",
        "next_close_approach": "2029-04-13"
    },
    "101955": {
        "name": "Bennu",
        "designation": "1999 RQ36",
        "diameter_km": 0.49,
        "hazard_level": "HIGH",
        "next_close_approach": "2135-09-25"
    },
    "162173": {
        "name": "Ryugu",
        "designation": "1999 JU3",
        "diameter_km": 0.90,
        "hazard_level": "MEDIUM",
        "next_close_approach": "2076"
    },
    "433": {
        "name": "Eros",
        "designation": "1898 DQ",
        "diameter_km": 16.84,
        "hazard_level": "LOW",
        "next_close_approach": "2056"
    },
    "1": {
        "name": "Ceres",
        "designation": "A899 OF",
        "diameter_km": 939.4,
        "hazard_level": "NONE",
        "next_close_approach": "Never"
    },
    "4": {
        "name": "Vesta",
        "designation": "1807 FA",
        "diameter_km": 525.4,
        "hazard_level": "NONE",
        "next_close_approach": "Never"
    }
}

HORIZONS_AVAILABLE_NEOS = [
    "99942",   # Apophis
    "101955",  # Bennu
    "162173",  # Ryugu  
    "433",     # Eros
    "1620",    # Geographos
    "1865",    # Cerberus
    "2063",    # Bacchus
    "3361",    # Orpheus
    "4179",    # Toutatis
    "4660",    # Nereus
    "4769",    # Castalia
]

def is_horizons_available(asteroid_id: str) -> bool:
    """Asteroid'in Horizons'da olup olmadığını kontrol et"""
    asteroid_id_clean = asteroid_id.strip().split()[0]  # "99942 (2004 MN4)" -> "99942"
    
    return asteroid_id_clean in HORIZONS_AVAILABLE_NEOS or asteroid_id_clean in KNOWN_HAZARDOUS_ASTEROIDS

def get_asteroid_info(asteroid_id: str) -> dict | None:
    """Asteroid bilgisini döndür"""
    return KNOWN_HAZARDOUS_ASTEROIDS.get(asteroid_id)

def format_for_horizons(asteroid_id: str) -> str:
    """Asteroid ID'yi Horizons formatına çevir"""
    if len(asteroid_id) > 7:
        return None
    
    return f"{asteroid_id};"
