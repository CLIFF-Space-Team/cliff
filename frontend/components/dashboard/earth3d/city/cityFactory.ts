/**
 * City layout generator for the immersive earthquake scene.
 *
 * Produces a deterministic-yet-organic Turkish-style city block grid:
 *   - mid-rise residential apartments (5-9 storeys, balconies)
 *   - office towers in the centre
 *   - low-rise commercial along streets
 *   - one cluster of taller skyscrapers if the place has them
 *   - mosques scattered (dome + minarets)
 *   - parks (no building, trees only)
 *   - streetlights at every intersection
 *   - trees lining the avenues
 *
 * The output is consumed by `EarthquakeScene.tsx` which renders each
 * structure type with its own component — keeps this file pure, easy to
 * test, and easy to swap with a future GIS-driven generator.
 */

export type StructureKind =
  | 'apartment'
  | 'tower'
  | 'commercial'
  | 'mosque'
  | 'landmark';

export interface CityStructure {
  kind: StructureKind;
  /** Centre position on the ground plane. */
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  /** 0..1 deterministic seed for sub-randomization. */
  seed: number;
  /** Building base colour as HSL triplet. */
  hsl: [number, number, number];
  /** Should this structure visibly collapse during the simulation? */
  collapses: boolean;
  /** Time (s) into the simulation when collapse begins. */
  collapseAt: number;
  /** Optional landmark id for special rendering. */
  landmarkId?: 'galata' | 'atakule' | 'mosque-large';
  /** Distance from epicenter (used for wave delay + intensity). */
  distance: number;
}

export interface Streetlight {
  x: number;
  z: number;
  rotationY: number;
}

export interface Tree {
  x: number;
  z: number;
  scale: number;
}

export interface CityLayout {
  structures: CityStructure[];
  streetlights: Streetlight[];
  trees: Tree[];
  /** Bounding extent of the city (used by camera + fog). */
  extent: number;
  /** Detected landmark style for the place name (or null). */
  landmark: 'galata' | 'atakule' | null;
}

interface FactoryOptions {
  /** USGS `place` string — used to detect Turkish landmarks. */
  place: string;
  /** Magnitude — drives collapse probability. */
  magnitude: number;
}

const TURKISH_CITY_HINTS: Array<{ keys: string[]; landmark: 'galata' | 'atakule' }> = [
  { keys: ['istanbul', 'kocaeli', 'izmit'], landmark: 'galata' },
  { keys: ['ankara', 'eskisehir'], landmark: 'atakule' },
];

function detectLandmark(place: string): 'galata' | 'atakule' | null {
  const p = place.toLowerCase();
  for (const hint of TURKISH_CITY_HINTS) {
    if (hint.keys.some((k) => p.includes(k))) return hint.landmark;
  }
  return null;
}

