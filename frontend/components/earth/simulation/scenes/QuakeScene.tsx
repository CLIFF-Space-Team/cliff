'use client';

import { EarthquakeScene as LegacyEarthquakeScene } from '@/components/dashboard/earth3d/EarthquakeScene';

import type { SimulationSceneProps } from '../types';

/**
 * Adapter that bridges the unified `SimulationModal` props into the
 * existing city-scale `EarthquakeScene`. Keeps the proven shaking
 * city + collapsing buildings simulation in place — we just
 * normalize the prop shape so it plugs into the new framework.
 */
export function QuakeScene({ event, playing, playKey }: SimulationSceneProps) {
  const magnitude = event.primary_metric?.value ?? 5.0;
  const place =
    (event.extras?.['place'] as string | undefined) ??
    event.title;
  const depthKm = (event.extras?.['depth_km'] as number | null | undefined) ?? null;

  return (
    <LegacyEarthquakeScene
      magnitude={magnitude}
      depthKm={depthKm}
      place={place}
      playing={playing}
      playKey={playKey}
    />
  );
}
