/**
 * Resolves a NEO id to either a curated GLB model or a procedural fallback.
 *
 * The manifest is fetched once at first lookup and cached. Unknown NEOs map
 * to procedural with a deterministic seed (hash of neoId) so the same
 * asteroid renders identically across reloads.
 */

import type {
  AsteroidLookup,
  AsteroidManifestEntry,
  AsteroidSpectralType,
} from './types';

interface Manifest {
  version: number;
  models: Record<string, AsteroidManifestEntry>;
}

let manifestCache: Promise<Manifest> | null = null;

async function loadManifest(): Promise<Manifest> {
  if (!manifestCache) {
    manifestCache = fetch('/asteroids/manifest.json')
      .then((res) => (res.ok ? (res.json() as Promise<Manifest>) : { version: 0, models: {} }))
      .catch(() => ({ version: 0, models: {} }));
  }
  return manifestCache;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function inferSpectralType(neoId: string): AsteroidSpectralType {
  const types: AsteroidSpectralType[] = ['C', 'S', 'M', 'B', 'X', 'D'];
  return types[hashString(neoId) % types.length] ?? 'S';
}

export async function lookup(neoId: string): Promise<AsteroidLookup> {
  const manifest = await loadManifest();
  const entry = manifest.models[neoId];
  if (entry) {
    return { kind: 'glb', entry };
  }
  return {
    kind: 'procedural',
    type: inferSpectralType(neoId),
    seed: hashString(neoId),
  };
}

export async function listKnownEntries(): Promise<AsteroidManifestEntry[]> {
  const manifest = await loadManifest();
  return Object.values(manifest.models);
}
