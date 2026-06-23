'use client';

/**
 * CLIFF · "Karanlıktan Gelen" — self-running cinematic tour.
 *
 * A fully scripted, seamless-loop camera journey over the real NASA-textured
 * solar system: a black cold-open, a Sun god-ray gate, an Earth atmosphere
 * approach with rack-focus, a deep-space threat reveal (Bennu), a trajectory
 * lock and a CLIFF radar-lock payoff — then an invisible cut back to the start.
 *
 * Reuses the production 3D primitives (Earth, Sun corona, planets, real GLB
 * asteroids) and the project's restrained PostFX budget (SMAA + Bloom +
 * Vignette), layering DepthOfField + GodRays + film-grain as high-only passes.
 * Lite mode keeps the base stack at 60fps.
 *
 * Drop-in for app/sinematik/page.tsx: exports { CinematicScene, TOUR_DURATION_S }
 * and fires onCaptionChange(caption, progress, narration) every frame.
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import {
  Bloom,
  DepthOfField,
  EffectComposer,
  GodRays,
  Noise,
  SMAA,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { PlanetaryBackdrop } from '@/components/3d/PlanetaryBackdrop';
import { Asteroid } from '@/components/3d/asteroids/Asteroid';
import { Earth } from '@/components/3d/primitives/Earth';
import { Moon } from '@/components/3d/primitives/Moon';
import { StarField } from '@/components/3d/primitives/StarField';
import { useLiteMode } from '@/hooks/useLiteMode';

// ── World constants (match SolarSystemScene / asset map) ───────────────────
const SUN_POSITION: Vec3 = [-220, 28, 60];
const SUN_SCALE = 5.5;
const EARTH_SCALE = 3.6;
const SUN_DIRECTION: Vec3 = [-0.958, 0.122, 0.261];
const BENNU_SPAWN: Vec3 = [40, -6, -120];
// Deep-space → near-Earth approach lane (shots 4→6).
const BENNU_LANE: readonly Vec3[] = [
  [40, -6, -120],
  [22, -3, -64],
  [8, -1, -20],
  [6, 0, -6],
];
const START_POS: Vec3 = [0, 2, 120];
const START_LOOK: Vec3 = [0, 0, 0];
const START_FOV = 38;

type Vec3 = [number, number, number];
type FocusKind = 'stars' | 'earth' | 'bennu';
type Ease = 'linear' | 'smoothstep' | 'easeInOut' | 'easeOut';

interface Shot {
  id: string;
  dur: number;
  posTo: Vec3;
  lookAt: Vec3;
  fov: number;
  ease: Ease;
  caption: string;
  narration: string;
  focus: FocusKind;
  bloom: number;
  bokeh: number;
  grain: number;
  sunInFrame: boolean;
  selectBennu?: boolean;
}

// posFrom of each shot = posTo of the previous (continuity); shot 0 = START_POS.
const SHOTS: readonly Shot[] = [
  {
    id: '00_titles', dur: 4.5, posTo: [0, 2, 96], lookAt: [0, 0, 0], fov: 38, ease: 'easeOut',
    caption: 'CLIFF · Otonom Asteroit Tehdit İzleme',
    narration: 'Karanlıkta, kimsenin bakmadığı yerde bir tehdit yaklaşıyor. CLIFF izliyor.',
    focus: 'stars', bloom: 0.55, bokeh: 0, grain: 0, sunInFrame: false,
  },
  {
    id: '01_sun_gate', dur: 5, posTo: [-78, 22, 80], lookAt: [-160, 20, 40], fov: 50, ease: 'smoothstep',
    caption: 'Güneş Sistemi — her şeyin tanığı',
    narration: 'Milyonlarca yıldır Güneş bu dansı izledi. Ama bu kez yörüngeden bir şey çıktı.',
    focus: 'stars', bloom: 0.95, bokeh: 0, grain: 0.05, sunInFrame: true,
  },
  {
    id: '02_blue_marble', dur: 6, posTo: [18, 7, 26], lookAt: [0, 0, 0], fov: 44, ease: 'easeInOut',
    caption: 'Dünya — canlı, kırılgan, korumasız',
    narration: 'İşte savunmasız evimiz. Atmosferin ince mavi çizgisi, bizi boşluktan ayıran tek şey.',
    focus: 'earth', bloom: 0.7, bokeh: 3.5, grain: 0.05, sunInFrame: false,
  },
  {
    id: '03_terminator', dur: 5, posTo: [2, 3, 11], lookAt: [1, 0.5, 0], fov: 34, ease: 'easeInOut',
    caption: 'Atmosfer — kalkanımız, ama yetmez',
    narration: 'Atmosfer küçük kayaları yakar. Ama büyükleri için erken uyarı şarttır.',
    focus: 'earth', bloom: 0.6, bokeh: 4.5, grain: 0.06, sunInFrame: false,
  },
  {
    id: '04_threat_reveal', dur: 5.5, posTo: [10, 6, 30], lookAt: [22, -3, -64], fov: 42, ease: 'easeOut',
    caption: 'BİLİNMEYEN CİSİM · yörünge dışı',
    narration: 'Derin uzayın karanlığından, hiçbir kataloğa tam uymayan bir cisim beliriyor: Bennu.',
    focus: 'bennu', bloom: 0.6, bokeh: 5, grain: 0.08, sunInFrame: false,
  },
  {
    id: '05_trajectory', dur: 5.5, posTo: [13, 4, 14], lookAt: [8, -1, -20], fov: 45, ease: 'easeInOut',
    caption: 'ROTA HESAPLANIYOR · hedef: DÜNYA',
    narration: 'Yörünge çözüldü. Hedef belli: Dünya. Zaman artık bizim aleyhimize işliyor.',
    focus: 'bennu', bloom: 0.6, bokeh: 3, grain: 0.08, sunInFrame: false,
  },
  {
    id: '06_radar_lock', dur: 6, posTo: [6, 5, 22], lookAt: [6, 0, -6], fov: 46, ease: 'smoothstep',
    caption: 'CLIFF KİLİTLENDİ · sürekli izleme altında',
    narration: 'Ama bu kaya gözetimsiz değil. CLIFF onu kilitledi — gerçek NASA verisiyle, gece gündüz.',
    focus: 'bennu', bloom: 0.8, bokeh: 2.5, grain: 0.05, sunInFrame: false, selectBennu: true,
  },
  {
    id: '07_loop_bridge', dur: 3, posTo: [0, 2, 120], lookAt: [0, 0, 0], fov: 38, ease: 'easeInOut',
    caption: 'CLIFF · Gökyüzünü izliyoruz',
    narration: 'Binlerce kaya, tek bir nöbetçi. Tur baştan başlıyor.',
    focus: 'stars', bloom: 0.55, bokeh: 0, grain: 0, sunInFrame: false,
  },
];

const TOUR_DURATION_S = SHOTS.reduce((s, x) => s + x.dur, 0);
const SHOT_STARTS: readonly number[] = (() => {
  const out: number[] = [];
  let acc = 0;
  for (const s of SHOTS) {
    out.push(acc);
    acc += s.dur;
  }
  return out;
})();

interface CinematicSceneProps {
  /** Fires every frame: clean on-screen caption, 0..1 progress, spoken narration. */
  onCaptionChange?: (caption: string, progress: number, narration: string) => void;
}

