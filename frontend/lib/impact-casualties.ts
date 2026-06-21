/**
 * Population-based casualty estimator.
 *
 * Approach:
 *   1. Each damage zone (critical / high / moderate) has an associated
 *      lethality rate inside its radius.
 *   2. We compute the overlap area between each zone disc and the city's
 *      circular footprint, multiply by city density, multiply by lethality,
 *      and aggregate.
 *
 * Limitations: assumes uniform density inside the city footprint and impact
 * exactly at the city centre. For impacts offset from the city or for cities
 * with strong density gradients (e.g. Tokyo 23 wards vs metro), error grows.
 * Replace with a SEDAC GeoTIFF lookup when high accuracy is required.
 */

import { densityOf, radiusKmOf, type CityInfo } from './cities';
import type { ImpactResult } from './impact-physics';

export interface CasualtyEstimate {
  fatalities: number;
  injuries: number;
  /** Per-zone breakdown for UI. */
  zones: Array<{
    label: string;
    radius_km: number;
    overlap_km2: number;
    fatalities: number;
    injuries: number;
  }>;
  /** Effective density used (people/km²). */
  density_per_km2: number;
}

/** Lethality rates inside each damage tier (Glasstone & Dolan-style heuristics). */
const LETHALITY = {
  critical: { fatal: 0.95, injure: 0.05 },   // crater, thermal, fireball core
  high:     { fatal: 0.45, injure: 0.40 },   // 5 psi overpressure
  moderate: { fatal: 0.05, injure: 0.45 },   // 1 psi
  low:      { fatal: 0.005, injure: 0.10 },  // seismic / mild
};

export function estimateCasualties(
  result: ImpactResult,
  city: CityInfo,
): CasualtyEstimate {
  const density = densityOf(city);
  const cityR = radiusKmOf(city);

  // Each zone is a disc centered at impact (assumed = city center).
  const zoneOverlaps = result.damage_zones.map((zone) => {
    const overlap = circleCircleOverlapArea(0, zone.radius_km, cityR);
    const lethal = LETHALITY[zone.severity] ?? LETHALITY.low;
    const fatalities = Math.max(0, density * overlap * lethal.fatal);
    const injuries = Math.max(0, density * overlap * lethal.injure);
    return {
      label: zone.label,
      radius_km: zone.radius_km,
      overlap_km2: overlap,
      fatalities,
      injuries,
    };
  });

  // Sort by zone radius asc and ensure inner zones don't double-count outer.
  zoneOverlaps.sort((a, b) => a.radius_km - b.radius_km);
  let cumulativeArea = 0;
  for (const z of zoneOverlaps) {
    const newArea = Math.max(0, z.overlap_km2 - cumulativeArea);
    const ratio = z.overlap_km2 > 0 ? newArea / z.overlap_km2 : 0;
    z.fatalities *= ratio;
    z.injuries *= ratio;
    z.overlap_km2 = newArea;
    cumulativeArea += newArea;
  }

  const fatalities = zoneOverlaps.reduce((s, z) => s + z.fatalities, 0);
  const injuries = zoneOverlaps.reduce((s, z) => s + z.injuries, 0);

  return {
    fatalities: Math.round(fatalities),
    injuries: Math.round(injuries),
    zones: zoneOverlaps,
    density_per_km2: Math.round(density),
  };
}

/**
 * Area of intersection between two circles whose centres are `d` apart.
 *
 * Closed-form Heron-style solution. d=0 → π·min(r1,r2)².
 */
function circleCircleOverlapArea(d: number, r1: number, r2: number): number {
  if (r1 <= 0 || r2 <= 0) return 0;
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const a = (r1 ** 2 - r2 ** 2 + d ** 2) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 ** 2 - a ** 2));
  const part1 = r1 ** 2 * Math.acos(Math.min(1, Math.max(-1, a / r1)));
  const part2 = r2 ** 2 * Math.acos(Math.min(1, Math.max(-1, (d - a) / r2)));
  const tri = d * h;
  return part1 + part2 - tri;
}
