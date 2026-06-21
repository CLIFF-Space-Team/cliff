'use client';

import { Trail } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { CameraControls } from '@/components/3d/controls/CameraControls';
import { PostFX } from '@/components/3d/postprocessing/PostFX';
import { ProceduralAsteroid } from '@/components/3d/asteroids/ProceduralAsteroid';
import { Earth } from '@/components/3d/primitives/Earth';
import { StarField } from '@/components/3d/primitives/StarField';
import { useLiteMode } from '@/hooks/useLiteMode';
import { AirShockwaveRing } from './scene/AirShockwaveRing';
import { AsteroidEntry } from './scene/AsteroidEntry';
import { CometEntry } from './scene/CometEntry';
import { AtmosphericBlanket } from './scene/AtmosphericBlanket';
import { AtmosphericGlow } from './scene/AtmosphericGlow';
import { BolideTrail } from './scene/BolideTrail';
import { CityCluster } from './scene/CityCluster';
import { CityDebris } from './scene/CityDebris';
import { Crater } from './scene/Crater';
import { FallenForest } from './scene/FallenForest';
import { GlassShatter } from './scene/GlassShatter';
import { DynamicLighting } from './scene/DynamicLighting';
import { EjectaChunks } from './scene/EjectaChunks';
import { makeImpactFrame } from './scene/frame';
import { ImpactLight } from './scene/ImpactLight';
import { MoltenCracks } from './scene/MoltenCracks';
import { MoltenSurfaceGlow } from './scene/MoltenSurfaceGlow';
import { MushroomCloud } from './scene/MushroomCloud';
import { PersistentDustLayer } from './scene/PersistentDustLayer';
import { PlanetShatter, PLANET_SHATTER_THRESHOLD_MT } from './scene/PlanetShatter';
import { SceneAnnotations } from './scene/SceneAnnotations';
import { SeismicRipples } from './scene/SeismicRipples';
import { ThermalGlowHalo } from './scene/ThermalGlowHalo';

import { getNarrative, type SceneEffect } from '@/lib/impact-narratives';
import type { Composition, ImpactResult } from '@/lib/impact-physics';

interface ImpactVisualization3DProps {
  result: ImpactResult;
  diameterM: number;
  composition: Composition;
  /** Timeline is playing forward. When false, camera-rig auto-dolly pauses
   *  so the user can freely orbit/zoom without being yanked back. */
  playing?: boolean;
  /** 0..1 timeline cursor; controlled by caller. */
  progress: number;
  /** Active preset id — drives narrative effects (city, forest, atmospheric blanket). */
  presetId?: string | null;
  /** Impact site latitude in degrees (-90..90). Default = 28 (Sahara). */
  targetLat?: number;
  /** Impact site longitude in degrees (-180..180). Default = 16. */
  targetLng?: number;
  /** A real city is targeted → always show the city cluster + debris at the
   *  impact site (not only when the preset narrative enables 'city'). */
  cityTargeted?: boolean;
}

const EARTH_SCALE = 3.2;
const EARTH_RADIUS_KM = 6371;
const DEFAULT_IMPACT_LAT = 28;
const DEFAULT_IMPACT_LON = 16;

// ────────────────────────────────────────────────────────────
// Phase boundaries (0..1)
//   0.00 – 0.50  approach (deep space → entry)
//   0.50 – 0.62  atmospheric entry (plasma + glow)
//   0.62 – 0.65  impact flash + camera shake
//   0.62 – 0.85  fireball (rising + cooling)
//   0.65 – 1.00  multi-ring shockwave
//   0.70 – 1.00  damage zones revealed
// ────────────────────────────────────────────────────────────

const ASTEROID_MAP_TYPE: Record<Composition, 'M' | 'S' | 'C' | 'V'> = {
  iron: 'M',
  stony: 'S',
  carbonaceous: 'C',
  icy: 'V',
};