// ── easing ─────────────────────────────────────────────────────────────────
function applyEase(t: number, ease: Ease): number {
  if (ease === 'linear') return t;
  if (ease === 'easeOut') return 1 - (1 - t) * (1 - t);
  if (ease === 'easeInOut') return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
  return t * t * (3 - 2 * t); // smoothstep
}
function lerpV(a: Vec3, b: Vec3, t: number, out: THREE.Vector3): THREE.Vector3 {
  return out.set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
}

// ── shared per-frame FX state (written by rig, read by FxModulator) ─────────
interface FxState {
  bloom: number;
  bokeh: number;
  grain: number;
  sunInFrame: boolean;
  focus: THREE.Vector3;
}

// ════════════════════════════════════════════════════════════════════════
// GodRaySun — Sun photosphere (ref'd for GodRays) + corona shells + key light
// + camera-facing anamorphic flare billboards. Replaces <Sun> so GodRays has
// a concrete source mesh (the shipped <Sun> doesn't expose its ref).
// ════════════════════════════════════════════════════════════════════════
function GodRaySun({ onMesh }: { onMesh: (m: THREE.Mesh | null) => void }) {
  const texture = useTexture('/textures/nasa/sun/sun_sdo_2k.jpg');
  texture.colorSpace = THREE.SRGBColorSpace;
  const photo = useRef<THREE.Mesh | null>(null);
  const flare = useRef<THREE.Group>(null);

  const setPhoto = useCallback(
    (m: THREE.Mesh | null) => {
      photo.current = m;
      onMesh(m);
    },
    [onMesh],
  );

  useFrame(({ camera }, dt) => {
    if (photo.current) photo.current.rotation.y += dt * 0.04;
    if (flare.current) flare.current.quaternion.copy(camera.quaternion); // billboard
  });

  return (
    <group position={SUN_POSITION}>
      <mesh ref={setPhoto} scale={SUN_SCALE}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial map={texture} toneMapped={false} color={new THREE.Color('#fff0cf')} />
      </mesh>
      {/* corona shells */}
      <mesh scale={SUN_SCALE * 1.16}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial color={new THREE.Color('#ffcf7a')} transparent opacity={0.32} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh scale={SUN_SCALE * 1.55}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial color={new THREE.Color('#ffb14d')} transparent opacity={0.12} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh scale={SUN_SCALE * 2.4}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={new THREE.Color('#ff9a3c')} transparent opacity={0.05} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* anamorphic flare — additive billboards facing the camera */}
      <group ref={flare}>
        <mesh scale={[SUN_SCALE * 11, SUN_SCALE * 0.45, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={new THREE.Color('#ffe1a8')} transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <mesh scale={SUN_SCALE * 1.5}>
          <circleGeometry args={[1, 32]} />
          <meshBasicMaterial color={new THREE.Color('#fff2cf')} transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      </group>
      <pointLight color="#ffe4b0" intensity={2.6} distance={600} decay={1.2} />
    </group>
  );
}

// ════════════════════════════════════════════════════════════════════════
// ThreatAsteroid — Bennu in a group ref the rig moves along the approach lane.
// ════════════════════════════════════════════════════════════════════════
function ThreatAsteroid({
  groupRef,
  selected,
}: {
  groupRef: React.MutableRefObject<THREE.Group | null>;
  selected: boolean;
}) {
  return (
    <group ref={groupRef} position={BENNU_SPAWN}>
      <Suspense fallback={null}>
        <Asteroid neoId="2101955" name="Bennu" hazardous position={[0, 0, 0]} scale={1.4} selected={selected} />
      </Suspense>
    </group>
  );
}

// "others under watch" — a few distant procedural rocks drifting behind.
function NeoSwarm() {
  const spots = useMemo<Vec3[]>(() => [
    [-34, 10, -88],
    [48, -16, -96],
    [14, 22, -110],
  ], []);
  return (
    <>
      {spots.map((p, i) => (
        <Suspense key={i} fallback={null}>
          <Asteroid neoId={`swarm-${i}`} position={p} scale={0.8 + i * 0.25} dimmed />
        </Suspense>
      ))}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════
// CameraRig — the scripted keyframe camera. One useFrame drives everything.
// ════════════════════════════════════════════════════════════════════════
function CameraRig({
  onCaptionChange,
  fxRef,
  asteroidGroupRef,
  setSelected,
}: {
  onCaptionChange?: CinematicSceneProps['onCaptionChange'];
  fxRef: React.MutableRefObject<FxState>;
  asteroidGroupRef: React.MutableRefObject<THREE.Group | null>;
  setSelected: (v: boolean) => void;
}) {
  const { camera } = useThree();
  const startTime = useRef<number | null>(null);
  const lastSelected = useRef(false);
  const tmpPos = useRef(new THREE.Vector3());
  const tmpLook = useRef(new THREE.Vector3());
  const tmpFocus = useRef(new THREE.Vector3());
  const laneFrom = useRef(new THREE.Vector3());
  const laneTo = useRef(new THREE.Vector3());

  useFrame(({ clock }) => {
    if (startTime.current == null) startTime.current = clock.elapsedTime;
    const elapsed = (clock.elapsedTime - startTime.current) % TOUR_DURATION_S;

    // active shot
    let idx = SHOTS.length - 1;
    for (let i = 0; i < SHOTS.length; i += 1) {
      const start = SHOT_STARTS[i]!;
      const dur = SHOTS[i]!.dur;
      if (elapsed >= start && elapsed < start + dur) {
        idx = i;
        break;
      }
    }
    const shot = SHOTS[idx]!;
    const prev = idx === 0 ? null : SHOTS[idx - 1]!;
    const segT = Math.min(1, (elapsed - SHOT_STARTS[idx]!) / shot.dur);
    const e = applyEase(segT, shot.ease);

    // position (from = prev.posTo, continuous)
    const posFrom = prev ? prev.posTo : START_POS;
    lerpV(posFrom, shot.posTo, e, tmpPos.current);
    camera.position.copy(tmpPos.current);

    // lookAt (from = prev.lookAt)
    const lookFrom = prev ? prev.lookAt : START_LOOK;
    lerpV(lookFrom, shot.lookAt, e, tmpLook.current);

    // fov (from = prev.fov)
    const fovFrom = prev ? prev.fov : START_FOV;
    const fov = fovFrom + (shot.fov - fovFrom) * e;
    const cam = camera as THREE.PerspectiveCamera;
    if (Math.abs(cam.fov - fov) > 0.001) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    camera.lookAt(tmpLook.current);

    // Bennu approach lane (shots 4..6); on the loop bridge (shot 7) glide the
    // locked rock smoothly back out to spawn so it never teleports; otherwise
    // parked off-frame at spawn.
    const grp = asteroidGroupRef.current;
    if (grp) {
      if (idx >= 4 && idx <= 7) {
        if (idx <= 6) {
          const li = idx - 4;
          laneFrom.current.set(...BENNU_LANE[li]!);
          laneTo.current.set(...BENNU_LANE[li + 1]!);
        } else {
          // shot 7: retreat from the radar-lock pose back to deep-space spawn
          laneFrom.current.set(...BENNU_LANE[3]!);
          laneTo.current.set(...BENNU_SPAWN);
        }
        grp.position.lerpVectors(laneFrom.current, laneTo.current, e);
      } else {
        grp.position.set(...BENNU_SPAWN);
      }
    }

    // FX modulation targets
    const fx = fxRef.current;
    const bloomFrom = prev ? prev.bloom : shot.bloom;
    const grainFrom = prev ? prev.grain : shot.grain;
    fx.bloom = bloomFrom + (shot.bloom - bloomFrom) * e;
    fx.grain = grainFrom + (shot.grain - grainFrom) * e;
    fx.bokeh = shot.bokeh;
    fx.sunInFrame = shot.sunInFrame;

    // DoF focus point
    if (shot.focus === 'bennu' && grp) {
      grp.getWorldPosition(tmpFocus.current);
    } else if (shot.focus === 'earth') {
      tmpFocus.current.set(0, 0, 0);
    } else {
      tmpFocus.current.set(0, 0, 0); // stars → bokeh is 0 so focus is irrelevant
    }
    fx.focus.copy(tmpFocus.current);

    // radar-lock selection (toggles once per shot crossing, not per frame)
    const wantSelected = !!shot.selectBennu;
    if (wantSelected !== lastSelected.current) {
      lastSelected.current = wantSelected;
      setSelected(wantSelected);
    }

    onCaptionChange?.(shot.caption, elapsed / TOUR_DURATION_S, shot.narration);
  });

  return null;
}

// ════════════════════════════════════════════════════════════════════════
// FxModulator — mutates effect uniforms each frame (never re-mounts composer).
// ════════════════════════════════════════════════════════════════════════
function FxModulator({
  fxRef,
  bloomRef,
  dofRef,
  noiseRef,
  highMode,
}: {
  fxRef: React.MutableRefObject<FxState>;
  bloomRef: React.MutableRefObject<any>;
  dofRef: React.MutableRefObject<any>;
  noiseRef: React.MutableRefObject<any>;
  highMode: boolean;
}) {
  useFrame(() => {
    const fx = fxRef.current;
    if (bloomRef.current) bloomRef.current.intensity = fx.bloom;
    if (highMode && dofRef.current) {
      const dof = dofRef.current;
      if (dof.target?.copy) dof.target.copy(fx.focus);
      if ('bokehScale' in dof) dof.bokehScale = fx.bokeh;
    }
    if (highMode && noiseRef.current?.blendMode?.opacity) {
      noiseRef.current.blendMode.opacity.value = fx.grain;
    }
  });
  return null;
}

// ════════════════════════════════════════════════════════════════════════
export function CinematicScene({ onCaptionChange }: CinematicSceneProps) {
  const lite = useLiteMode();
  const high = !lite;
  const quality: 'low' | 'medium' | 'high' = high ? 'high' : 'medium';
  const dpr: [number, number] = lite ? [1, 1] : [1, 2];
  const starCount = lite ? 6000 : 18000;

  const fxRef = useRef<FxState>({ bloom: 0.55, bokeh: 0, grain: 0, sunInFrame: false, focus: new THREE.Vector3() });
  const asteroidGroupRef = useRef<THREE.Group | null>(null);
  const bloomRef = useRef<any>(null);
  const dofRef = useRef<any>(null);
  const noiseRef = useRef<any>(null);

  const [sunMesh, setSunMesh] = useState<THREE.Mesh | null>(null);
  const [selected, setSelected] = useState(false);

  return (
    <Canvas
      shadows={false}
      dpr={dpr}
      gl={{
        antialias: !lite,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{ position: START_POS, near: 0.1, far: 4000, fov: START_FOV }}
      onCreated={({ scene, gl }) => {
        scene.background = new THREE.Color(0x000000);
        gl.setClearColor(0x000000, 1);
      }}
    >
      {/* lighting rig (matches SolarSystemScene) */}
      <ambientLight intensity={0.1} />
      <hemisphereLight args={['#101725', '#000000', 0.06]} />
      <directionalLight position={[-200, 26, 56]} intensity={2.4} color="#fff3da" castShadow={false} />

      <StarField count={starCount} radius={600} />

      <Suspense fallback={null}>
        <GodRaySun onMesh={setSunMesh} />
      </Suspense>
      <Suspense fallback={null}>
        <PlanetaryBackdrop quality={quality} />
      </Suspense>
      <Suspense fallback={null}>
        <Earth position={[0, 0, 0]} scale={EARTH_SCALE} rotationSpeed={0.04} sunDirection={SUN_DIRECTION} />
      </Suspense>
      <Moon parentPosition={[0, 0, 0]} orbitRadius={6.4} scale={0.65} speed={0.2} />

      <ThreatAsteroid groupRef={asteroidGroupRef} selected={selected} />
      <NeoSwarm />

      <CameraRig
        onCaptionChange={onCaptionChange}
        fxRef={fxRef}
        asteroidGroupRef={asteroidGroupRef}
        setSelected={setSelected}
      />
      <FxModulator fxRef={fxRef} bloomRef={bloomRef} dofRef={dofRef} noiseRef={noiseRef} highMode={high} />

      <EffectComposer multisampling={0} enableNormalPass={false}>
        <SMAA />
        <Bloom
          ref={bloomRef}
          intensity={0.7}
          luminanceThreshold={0.62}
          luminanceSmoothing={0.28}
          kernelSize={high ? KernelSize.LARGE : KernelSize.MEDIUM}
          mipmapBlur
        />
        {high && sunMesh ? (
          <GodRays
            sun={sunMesh}
            samples={60}
            density={0.92}
            decay={0.93}
            weight={0.5}
            exposure={0.34}
            blur
            kernelSize={KernelSize.SMALL}
          />
        ) : (
          <></>
        )}
        {high ? (
          <DepthOfField ref={dofRef} target={[0, 0, 0]} focalLength={0.02} bokehScale={3} />
        ) : (
          <></>
        )}
        {high ? (
          <Noise ref={noiseRef} premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.05} />
        ) : (
          <></>
        )}
        <Vignette eskil={false} offset={0.2} darkness={0.62} blendFunction={BlendFunction.NORMAL} />
      </EffectComposer>
    </Canvas>
  );
}

export { TOUR_DURATION_S };
