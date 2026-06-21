'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

import type { Streetlight, Tree } from './cityFactory';

/* ────────────────────────────────────────────────────────────────────────
 * ParkedCars — small instanced car silhouettes scattered along avenues.
 * Generated deterministically from the streetlight grid + a seed so the
 * cars stay put across re-renders and the same simulation always shows
 * the same parking layout.
 * ──────────────────────────────────────────────────────────────────────── */

interface ParkedCarsProps {
  /** Bounding extent of the city (full width = extent × 2). */
  extent: number;
  /** Approximate spacing between blocks; cars line up along avenues. */
  blockSize?: number;
  /** Random seed (we reuse the city seed). */
  seed?: number;
}

const CAR_PALETTE = [
  '#9aa6b0', // silver
  '#d4d8dd', // white
  '#1f242a', // dark grey
  '#2c3a52', // navy
  '#5e1f1f', // dark red
  '#3a4a3e', // forest green
  '#6c5a3a', // sand
];

export function ParkedCars({ extent, blockSize = 6, seed = 1 }: ParkedCarsProps) {
  const cars = useMemo(() => {
    const out: Array<{
      x: number;
      z: number;
      rotY: number;
      color: string;
      kind: 'sedan' | 'hatch' | 'suv';
    }> = [];

    let s = (seed * 7919 + 11) >>> 0;
    const rng = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };

    // Halved car density to keep the scene snappy: only east-west avenues
    // get parked cars, and lane spacing is doubled. The cinematic camera
    // angle reads "alive city" with ~25 cars just as well as ~80.
    const half = extent;
    const lanes = Math.max(2, Math.floor((half * 2) / (blockSize * 2)));
    for (let i = 0; i < lanes; i++) {
      const z = -half + (i + 0.5) * (blockSize * 2);
      const carCount = 3 + Math.floor(rng() * 2);
      for (let c = 0; c < carCount; c++) {
        const x = -half + rng() * (half * 2);
        if (Math.hypot(x, z) < blockSize * 0.7) continue;
        const sideOffset = (rng() < 0.5 ? -1 : 1) * blockSize * 0.42;
        out.push({
          x,
          z: z + sideOffset,
          rotY: Math.PI / 2 + (rng() < 0.5 ? Math.PI : 0),
          color: CAR_PALETTE[Math.floor(rng() * CAR_PALETTE.length)] ?? '#888',
          kind: rng() < 0.55 ? 'sedan' : rng() < 0.78 ? 'hatch' : 'suv',
        });
      }
    }
    return out;
  }, [extent, blockSize, seed]);

  return (
    <group>
      {cars.map((c, i) => (
        <CarMesh key={i} {...c} />
      ))}
    </group>
  );
}