/** Mulberry32 — fast 32-bit deterministic PRNG. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildCityLayout(opts: FactoryOptions): CityLayout {
  // Stable hash from the place name → same city if you replay the same quake.
  let h = 2166136261;
  for (const c of opts.place) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rng = mulberry32(h);

  const landmark = detectLandmark(opts.place);

  // City grid — 7×7 blocks, each block holds 1-3 structures.
  const blocks = 7;
  const blockSize = 7.5;
  const streetWidth = 1.6;
  const cellPitch = blockSize + streetWidth;
  const halfSpan = ((blocks - 1) * cellPitch) / 2;

  const structures: CityStructure[] = [];
  const streetlights: Streetlight[] = [];
  const trees: Tree[] = [];

  // Magnitude-based collapse probability schedule.
  const baseCollapseP =
    opts.magnitude >= 7.5 ? 0.55 :
    opts.magnitude >= 7 ? 0.4 :
    opts.magnitude >= 6.5 ? 0.22 :
    opts.magnitude >= 6 ? 0.1 :
    opts.magnitude >= 5.5 ? 0.03 :
    0;

  for (let bx = 0; bx < blocks; bx++) {
    for (let bz = 0; bz < blocks; bz++) {
      const cx = bx * cellPitch - halfSpan;
      const cz = bz * cellPitch - halfSpan;

      // Centre block holds the tallest cluster (downtown).
      const centreDist = Math.hypot(bx - (blocks - 1) / 2, bz - (blocks - 1) / 2);
      const isCentre = centreDist < 1.6;

      // 8 % chance of a park (no buildings, just trees).
      const role = rng();
      const isPark =
        role < 0.08 && !isCentre && !(bx === 0 && bz === 0);

      if (isPark) {
        const treeCount = 4 + Math.floor(rng() * 6);
        for (let t = 0; t < treeCount; t++) {
          trees.push({
            x: cx + (rng() - 0.5) * blockSize * 0.8,
            z: cz + (rng() - 0.5) * blockSize * 0.8,
            scale: 0.7 + rng() * 0.6,
          });
        }
        continue;
      }

      // Mosque slot — ~3 % rate, never in dead centre.
      if (role < 0.11 && !isCentre && rng() < 0.6) {
        structures.push({
          kind: 'mosque',
          x: cx,
          z: cz,
          width: 4.5,
          depth: 4.5,
          height: 5,
          seed: rng(),
          hsl: [0.08, 0.05, 0.62],
          collapses: rng() < baseCollapseP * 0.4, // mosques are sturdier
          collapseAt: 4 + rng() * 3,
          distance: Math.hypot(cx, cz),
        });
        continue;
      }

      // Landmark slot — exactly one near the centre.
      if (landmark && isCentre && bx === Math.round((blocks - 1) / 2) && bz === Math.round((blocks - 1) / 2)) {
        structures.push({
          kind: 'landmark',
          x: cx,
          z: cz,
          width: 4.5,
          depth: 4.5,
          height: landmark === 'galata' ? 18 : 22,
          seed: rng(),
          hsl: [0.07, 0.18, 0.58],
          collapses: false, // never collapse landmarks (it's a demo)
          collapseAt: 999,
          landmarkId: landmark,
          distance: Math.hypot(cx, cz),
        });
        continue;
      }

      // Otherwise pack 1-3 buildings into this block.
      const occupants = isCentre ? 2 + Math.floor(rng() * 2) : 1 + Math.floor(rng() * 2);
      for (let o = 0; o < occupants; o++) {
        // Sub-cell positioning — keep some clearance from block edges.
        const subX = cx + (rng() - 0.5) * (blockSize * 0.55);
        const subZ = cz + (rng() - 0.5) * (blockSize * 0.55);
        const distance = Math.hypot(subX, subZ);

        let kind: StructureKind = 'apartment';
        let width: number, depth: number, height: number, hsl: [number, number, number];

        if (isCentre && rng() < 0.65) {
          // Office tower
          kind = 'tower';
          width = 1.8 + rng() * 1.0;
          depth = 1.8 + rng() * 1.0;
          height = 18 + rng() * 18;
          hsl = [0.58, 0.12, 0.16 + rng() * 0.08]; // dark glass blue
        } else if (rng() < 0.18) {
          // Low-rise commercial
          kind = 'commercial';
          width = 2.2 + rng() * 1.6;
          depth = 2.2 + rng() * 1.6;
          height = 1.6 + rng() * 2.2;
          hsl = [0.08, 0.18, 0.55 + rng() * 0.15]; // warm beige
        } else {
          // Mid-rise apartment (the workhorse of Turkish cities)
          kind = 'apartment';
          width = 1.8 + rng() * 1.4;
          depth = 1.8 + rng() * 1.4;
          height = 4 + rng() * 6;
          hsl = [0.07 + rng() * 0.04, 0.06 + rng() * 0.08, 0.62 + rng() * 0.16]; // warm cream
        }

        const collapseChance =
          kind === 'tower' ? baseCollapseP * 0.7 :
          kind === 'commercial' ? baseCollapseP * 1.2 :
          baseCollapseP;

        structures.push({
          kind,
          x: subX,
          z: subZ,
          width,
          depth,
          height,
          seed: rng(),
          hsl,
          collapses: rng() < collapseChance,
          collapseAt: 1.5 + (distance / 3) + rng() * 1.5,
          distance,
        });
      }

      // Streetlight at the corner of every block.
      if (bx < blocks - 1 && bz < blocks - 1) {
        const sx = cx + cellPitch / 2;
        const sz = cz + cellPitch / 2;
        streetlights.push({ x: sx, z: sz, rotationY: rng() * Math.PI });
      }

      // Trees along the avenue running between blocks.
      if (rng() < 0.5 && bx < blocks - 1) {
        trees.push({
          x: cx + cellPitch / 2,
          z: cz - blockSize * 0.3 + (rng() - 0.5) * 1.0,
          scale: 0.55 + rng() * 0.35,
        });
      }
    }
  }

  return {
    structures,
    streetlights,
    trees,
    extent: halfSpan + blockSize,
    landmark,
  };
}