export function ImpactVisualization3D({
  result,
  diameterM,
  composition,
  progress,
  presetId,
  targetLat,
  targetLng,
  cityTargeted = false,
  playing = true,
}: ImpactVisualization3DProps) {
  const impactPoint = useMemo<[number, number, number]>(() => {
    const lat = targetLat ?? DEFAULT_IMPACT_LAT;
    const lng = targetLng ?? DEFAULT_IMPACT_LON;
    const φ = (90 - lat) * (Math.PI / 180);
    const θ = lng * (Math.PI / 180);
    // Z is negated to match Three.js SphereGeometry's default UV wrapping —
    // without this, picking Istanbul (29°E) lands the impact ~58° east of
    // where the texture renders Istanbul. Same convention as EarthGlobe3D.
    return [
      EARTH_SCALE * Math.sin(φ) * Math.cos(θ),
      EARTH_SCALE * Math.cos(φ),
      -EARTH_SCALE * Math.sin(φ) * Math.sin(θ),
    ];
  }, [targetLat, targetLng]);

  const narrative = useMemo(() => getNarrative(presetId ?? null), [presetId]);
  const effects = useMemo(() => new Set<SceneEffect>(narrative.effects), [narrative]);

  // Shared tangent frame at the impact point, aligned with the impact azimuth
  // so every effect (Crater, Ejecta, Thermal halo, Shockwave ring, Seismic
  // ripples) stretches/orients consistently.
  const azimuthDeg = result.impact_azimuth_deg ?? 90;
  const angleDeg = result.impact_angle_deg ?? 90;
  const impactFrame = useMemo(
    () => makeImpactFrame(impactPoint, azimuthDeg),
    [impactPoint, azimuthDeg],
  );
  // Asteroid approach start (mirrors the formula in Asteroid component).
  const asteroidStartPos = useMemo<[number, number, number]>(
    () => [impactPoint[0] + 6, impactPoint[1] + 11, impactPoint[2] + 6],
    [impactPoint],
  );

  // Surface-aligned shockwave radius (scene units) used by city / forest props.
  const peakShockSceneRadius = Math.min(
    EARTH_SCALE * 1.6,
    Math.max(0.4, (result.overpressure_1psi_km / EARTH_RADIUS_KM) * EARTH_SCALE * 4),
  );
  const shockRadiusFn = () => {
    if (progress < 0.65) return 0;
    const t = (progress - 0.65) / 0.35;
    return peakShockSceneRadius * Math.min(1, t * 1.3);
  };

  // Reveal driver for atmospheric blanket / glass shatter (post-impact, 0..1).
  const postImpactReveal = Math.max(0, Math.min(1, (progress - 0.65) / 0.3));

  // Lite mode: dpr=1, antialias kapalı, yıldız sayısı /3 — düşük güçlü cihazlar için
  const liteMode = useLiteMode();
  const dpr: [number, number] = liteMode ? [1, 1] : [1, 2];
  const antialias = !liteMode;
  const starCount = liteMode ? 1500 : 5000;

  return (
    <Canvas
      shadows={false}
      dpr={dpr}
      gl={{
        antialias,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      camera={{ position: [0, 2.4, 22], near: 0.1, far: 240, fov: 46 }}
      onCreated={({ scene, gl }) => {
        scene.background = new THREE.Color(0x000000);
        gl.setClearColor(0x000000, 1);
      }}
    >
      <StarField count={starCount} radius={120} />
      <DynamicLighting progress={progress} />

      <Earth position={[0, 0, 0]} scale={EARTH_SCALE} rotationSpeed={0} />

      {/* Atmospheric heating glow during entry phase (0.45 → 0.62) */}
      <AtmosphericGlow
        entryDirection={impactPoint}
        earthRadius={EARTH_SCALE}
        progress={progress}
      />
      {/* Bolide plasma trail behind the asteroid during entry */}
      <BolideTrail startPos={asteroidStartPos} target={impactPoint} progress={progress} />

      {/* Big-scene props */}
      {effects.has('atmospheric_blanket') && (
        <AtmosphericBlanket earthScale={EARTH_SCALE} reveal={postImpactReveal} />
      )}
      {/* Crater always shown for ground impacts. Radius is exaggerated 8×
       *  (vs the geographically-true ratio) so the user can actually see
       *  the depression on a 3.2-unit Earth — otherwise a 1 km crater would
       *  be sub-pixel. Floor at 0.10 so even tiny impacts leave a visible scar. */}
      {result.mode === 'crater' && result.crater_diameter_km > 0 && (
        <>
          <Crater
            impactPoint={impactPoint}
            radius={Math.min(
              EARTH_SCALE * 0.7,
              Math.max(0.10, (result.crater_diameter_km / EARTH_RADIUS_KM) * EARTH_SCALE * 8),
            )}
            reveal={postImpactReveal}
            angleDeg={angleDeg}
            azimuthDeg={azimuthDeg}
          />
          {/* Half-buried asteroid fragment in the crater floor — the visceral
           *  "the rock is here" anchor that keeps the post-impact frame from
           *  looking empty. */}
          <BuriedFragment
            impactPoint={impactPoint}
            diameterM={diameterM}
            composition={composition}
            reveal={postImpactReveal}
          />
        </>
      )}
      {(effects.has('city') || cityTargeted) && (
        <>
          <CityCluster
            impactPoint={impactPoint}
            shockRadiusFn={shockRadiusFn}
            count={liteMode ? 70 : 140}
          />
          <CityDebris
            impactPoint={impactPoint}
            shockRadiusFn={shockRadiusFn}
            lite={liteMode}
          />
        </>
      )}
      {effects.has('forest') && (
        <FallenForest impactPoint={impactPoint} shockRadiusFn={shockRadiusFn} />
      )}
      {effects.has('glass_shatter') && (
        <GlassShatter impactPoint={impactPoint} reveal={postImpactReveal} />
      )}
      {(effects.has('mega_dust') || result.mode === 'crater') && (
        <MushroomCloud
          impactPoint={impactPoint}
          progress={progress}
          peakRadius={Math.min(
            EARTH_SCALE * 0.42,
            Math.max(0.16, (result.thermal_radius_km / EARTH_RADIUS_KM) * EARTH_SCALE * 3),
          )}
          tint={composition === 'iron' ? 'iron' : composition === 'icy' ? 'icy' : 'natural'}
        />
      )}
      <ImpactLight impactPoint={impactPoint} progress={progress} />
      {/* Solar Smash tarzı erimiş lav çatlak ağı + akkor yüzey — küre
          yüzeyini takip eder, enerjiyle ölçeklenir (dev çarpma → gezegeni sarar). */}
      <MoltenCracks
        impactPoint={impactPoint}
        earthRadius={EARTH_SCALE}
        progress={progress}
        energyMegatons={result.energy_megatons}
      />
      <MoltenSurfaceGlow
        impactPoint={impactPoint}
        earthRadius={EARTH_SCALE}
        progress={progress}
        energyMegatons={result.energy_megatons}
      />
      {/* Solar Smash finali — yalnızca aşırı enerjide (K-Pg+) gezegen parçalanır:
          kabuk uzaya fırlar, akkor çekirdek açığa çıkar. */}
      {result.energy_megatons >= PLANET_SHATTER_THRESHOLD_MT && (
        <PlanetShatter
          earthRadius={EARTH_SCALE}
          progress={progress}
          energyMegatons={result.energy_megatons}
          lite={liteMode}
        />
      )}
      <EjectaChunks
        impactPoint={impactPoint}
        progress={progress}
        angleDeg={angleDeg}
        azimuthDeg={azimuthDeg}
        energyMegatons={result.energy_megatons}
        lite={liteMode}
      />

      {/* Post-impact effect layers — orient via shared frame */}
      <ThermalGlowHalo
        frame={impactFrame}
        earthRadius={EARTH_SCALE}
        radius={Math.min(
          EARTH_SCALE * 0.95,
          Math.max(0.18, (result.thermal_radius_km / EARTH_RADIUS_KM) * EARTH_SCALE * 4),
        )}
        progress={progress}
        downrangeStretch={
          // Shallower angle → halo stretches more downrange.
          1 + (Math.max(0, 60 - angleDeg) / 60) * 0.4
        }
      />
      <AirShockwaveRing
        frame={impactFrame}
        earthRadius={EARTH_SCALE}
        innerRadius={Math.min(
          EARTH_SCALE * 1.4,
          Math.max(0.25, (result.overpressure_5psi_km / EARTH_RADIUS_KM) * EARTH_SCALE * 4),
        )}
        outerRadius={Math.min(
          EARTH_SCALE * 1.8,
          Math.max(0.4, (result.overpressure_1psi_km / EARTH_RADIUS_KM) * EARTH_SCALE * 4),
        )}
        progress={progress}
      />
      <SeismicRipples
        frame={impactFrame}
        earthRadius={EARTH_SCALE}
        feltRadius={Math.min(
          EARTH_SCALE * 1.95,
          Math.max(0.5, (result.seismic_felt_radius_km / EARTH_RADIUS_KM) * EARTH_SCALE * 4),
        )}
        magnitude={result.seismic_magnitude}
        progress={progress}
      />
      <PersistentDustLayer
        earthRadius={EARTH_SCALE}
        energyMegatons={result.energy_megatons}
        progress={progress}
      />

      <SceneAnnotations impactPoint={impactPoint} result={result} progress={progress} />

      {/* Cisim girişi — bileşime göre farklı. icy → koma+kuyruklu kuyrukluyıldız,
          yüksek irtifa hava patlaması. Diğerleri → atmosferde parçalanan bolide
          (tek kaya girer, parça yağmuruna dönüşerek çarpar). */}
      {composition === 'icy' ? (
        <CometEntry diameterM={diameterM} target={impactPoint} progress={progress} />
      ) : (
        <AsteroidEntry
          diameterM={diameterM}
          composition={composition}
          target={impactPoint}
          progress={progress}
        />
      )}

      <ImpactFlash impactPoint={impactPoint} progress={progress} />
      <FireballStack impactPoint={impactPoint} progress={progress} result={result} />
      <SecondaryBlasts impactPoint={impactPoint} progress={progress} result={result} />
      <DebrisCloud impactPoint={impactPoint} progress={progress} result={result} />
      <Shockwave impactPoint={impactPoint} progress={progress} result={result} />
      <DamageRings impactPoint={impactPoint} progress={progress} result={result} />
      <SurfaceScar impactPoint={impactPoint} progress={progress} result={result} />

      <CameraRig progress={progress} impactPoint={impactPoint} playing={playing} />
      {/* minDistance ~3.6 lets the user dolly right onto the crater rim
       *  (Earth scale is 3.2). Pan still off so the focus stays on the
       *  impact site no matter how close they zoom. */}
      <CameraControls minDistance={3.6} maxDistance={60} enablePan={false} />

      {/* Bloom — akkor çatlaklar, ateş topu, erimiş yüzey parlar (Solar Smash hissi).
          + Çarpma anında ekran şok dalgası bozulması. */}
      <PostFX
        quality={liteMode ? 'low' : 'high'}
        shockwave={{ impactPoint, progress }}
      />
    </Canvas>
  );
}

// ════════════════════════════════════════════════════════════
// Asteroid + plasma trail
// ════════════════════════════════════════════════════════════

function Asteroid({
  diameterM,
  composition,
  target,
  progress,
}: {
  diameterM: number;
  composition: Composition;
  target: [number, number, number];
  progress: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const heatRef = useRef<THREE.Mesh>(null);
  const heatMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const visualSize = Math.max(0.06, Math.min(0.55, Math.log10(diameterM + 1) * 0.18));
  // Stable seed per composition so re-renders don't reshape the rock.
  const seed = useMemo(() => {
    const s = composition.charCodeAt(0) * 7919 + Math.round(diameterM);
    return s >>> 0;
  }, [composition, diameterM]);

  // Approach trajectory: arc from far up-right toward target. Tightened so
  // the asteroid plunges almost vertically against the local surface in the
  // last 15% of approach — visually reads as a proper impact, not a glide.
  const startPos = useMemo<[number, number, number]>(
    () => [target[0] + 6, target[1] + 11, target[2] + 6],
    [target],
  );

  // Burrow target: a point slightly *below* the surface along the inward
  // normal. The asteroid sinks into the crust before disappearing so the
  // user sees it actually impact, not just dissolve in mid-air.
  const burrowTarget = useMemo<[number, number, number]>(() => {
    const inward = new THREE.Vector3(...target).normalize().multiplyScalar(-visualSize * 0.6);
    return [target[0] + inward.x, target[1] + inward.y, target[2] + inward.z];
  }, [target, visualSize]);

  useFrame(() => {
    if (!groupRef.current) return;

    if (progress < 0.65) {
      // Approach window has two phases: long curve in (0..0.55) then a
      // straight, accelerating dive (0.55..0.65) that sinks INTO the
      // surface so the impact reads physically.
      const t = Math.min(1, progress / 0.65);
      const eased = Math.pow(t, 1.6);
      groupRef.current.visible = true;

      if (t < 0.85) {
        const k = eased / Math.pow(0.85, 1.6);
        groupRef.current.position.set(
          THREE.MathUtils.lerp(startPos[0], target[0], k),
          THREEMathLerpQuad(startPos[1], target[1], k),
          THREE.MathUtils.lerp(startPos[2], target[2], k),
        );
      } else {
        const k = (t - 0.85) / 0.15;
        groupRef.current.position.set(
          THREE.MathUtils.lerp(target[0], burrowTarget[0], k),
          THREE.MathUtils.lerp(target[1], burrowTarget[1], k),
          THREE.MathUtils.lerp(target[2], burrowTarget[2], k),
        );
      }

      // Plasma envelope: a glow shell around the rock, intensifying in the
      // last 30% of approach as it ablates through the atmosphere.
      const heat = Math.max(0, (t - 0.7) / 0.3);
      if (heatRef.current && heatMatRef.current) {
        heatRef.current.visible = heat > 0.01;
        heatMatRef.current.opacity = 0.85 * heat;
      }
    } else {
      groupRef.current.visible = false;
    }
  });

  return (
    <Trail
      width={visualSize * 6}
      length={5}
      decay={2.4}
      attenuation={(t) => t * t}
      color={'#ffaa44'}
      // The trail re-renders only while the group is visible.
    >
      <group ref={groupRef}>
        {/* Real PBR rock with vertex displacement — same generator the
         *  dashboard asteroids use, so the meteor matches the visual
         *  language of the rest of the app. */}
        <ProceduralAsteroid
          position={[0, 0, 0]}
          scale={visualSize}
          type={ASTEROID_MAP_TYPE[composition]}
          seed={seed}
          detail={3}
        />
        {/* Plasma envelope — back-side additive shell that fires up only
         *  during atmospheric entry. */}
        <mesh ref={heatRef} scale={visualSize * 1.55} visible={false}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial
            ref={heatMatRef}
            color="#ff8a3a"
            transparent
            opacity={0}
            side={THREE.BackSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
    </Trail>
  );
}

// ════════════════════════════════════════════════════════════
// BuriedFragment — a half-sunk asteroid chunk in the crater floor.
// Persists once the impact reveal has played; gives the user a visceral
// "the rock is right there, embedded in the ground" anchor instead of the
// crater being a scorch mark with nothing inside it.
// ════════════════════════════════════════════════════════════

function BuriedFragment({
  impactPoint,
  diameterM,
  composition,
  reveal,
}: {
  impactPoint: [number, number, number];
  diameterM: number;
  composition: Composition;
  reveal: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // Sit below the surface along the inward normal, leaving roughly the
  // top third of the rock above ground. Real impact physics: the bulk of
  // the body vaporises on contact — only a small fragment survives, often
  // ~5-10% of the original mass. Visible size is tuned ~3× smaller than
  // the approaching meteor so it fits inside the crater bowl without
  // crowding it out.
  const visualSize = Math.max(0.025, Math.min(0.16, Math.log10(diameterM + 1) * 0.045));

  const orientation = useMemo(() => {
    const normal = new THREE.Vector3(...impactPoint).normalize();
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    return quat;
  }, [impactPoint]);

  const buriedPos = useMemo<[number, number, number]>(() => {
    const n = new THREE.Vector3(...impactPoint).normalize();
    // Sink ~70% of its radius below the surface point.
    const offset = n.multiplyScalar(-visualSize * 0.7);
    return [
      impactPoint[0] + offset.x,
      impactPoint[1] + offset.y,
      impactPoint[2] + offset.z,
    ];
  }, [impactPoint, visualSize]);

  const seed = useMemo(() => {
    const s = composition.charCodeAt(0) * 6151 + Math.round(diameterM) * 13;
    return (s + 9_999_991) >>> 0;
  }, [composition, diameterM]);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    const target = Math.min(1, reveal * 1.2);
    const cur = groupRef.current.scale.x;
    const next = THREE.MathUtils.lerp(cur, target, Math.min(1, dt * 4));
    groupRef.current.scale.setScalar(next);
    groupRef.current.visible = next > 0.02;
  });

  return (
    <group
      ref={groupRef}
      position={buriedPos}
      quaternion={orientation}
      scale={0.001}
    >
      <ProceduralAsteroid
        position={[0, 0, 0]}
        scale={visualSize}
        type={ASTEROID_MAP_TYPE[composition]}
        seed={seed}
        detail={3}
      />
    </group>
  );
}

// Quadratic lerp for slight hang-time at the apex of the arc.
function THREEMathLerpQuad(a: number, b: number, t: number): number {
  return a + (b - a) * (t * t);
}

// ════════════════════════════════════════════════════════════
// Impact flash — brief white sphere at impact site
// ════════════════════════════════════════════════════════════

function ImpactFlash({
  impactPoint,
  progress,
}: {
  impactPoint: [number, number, number];
  progress: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ref.current) return;
    if (progress < 0.62 || progress > 0.72) {
      ref.current.visible = false;
      return;
    }
    ref.current.visible = true;
    const local = (progress - 0.62) / 0.10; // 0..1 over flash window
    const scale = 0.8 + local * 6;
    ref.current.scale.setScalar(scale);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, 1 - local) * 0.9;
  });

  return (
    <mesh ref={ref} position={impactPoint}>
      <sphereGeometry args={[1, 24, 24]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

// ════════════════════════════════════════════════════════════
// Fireball — three layers with staggered cooling
// ════════════════════════════════════════════════════════════

function FireballStack({
  impactPoint,
  progress,
  result,
}: {
  impactPoint: [number, number, number];
  progress: number;
  result: ImpactResult;
}) {
  const coreRef = useRef<THREE.Mesh>(null);
  const plasmaRef = useRef<THREE.Mesh>(null);
  const smokeRef = useRef<THREE.Mesh>(null);

  const peakRadius = useMemo(() => {
    // Gezegeni kaplayan dev sfer yerine, yüzeyden yükselen kontrollü ateş
    // topu. Çatlak ağı + erimiş yüzey büyük çarpmanın dramını taşır.
    return Math.min(
      EARTH_SCALE * 0.4,
      Math.max(0.22, (result.thermal_radius_km / EARTH_RADIUS_KM) * EARTH_SCALE * 3),
    );
  }, [result.thermal_radius_km]);

  // Surface normal so the fireball mushrooms outward from the surface.
  const liftVec = useMemo(() => {
    const v = new THREE.Vector3(...impactPoint).normalize().multiplyScalar(0.2);
    return [v.x, v.y, v.z] as [number, number, number];
  }, [impactPoint]);

  useFrame(() => {
    const inWindow = progress >= 0.62 && progress <= 1.0;

    [coreRef, plasmaRef, smokeRef].forEach((r) => {
      if (r.current) r.current.visible = inWindow;
    });
    if (!inWindow) return;

    const local = (progress - 0.62) / 0.38;

    // White-hot core: very fast bloom, fades within first 25% — daha iri/parlak.
    if (coreRef.current) {
      const t = Math.min(1, local * 6);
      const fade = Math.max(0, 1 - local / 0.28);
      coreRef.current.scale.setScalar(peakRadius * 0.62 * t);
      const mat = coreRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = fade;
    }

    // Plasma cloud: bigger, lasts longer, color goes white→orange→red
    if (plasmaRef.current) {
      const t = Math.min(1, local * 3);
      const fade = Math.max(0, 1 - local * 1.2);
      plasmaRef.current.scale.setScalar(peakRadius * t);
      const mat = plasmaRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.7 * fade;

      // Color shift: t=0 white → t=0.4 orange → t=1 red
      const c = mat.color;
      if (local < 0.25) {
        c.setRGB(1, 1 - local * 1.6, 0.5 - local * 1.6);
      } else if (local < 0.55) {
        const k = (local - 0.25) / 0.3;
        c.setRGB(1, 0.6 - k * 0.3, 0.1);
      } else {
        const k = Math.min(1, (local - 0.55) / 0.45);
        c.setRGB(1 - k * 0.5, 0.3 - k * 0.2, 0.1 - k * 0.05);
      }

      // Slow rise from surface (mushroom)
      const lift = Math.min(0.4, local * 0.6) * peakRadius;
      plasmaRef.current.position.set(
        impactPoint[0] + liftVec[0] * lift,
        impactPoint[1] + liftVec[1] * lift,
        impactPoint[2] + liftVec[2] * lift,
      );
    }

    // Smoke: appears later, persists, gray
    if (smokeRef.current) {
      const t = Math.max(0, (local - 0.2) / 0.6);
      const fade = Math.max(0, 1 - Math.max(0, local - 0.6) * 1.5);
      smokeRef.current.scale.setScalar(peakRadius * 1.4 * Math.min(1, t));
      const mat = smokeRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.42 * fade;

      const lift = Math.min(0.9, local * 1.2) * peakRadius;
      smokeRef.current.position.set(
        impactPoint[0] + liftVec[0] * lift,
        impactPoint[1] + liftVec[1] * lift,
        impactPoint[2] + liftVec[2] * lift,
      );
    }
  });

  return (
    <>
      <mesh ref={coreRef} position={impactPoint}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={plasmaRef} position={impactPoint}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#ffd680"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={smokeRef} position={impactPoint}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          color="#403028"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

// ════════════════════════════════════════════════════════════
// Secondary blasts — staggered bright pops around the fireball so it roils
// and "detonates" instead of being one clean sphere. Additive + bloom.
// ════════════════════════════════════════════════════════════

function SecondaryBlasts({
  impactPoint,
  progress,
  result,
}: {
  impactPoint: [number, number, number];
  progress: number;
  result: ImpactResult;
}) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);

  const peakRadius = useMemo(
    () =>
      Math.min(
        EARTH_SCALE * 0.4,
        Math.max(0.22, (result.thermal_radius_km / EARTH_RADIUS_KM) * EARTH_SCALE * 3),
      ),
    [result.thermal_radius_km],
  );

  const blasts = useMemo(() => {
    const n = new THREE.Vector3(...impactPoint).normalize();
    let t1 = new THREE.Vector3(0, 1, 0).cross(n);
    if (t1.lengthSq() < 1e-4) t1 = new THREE.Vector3(1, 0, 0).cross(n);
    t1.normalize();
    const t2 = n.clone().cross(t1).normalize();
    let s = 24681 >>> 0;
    const rng = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
    return Array.from({ length: 7 }, () => {
      const ang = rng() * Math.PI * 2;
      const rad = (0.3 + rng() * 0.95) * peakRadius;
      const off = t1
        .clone()
        .multiplyScalar(Math.cos(ang) * rad)
        .addScaledVector(t2, Math.sin(ang) * rad)
        .addScaledVector(n, (0.08 + rng() * 0.55) * peakRadius);
      return {
        pos: [
          impactPoint[0] + off.x,
          impactPoint[1] + off.y,
          impactPoint[2] + off.z,
        ] as [number, number, number],
        delay: rng() * 0.18,
        size: (0.16 + rng() * 0.24) * peakRadius,
        dur: 0.05 + rng() * 0.06,
      };
    });
  }, [impactPoint, peakRadius]);

  useFrame(() => {
    blasts.forEach((b, i) => {
      const m = refs.current[i];
      if (!m) return;
      const start = 0.63 + b.delay;
      const t = (progress - start) / b.dur;
      if (t < 0 || t > 1) {
        if (m.visible) m.visible = false;
        return;
      }
      m.visible = true;
      m.scale.setScalar(b.size * (0.3 + t * 1.5));
      (m.material as THREE.MeshBasicMaterial).opacity = Math.sin(t * Math.PI) * 0.92;
    });
  });

  return (
    <>
      {blasts.map((b, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={b.pos}
          visible={false}
        >
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            color="#ffd28a"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

// ════════════════════════════════════════════════════════════
// Debris cloud — radiating spark particles right at impact
// ════════════════════════════════════════════════════════════

function DebrisCloud({
  impactPoint,
  progress,
}: {
  impactPoint: [number, number, number];
  progress: number;
  result: ImpactResult;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const COUNT = 240;

  // Birim yön × hız ofsetleri bir kez "pişirilir"; kare başına yalnızca tek bir
  // uniform ölçek (scale.setScalar(reach)) uygulanır — 240-eleman buffer'ı her
  // kare yeniden yazıp GPU'ya yüklemek yerine. Görsel bit-aynı (scale model
  // matrisinde döndürme/öteleme öncesi uygulanır).
  const offsets = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const u = Math.random();
      const v = Math.random();
      const θ = 2 * Math.PI * u;
      const φ = Math.acos(0.5 + v * 0.5); // upper hemisphere bias
      const speed = 0.6 + Math.random() * 1.6;
      arr[i * 3] = Math.sin(φ) * Math.cos(θ) * speed;
      arr[i * 3 + 1] = Math.cos(φ) * speed;
      arr[i * 3 + 2] = Math.sin(φ) * Math.sin(θ) * speed;
    }
    return arr;
  }, []);

  // Orient hemisphere so its "up" matches surface normal.
  const orientation = useMemo(() => {
    const normal = new THREE.Vector3(...impactPoint).normalize();
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    return quat;
  }, [impactPoint]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const inWindow = progress >= 0.62 && progress <= 0.95;
    pointsRef.current.visible = inWindow;
    if (!inWindow) return;

    const local = (progress - 0.62) / 0.33;
    const reach = Math.min(2.8, local * 3);
    pointsRef.current.scale.setScalar(reach);

    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.opacity = Math.max(0, 1 - local) * 0.85;
    mat.size = Math.max(0.03, 0.12 * (1 - local * 0.6));
  });

  return (
    <points ref={pointsRef} position={impactPoint} quaternion={orientation}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[offsets, 3]}
          count={COUNT}
          array={offsets}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffd28a"
        size={0.08}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ════════════════════════════════════════════════════════════
// Shockwave — three concentric rings hugging the surface
// ════════════════════════════════════════════════════════════

function Shockwave({
  impactPoint,
  progress,
  result,
}: {
  impactPoint: [number, number, number];
  progress: number;
  result: ImpactResult;
}) {
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const peakRadius = useMemo(() => {
    return Math.min(
      EARTH_SCALE * 1.6,
      Math.max(0.4, (result.overpressure_1psi_km / EARTH_RADIUS_KM) * EARTH_SCALE * 4),
    );
  }, [result.overpressure_1psi_km]);

  const orientation = useMemo(() => {
    const normal = new THREE.Vector3(...impactPoint).normalize();
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    return quat;
  }, [impactPoint]);

  useFrame(() => {
    const refs = ringRefs.current;
    if (!refs.length) return;

    const inWindow = progress >= 0.65;
    if (!inWindow) {
      refs.forEach((r) => {
        if (r) r.visible = false;
      });
      return;
    }
    const local = (progress - 0.65) / 0.35;

    refs.forEach((r, i) => {
      if (!r) return;
      const ringDelay = i * 0.10;
      const ringT = Math.max(0, local - ringDelay);
      if (ringT <= 0) {
        r.visible = false;
        return;
      }
      r.visible = true;
      const radius = Math.max(0.05, peakRadius * Math.min(1, ringT * 1.3));
      r.scale.set(radius, radius, radius);
      const mat = r.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 * Math.max(0, 1 - ringT * 1.1);
    });
  });

  return (
    <>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            ringRefs.current[i] = el;
          }}
          position={impactPoint}
          quaternion={orientation}
        >
          <ringGeometry args={[0.92, 1, 96]} />
          <meshBasicMaterial
            color={i === 0 ? '#ffd06a' : i === 1 ? '#ff7848' : '#ff3030'}
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

// ════════════════════════════════════════════════════════════
// Damage rings — animated reveal + persistent
// ════════════════════════════════════════════════════════════

function DamageRings({
  impactPoint,
  progress,
  result,
}: {
  impactPoint: [number, number, number];
  progress: number;
  result: ImpactResult;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const orientation = useMemo(() => {
    const normal = new THREE.Vector3(...impactPoint).normalize();
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    return quat;
  }, [impactPoint]);

  const zones = useMemo(
    () =>
      result.damage_zones.slice(0, 4).map((z, i) => ({
        ...z,
        sceneRadius: Math.max(
          0.05,
          Math.min(EARTH_SCALE * 0.85, (z.radius_km / EARTH_RADIUS_KM) * EARTH_SCALE * 3),
        ),
        index: i,
      })),
    [result.damage_zones],
  );

  useFrame(() => {
    if (!groupRef.current) return;
    // Reveal starting at 0.7 (after impact) — each zone fades in with delay.
    const visible = progress > 0.7;
    groupRef.current.visible = visible;
    if (!visible) return;

    const t0 = Math.max(0, (progress - 0.7) / 0.25);

    groupRef.current.children.forEach((child, i) => {
      if (!(child instanceof THREE.Mesh)) return;
      const delay = i * 0.15;
      const local = Math.max(0, Math.min(1, t0 - delay));
      const baseOpacity = (child.userData.baseOpacity as number) ?? 0.18;
      const targetRadius = (child.userData.targetRadius as number) ?? 0.1;
      const radius = targetRadius * local;
      child.scale.setScalar(Math.max(0.001, radius));
      const mat = child.material as THREE.MeshBasicMaterial;
      mat.opacity = baseOpacity * local;
    });
  });

  // Earth-tone palette instead of saturated threat colours. Reads as a
  // physical dust / scorch blanket rather than a UI overlay. Severity is
  // signalled by inner darkness (more burned = more critical).
  const colorFor = (severity: string) =>
    severity === 'critical'
      ? '#3d0e0e'
      : severity === 'high'
        ? '#4a2818'
        : severity === 'moderate'
          ? '#534228'
          : '#3a3530';

  return (
    <group ref={groupRef} position={impactPoint} quaternion={orientation}>
      {zones.map((z) => (
        <mesh
          key={z.label}
          userData={{
            // Lower base opacity per zone so overlap doesn't become opaque.
            baseOpacity: 0.13 - z.index * 0.025,
            targetRadius: z.sceneRadius,
          }}
        >
          {/* Wide soft band (0.65→1.0) with radial alpha falloff via vertex
           *  colour — looks like a fading dust ring instead of a hard line. */}
          <ringGeometry args={[0.65, 1.0, 96, 1]} />
          <meshBasicMaterial
            color={colorFor(z.severity)}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ════════════════════════════════════════════════════════════
// Surface scar — a subtle dark spot on Earth where impact landed
// ════════════════════════════════════════════════════════════

function SurfaceScar({
  impactPoint,
  progress,
  result,
}: {
  impactPoint: [number, number, number];
  progress: number;
  result: ImpactResult;
}) {
  const ref = useRef<THREE.Mesh>(null);

  const orientation = useMemo(() => {
    const normal = new THREE.Vector3(...impactPoint).normalize();
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    return quat;
  }, [impactPoint]);

  // Crater visible scar size — tied to crater diameter, capped
  const scarRadius = useMemo(() => {
    if (result.mode === 'airburst') return 0;
    return Math.min(
      0.25,
      Math.max(0.04, (result.crater_diameter_km / EARTH_RADIUS_KM) * EARTH_SCALE * 4),
    );
  }, [result.mode, result.crater_diameter_km]);

  useEffect(() => {
    if (ref.current) ref.current.scale.setScalar(scarRadius);
  }, [scarRadius]);

  useFrame(() => {
    if (!ref.current) return;
    const visible = progress > 0.65 && scarRadius > 0;
    ref.current.visible = visible;
    if (!visible) return;
    const t = Math.min(1, (progress - 0.65) / 0.1);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.85 * t;
  });

  if (scarRadius === 0) return null;
  return (
    <mesh ref={ref} position={impactPoint} quaternion={orientation}>
      <circleGeometry args={[1, 32]} />
      <meshBasicMaterial color="#1a0e08" transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ════════════════════════════════════════════════════════════
// Camera rig — slight push-in during approach + impact shake
// ════════════════════════════════════════════════════════════

function CameraRig({
  progress,
  impactPoint,
  playing,
}: {
  progress: number;
  impactPoint: [number, number, number];
  playing: boolean;
}) {
  const { camera, controls } = useThree();
  const lastShake = useRef(new THREE.Vector3());
  const tmpShake = useRef(new THREE.Vector3());
  const tmpDir = useRef(new THREE.Vector3());
  const tmpTarget = useRef(new THREE.Vector3());
  const tmpDesired = useRef(new THREE.Vector3());
  const tmpZero = useRef(new THREE.Vector3());
  // Track user interaction. `userDriving=true` while they're dragging or
  // wheel-zooming; `releaseAt` is the timestamp when interaction ended so
  // we can grant a few seconds of grace before the rig retakes the camera.
  const userDriving = useRef(false);
  const releaseAt = useRef<number | null>(null);

  useEffect(() => {
    const ctrl = controls as { addEventListener?: Function; removeEventListener?: Function } | null;
    if (!ctrl?.addEventListener) return;
    const onStart = () => {
      userDriving.current = true;
      releaseAt.current = null;
    };
    const onEnd = () => {
      userDriving.current = false;
      releaseAt.current = performance.now();
    };
    ctrl.addEventListener('start', onStart);
    ctrl.addEventListener('end', onEnd);
    return () => {
      ctrl.removeEventListener?.('start', onStart);
      ctrl.removeEventListener?.('end', onEnd);
    };
  }, [controls]);

  useFrame(({ clock }) => {
    // Step 1: undo last frame's shake offset before any other camera math.
    camera.position.sub(lastShake.current);
    lastShake.current.set(0, 0, 0);

    // Step 2: decide whether to script the camera this frame. We DON'T
    // touch the camera when:
    //   - the timeline is paused (let the user explore freely)
    //   - the user is currently dragging/zooming
    //   - the user just released within the last 4 s (grace window)
    const now = performance.now();
    const inGrace = releaseAt.current !== null && now - releaseAt.current < 4000;
    const skipDolly = !playing || userDriving.current || inGrace;

    if (!skipDolly) {
      const orb = controls as { target?: THREE.Vector3 } | null;
      // Scratch'leri kullan — kare başına Vector3 tahsisatı yok.
      const target = orb?.target ?? tmpZero.current.set(0, 0, 0);

      let desiredDistance: number;
      const desiredTarget = tmpDesired.current;

      if (progress < 0.5) {
        desiredDistance = 20;
        desiredTarget.set(0, 0, 0);
      } else if (progress < 0.7) {
        desiredDistance = 14;
        desiredTarget.set(impactPoint[0], impactPoint[1], impactPoint[2]).multiplyScalar(0.55);
      } else if (progress < 0.88) {
        desiredDistance = 12;
        desiredTarget.set(impactPoint[0], impactPoint[1], impactPoint[2]).multiplyScalar(0.6);
      } else {
        desiredDistance = 18;
        desiredTarget.set(impactPoint[0], impactPoint[1], impactPoint[2]).multiplyScalar(0.3);
      }

      tmpDir.current.copy(camera.position).sub(target).normalize();
      if (tmpDir.current.lengthSq() < 1e-6) tmpDir.current.set(0, 0.3, 1).normalize();

      tmpTarget.current.copy(target).lerp(desiredTarget, 0.06);
      const newPos = tmpDir.current.multiplyScalar(desiredDistance).add(tmpTarget.current);
      camera.position.lerp(newPos, 0.06);

      if (orb?.target) orb.target.lerp(tmpTarget.current, 0.06);
    }

    // Step 3: apply new shake (only inside impact window). Camera shake
    // happens regardless of dolly state — even if the user is exploring,
    // a violent jolt at impact reads as a real shockwave hit. Slow-mo keeps
    // this window on-screen longer, so the shake feels sustained + cinematic.
    if (progress >= 0.62 && progress <= 0.78) {
      const decay = Math.max(0, 1 - (progress - 0.62) / 0.16);
      // Şiddetli temel sarsıntı + ilk temasta (0.62–0.645) keskin tokat.
      let intensity = decay * decay * 0.36;
      if (progress < 0.645) {
        intensity += Math.max(0, 1 - (progress - 0.62) / 0.025) * 0.28;
      }
      const t = clock.elapsedTime * 55;
      tmpShake.current.set(
        Math.sin(t * 1.3) * intensity,
        Math.cos(t * 1.7) * intensity,
        Math.sin(t * 0.9) * intensity * 0.6,
      );
      camera.position.add(tmpShake.current);
      lastShake.current.copy(tmpShake.current);
    }
  });

  return null;
}
