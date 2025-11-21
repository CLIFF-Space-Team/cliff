from app.models.celestial_body import CelestialBody
SOLAR_SYSTEM_DATA = [
    {
        "name": "Mercury", "type": "Planet", "mass": "0.330 x 10^24 kg", 
        "radius": "2,439.7 km", "orbital_period": "88 days", "parent_body": "Sun"
    },
    {
        "name": "Venus", "type": "Planet", "mass": "4.87 x 10^24 kg", 
        "radius": "6,051.8 km", "orbital_period": "225 days", "parent_body": "Sun"
    },
    {
        "name": "Earth", "type": "Planet", "mass": "5.97 x 10^24 kg", 
        "radius": "6,371 km", "orbital_period": "365.25 days", "parent_body": "Sun"
    },
    {
        "name": "Mars", "type": "Planet", "mass": "0.642 x 10^24 kg", 
        "radius": "3,389.5 km", "orbital_period": "687 days", "parent_body": "Sun"
    },
    {
        "name": "Jupiter", "type": "Planet", "mass": "1898 x 10^24 kg", 
        "radius": "69,911 km", "orbital_period": "4333 days", "parent_body": "Sun"
    },
    {
        "name": "Saturn", "type": "Planet", "mass": "568 x 10^24 kg", 
        "radius": "58,232 km", "orbital_period": "10759 days", "parent_body": "Sun"
    },
    {
        "name": "Uranus", "type": "Planet", "mass": "86.8 x 10^24 kg", 
        "radius": "25,362 km", "orbital_period": "30687 days", "parent_body": "Sun"
    },
    {
        "name": "Neptune", "type": "Planet", "mass": "102 x 10^24 kg", 
        "radius": "24,622 km", "orbital_period": "60190 days", "parent_body": "Sun"
    },
    {
        "name": "Pluto", "type": "Dwarf Planet", "mass": "0.0130 x 10^24 kg", 
        "radius": "1,188.3 km", "orbital_period": "90560 days", "parent_body": "Sun"
    },
    {
        "name": "Moon", "type": "Satellite", "mass": "0.073 x 10^24 kg", 
        "radius": "1,737.4 km", "orbital_period": "27 days", "parent_body": "Earth"
    },
    {
        "name": "Europa", "type": "Satellite", "mass": "0.048 x 10^24 kg", 
        "radius": "1,560.8 km", "orbital_period": "3.5 days", "parent_body": "Jupiter"
    },
    {
        "name": "Titan", "type": "Satellite", "mass": "0.135 x 10^24 kg", 
        "radius": "2,574.7 km", "orbital_period": "16 days", "parent_body": "Saturn"
    },
    {
        "name": "Ceres", "type": "Dwarf Planet", "mass": "0.000943 x 10^24 kg", 
        "radius": "473 km", "orbital_period": "1682 days", "parent_body": "Sun"
    }
]
def get_all_celestial_bodies():
    return [CelestialBody(**data) for data in SOLAR_SYSTEM_DATA]
