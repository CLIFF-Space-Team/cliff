'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { Building } from './city/Building';
import { AsphaltGround, NightSkybox, ParkedCars, Streetlights, Trees } from './city/CityProps';
import { buildCityLayout, type CityStructure } from './city/cityFactory';

interface EarthquakeSceneProps {
  magnitude: number;
  depthKm: number | null;
  /** USGS `place` string. Drives Turkish-landmark detection. */
  place: string;
  playing: boolean;
  /** Increment to restart the animation. */
  playKey: number;
}

/**
 * Immersive city-scale earthquake renderer.
 *
 * Rebuilt from a primitive cube grid into a real-feeling Turkish city:
 *   - night sky gradient + warm horizon haze
 *   - asphalt ground plane that ripples with the surface wave
 *   - 7×7 city blocks of mid-rise apartments / office towers / mosques
 *   - one named landmark for Istanbul (Galata silhouette) or Ankara (Atakule)
 *   - streetlights and trees lining the avenues
 *   - magnitude-driven shake amplitude + collapse probabilities
 *
 * Camera defaults to a low cinematic angle near street level so the user
 * sees the buildings towering over them — "felt" earthquake, not God-view.
 */
export function EarthquakeScene({
  magnitude,
  depthKm,
  place,
  playing,
  playKey,
}: EarthquakeSceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{ position: [18, 7.5, 22], near: 0.1, far: 400, fov: 48 }}
      onCreated={({ scene, gl }) => {
        scene.background = new THREE.Color('#070b14');
        gl.setClearColor('#070b14', 1);
        scene.fog = new THREE.FogExp2('#0c1018', 0.018);
      }}
    >
      <NightSkybox radius={140} />

      {/* ── Lighting ─────────────────────────────────────────────── */}
      <ambientLight intensity={0.22} color="#88a5d4" />
      <hemisphereLight intensity={0.32} color="#5b78a8" groundColor="#0c0e10" />
      <directionalLight
        position={[18, 26, 14]}
        intensity={0.7}
        color="#dde6f8"
        castShadow
        shadow-mapSize={[1536, 1536]}
        shadow-camera-near={0.5}
        shadow-camera-far={120}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      {/* Warm city glow — sodium-vapour streetlight tint */}
      <pointLight
        position={[0, 4, 0]}
        intensity={0.45}
        color="#ffaa55"
        distance={60}
        decay={1.6}
      />

      <CityStage
        magnitude={magnitude}
        place={place}
        depthKm={depthKm}
        playing={playing}
        playKey={playKey}
      />

      {/* Hand-held camera shake — locked to magnitude so M5 feels different
       *  from M7. Drives perceived intensity more than any other change. */}
      <CameraShake
        magnitude={magnitude}
        playing={playing}
        playKey={playKey}
      />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={10}
        maxDistance={55}
        maxPolarAngle={Math.PI / 2 - 0.05}
        rotateSpeed={0.45}
        autoRotate={false}
      />
    </Canvas>
  );
}

interface CityStageProps {
  magnitude: number;
  place: string;
  depthKm: number | null;
  playing: boolean;
  playKey: number;
}

