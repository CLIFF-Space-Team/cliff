/**
 * Shared types for the asteroid subsystem.
 */

export type AsteroidSpectralType = 'C' | 'S' | 'M' | 'B' | 'V' | 'X' | 'D';

export interface AsteroidManifestEntry {
  neoId: string;
  designation: string;
  name: string;
  modelPath: string;
  textureSet: string;
  scale_km: number;
  rotation_period_h: number;
  type: AsteroidSpectralType;
  source: string;
}

export interface ProceduralAsteroidLookup {
  kind: 'procedural';
  type: AsteroidSpectralType;
  seed: number;
}

export interface GlbAsteroidLookup {
  kind: 'glb';
  entry: AsteroidManifestEntry;
}

export type AsteroidLookup = ProceduralAsteroidLookup | GlbAsteroidLookup;

export interface AsteroidProps {
  neoId: string;
  name?: string;
  hazardous?: boolean;
  position: [number, number, number];
  /** Visual scale in scene units. Procedural sizes off this; GLB models also rescale. */
  scale: number;
  quality?: 'low' | 'medium' | 'high';
  selected?: boolean;
  /** Render dimmed (e.g. another asteroid is selected). */
  dimmed?: boolean;
  onSelect?: (neoId: string) => void;
}
