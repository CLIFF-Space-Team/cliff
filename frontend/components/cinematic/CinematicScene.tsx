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
  Noise,
  SMAA,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import { Suspense, useMemo, useRef, useState } from 'react';
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
// Impact point on Earth's near surface (front-right, facing the camera).
const IMPACT_POINT: Vec3 = [2.6, 0.7, 2.2];
// Deep-space → Earth COLLISION lane (shots 4→7). Final point = contact.
const BENNU_LANE: readonly Vec3[] = [
  [40, -6, -120], // spawn (shot 4 start)
  [20, -3, -56], // shot 4 end
  [10, -1, -20], // shot 5 end
  [5.5, 0.4, 5], // shot 6 end — just above Earth, front
  [2.6, 0.7, 2.2], // shot 7 end = IMPACT (contact)
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
    id: '06_final_approach', dur: 4.5, posTo: [11, 3, 22], lookAt: [4, 0, -4], fov: 48, ease: 'smoothstep',
    caption: 'ÇARPMA ROTASI · kaçınılmaz',
    narration: 'Çok geç kalındı. Kaya atmosfere giriyor — hızı saniyede onlarca kilometre.',
    focus: 'bennu', bloom: 0.6, bokeh: 1.6, grain: 0.08, sunInFrame: false,
  },
  {
    id: '07_impact', dur: 3, posTo: [7, 2.5, 13], lookAt: [2.6, 0.7, 2.2], fov: 40, ease: 'easeOut',
    caption: 'ÇARPMA — kinetik enerji boşalıyor',
    narration: 'Çarpışma! Bir anda milyonlarca yıllık enerji açığa çıkıyor.',
    focus: 'bennu', bloom: 0.9, bokeh: 1, grain: 0.1, sunInFrame: false,
  },
  {
    id: '08_aftermath', dur: 5, posTo: [0, 2, 120], lookAt: [0, 0, 0], fov: 38, ease: 'easeInOut',
    caption: 'İşte bu yüzden izliyoruz — CLIFF',
    narration: 'Erken uyarı her şeyi değiştirir. CLIFF gökyüzünü izlemeye devam ediyor.',
    focus: 'stars', bloom: 0.6, bokeh: 0, grain: 0.04, sunInFrame: false,
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
  /** 0..1 — how centered the Sun is in view (gates the soft glow). */
  onAxis: number;
  /** Impact finale: white flash (sharp), shockwave-ring progress, molten glow. */
  impact: number;
  shock: number;
  glow: number;
  focus: THREE.Vector3;
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// Soft radial-falloff glow sprite, generated once (module cache survives
// StrictMode double-mount). Replaces the old hard additive bar/disc.
let _glowTex: THREE.CanvasTexture | null = null;
function getSoftGlowTexture(): THREE.CanvasTexture {
  if (_glowTex) return _glowTex;
  const size = 128;
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, 'rgba(255,247,222,1)');
  g.addColorStop(0.25, 'rgba(255,225,168,0.5)');
  g.addColorStop(0.6, 'rgba(255,180,90,0.12)');
  g.addColorStop(1.0, 'rgba(255,160,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  _glowTex = tex;
  return tex;
}

const SUN_WORLD = new THREE.Vector3(...SUN_POSITION);
const CORONA: readonly { base: number; op: number; color: string; seg: number }[] = [
  { base: SUN_SCALE * 1.16, op: 0.32, color: '#ffcf7a', seg: 48 },
  { base: SUN_SCALE * 1.55, op: 0.12, color: '#ffb14d', seg: 48 },
  { base: SUN_SCALE * 2.4, op: 0.05, color: '#ff9a3c', seg: 32 },
];

// ════════════════════════════════════════════════════════════════════════
// GodRaySun — real-star Sun: textured photosphere (ref'd for GodRays) + a
// slowly BREATHING layered corona + a single soft, screen-facing glow that
// fades with how on-axis the Sun is. No swinging 60-unit billboard bar. Writes
// an `onAxis` scalar to fxRef so GodRays only fires when the Sun is on screen.
// ════════════════════════════════════════════════════════════════════════
function GodRaySun({ fxRef }: { fxRef: React.MutableRefObject<FxState> }) {
  const texture = useTexture('/textures/nasa/sun/sun_sdo_2k.jpg');
  texture.colorSpace = THREE.SRGBColorSpace;
  const glowTex = useMemo(getSoftGlowTexture, []);
  const photo = useRef<THREE.Mesh>(null);
  const gran = useRef<THREE.Mesh>(null);
  const c0 = useRef<THREE.Mesh>(null);
  const c1 = useRef<THREE.Mesh>(null);
  const c2 = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);
  const fwd = useRef(new THREE.Vector3());
  const toSun = useRef(new THREE.Vector3());

  useFrame(({ camera, clock }, dt) => {
    const t = clock.elapsedTime;
    if (photo.current) photo.current.rotation.y += dt * 0.035;
    if (gran.current) gran.current.rotation.y -= dt * 0.022; // counter-roil

    // Corona breathing — shared slow phase, mutate scale + opacity (no alloc).
    const b = Math.sin(t * 0.35);
    const shells = [c0.current, c1.current, c2.current];
    for (let i = 0; i < 3; i += 1) {
      const m = shells[i];
      const cfg = CORONA[i]!;
      if (!m) continue;
      m.scale.setScalar(cfg.base * (1 + 0.03 * b));
      (m.material as THREE.MeshBasicMaterial).opacity = cfg.op * (1 + 0.18 * b);
    }

    // On-axis factor: how centered the Sun is → drives the soft glow + GodRays.
    camera.getWorldDirection(fwd.current);
    toSun.current.copy(SUN_WORLD).sub(camera.position).normalize();
    const onAxis = smoothstep(0.4, 0.95, fwd.current.dot(toSun.current));
    fxRef.current.onAxis = onAxis;

    if (glow.current) {
      glow.current.quaternion.copy(camera.quaternion); // face camera (radial → no swing)
      (glow.current.material as THREE.MeshBasicMaterial).opacity = onAxis * 0.7;
    }
  });

  return (
    <group position={SUN_POSITION}>
      <mesh ref={photo} scale={SUN_SCALE}>
        <sphereGeometry args={[1, 96, 96]} />
        <meshBasicMaterial map={texture} toneMapped={false} color={new THREE.Color('#fff2d6')} />
      </mesh>
      {/* counter-rotating granulation shell — the same photosphere texture
          drifting the other way reads as roiling plasma (real-Sun surface life). */}
      <mesh ref={gran} scale={SUN_SCALE * 1.008}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial map={texture} toneMapped={false} color={new THREE.Color('#ff9d3c')} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={c0} scale={CORONA[0]!.base}>
        <sphereGeometry args={[1, CORONA[0]!.seg, CORONA[0]!.seg]} />
        <meshBasicMaterial color={new THREE.Color(CORONA[0]!.color)} transparent opacity={CORONA[0]!.op} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={c1} scale={CORONA[1]!.base}>
        <sphereGeometry args={[1, CORONA[1]!.seg, CORONA[1]!.seg]} />
        <meshBasicMaterial color={new THREE.Color(CORONA[1]!.color)} transparent opacity={CORONA[1]!.op} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={c2} scale={CORONA[2]!.base}>
        <sphereGeometry args={[1, CORONA[2]!.seg, CORONA[2]!.seg]} />
        <meshBasicMaterial color={new THREE.Color(CORONA[2]!.color)} transparent opacity={CORONA[2]!.op} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* single soft screen-facing glow — fades fully out as the Sun leaves frame */}
      <mesh ref={glow} scale={SUN_SCALE * 3}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glowTex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
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
// ImpactFx — the collision finale: a white flash, an expanding surface
// shockwave ring, and a molten glow, all at IMPACT_POINT, driven by fxRef.
// ════════════════════════════════════════════════════════════════════════
function ImpactFx({ fxRef }: { fxRef: React.MutableRefObject<FxState> }) {
  const flash = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);
  const orient = useMemo(() => {
    const n = new THREE.Vector3(...IMPACT_POINT).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  }, []);

  useFrame(() => {
    const fx = fxRef.current;
    if (flash.current) {
      flash.current.visible = fx.impact > 0.01;
      flash.current.scale.setScalar(0.4 + fx.impact * 5);
      (flash.current.material as THREE.MeshBasicMaterial).opacity = fx.impact;
    }
    if (ring.current) {
      const s = fx.shock;
      ring.current.visible = s > 0.001 && s < 0.999;
      ring.current.scale.setScalar(0.2 + s * 7);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.75 * (1 - s));
    }
    if (glow.current) {
      glow.current.visible = fx.glow > 0.01;
      glow.current.scale.setScalar(1.4 + (1 - fx.glow) * 0.9); // spreads as it cools
      (glow.current.material as THREE.MeshBasicMaterial).opacity = fx.glow * 0.85;
    }
  });

  return (
    <group position={IMPACT_POINT}>
      <mesh ref={flash}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color="#fff6e0" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh ref={glow} quaternion={orient}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial color="#ff5a1e" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh ref={ring} quaternion={orient}>
        <ringGeometry args={[0.82, 1, 64]} />
        <meshBasicMaterial color="#ffd27a" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
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

    // Bennu collision lane: shots 4..7 ride 4 segments ending at IMPACT_POINT;
    // shot 8 it is vaporised (scale 0); otherwise parked off-frame at spawn.
    const grp = asteroidGroupRef.current;
    if (grp) {
      if (idx >= 4 && idx <= 7) {
        const li = idx - 4; // 0..3 → lane segment li → li+1 (last = contact)
        laneFrom.current.set(...BENNU_LANE[li]!);
        laneTo.current.set(...BENNU_LANE[li + 1]!);
        grp.position.lerpVectors(laneFrom.current, laneTo.current, e);
        grp.scale.setScalar(1);
      } else if (idx === 8) {
        grp.scale.setScalar(0); // vaporised on impact
      } else {
        grp.position.set(...BENNU_SPAWN);
        grp.scale.setScalar(1);
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
      // Focus on the Earth surface facing the camera (NOT the centre behind it)
      // so the visible globe stays sharp — only the background bokehs.
      tmpFocus.current.copy(camera.position).normalize().multiplyScalar(EARTH_SCALE);
    } else {
      tmpFocus.current.set(0, 0, 0); // stars → bokeh is 0 so focus is irrelevant
    }
    fx.focus.copy(tmpFocus.current);

    // Impact finale — contact at the end of shot 7. Flash (sharp), expanding
    // shockwave ring, and a molten glow that lingers as the camera pulls back.
    const impactT = SHOT_STARTS[7]! + SHOTS[7]!.dur;
    const di = elapsed - impactT;
    fx.impact = di >= -0.08 && di < 1.4 ? (di < 0 ? 1 + di / 0.08 : Math.max(0, 1 - di / 1.4)) : 0;
    fx.shock = di >= 0 && di < 2.6 ? di / 2.6 : 0;
    fx.glow = di >= 0 ? Math.max(0, 1 - di / 4.8) : 0;
    if (fx.impact > 0.01) {
      const s = fx.impact * 0.7; // camera shake on contact
      camera.position.x += Math.sin(elapsed * 97) * s;
      camera.position.y += Math.cos(elapsed * 83) * s;
      camera.position.z += Math.sin(elapsed * 71) * s * 0.5;
    }

    // selection toggle (kept for the asteroid API; no shot sets it now)
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
      // 0.45× — the raw per-shot bokeh read far too blurry; keep DoF as a gentle
      // background softening, not a full wash.
      if ('bokehScale' in dof) dof.bokehScale = fx.bokeh * 0.45;
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
  const dpr: [number, number] = lite ? [1, 1] : [1, 1.75];
  const starCount = lite ? 6000 : 18000;

  const fxRef = useRef<FxState>({ bloom: 0.55, bokeh: 0, grain: 0, sunInFrame: false, onAxis: 0, impact: 0, shock: 0, glow: 0, focus: new THREE.Vector3() });
  const asteroidGroupRef = useRef<THREE.Group | null>(null);
  const bloomRef = useRef<any>(null);
  const dofRef = useRef<any>(null);
  const noiseRef = useRef<any>(null);

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
        <GodRaySun fxRef={fxRef} />
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
      <ImpactFx fxRef={fxRef} />

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
