/**
 * Curated list of major cities with population + footprint area.
 *
 * Data sources (public domain / CC):
 *   - UN World Urbanization Prospects (population, 2024 est.)
 *   - Wikipedia metropolitan area footprints (km²)
 *   - LandScan-derived density estimates
 *
 * Used by the impact simulator for location selection and population-based
 * casualty estimates. Density (people/km²) is implicit from population/area.
 */

export interface CityInfo {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  /** Metropolitan population (millions). */
  population_millions: number;
  /** Metropolitan area (km²). */
  area_km2: number;
}

export const CITIES: CityInfo[] = [
  { id: 'istanbul', name: 'İstanbul', country: 'TR', lat: 41.015, lng: 28.979, population_millions: 16.0, area_km2: 5343 },
  { id: 'ankara', name: 'Ankara', country: 'TR', lat: 39.928, lng: 32.864, population_millions: 5.7, area_km2: 24521 },
  { id: 'izmir', name: 'İzmir', country: 'TR', lat: 38.419, lng: 27.128, population_millions: 4.4, area_km2: 11891 },
  { id: 'aksaray', name: 'Aksaray', country: 'TR', lat: 38.371, lng: 34.029, population_millions: 0.43, area_km2: 90 },
  { id: 'tokyo', name: 'Tokyo', country: 'JP', lat: 35.689, lng: 139.692, population_millions: 37.4, area_km2: 13572 },
  { id: 'delhi', name: 'Delhi', country: 'IN', lat: 28.704, lng: 77.102, population_millions: 32.9, area_km2: 1484 },
  { id: 'shanghai', name: 'Shanghai', country: 'CN', lat: 31.230, lng: 121.474, population_millions: 28.5, area_km2: 6340 },
  { id: 'beijing', name: 'Beijing', country: 'CN', lat: 39.904, lng: 116.407, population_millions: 21.7, area_km2: 16410 },
  { id: 'mumbai', name: 'Mumbai', country: 'IN', lat: 19.076, lng: 72.877, population_millions: 21.3, area_km2: 603 },
  { id: 'sao-paulo', name: 'São Paulo', country: 'BR', lat: -23.550, lng: -46.633, population_millions: 22.6, area_km2: 7947 },
  { id: 'mexico-city', name: 'Mexico City', country: 'MX', lat: 19.432, lng: -99.133, population_millions: 22.5, area_km2: 7866 },
  { id: 'cairo', name: 'Cairo', country: 'EG', lat: 30.044, lng: 31.236, population_millions: 21.7, area_km2: 17268 },
  { id: 'dhaka', name: 'Dhaka', country: 'BD', lat: 23.811, lng: 90.413, population_millions: 22.5, area_km2: 306 },
  { id: 'new-york', name: 'New York', country: 'US', lat: 40.713, lng: -74.006, population_millions: 19.5, area_km2: 17319 },
  { id: 'karachi', name: 'Karachi', country: 'PK', lat: 24.861, lng: 67.010, population_millions: 17.2, area_km2: 3527 },
  { id: 'buenos-aires', name: 'Buenos Aires', country: 'AR', lat: -34.604, lng: -58.382, population_millions: 15.4, area_km2: 4758 },
  { id: 'kolkata', name: 'Kolkata', country: 'IN', lat: 22.573, lng: 88.364, population_millions: 14.9, area_km2: 1886 },
  { id: 'manila', name: 'Manila', country: 'PH', lat: 14.599, lng: 120.984, population_millions: 14.4, area_km2: 1474 },
  { id: 'lagos', name: 'Lagos', country: 'NG', lat: 6.524, lng: 3.379, population_millions: 15.3, area_km2: 1171 },
  { id: 'rio', name: 'Rio de Janeiro', country: 'BR', lat: -22.907, lng: -43.173, population_millions: 13.5, area_km2: 4540 },
  { id: 'tianjin', name: 'Tianjin', country: 'CN', lat: 39.343, lng: 117.361, population_millions: 13.6, area_km2: 11760 },
  { id: 'kinshasa', name: 'Kinshasa', country: 'CD', lat: -4.441, lng: 15.266, population_millions: 14.9, area_km2: 9965 },
  { id: 'guangzhou', name: 'Guangzhou', country: 'CN', lat: 23.129, lng: 113.264, population_millions: 13.6, area_km2: 7434 },
  { id: 'lahore', name: 'Lahore', country: 'PK', lat: 31.582, lng: 74.329, population_millions: 13.0, area_km2: 1772 },
  { id: 'moscow', name: 'Moscow', country: 'RU', lat: 55.756, lng: 37.617, population_millions: 12.7, area_km2: 2511 },
  { id: 'london', name: 'London', country: 'GB', lat: 51.507, lng: -0.128, population_millions: 9.6, area_km2: 1572 },
  { id: 'paris', name: 'Paris', country: 'FR', lat: 48.857, lng: 2.351, population_millions: 11.0, area_km2: 2845 },
  { id: 'jakarta', name: 'Jakarta', country: 'ID', lat: -6.208, lng: 106.846, population_millions: 11.3, area_km2: 661 },
  { id: 'seoul', name: 'Seoul', country: 'KR', lat: 37.566, lng: 126.978, population_millions: 9.7, area_km2: 605 },
  { id: 'lima', name: 'Lima', country: 'PE', lat: -12.046, lng: -77.043, population_millions: 11.0, area_km2: 2672 },
  { id: 'bangkok', name: 'Bangkok', country: 'TH', lat: 13.756, lng: 100.502, population_millions: 10.7, area_km2: 1569 },
  { id: 'tehran', name: 'Tehran', country: 'IR', lat: 35.689, lng: 51.389, population_millions: 9.5, area_km2: 730 },
  { id: 'los-angeles', name: 'Los Angeles', country: 'US', lat: 34.052, lng: -118.244, population_millions: 13.2, area_km2: 12562 },
  { id: 'san-francisco', name: 'San Francisco', country: 'US', lat: 37.775, lng: -122.418, population_millions: 7.8, area_km2: 6987 },
  { id: 'hong-kong', name: 'Hong Kong', country: 'HK', lat: 22.302, lng: 114.177, population_millions: 7.5, area_km2: 1106 },
  { id: 'singapore', name: 'Singapore', country: 'SG', lat: 1.352, lng: 103.820, population_millions: 5.9, area_km2: 728 },
  { id: 'sydney', name: 'Sydney', country: 'AU', lat: -33.869, lng: 151.209, population_millions: 5.4, area_km2: 12368 },
  { id: 'berlin', name: 'Berlin', country: 'DE', lat: 52.520, lng: 13.405, population_millions: 4.5, area_km2: 891 },
  { id: 'dubai', name: 'Dubai', country: 'AE', lat: 25.276, lng: 55.296, population_millions: 3.6, area_km2: 4114 },
];

export function getCity(id: string): CityInfo | undefined {
  return CITIES.find((c) => c.id === id);
}

/** Effective density (people/km²) for a city. */
export function densityOf(city: CityInfo): number {
  if (city.area_km2 <= 0) return 0;
  return (city.population_millions * 1_000_000) / city.area_km2;
}

/** Effective city radius assuming a circular footprint. */
export function radiusKmOf(city: CityInfo): number {
  return Math.sqrt(city.area_km2 / Math.PI);
}
