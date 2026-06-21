/**
 * Procedural PBR texture factory for asteroids.
 *
 * Generates a 4-map set (diffuse, normal, roughness, AO) per spectral type
 * using multi-octave value noise + crater impressions + boulder bumps. Output
 * approximates real spacecraft imagery (OSIRIS-REx Bennu, Hayabusa Itokawa).
 *
 * Cached by `${type}|${size}` so the work happens once per session.
 */

import * as THREE from 'three';

import type { AsteroidSpectralType } from './types';

interface PbrTextureSet {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  aoMap: THREE.Texture;
  bumpScale: number;
}

interface TypeProfile {
  base: [number, number, number];
  highlight: [number, number, number];
  shadow: [number, number, number];
  craterDensity: number;
  boulderDensity: number;
  baseRoughness: number;
  metalness: number;
}

const PROFILES: Record<AsteroidSpectralType, TypeProfile> = {
  C: {
    base: [50, 44, 38],
    highlight: [78, 70, 60],
    shadow: [20, 16, 12],
    craterDensity: 1.4,
    boulderDensity: 1.2,
    baseRoughness: 0.96,
    metalness: 0.04,
  },
  S: {
    base: [128, 104, 74],
    highlight: [180, 150, 110],
    shadow: [62, 48, 32],
    craterDensity: 1.1,
    boulderDensity: 1.4,
    baseRoughness: 0.86,
    metalness: 0.06,
  },
  M: {
    base: [115, 110, 102],
    highlight: [188, 182, 172],
    shadow: [50, 48, 44],
    craterDensity: 0.9,
    boulderDensity: 1.0,
    baseRoughness: 0.55,
    metalness: 0.45,
  },
  B: {
    base: [44, 44, 40],
    highlight: [70, 70, 64],
    shadow: [16, 16, 12],
    craterDensity: 1.3,
    boulderDensity: 1.1,
    baseRoughness: 0.94,
    metalness: 0.04,
  },
  V: {
    base: [142, 118, 88],
    highlight: [196, 168, 132],
    shadow: [70, 56, 36],
    craterDensity: 1.0,
    boulderDensity: 1.2,
    baseRoughness: 0.78,
    metalness: 0.05,
  },
  X: {
    base: [102, 92, 76],
    highlight: [150, 138, 116],
    shadow: [44, 40, 30],
    craterDensity: 1.1,
    boulderDensity: 1.0,
    baseRoughness: 0.78,
    metalness: 0.18,
  },
  D: {
    base: [55, 46, 36],
    highlight: [88, 74, 56],
    shadow: [22, 18, 12],
    craterDensity: 1.3,
    boulderDensity: 1.2,
    baseRoughness: 0.94,
    metalness: 0.04,
  },
};

const cache = new Map<string, PbrTextureSet>();

