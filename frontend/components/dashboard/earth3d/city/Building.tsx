'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { CityStructure } from './cityFactory';

interface BuildingProps {
  def: CityStructure;
  /** Magnitude-derived shake amplitude (0..~1.2). */
  amplitude: number;
  /** Surface-wave speed in scene units / sec. */
  waveSpeed: number;
  /** Total simulation duration. */
  duration: number;
  /** Animation playing. Frozen frame when false. */
  playing: boolean;
  /** Increment to restart from t=0. */
  playKey: number;
}

/**
 * One animated building. Renders the kind-specific mesh (apartment with
 * balconies, glassy tower, low commercial, mosque with dome) and applies the
 * earthquake shake / collapse animation to its parent group.
 */
export function Building({
  def,
  amplitude,
  waveSpeed,
  duration,
  playing,
  playKey,
}: BuildingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const startRef = useRef(0);
  const lastKey = useRef(playKey);
  const pausedAt = useRef<number | null>(null);

  const baseColor = useMemo(() => {
    const c = new THREE.Color();
    c.setHSL(def.hsl[0], def.hsl[1], def.hsl[2]);
    return c;
  }, [def.hsl]);

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;

    if (lastKey.current !== playKey) {
      lastKey.current = playKey;
      startRef.current = clock.elapsedTime;
      pausedAt.current = null;
      g.rotation.set(0, 0, 0);
      g.position.set(def.x, def.height / 2, def.z);
    }
    if (!playing) {
      if (pausedAt.current === null) pausedAt.current = clock.elapsedTime;
      return;
    }
    if (pausedAt.current !== null) {
      startRef.current += clock.elapsedTime - pausedAt.current;
      pausedAt.current = null;
    }
    const t = clock.elapsedTime - startRef.current;
    const arrival = def.distance / waveSpeed;
    const local = t - arrival;
    const fadeWindow = duration - arrival;
    const fade = Math.max(0, 1 - local / Math.max(1, fadeWindow));

    if (local > 0) {
      // Tall buildings have a longer natural period → respond at lower
      // frequency with bigger amplitude (resonance proxy).
      const heightFactor = Math.min(1, def.height / 22);
      const freq = 4.2 - heightFactor * 1.6 + def.seed * 0.6;
      const amp = amplitude * fade * (0.5 + heightFactor * 0.7);

      const swayX = Math.sin(t * freq + def.seed * 6) * amp;
      const swayZ = Math.cos(t * (freq * 0.85) + def.seed * 4) * amp;

      g.position.x = def.x + swayX * 0.18;
      g.position.z = def.z + swayZ * 0.18;
      g.rotation.z = swayX * 0.012;
      g.rotation.x = swayZ * 0.012;
    }

    if (def.collapses && local > def.collapseAt) {
      const cT = Math.min(1, (local - def.collapseAt) / 1.6);
      const tilt = (Math.PI / 2.1) * cT * (def.seed > 0.5 ? 1 : -1);
      g.rotation.z = tilt;
      g.position.y = def.height / 2 - cT * (def.height / 2 - 0.2);
    }
  });

  return (
    <group ref={groupRef} position={[def.x, def.height / 2, def.z]}>
      {def.kind === 'apartment' && (
        <ApartmentMesh def={def} baseColor={baseColor} />
      )}
      {def.kind === 'tower' && <TowerMesh def={def} baseColor={baseColor} />}
      {def.kind === 'commercial' && (
        <CommercialMesh def={def} baseColor={baseColor} />
      )}
      {def.kind === 'mosque' && <MosqueMesh def={def} />}
      {def.kind === 'landmark' && def.landmarkId === 'galata' && (
        <GalataMesh def={def} />
      )}
      {def.kind === 'landmark' && def.landmarkId === 'atakule' && (
        <AtakuleMesh def={def} />
      )}
    </group>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Apartment — Turkish mid-rise (5-9 storeys, balconies on facade).
 * ──────────────────────────────────────────────────────────────────────── */

function ApartmentMesh({
  def,
  baseColor,
}: {
  def: CityStructure;
  baseColor: THREE.Color;
}) {
  // Reduced storey count + column count compared to the first pass —
  // each building now generates ~10× fewer window meshes. The visual gap
  // is closed by adding a darker frame *colour* via the wall material's
  // bump-like texture instead of dedicated frame planes.
  const storeys = Math.max(3, Math.round(def.height / 1.1));
  const floorH = def.height / storeys;
  const widthCols = Math.max(2, Math.min(4, Math.round(def.width / 1.5)));

  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.85,
        metalness: 0.04,
      }),
    [baseColor],
  );

  // Lit and unlit window pane materials (deterministic mix per building so
  // some windows are dark and some warmly lit — the alive-city look).
  const panes = useMemo(() => {
    const lit = new THREE.MeshStandardMaterial({
      color: '#3a2e22',
      roughness: 0.45,
      metalness: 0.1,
      emissive: new THREE.Color('#ffce85'),
      emissiveIntensity: 0.55,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: '#0d0c0a',
      roughness: 0.4,
      metalness: 0.15,
      emissive: new THREE.Color('#1a1408'),
      emissiveIntensity: 0.06,
    });
    return { lit, dark };
  }, []);

  // Per-window deterministic on/off pattern. ~55% lit at night.
  const isLit = (i: number, j: number, side: number) => {
    const h = ((def.seed * 91.7 + i * 13.7 + j * 7.3 + side * 5.1) | 0) >>> 0;
    return (h % 1000) / 1000 < 0.55;
  };

  const winW = (def.width * 0.78) / widthCols;
  const winH = floorH * 0.55;

  return (
    <group>
      {/* Main body */}
      <mesh material={wallMat} castShadow receiveShadow>
        <boxGeometry args={[def.width, def.height, def.depth]} />
      </mesh>

      {/* Window grid on FRONT and BACK facades only. Side facades are
       *  almost never visible from the cinematic camera angle so we skip
       *  them — saves ~50% of window meshes per apartment without any
       *  perceived loss of detail. Frame planes are also gone; the dim
       *  pane material itself is dark enough to read as recessed. */}
      {Array.from({ length: storeys }).map((_, row) => {
        if (row === 0) return null;
        const yLocal = -def.height / 2 + (row + 0.5) * floorH;
        return (
          <group key={`v-${row}`} position={[0, yLocal, 0]}>
            {Array.from({ length: widthCols }).map((__, col) => {
              const xLocal =
                -def.width / 2 + ((col + 0.5) * def.width) / widthCols;
              return (
                <group key={col}>
                  <mesh
                    position={[xLocal, 0, def.depth / 2 + 0.001]}
                    material={isLit(row, col, 0) ? panes.lit : panes.dark}
                  >
                    <planeGeometry args={[winW, winH]} />
                  </mesh>
                  <mesh
                    position={[xLocal, 0, -def.depth / 2 - 0.001]}
                    rotation={[0, Math.PI, 0]}
                    material={isLit(row, col, 1) ? panes.lit : panes.dark}
                  >
                    <planeGeometry args={[winW, winH]} />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}

      {/* Continuous balcony slabs running along the front facade at every
       *  upper floor — the iconic Turkish mid-rise look. Thin but cast
       *  shadow so they read as 3D. */}
      {Array.from({ length: storeys }).map((_, row) => {
        if (row === 0 || row === storeys - 1) return null;
        const yLocal = -def.height / 2 + row * floorH + 0.05;
        return (
          <group key={`bal-${row}`}>
            <mesh
              position={[0, yLocal, def.depth / 2 + 0.18]}
              castShadow
            >
              <boxGeometry args={[def.width * 0.92, 0.05, 0.36]} />
              <meshStandardMaterial color="#a89c8d" roughness={0.92} />
            </mesh>
            {/* Balcony railing — thin metal strip on top of the slab */}
            <mesh position={[0, yLocal + 0.18, def.depth / 2 + 0.34]}>
              <boxGeometry args={[def.width * 0.92, 0.36, 0.02]} />
              <meshStandardMaterial
                color="#2a2520"
                roughness={0.55}
                metalness={0.6}
                transparent
                opacity={0.7}
              />
            </mesh>
          </group>
        );
      })}

      {/* Wall-mounted AC units on side facades — small white boxes that
       *  jut out under upper-floor windows. Iconic Turkish apartment look,
       *  and adds depth to the otherwise flat side walls. */}
      {Array.from({ length: storeys }).map((_, row) => {
        if (row < 2) return null;
        const yLocal = -def.height / 2 + (row + 0.18) * floorH;
        const seedOk = ((def.seed * 31 + row * 7) | 0) % 3 !== 0; // ~67% of floors get one
        if (!seedOk) return null;
        const sideSign = (row % 2 === 0 ? 1 : -1) * (def.seed > 0.5 ? 1 : -1);
        return (
          <mesh
            key={`ac-${row}`}
            position={[
              (def.width / 2 + 0.12) * sideSign,
              yLocal,
              def.depth * 0.15 * (row % 2 === 0 ? 1 : -1),
            ]}
            castShadow
          >
            <boxGeometry args={[0.22, 0.32, 0.5]} />
            <meshStandardMaterial color="#d6d3cd" roughness={0.85} />
          </mesh>
        );
      })}

      {/* Roof — flat slab + parapet wall + a couple of HVAC / water tanks
       *  so the silhouette doesn't read as a perfect box. */}
      <mesh position={[0, def.height / 2 + 0.06, 0]} receiveShadow>
        <boxGeometry args={[def.width * 1.04, 0.12, def.depth * 1.04]} />
        <meshStandardMaterial color="#2a2521" roughness={0.95} />
      </mesh>
      {/* Parapet edge */}
      <mesh position={[0, def.height / 2 + 0.25, def.depth / 2 + 0.02]}>
        <boxGeometry args={[def.width * 1.04, 0.3, 0.05]} />
        <meshStandardMaterial color="#1f1c19" roughness={0.95} />
      </mesh>
      <mesh position={[0, def.height / 2 + 0.25, -def.depth / 2 - 0.02]}>
        <boxGeometry args={[def.width * 1.04, 0.3, 0.05]} />
        <meshStandardMaterial color="#1f1c19" roughness={0.95} />
      </mesh>
      {/* Water tank (cylinder) on roof */}
      <mesh
        position={[
          def.width * 0.18 * (def.seed > 0.5 ? 1 : -1),
          def.height / 2 + 0.55,
          def.depth * 0.15,
        ]}
        castShadow
      >
        <cylinderGeometry args={[0.32, 0.32, 0.6, 12]} />
        <meshStandardMaterial color="#525048" roughness={0.65} metalness={0.4} />
      </mesh>
      {/* Satellite dishes — small white parabolas tilted skyward. Two per
       *  apartment, anchored on the parapet edges. */}
      <group position={[def.width * 0.32, def.height / 2 + 0.42, def.depth * 0.32]}>
        <mesh rotation={[Math.PI / 2.6, 0, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.04, 14, 1, true]} />
          <meshStandardMaterial color="#f4ede2" roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.12, 0.0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.32, 6]} />
          <meshStandardMaterial color="#222" roughness={0.6} metalness={0.5} />
        </mesh>
      </group>
      <group position={[-def.width * 0.36, def.height / 2 + 0.42, -def.depth * 0.30]}>
        <mesh rotation={[Math.PI / 2.4, 0, 0.3]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.03, 14, 1, true]} />
          <meshStandardMaterial color="#e6dccd" roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.1, 0.0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.28, 6]} />
          <meshStandardMaterial color="#222" roughness={0.6} metalness={0.5} />
        </mesh>
      </group>

      {/* Stair / lift housing */}
      <mesh
        position={[
          -def.width * 0.18,
          def.height / 2 + 0.55,
          -def.depth * 0.18,
        ]}
        castShadow
      >
        <boxGeometry args={[def.width * 0.32, 1.0, def.depth * 0.32]} />
        <meshStandardMaterial color="#3c3631" roughness={0.95} />
      </mesh>
    </group>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Tower — glassy office skyscraper (Levent / Maslak vibe).
 * ──────────────────────────────────────────────────────────────────────── */

function TowerMesh({
  def,
  baseColor,
}: {
  def: CityStructure;
  baseColor: THREE.Color;
}) {
  // Halved storey + column density vs first iteration. A glass tower
  // doesn't need 8×8 panes per face to read as a tower — 5×4 already
  // gives the curtain-wall look, and the GPU thanks us.
  const storeys = Math.max(5, Math.round(def.height / 1.4));
  const winCols = Math.max(3, Math.min(5, Math.round(def.width / 1.4)));
  const floorH = def.height / storeys;

  const glassMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.22,
        metalness: 0.78,
        emissive: new THREE.Color('#1c4a78'),
        emissiveIntensity: 0.18 + def.seed * 0.14,
      }),
    [baseColor, def.seed],
  );

  const mullionMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1a2330',
        roughness: 0.45,
        metalness: 0.6,
      }),
    [],
  );

  const litPaneMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#3d6b9c',
        roughness: 0.18,
        metalness: 0.5,
        emissive: new THREE.Color('#9ec9ff'),
        emissiveIntensity: 0.85,
      }),
    [],
  );
  const dimPaneMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#16243a',
        roughness: 0.2,
        metalness: 0.6,
        emissive: new THREE.Color('#1c2a4a'),
        emissiveIntensity: 0.18,
      }),
    [],
  );

  // Vary lit windows per cell so the tower reads as occupied at night.
  const isLit = (row: number, col: number, side: number) => {
    const h = ((def.seed * 73.13 + row * 17.7 + col * 11.3 + side * 5.7) | 0) >>> 0;
    return (h % 1000) / 1000 < 0.45;
  };

  const winFrontW = (def.width * 0.94) / winCols;
  const winH = floorH * 0.78;

  return (
    <group>
      {/* Glass curtain wall body */}
      <mesh material={glassMat} castShadow receiveShadow>
        <boxGeometry args={[def.width, def.height, def.depth]} />
      </mesh>

      {/* Concrete plinth at street level so the tower feels grounded. */}
      <mesh
        position={[0, -def.height / 2 + 0.4, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[def.width * 1.06, 0.8, def.depth * 1.06]} />
        <meshStandardMaterial color="#2c2925" roughness={0.95} />
      </mesh>

      {/* Window grid — front + back. */}
      {Array.from({ length: storeys }).map((_, row) => {
        const yLocal = -def.height / 2 + (row + 0.5) * floorH;
        return (
          <group key={`fb-${row}`} position={[0, yLocal, 0]}>
            {Array.from({ length: winCols }).map((__, col) => {
              const xLocal =
                -def.width / 2 + ((col + 0.5) * def.width) / winCols;
              return (
                <group key={col}>
                  <mesh
                    position={[xLocal, 0, def.depth / 2 + 0.002]}
                    material={isLit(row, col, 0) ? litPaneMat : dimPaneMat}
                  >
                    <planeGeometry args={[winFrontW * 0.92, winH]} />
                  </mesh>
                  <mesh
                    position={[xLocal, 0, -def.depth / 2 - 0.002]}
                    rotation={[0, Math.PI, 0]}
                    material={isLit(row, col, 1) ? litPaneMat : dimPaneMat}
                  >
                    <planeGeometry args={[winFrontW * 0.92, winH]} />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}

      {/* Side facades are skipped — at the camera's typical orbit angle
       *  they're foreshortened to nothing, and skipping them halves the
       *  per-tower mesh count. A subtle mullion grid on every face still
       *  reads as a curtain wall thanks to the front/back windows. */}

      {/* Horizontal mullion lines (every 2 floors instead of every floor)
       *  — narrow stripes that read as a curtain-wall division. */}
      {Array.from({ length: Math.ceil(storeys / 2) + 1 }).map((_, i) => {
        const y = -def.height / 2 + (i * 2 * def.height) / storeys;
        return (
          <mesh key={`mull-${i}`} position={[0, y, 0]} material={mullionMat}>
            <boxGeometry args={[def.width + 0.04, 0.04, def.depth + 0.04]} />
          </mesh>
        );
      })}

      {/* Crown / cap */}
      <mesh position={[0, def.height / 2 + 0.3, 0]} castShadow>
        <boxGeometry args={[def.width * 0.92, 0.6, def.depth * 0.92]} />
        <meshStandardMaterial color="#1a1d23" roughness={0.65} metalness={0.45} />
      </mesh>

      {/* Antenna / spire with red aviation light */}
      <mesh position={[0, def.height / 2 + 1.5, 0]}>
        <cylinderGeometry args={[0.03, 0.06, 2.4, 6]} />
        <meshStandardMaterial color="#9aa1ad" roughness={0.4} metalness={0.85} />
      </mesh>
      <mesh position={[0, def.height / 2 + 2.8, 0]}>
        <sphereGeometry args={[0.11, 10, 10]} />
        <meshBasicMaterial color="#ff3030" />
      </mesh>
      {/* Faint red halo around the aviation light */}
      <mesh position={[0, def.height / 2 + 2.8, 0]}>
        <sphereGeometry args={[0.28, 10, 10]} />
        <meshBasicMaterial
          color="#ff3030"
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Commercial — low warm-toned shop block.
 * ──────────────────────────────────────────────────────────────────────── */

function CommercialMesh({
  def,
  baseColor,
}: {
  def: CityStructure;
  baseColor: THREE.Color;
}) {
  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[def.width, def.height, def.depth]} />
        <meshStandardMaterial color={baseColor} roughness={0.85} />
      </mesh>
      {/* Awning */}
      <mesh position={[0, -def.height / 2 + 0.6, def.depth / 2 + 0.25]}>
        <boxGeometry args={[def.width * 0.95, 0.08, 0.5]} />
        <meshStandardMaterial color="#9c2a25" roughness={0.7} />
      </mesh>
      {/* Lit storefront */}
      <mesh position={[0, -def.height / 2 + 0.35, def.depth / 2 + 0.001]}>
        <planeGeometry args={[def.width * 0.85, 0.5]} />
        <meshBasicMaterial color="#ffd9a3" />
      </mesh>
    </group>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Mosque — body + dome + 1 minaret (simplified silhouette).
 * ──────────────────────────────────────────────────────────────────────── */

function MosqueMesh({ def }: { def: CityStructure }) {
  return (
    <group>
      {/* Stone body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[def.width, def.height, def.depth]} />
        <meshStandardMaterial color="#cdb796" roughness={0.92} />
      </mesh>
      {/* Dome */}
      <mesh position={[0, def.height / 2 + def.width * 0.32, 0]} castShadow>
        <sphereGeometry args={[def.width * 0.55, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#6b4f33"
          roughness={0.55}
          metalness={0.18}
          emissive={new THREE.Color('#ffe2a0')}
          emissiveIntensity={0.08}
        />
      </mesh>
      {/* Minaret */}
      <mesh position={[def.width / 2 + 0.4, def.height * 0.7, def.depth / 2 + 0.4]}>
        <cylinderGeometry args={[0.15, 0.18, def.height * 1.7, 12]} />
        <meshStandardMaterial color="#cdb796" roughness={0.9} />
      </mesh>
      <mesh position={[def.width / 2 + 0.4, def.height * 1.55 + 0.3, def.depth / 2 + 0.4]}>
        <coneGeometry args={[0.18, 0.55, 12]} />
        <meshStandardMaterial color="#6b4f33" roughness={0.6} />
      </mesh>
      {/* Crescent on dome */}
      <mesh position={[0, def.height / 2 + def.width * 0.32 + def.width * 0.55 + 0.2, 0]}>
        <torusGeometry args={[0.1, 0.03, 6, 16, Math.PI * 1.4]} />
        <meshStandardMaterial color="#ffd28a" emissive="#ffd28a" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Galata Tower silhouette (Istanbul). Cylindrical body + conical roof.
 * ──────────────────────────────────────────────────────────────────────── */

function GalataMesh({ def }: { def: CityStructure }) {
  const stoneColor = '#a48662';
  return (
    <group>
      <mesh position={[0, -def.height / 2 + def.height * 0.04, 0]}>
        {/* small base */}
        <cylinderGeometry args={[def.width * 0.45, def.width * 0.5, 0.4, 16]} />
        <meshStandardMaterial color={stoneColor} roughness={0.92} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[def.width * 0.32, def.width * 0.36, def.height * 0.85, 24]} />
        <meshStandardMaterial color={stoneColor} roughness={0.88} />
      </mesh>
      <mesh position={[0, def.height * 0.37, 0]}>
        <cylinderGeometry args={[def.width * 0.4, def.width * 0.32, 0.6, 24]} />
        <meshStandardMaterial color="#6f553d" roughness={0.72} />
      </mesh>
      <mesh position={[0, def.height * 0.55, 0]}>
        <coneGeometry args={[def.width * 0.4, def.height * 0.32, 24]} />
        <meshStandardMaterial
          color="#7a3530"
          roughness={0.7}
          emissive={new THREE.Color('#ffae6a')}
          emissiveIntensity={0.05}
        />
      </mesh>
      {/* Lit windows around the observation deck */}
      <mesh position={[0, def.height * 0.32, 0]}>
        <torusGeometry args={[def.width * 0.36, 0.06, 8, 32]} />
        <meshBasicMaterial color="#ffd28a" />
      </mesh>
    </group>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Atakule silhouette (Ankara). Hourglass tower with disc top.
 * ──────────────────────────────────────────────────────────────────────── */

function AtakuleMesh({ def }: { def: CityStructure }) {
  return (
    <group>
      {/* Tapered shaft */}
      <mesh>
        <cylinderGeometry args={[def.width * 0.18, def.width * 0.32, def.height * 0.85, 16]} />
        <meshStandardMaterial color="#bdb6a8" roughness={0.62} metalness={0.25} />
      </mesh>
      {/* Top disc */}
      <mesh position={[0, def.height * 0.42, 0]}>
        <cylinderGeometry args={[def.width * 0.45, def.width * 0.45, 0.8, 24]} />
        <meshStandardMaterial
          color="#4a3a2c"
          roughness={0.4}
          metalness={0.65}
          emissive={new THREE.Color('#ffe2a0')}
          emissiveIntensity={0.35}
        />
      </mesh>
      {/* Top observation glass */}
      <mesh position={[0, def.height * 0.5, 0]}>
        <cylinderGeometry args={[def.width * 0.36, def.width * 0.42, 0.5, 24]} />
        <meshStandardMaterial
          color="#3a76b8"
          roughness={0.2}
          metalness={0.85}
          emissive={new THREE.Color('#ffd28a')}
          emissiveIntensity={0.45}
        />
      </mesh>
      {/* Antenna */}
      <mesh position={[0, def.height * 0.65, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 1.6, 6]} />
        <meshStandardMaterial color="#777" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, def.height * 0.7 + 0.6, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#ff4040" />
      </mesh>
    </group>
  );
}