function CityStage({
  magnitude,
  place,
  playing,
  playKey,
}: CityStageProps) {
  const layout = useMemo(
    () => buildCityLayout({ place, magnitude }),
    [place, magnitude],
  );

  // Animation parameters keyed off magnitude.
  const params = useMemo(() => {
    const amp =
      magnitude >= 8 ? 1.1 :
      magnitude >= 7.5 ? 0.9 :
      magnitude >= 7 ? 0.7 :
      magnitude >= 6 ? 0.45 :
      magnitude >= 5 ? 0.25 :
      magnitude >= 4 ? 0.13 :
      0.07;
    const duration =
      magnitude >= 7 ? 14 :
      magnitude >= 6 ? 11 :
      magnitude >= 5 ? 8 :
      6;
    return { amp, duration, waveSpeed: 4.0 };
  }, [magnitude]);

  const groundGeometryRef = useRef<THREE.PlaneGeometry | null>(null);

  return (
    <group>
      <AsphaltGround size={layout.extent * 2.4} geometryRef={groundGeometryRef} />

      <GroundWaveDriver
        geometryRef={groundGeometryRef}
        amplitude={params.amp}
        waveSpeed={params.waveSpeed}
        duration={params.duration}
        playing={playing}
        playKey={playKey}
      />

      <Streetlights lights={layout.streetlights} />
      <Trees trees={layout.trees} />
      <ParkedCars extent={layout.extent} seed={layout.streetlights.length || 1} />

      {layout.structures.map((s, i) => (
        <Building
          key={`${playKey}-${i}`}
          def={s}
          amplitude={params.amp}
          waveSpeed={params.waveSpeed}
          duration={params.duration}
          playing={playing}
          playKey={playKey}
        />
      ))}

      {/* Per-collapsing-building dust column. Only the buildings flagged
       *  as `collapses` get one — the rest just sway. */}
      {layout.structures
        .filter((s) => s.collapses)
        .map((s, i) => (
          <CollapseDust
            key={`dust-${playKey}-${i}`}
            structure={s}
            waveSpeed={params.waveSpeed}
            amplitude={params.amp}
            playing={playing}
            playKey={playKey}
          />
        ))}

      <EpicenterRings
        amplitude={params.amp}
        duration={params.duration}
        playing={playing}
        playKey={playKey}
      />

      <DustOverlay
        amplitude={params.amp}
        magnitude={magnitude}
        duration={params.duration}
        playing={playing}
        playKey={playKey}
      />
    </group>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Camera shake — handheld jitter applied directly to the active camera.
 * This is what sells "you are inside the quake" more than any other effect.
 * Two-band noise (high-freq for the body shake, low-freq for the slow
 * lurch) gives a cinematic feel rather than a vibrating cube.
 * ──────────────────────────────────────────────────────────────────────── */

function CameraShake({
  magnitude,
  playing,
  playKey,
}: {
  magnitude: number;
  playing: boolean;
  playKey: number;
}) {
  const { camera } = useThree();
  const startRef = useRef(0);
  const lastKey = useRef(playKey);
  const pausedAt = useRef<number | null>(null);
  const lastOffset = useRef(new THREE.Vector3(0, 0, 0));
  const lastRot = useRef({ x: 0, y: 0, z: 0 });

  // Magnitude → peak shake amplitude (scene units) and active duration.
  const peak =
    magnitude >= 8 ? 1.4 :
    magnitude >= 7.5 ? 1.0 :
    magnitude >= 7 ? 0.7 :
    magnitude >= 6 ? 0.42 :
    magnitude >= 5 ? 0.22 :
    magnitude >= 4 ? 0.10 :
    0.05;

  const activeDuration =
    magnitude >= 7 ? 12 :
    magnitude >= 6 ? 9 :
    magnitude >= 5 ? 6.5 :
    4.5;

  useFrame(({ clock }) => {
    if (lastKey.current !== playKey) {
      lastKey.current = playKey;
      startRef.current = clock.elapsedTime;
      pausedAt.current = null;
    }

    // Always undo last frame's shake before applying new one — keeps the
    // camera under OrbitControls' authority when shake is idle.
    camera.position.sub(lastOffset.current);
    camera.rotation.x -= lastRot.current.x;
    camera.rotation.y -= lastRot.current.y;
    camera.rotation.z -= lastRot.current.z;
    lastOffset.current.set(0, 0, 0);
    lastRot.current = { x: 0, y: 0, z: 0 };

    if (!playing) {
      if (pausedAt.current === null) pausedAt.current = clock.elapsedTime;
      return;
    }
    if (pausedAt.current !== null) {
      startRef.current += clock.elapsedTime - pausedAt.current;
      pausedAt.current = null;
    }
    const t = clock.elapsedTime - startRef.current;
    if (t < 0 || t > activeDuration) return;

    // Build-up envelope: P-wave arrival 0..0.6s, S-wave peak 0.6..2s, then
    // exponential decay over remaining duration.
    let env: number;
    if (t < 0.6) env = t / 0.6 * 0.45;
    else if (t < 2) env = 0.45 + (t - 0.6) / 1.4 * 0.55;
    else env = Math.exp(-(t - 2) / (activeDuration / 2.4));

    const amp = peak * env;
    if (amp < 0.005) return;

    // Mix of frequencies so the camera doesn't read as a sine wave.
    const tt = clock.elapsedTime * 30;
    const dx = (Math.sin(tt * 1.13) + Math.sin(tt * 2.71) * 0.5) * amp * 0.18;
    const dy = (Math.cos(tt * 1.47) + Math.sin(tt * 3.13) * 0.4) * amp * 0.14;
    const dz = (Math.sin(tt * 0.97) + Math.cos(tt * 2.31) * 0.45) * amp * 0.18;

    const rx = (Math.sin(tt * 1.27) * 0.012) * amp;
    const ry = (Math.cos(tt * 1.63) * 0.012) * amp;
    const rz = (Math.sin(tt * 0.83) * 0.018) * amp;

    lastOffset.current.set(dx, dy, dz);
    lastRot.current = { x: rx, y: ry, z: rz };
    camera.position.add(lastOffset.current);
    camera.rotation.x += rx;
    camera.rotation.y += ry;
    camera.rotation.z += rz;
  });

  return null;
}

/* ────────────────────────────────────────────────────────────────────────
 * CollapseDust — vertical dust column that puffs up from a building when
 * it tips over, then drifts and fades. Adds the visceral "cloud of debris"
 * the user expects from a real collapse.
 * ──────────────────────────────────────────────────────────────────────── */

function CollapseDust({
  structure,
  waveSpeed,
  amplitude,
  playing,
  playKey,
}: {
  structure: CityStructure;
  waveSpeed: number;
  amplitude: number;
  playing: boolean;
  playKey: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const startRef = useRef(0);
  const lastKey = useRef(playKey);
  const pausedAt = useRef<number | null>(null);

  // Trigger time relative to scene start: P-wave arrival + the building's
  // own collapseAt offset.
  const triggerAt = structure.distance / waveSpeed + structure.collapseAt;
  const peakWidth = Math.max(0.6, structure.height * 0.35);
  const peakHeight = structure.height * 1.2;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    if (lastKey.current !== playKey) {
      lastKey.current = playKey;
      startRef.current = clock.elapsedTime;
      pausedAt.current = null;
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
    const local = t - triggerAt;
    if (local < 0 || local > 8) {
      meshRef.current.visible = false;
      return;
    }
    meshRef.current.visible = true;

    // Bloom in the first 0..1.2s, then drift up + fade over 1.2..8s.
    const bloom = Math.min(1, local / 1.2);
    const drift = Math.max(0, (local - 1.2) / 6.8);
    const widthScale = peakWidth * (0.4 + bloom * 0.7 + drift * 0.4);
    const heightScale = peakHeight * (0.3 + bloom * 0.7 + drift * 0.4);
    meshRef.current.scale.set(widthScale, heightScale, widthScale);
    meshRef.current.position.set(
      structure.x,
      structure.height * 0.15 + drift * structure.height * 0.7,
      structure.z,
    );

    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, 0.55 * Math.min(1, amplitude * 1.5) * (1 - local / 8));
  });

  return (
    <mesh ref={meshRef} visible={false}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial
        color="#9c8b76"
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Ground wave — deforms the asphalt plane via per-vertex Z displacement.
 * ──────────────────────────────────────────────────────────────────────── */

function GroundWaveDriver({
  geometryRef,
  amplitude,
  waveSpeed,
  duration,
  playing,
  playKey,
}: {
  geometryRef: { current: THREE.PlaneGeometry | null };
  amplitude: number;
  waveSpeed: number;
  duration: number;
  playing: boolean;
  playKey: number;
}) {
  const startRef = useRef(0);
  const lastKey = useRef(playKey);
  const pausedAt = useRef<number | null>(null);

  useFrame(({ clock }) => {
    const geo = geometryRef.current;
    if (!geo) return;
    if (lastKey.current !== playKey) {
      lastKey.current = playKey;
      startRef.current = clock.elapsedTime;
      pausedAt.current = null;
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
    const fade = Math.max(0, 1 - t / duration);
    const peak = amplitude * fade;

    const positions = geo.attributes.position;
    if (!positions) return;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const r = Math.hypot(x, y);
      const phase = (r - waveSpeed * t) * 1.4;
      const env = Math.exp(-Math.pow((r - waveSpeed * t) / 5.5, 2));
      const z = Math.sin(phase) * env * peak * 0.45;
      positions.setZ(i, z);
    }
    positions.needsUpdate = true;
    geo.computeVertexNormals();
  });

  return null;
}

/* ────────────────────────────────────────────────────────────────────────
 * Epicenter rings — three concentric tangent rings expanding outward.
 * ──────────────────────────────────────────────────────────────────────── */

function EpicenterRings({
  amplitude,
  duration,
  playing,
  playKey,
}: {
  amplitude: number;
  duration: number;
  playing: boolean;
  playKey: number;
}) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const startRef = useRef(0);
  const lastKey = useRef(playKey);
  const pausedAt = useRef<number | null>(null);

  useFrame(({ clock }) => {
    if (lastKey.current !== playKey) {
      lastKey.current = playKey;
      startRef.current = clock.elapsedTime;
      pausedAt.current = null;
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
    refs.current.forEach((m, i) => {
      if (!m) return;
      const delay = i * 0.5;
      const local = Math.max(0, t - delay);
      if (local <= 0 || local > duration) {
        m.visible = false;
        return;
      }
      m.visible = true;
      const r = Math.min(36, local * 5);
      m.scale.set(r, r, r);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity =
        0.45 * Math.max(0, 1 - local / duration) * Math.min(1, amplitude * 1.2);
    });
  });

  return (
    <>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.04, 0]}
        >
          <ringGeometry args={[0.96, 1, 96]} />
          <meshBasicMaterial
            color={i === 0 ? '#ffd06a' : i === 1 ? '#ff8044' : '#ef4444'}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Dust overlay — translucent plane that fades in once the wave hits and
 * stronger collapses begin. Cheap stand-in for a particle dust cloud.
 * ──────────────────────────────────────────────────────────────────────── */

function DustOverlay({
  amplitude,
  magnitude,
  duration,
  playing,
  playKey,
}: {
  amplitude: number;
  magnitude: number;
  duration: number;
  playing: boolean;
  playKey: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const startRef = useRef(0);
  const lastKey = useRef(playKey);
  const pausedAt = useRef<number | null>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (lastKey.current !== playKey) {
      lastKey.current = playKey;
      startRef.current = clock.elapsedTime;
      pausedAt.current = null;
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
    // Dust ramps up after the wave hits, peaks mid-quake, fades slowly.
    const local = t / duration;
    const env =
      Math.exp(-Math.pow((local - 0.55) / 0.35, 2)) * (magnitude >= 5.5 ? 1 : 0);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = env * 0.22 * Math.min(1, amplitude * 1.5);
    ref.current.position.y = 1.5 + local * 1.5;
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.5, 0]}>
      <planeGeometry args={[80, 80]} />
      <meshBasicMaterial
        color="#9c7e58"
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  );
}