function CarMesh({
  x,
  z,
  rotY,
  color,
  kind,
}: {
  x: number;
  z: number;
  rotY: number;
  color: string;
  kind: 'sedan' | 'hatch' | 'suv';
}) {
  const dims =
    kind === 'sedan'
      ? { length: 1.6, width: 0.7, height: 0.45, cabin: 0.85 }
      : kind === 'hatch'
        ? { length: 1.3, width: 0.65, height: 0.5, cabin: 0.95 }
        : { length: 1.7, width: 0.78, height: 0.62, cabin: 1.0 };

  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      {/* Body */}
      <mesh position={[0, dims.height / 2, 0]} castShadow>
        <boxGeometry args={[dims.length, dims.height, dims.width]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.35} />
      </mesh>
      {/* Cabin (slightly narrower, sits on top toward back) */}
      <mesh
        position={[
          kind === 'hatch' ? -dims.length * 0.05 : -dims.length * 0.1,
          dims.height + 0.18,
          0,
        ]}
        castShadow
      >
        <boxGeometry
          args={[dims.length * dims.cabin * 0.55, 0.36, dims.width * 0.92]}
        />
        <meshStandardMaterial color="#0c0d10" roughness={0.35} metalness={0.55} />
      </mesh>
      {/* Headlights — small warm-white emissive dots */}
      <mesh position={[dims.length / 2 + 0.005, dims.height * 0.55, dims.width * 0.28]}>
        <boxGeometry args={[0.04, 0.07, 0.12]} />
        <meshBasicMaterial color="#fff5da" />
      </mesh>
      <mesh position={[dims.length / 2 + 0.005, dims.height * 0.55, -dims.width * 0.28]}>
        <boxGeometry args={[0.04, 0.07, 0.12]} />
        <meshBasicMaterial color="#fff5da" />
      </mesh>
      {/* Tail lights */}
      <mesh position={[-dims.length / 2 - 0.005, dims.height * 0.55, dims.width * 0.28]}>
        <boxGeometry args={[0.04, 0.07, 0.12]} />
        <meshBasicMaterial color="#a01818" />
      </mesh>
      <mesh position={[-dims.length / 2 - 0.005, dims.height * 0.55, -dims.width * 0.28]}>
        <boxGeometry args={[0.04, 0.07, 0.12]} />
        <meshBasicMaterial color="#a01818" />
      </mesh>
    </group>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Streetlights — instanced cylinders + emissive bulbs.
 * Adds atmosphere (warm dot pattern) without N point lights.
 * ──────────────────────────────────────────────────────────────────────── */

interface StreetlightsProps {
  lights: Streetlight[];
}

export function Streetlights({ lights }: StreetlightsProps) {
  const poleMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1f1d1a',
        roughness: 0.6,
        metalness: 0.5,
      }),
    [],
  );
  const bulbMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffd28a',
      }),
    [],
  );
  return (
    <group>
      {lights.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation={[0, s.rotationY, 0]}>
          <mesh position={[0, 1.6, 0]} material={poleMat} castShadow>
            <cylinderGeometry args={[0.04, 0.05, 3.2, 8]} />
          </mesh>
          {/* Horizontal arm */}
          <mesh position={[0.25, 3.0, 0]} material={poleMat}>
            <boxGeometry args={[0.5, 0.06, 0.06]} />
          </mesh>
          <mesh position={[0.45, 2.9, 0]} material={bulbMat}>
            <sphereGeometry args={[0.08, 8, 8]} />
          </mesh>
          {/* Light cone glow (cheap fake) */}
          <mesh position={[0.45, 2.7, 0]}>
            <coneGeometry args={[0.5, 0.6, 12, 1, true]} />
            <meshBasicMaterial
              color="#ffd28a"
              transparent
              opacity={0.16}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Trees — simple cone + cylinder. One mesh per tree (count is small).
 * ──────────────────────────────────────────────────────────────────────── */

interface TreesProps {
  trees: Tree[];
}

export function Trees({ trees }: TreesProps) {
  const trunkMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#3b2a1d',
        roughness: 0.92,
      }),
    [],
  );
  const leavesMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2c4a2a',
        roughness: 0.85,
      }),
    [],
  );
  return (
    <group>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.scale}>
          <mesh position={[0, 0.5, 0]} material={trunkMat} castShadow>
            <cylinderGeometry args={[0.08, 0.12, 1.0, 6]} />
          </mesh>
          <mesh position={[0, 1.5, 0]} material={leavesMat} castShadow>
            <coneGeometry args={[0.55, 1.4, 8]} />
          </mesh>
          <mesh position={[0, 2.2, 0]} material={leavesMat}>
            <coneGeometry args={[0.4, 1.0, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Skybox — large sphere with a Turkish-night vertical gradient
 * (deep blue → warm city haze near the horizon). Pure shader, no texture.
 * ──────────────────────────────────────────────────────────────────────── */

export function NightSkybox({ radius }: { radius: number }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color('#070b16') },
          uHorizon: { value: new THREE.Color('#3a2820') },
        },
        vertexShader: `
          varying vec3 vWorld;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorld = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: `
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          varying vec3 vWorld;
          void main() {
            float h = clamp((normalize(vWorld).y + 0.1) / 0.9, 0.0, 1.0);
            // Smooth gradient with extra warmth near horizon
            vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.85, h));
            // Add faint bluish star tint above
            float starHint = smoothstep(0.4, 1.0, h) * 0.04;
            col += vec3(starHint);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    [],
  );
  return (
    <mesh material={material}>
      <sphereGeometry args={[radius, 32, 32]} />
    </mesh>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Asphalt ground — the textured plane that ripples during the quake.
 * (Wave deformation lives in EarthquakeScene.tsx; this just builds the mesh.)
 * ──────────────────────────────────────────────────────────────────────── */

export function AsphaltGround({
  size,
  geometryRef,
}: {
  size: number;
  geometryRef: { current: THREE.PlaneGeometry | null };
}) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, 96, 96);
    geometryRef.current = g;
    return g;
  }, [size, geometryRef]);

  const material = useMemo(() => {
    // Procedural asphalt — dark grey base + diagonal speckles via shader.
    return new THREE.ShaderMaterial({
      uniforms: {
        uBase: { value: new THREE.Color('#1a1816') },
        uHigh: { value: new THREE.Color('#2a2622') },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uBase;
        uniform vec3 uHigh;
        varying vec2 vUv;
        varying vec3 vNormal;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main() {
          vec2 cell = vUv * 80.0;
          float speckle = hash(floor(cell));
          float lane = smoothstep(0.495, 0.5, fract(vUv.x * 7.0)) +
                       smoothstep(0.495, 0.5, fract(vUv.y * 7.0));
          vec3 col = mix(uBase, uHigh, speckle * 0.35);
          // Faint road markings along the avenues
          col = mix(col, vec3(0.55, 0.5, 0.4), clamp(lane, 0.0, 1.0) * 0.18);
          // Subtle normal-based shading so the ripple reads
          float lambert = max(dot(vNormal, normalize(vec3(0.4, 1.0, 0.2))), 0.0);
          col *= 0.55 + 0.45 * lambert;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, []);

  return (
    <mesh
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    />
  );
}