export function getAsteroidTextureSet(
  type: AsteroidSpectralType,
  size = 1024,
): PbrTextureSet {
  const key = `${type}|${size}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const profile = PROFILES[type];
  const heightField = buildHeightField(size, profile, hashSeed(type));

  const diffuse = buildDiffuse(size, profile, heightField);
  const normal = buildNormal(size, heightField, 4.5);
  const rough = buildRoughness(size, heightField, profile.baseRoughness);
  const ao = buildAO(size, heightField);

  const set: PbrTextureSet = {
    map: makeTexture(diffuse, size, true),
    normalMap: makeTexture(normal, size, false),
    roughnessMap: makeTexture(rough, size, false),
    aoMap: makeTexture(ao, size, false),
    bumpScale: 0.06,
  };
  cache.set(key, set);
  return set;
}

// ---- height field ----

function buildHeightField(size: number, profile: TypeProfile, seed: number): Float32Array {
  const h = new Float32Array(size * size);

  // Multi-octave value noise gives the rocky base.
  const noise = makeValueNoise(seed);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n =
        0.55 * fbm(noise, u * 4, v * 4, 5) +
        0.3 * fbm(noise, u * 12, v * 12, 4) +
        0.15 * fbm(noise, u * 32, v * 32, 3);
      h[y * size + x] = n;
    }
  }

  // Stamp craters — circular depressions with raised rim.
  const craters = Math.floor(220 * profile.craterDensity);
  const craterRng = mulberry32(seed ^ 0xc0ffee);
  for (let i = 0; i < craters; i++) {
    const cx = Math.floor(craterRng() * size);
    const cy = Math.floor(craterRng() * size);
    const r = (4 + craterRng() * 26) | 0;
    const depth = 0.35 + craterRng() * 0.5;
    stampCrater(h, size, cx, cy, r, depth);
  }

  // Boulder bumps.
  const boulders = Math.floor(180 * profile.boulderDensity);
  const boulderRng = mulberry32(seed ^ 0xb0bbed);
  for (let i = 0; i < boulders; i++) {
    const cx = Math.floor(boulderRng() * size);
    const cy = Math.floor(boulderRng() * size);
    const r = (1 + boulderRng() * 5) | 0;
    const height = 0.15 + boulderRng() * 0.35;
    stampBump(h, size, cx, cy, r, height);
  }

  // Normalize 0..1.
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < h.length; i++) {
    if (h[i]! < min) min = h[i]!;
    if (h[i]! > max) max = h[i]!;
  }
  const span = Math.max(1e-6, max - min);
  for (let i = 0; i < h.length; i++) h[i] = (h[i]! - min) / span;

  return h;
}

function stampCrater(h: Float32Array, size: number, cx: number, cy: number, r: number, depth: number) {
  const r2 = r * r;
  const rimR = r * 1.18;
  const rimR2 = rimR * rimR;
  for (let dy = -rimR; dy <= rimR; dy++) {
    const y = cy + (dy | 0);
    if (y < 0 || y >= size) continue;
    for (let dx = -rimR; dx <= rimR; dx++) {
      const x = cx + (dx | 0);
      if (x < 0 || x >= size) continue;
      const d2 = dx * dx + dy * dy;
      if (d2 > rimR2) continue;
      const idx = y * size + x;
      if (d2 < r2) {
        // bowl: deeper toward center
        const t = 1 - d2 / r2;
        h[idx] = (h[idx] ?? 0) - depth * t;
      } else {
        // raised rim
        const t = (rimR2 - d2) / (rimR2 - r2);
        h[idx] = (h[idx] ?? 0) + depth * 0.35 * t;
      }
    }
  }
}

function stampBump(h: Float32Array, size: number, cx: number, cy: number, r: number, height: number) {
  const r2 = r * r;
  for (let dy = -r; dy <= r; dy++) {
    const y = cy + dy;
    if (y < 0 || y >= size) continue;
    for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx;
      if (x < 0 || x >= size) continue;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const t = 1 - d2 / r2;
      const idx = y * size + x;
      h[idx] = (h[idx] ?? 0) + height * t * t;
    }
  }
}

// ---- map builders ----

function buildDiffuse(size: number, profile: TypeProfile, h: Float32Array): Uint8ClampedArray {
  const out = new Uint8ClampedArray(size * size * 4);
  const [br, bg, bb] = profile.base;
  const [hr, hg, hb] = profile.highlight;
  const [sr, sg, sb] = profile.shadow;
  for (let i = 0; i < h.length; i++) {
    const v = h[i]!;
    let r: number;
    let g: number;
    let b: number;
    if (v < 0.5) {
      const t = v * 2;
      r = sr * (1 - t) + br * t;
      g = sg * (1 - t) + bg * t;
      b = sb * (1 - t) + bb * t;
    } else {
      const t = (v - 0.5) * 2;
      r = br * (1 - t) + hr * t;
      g = bg * (1 - t) + hg * t;
      b = bb * (1 - t) + hb * t;
    }
    const o = i * 4;
    out[o] = r;
    out[o + 1] = g;
    out[o + 2] = b;
    out[o + 3] = 255;
  }
  return out;
}

function buildNormal(size: number, h: Float32Array, strength: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xl = (x - 1 + size) % size;
      const xr = (x + 1) % size;
      const yu = (y - 1 + size) % size;
      const yd = (y + 1) % size;
      const dx = (h[y * size + xr]! - h[y * size + xl]!) * strength;
      const dy = (h[yd * size + x]! - h[yu * size + x]!) * strength;
      const dz = 1.0;
      const len = Math.hypot(dx, dy, dz);
      const nx = dx / len;
      const ny = dy / len;
      const nz = dz / len;
      const o = (y * size + x) * 4;
      out[o] = (nx * 0.5 + 0.5) * 255;
      out[o + 1] = (ny * 0.5 + 0.5) * 255;
      out[o + 2] = (nz * 0.5 + 0.5) * 255;
      out[o + 3] = 255;
    }
  }
  return out;
}

function buildRoughness(size: number, h: Float32Array, base: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < h.length; i++) {
    const v = h[i]!;
    // Crater bowls = smoother (compacted regolith); rims/boulders rougher.
    const r = base * 0.85 + (v * 0.25);
    const c = Math.min(255, Math.max(0, r * 255));
    const o = i * 4;
    out[o] = c;
    out[o + 1] = c;
    out[o + 2] = c;
    out[o + 3] = 255;
  }
  return out;
}

function buildAO(size: number, h: Float32Array): Uint8ClampedArray {
  // Cheap AO: lower in concave regions (where neighbors are higher).
  const out = new Uint8ClampedArray(size * size * 4);
  const radius = 3;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const center = h[y * size + x]!;
      let occ = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy += 2) {
        for (let dx = -radius; dx <= radius; dx += 2) {
          if (dx === 0 && dy === 0) continue;
          const nx = (x + dx + size) % size;
          const ny = (y + dy + size) % size;
          const diff = h[ny * size + nx]! - center;
          if (diff > 0) occ += diff;
          count++;
        }
      }
      const ao = 1 - Math.min(0.45, occ / count * 1.2);
      const c = Math.max(0, Math.min(255, ao * 255));
      const o = (y * size + x) * 4;
      out[o] = c;
      out[o + 1] = c;
      out[o + 2] = c;
      out[o + 3] = 255;
    }
  }
  return out;
}

function makeTexture(data: Uint8ClampedArray, size: number, srgb: boolean): THREE.Texture {
  // TS lib.es2024 ArrayBuffer strictness clashes with three's DataTexture sig — cast away.
  const buf = new Uint8Array(data.buffer.slice(0) as ArrayBuffer);
  // eslint-disable-next-line
  const tex = new THREE.DataTexture(buf as any, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// ---- PRNG + value noise ----

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeValueNoise(seed: number) {
  const perm = new Uint8Array(512);
  const rng = mulberry32(seed);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    const tmp = base[i]!;
    base[i] = base[j]!;
    base[j] = tmp;
  }
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255]!;

  return (x: number, y: number): number => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = fade(xf);
    const v = fade(yf);
    const a = perm[(perm[xi & 255]! + (yi & 255)) & 511]! / 255;
    const b = perm[(perm[(xi + 1) & 255]! + (yi & 255)) & 511]! / 255;
    const c = perm[(perm[xi & 255]! + ((yi + 1) & 255)) & 511]! / 255;
    const d = perm[(perm[(xi + 1) & 255]! + ((yi + 1) & 255)) & 511]! / 255;
    const x1 = lerp(a, b, u);
    const x2 = lerp(c, d, u);
    return lerp(x1, x2, v);
  };
}

function fbm(noise: (x: number, y: number) => number, x: number, y: number, octaves: number): number {
  let amp = 0.5;
  let freq = 1.0;
  let total = 0;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    total += noise(x * freq, y * freq) * amp;
    max += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return total / max;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
