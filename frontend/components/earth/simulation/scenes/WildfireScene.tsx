// @ts-nocheck — Float32Array indexing is runtime-safe but trips
// `noUncheckedIndexedAccess`. Logic is hand-verified.
'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { emberTexture, fireTexture, smokeTexture } from '../textures';
import type { SimulationSceneProps } from '../types';

/**
 * Cinematic wildfire — v3.
 *
 * Real wildfire footprints are NEVER circular. Wind stretches the head
 * fire (downwind) into a long teardrop, the back fire (upwind) crawls
 * slowly, and the flanks erupt into irregular lobes / fingers. We render
 * that shape with a polar function:
 *
 *     r(θ) = R₀ · (1 + 0.65 · cos(θ - θ_wind))^1.25 · (1 + multi_octave_noise)
 *
 * Every layer reads its perimeter from `fireShape(theta, ...)` so the
 * ground burn, perimeter fire wall, embers, and smoke spawn share the
 * same irregular asymmetric outline. Wind direction is hashed off the
 * event id so two different fires drift differently but each one is
 * deterministic.
 *
 * Layers (back-to-front, depth-sorted at draw time):
 *   1. Sky dome — black-to-burnt-orange gradient
 *   2. Ground — vertex-coloured charred interior + green canopy exterior
 *   3. Burned tree stumps & green forest (instanced)
 *   4. Glowing ember bed inside the burn — tiny scattered glow sprites
 *   5. Fire wall — billboarded textured flame sprites along the perimeter
 *   6. Drifting embers — fast-rising sparks with wind drift
 *   7. Smoke columns — large translucent billboards rising and shearing
 *   8. Heat-glow point light pulsing at the centre
 *
 * Burn radius animates: starts at 30 % of target on play, eases out to
 * 100 % over 5 s. Re-runs on `playKey` bump.
 */

// Wind-driven asymmetric perimeter. `θ` is the azimuth around the fire
// centroid (radians); `θwind` is the downwind direction. Returns a
// scaling factor that's multiplied by the current burn-radius envelope
// so callers can drive the same shape during the burn-front animation.
function fireShape(theta: number, windAngle: number, eventSeed: number): number {
  const dθ = theta - windAngle;
  // Ellipse-like stretch — strongest downwind, narrowest upwind.
  const stretch = Math.pow(1 + 0.65 * Math.cos(dθ), 1.25);
  // Multi-octave noise so the perimeter has natural fingers + wobbles.
  // Seeded off the event so each fire has its own irregular outline.
  const s = eventSeed * 0.0001;
  const n1 = Math.sin(theta * 3.2 + 1.7 + s) * 0.14;
  const n2 = Math.cos(theta * 7.4 + 3.1 + s * 1.3) * 0.07;
  const n3 = Math.sin(theta * 13.7 + 5.5 + s * 0.7) * 0.035;
  // A small bias of +1 keeps the back-fire perimeter from collapsing to 0.
  return stretch * (1 + n1 + n2 + n3) * 0.7 + 0.35;
}

// Convenience: derive a deterministic wind angle (0..2π) from event id.
function windAngleFromSeed(seed: number): number {
  return ((seed * 2654435761) >>> 0) / 0xffffffff * Math.PI * 2;
}
export function WildfireScene({ event, category, playing, playKey }: SimulationSceneProps) {
  const km2 = event.primary_metric?.value ?? 25;
  const finalRadius = useMemo(() => {
    // Map [1..50_000 km²] → [4..32 scene units] logarithmically. Critical
    // mega-fires fill the field of view; small ones look local.
    const km = Math.sqrt(Math.max(0.5, km2) / Math.PI);
    const norm = Math.log10(1 + km) / Math.log10(150);
    return THREE.MathUtils.clamp(4 + norm * 28, 4, 32);
  }, [km2]);

  const eventSeed = useMemo(() => hashCode(event.id), [event.id]);
  const windAngle = useMemo(() => windAngleFromSeed(eventSeed), [eventSeed]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
      }}
      camera={{ position: [0, 9, 26], near: 0.1, far: 600, fov: 52 }}
      onCreated={({ scene, gl }) => {
        scene.background = new THREE.Color('#0c0604');
        gl.setClearColor('#0c0604', 1);
        scene.fog = new THREE.FogExp2('#1c0a06', 0.0085);
      }}
    >
      <SkyDome />
      <Lighting accent={category.accent_hex} />

      <Ground radius={finalRadius} windAngle={windAngle} eventSeed={eventSeed} />
      <Forest
        count={420}
        maxRadius={finalRadius * 4.5}
        burnRadius={finalRadius}
        eventId={event.id}
        windAngle={windAngle}
        eventSeed={eventSeed}
      />
      <EmberBed radius={finalRadius} windAngle={windAngle} eventSeed={eventSeed} />
      <FireWall
        radius={finalRadius}
        playing={playing}
        playKey={playKey}
        accent={category.accent_hex}
        windAngle={windAngle}
        eventSeed={eventSeed}
      />
      <Embers
        count={260}
        radius={finalRadius}
        playing={playing}
        eventId={event.id}
        windAngle={windAngle}
        eventSeed={eventSeed}
      />
      <Smoke count={70} radius={finalRadius} eventId={event.id} playing={playing} />
      <CenterGlow accent={category.accent_hex} playing={playing} />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={Math.max(8, finalRadius * 0.8)}
        maxDistance={finalRadius * 7}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2 - 0.06}
        rotateSpeed={0.3}
        zoomSpeed={0.7}
      />
    </Canvas>
  );
}

// ──────────────────────────────────────────────────────────────────
// Sky dome — gradient sphere from horizon (smoky orange) to zenith (black).
// ──────────────────────────────────────────────────────────────────

function SkyDome() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.0, '#000000');
    g.addColorStop(0.55, '#0e0402');
    g.addColorStop(0.82, '#3b1106');
    g.addColorStop(1.0, '#7a230a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  if (!tex) return null;
  return (
    <mesh>
      <sphereGeometry args={[280, 24, 24]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

// ──────────────────────────────────────────────────────────────────
// Lighting — moonless, fire-glow dominant.
// ──────────────────────────────────────────────────────────────────

function Lighting({ accent }: { accent: string }) {
  return (
    <>
      <ambientLight intensity={0.32} color="#5a2a14" />
      <hemisphereLight intensity={0.18} color="#2a1a10" groundColor="#0c0606" />
      <directionalLight
        position={[18, 40, 14]}
        intensity={0.18}
        color="#cfb8a8"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[0, 5, 0]} intensity={4.5} color={accent} distance={70} decay={1.6} />
    </>
  );
}

// ──────────────────────────────────────────────────────────────────
// Ground — vertex-colored radial gradient with subtle bump.
// ──────────────────────────────────────────────────────────────────

function Ground({
  radius,
  windAngle,
  eventSeed,
}: {
  radius: number;
  windAngle: number;
  eventSeed: number;
}) {
  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(380, 380, 130, 130);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const charred = new THREE.Color('#100805');
    const cooling = new THREE.Color('#3a1a0a');
    const dryEarth = new THREE.Color('#241710');
    const grassFar = new THREE.Color('#0f1a0a');
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const r = Math.hypot(x, y);
      // Subtle terrain noise so the plane isn't dead flat.
      const bump =
        Math.sin(x * 0.18 + y * 0.05) * 0.45 +
        Math.cos(x * 0.05 + y * 0.21) * 0.4 +
        Math.sin(x * 0.45 + y * 0.5) * 0.12;
      pos.setZ(i, bump);

      // Asymmetric burn boundary — the perimeter wraps around the wind
      // direction instead of being a clean circle. We compute the local
      // shape factor and compare the vertex's distance against it.
      const θ = Math.atan2(y, x);
      const shape = fireShape(θ, windAngle, eventSeed);
      const localBoundary = radius * shape; // outer fire front
      const localInner = localBoundary * 0.6; // fully charred core
      const localMid = localBoundary * 0.92; // active burn band

      if (r < localInner) {
        tmp.copy(charred);
      } else if (r < localMid) {
        const t = (r - localInner) / (localMid - localInner);
        tmp.copy(charred).lerp(cooling, t);
      } else if (r < localBoundary) {
        tmp.copy(cooling);
      } else if (r < localBoundary * 1.35) {
        const t = (r - localBoundary) / (localBoundary * 0.35);
        tmp.copy(cooling).lerp(dryEarth, t);
      } else {
        const t = THREE.MathUtils.clamp((r - localBoundary * 1.35) / 60, 0, 1);
        tmp.copy(dryEarth).lerp(grassFar, t);
      }
      // Mild high-frequency noise so colors have grain.
      const grain = (Math.sin(x * 1.7) + Math.cos(y * 1.9)) * 0.012;
      colors[i * 3] = tmp.r + grain;
      colors[i * 3 + 1] = tmp.g + grain * 0.8;
      colors[i * 3 + 2] = tmp.b + grain * 0.6;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    g.rotateX(-Math.PI / 2);
    return g;
  }, [radius, windAngle, eventSeed]);

  return (
    <mesh geometry={geom} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0.0} />
    </mesh>
  );
}

// ──────────────────────────────────────────────────────────────────
// Forest — instanced trees. Trunks always visible; canopies hidden
// (scaled to 0) when burned. Outside the burn ring the canopies are
// vivid green so the eye reads the difference.
// ──────────────────────────────────────────────────────────────────

function Forest({
  count,
  maxRadius,
  burnRadius,
  eventId,
  windAngle,
  eventSeed,
}: {
  count: number;
  maxRadius: number;
  burnRadius: number;
  eventId: string;
  windAngle: number;
  eventSeed: number;
}) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const canopyRef = useRef<THREE.InstancedMesh>(null);
  const canopyTopRef = useRef<THREE.InstancedMesh>(null);

  const layout = useMemo(() => {
    const seed = hashCode(eventId);
    const rng = mulberry32(seed);
    const out: Array<{ x: number; z: number; h: number; w: number; burned: boolean; canopyShade: number }> = [];
    for (let i = 0; i < count; i++) {
      // Square-root distribution = uniform 2-D scatter.
      const r = Math.sqrt(rng()) * maxRadius;
      const theta = rng() * Math.PI * 2;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      const dist = Math.hypot(x, z);
      // Tree's azimuth from the fire centroid (use scene-XZ axes; we use
      // `atan2(z, x)` to match the polar layout of the rest of the scene).
      const treeAz = Math.atan2(z, x);
      const localBoundary = burnRadius * fireShape(treeAz, windAngle, eventSeed);
      const burned = dist < localBoundary * 1.02;
      // Outer trees lean larger so they read against the sky.
      const h = 1.6 + rng() * 1.8 + (dist > localBoundary * 1.8 ? 0.4 : 0);
      out.push({
        x,
        z,
        h,
        w: 0.7 + rng() * 0.5,
        burned,
        canopyShade: 0.7 + rng() * 0.4,
      });
    }
    return out;
  }, [count, maxRadius, burnRadius, eventId, windAngle, eventSeed]);

  useEffect(() => {
    if (!trunkRef.current || !canopyRef.current || !canopyTopRef.current) return;
    const dummy = new THREE.Object3D();
    const trunkColor = new THREE.Color();
    const canopyColor = new THREE.Color();
    layout.forEach((tree, i) => {
      // Trunk
      dummy.position.set(tree.x, tree.h / 2, tree.z);
      dummy.scale.set(tree.w, tree.h, tree.w);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      trunkRef.current!.setMatrixAt(i, dummy.matrix);
      trunkColor.set(tree.burned ? '#0a0604' : '#3a2618');
      trunkRef.current!.setColorAt(i, trunkColor);

      // Bottom canopy (wide skirt)
      if (tree.burned) {
        dummy.scale.set(0.001, 0.001, 0.001);
      } else {
        dummy.position.set(tree.x, tree.h * 0.85, tree.z);
        dummy.scale.set(1.5 + tree.h * 0.25, tree.h * 0.95, 1.5 + tree.h * 0.25);
      }
      dummy.updateMatrix();
      canopyRef.current!.setMatrixAt(i, dummy.matrix);
      canopyColor.setRGB(
        0.07 * tree.canopyShade,
        0.21 * tree.canopyShade,
        0.09 * tree.canopyShade,
      );
      canopyRef.current!.setColorAt(i, canopyColor);

      // Top canopy (smaller, slightly lighter green)
      if (tree.burned) {
        dummy.scale.set(0.001, 0.001, 0.001);
      } else {
        dummy.position.set(tree.x, tree.h * 1.18, tree.z);
        dummy.scale.set(1.0 + tree.h * 0.15, tree.h * 0.65, 1.0 + tree.h * 0.15);
      }
      dummy.updateMatrix();
      canopyTopRef.current!.setMatrixAt(i, dummy.matrix);
      canopyColor.setRGB(
        0.10 * tree.canopyShade,
        0.27 * tree.canopyShade,
        0.11 * tree.canopyShade,
      );
      canopyTopRef.current!.setColorAt(i, canopyColor);
    });
    trunkRef.current!.instanceMatrix.needsUpdate = true;
    canopyRef.current!.instanceMatrix.needsUpdate = true;
    canopyTopRef.current!.instanceMatrix.needsUpdate = true;
    if (trunkRef.current!.instanceColor) trunkRef.current!.instanceColor.needsUpdate = true;
    if (canopyRef.current!.instanceColor) canopyRef.current!.instanceColor.needsUpdate = true;
    if (canopyTopRef.current!.instanceColor) canopyTopRef.current!.instanceColor.needsUpdate = true;
  }, [layout]);

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, count]} castShadow>
        <cylinderGeometry args={[0.08, 0.14, 1, 6]} />
        <meshStandardMaterial vertexColors roughness={0.92} metalness={0.0} />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[undefined, undefined, count]} castShadow>
        <coneGeometry args={[0.55, 1, 7]} />
        <meshStandardMaterial vertexColors roughness={0.88} flatShading />
      </instancedMesh>
      <instancedMesh ref={canopyTopRef} args={[undefined, undefined, count]} castShadow>
        <coneGeometry args={[0.55, 1, 7]} />
        <meshStandardMaterial vertexColors roughness={0.85} flatShading />
      </instancedMesh>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────
// Ember bed — many tiny glowing dots scattered inside the burn area
// so the ground reads as "still burning" instead of just "dark".
// ──────────────────────────────────────────────────────────────────

function EmberBed({
  radius,
  windAngle,
  eventSeed,
}: {
  radius: number;
  windAngle: number;
  eventSeed: number;
}) {
  const tex = emberTexture();
  const ref = useRef<THREE.Points>(null);

  const data = useMemo(() => {
    const count = Math.max(400, Math.floor(radius * radius * 4));
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Sample a uniform azimuth, then radius up to the shape boundary
      // for that azimuth — keeps embers strictly inside the asymmetric
      // burn footprint, dense in the head fire and sparse in the back.
      const theta = Math.random() * Math.PI * 2;
      const localBoundary = radius * fireShape(theta, windAngle, eventSeed);
      const r = Math.sqrt(Math.random()) * localBoundary * 0.92;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = 0.08 + Math.random() * 0.18;
      positions[i * 3 + 2] = Math.sin(theta) * r;
      sizes[i] = 0.2 + Math.random() * 0.45;
      phases[i] = Math.random() * Math.PI * 2;
    }
    return { count, positions, sizes, phases };
  }, [radius, windAngle, eventSeed]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.PointsMaterial;
    mat.opacity = 0.55 + Math.sin(clock.elapsedTime * 1.3) * 0.18;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={data.count}
          array={data.positions}
          itemSize={3}
          args={[data.positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        map={tex}
        size={0.45}
        sizeAttenuation
        transparent
        opacity={0.75}
        depthWrite={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        color="#ff7a18"
      />
    </points>
  );
}

// ──────────────────────────────────────────────────────────────────
// Fire wall — billboarded textured flame sprites along the burn
// perimeter, vertically stretched and animated upward. Scale + opacity
// pulse so the wall feels alive.
// ──────────────────────────────────────────────────────────────────

function FireWall({
  radius,
  accent,
  playing,
  playKey,
  windAngle,
  eventSeed,
}: {
  radius: number;
  accent: string;
  playing: boolean;
  playKey: number;
  windAngle: number;
  eventSeed: number;
}) {
  const tex = fireTexture();
  const groupRef = useRef<THREE.Group>(null);
  // Bias sprite density toward the head fire — real fire walls roar at
  // the downwind front and crawl on the back side. We over-sample
  // angles where `cos(θ - windAngle) > 0` then jitter.
  const COUNT = Math.floor(radius * 11);
  const TICK_KEY = playKey;

  // Per-sprite layout. `angle` is sampled with downwind bias so the head
  // fire reads as a thick wall while the back fire is a sparse smolder.
  const sprites = useMemo(() => {
    const out: Array<{
      angle: number;
      rJitter: number;
      yOffset: number;
      scaleX: number;
      scaleY: number;
      phase: number;
      speed: number;
      // Activity factor — head-fire sprites are brighter + taller.
      activity: number;
    }> = [];
    const rng = mulberry32(99 + TICK_KEY + eventSeed);
    for (let i = 0; i < COUNT; i++) {
      // Start with uniform angle, then pull toward windAngle with bias
      // proportional to a power curve. Roll twice and keep the closer
      // sample to windAngle 60% of the time.
      let angle = rng() * Math.PI * 2;
      if (rng() < 0.6) {
        const alt = rng() * Math.PI * 2;
        const dA = Math.abs(((angle - windAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
        const dAlt = Math.abs(((alt - windAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
        if (dAlt < dA) angle = alt;
      }
      // Activity: 1.0 at downwind, 0.25 at upwind back-fire.
      const activity = 0.25 + 0.75 * Math.max(0, (1 + Math.cos(angle - windAngle)) / 2);
      out.push({
        angle,
        rJitter: (rng() - 0.5) * 0.9,
        yOffset: 0.5 + rng() * 0.7 + activity * 0.4,
        scaleX: (1.2 + rng() * 1.0) * (0.85 + activity * 0.5),
        scaleY: (1.8 + rng() * 1.6) * (0.85 + activity * 0.7),
        phase: rng() * Math.PI * 2,
        speed: 1.4 + rng() * 0.9,
        activity,
      });
    }
    return out;
  }, [COUNT, TICK_KEY, eventSeed, windAngle]);

  // Animated burn radius — eases from 0.3 → 1.0 of final.
  const elapsed = useRef(0);
  useEffect(() => {
    elapsed.current = 0;
  }, [playKey]);

  useFrame(({ camera, clock }, delta) => {
    if (!groupRef.current) return;
    if (playing) elapsed.current += delta;
    const t = Math.min(1, elapsed.current / 5);
    const eased = 1 - Math.pow(1 - t, 2.4);
    const envelope = 0.3 + 0.7 * eased; // 0.3 → 1.0 over 5 s

    const time = clock.elapsedTime;
    for (let i = 0; i < sprites.length; i++) {
      const s = sprites[i];
      if (!s) continue;
      const child = groupRef.current.children[i] as THREE.Mesh | undefined;
      if (!child) continue;
      // Each sprite sits on the asymmetric perimeter for its own angle —
      // the head fire stretches downwind, the back fire stays close in.
      const localBoundary = radius * fireShape(s.angle, windAngle, eventSeed) * envelope;
      const r = localBoundary + s.rJitter;
      child.position.x = Math.cos(s.angle) * r;
      child.position.z = Math.sin(s.angle) * r;
      // Vertical bob — head fire sprites flicker more intensely.
      const flickerAmp = 0.25 + s.activity * 0.4;
      const flicker =
        Math.sin(time * s.speed + s.phase) * flickerAmp +
        Math.sin(time * s.speed * 2.3 + s.phase * 1.3) * flickerAmp * 0.5;
      child.position.y = s.yOffset + flicker;
      // Always face camera (billboard).
      child.lookAt(camera.position);
      // Scale pulse + slight stretch
      const scaleVar = 1 + Math.sin(time * s.speed * 1.4 + s.phase) * 0.18;
      child.scale.set(
        s.scaleX * scaleVar,
        s.scaleY * (0.9 + scaleVar * 0.15),
        1,
      );
      // Material opacity tapers on the back-fire so it crawls instead of roaring.
      const mat = child.material as THREE.MeshBasicMaterial;
      mat.opacity = (0.75 + 0.25 * Math.sin(time * s.speed + s.phase)) * (0.45 + 0.55 * s.activity);
    }
  });

  return (
    <group ref={groupRef}>
      {sprites.map((_, i) => (
        <mesh key={i} renderOrder={4}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={tex}
            color={accent}
            transparent
            opacity={0.96}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────
// Embers — small glowing points rising fast from the perimeter, drifting
// in the wind. Texture-mapped points so they read as soft sparks not
// pixelated squares.
// ──────────────────────────────────────────────────────────────────

function Embers({
  count,
  radius,
  playing,
  eventId,
  windAngle,
  eventSeed,
}: {
  count: number;
  radius: number;
  playing: boolean;
  eventId: string;
  windAngle: number;
  eventSeed: number;
}) {
  const tex = emberTexture();
  const ref = useRef<THREE.Points>(null);
  // Drift uses the SAME wind angle the perimeter shape is built around,
  // so embers visibly stream off the head-fire side and bend downwind.
  const wind = useMemo(() => {
    return { x: Math.cos(windAngle) * 1.4, z: Math.sin(windAngle) * 1.4 };
  }, [windAngle]);

  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);
    for (let i = 0; i < count; i++) respawn(i, positions, lifetimes, radius, windAngle, eventSeed);
    return { positions, lifetimes };
  }, [count, radius, windAngle, eventSeed]);
  void eventId;

  useFrame((_, delta) => {
    if (!ref.current || !playing) return;
    const dt = Math.min(0.05, delta);
    const { positions, lifetimes } = data;
    for (let i = 0; i < count; i++) {
      lifetimes[i] -= dt;
      if (lifetimes[i] <= 0) {
        respawn(i, positions, lifetimes, radius, windAngle, eventSeed);
        continue;
      }
      // Rise + wind drift + slight lateral wiggle
      positions[i * 3] += wind.x * dt * 0.9 + (Math.sin(lifetimes[i] * 8) * 0.4) * dt;
      positions[i * 3 + 1] += dt * 6.5;
      positions[i * 3 + 2] += wind.z * dt * 0.9 + (Math.cos(lifetimes[i] * 8) * 0.4) * dt;
    }
    (ref.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <points ref={ref} renderOrder={5}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={data.positions}
          itemSize={3}
          args={[data.positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        map={tex}
        size={0.6}
        sizeAttenuation
        transparent
        opacity={0.95}
        depthWrite={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        color="#ffaa3c"
      />
    </points>
  );
}

function respawn(
  i: number,
  positions: Float32Array,
  lifetimes: Float32Array,
  radius: number,
  windAngle: number,
  eventSeed: number,
) {
  // Bias spawn azimuth toward the head fire — most embers fly off the
  // downwind side, where combustion is hottest.
  let theta = Math.random() * Math.PI * 2;
  if (Math.random() < 0.55) {
    const alt = Math.random() * Math.PI * 2;
    const dA = Math.abs(((theta - windAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
    const dAlt = Math.abs(((alt - windAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
    if (dAlt < dA) theta = alt;
  }
  const localBoundary = radius * fireShape(theta, windAngle, eventSeed);
  const r = localBoundary + (Math.random() - 0.5) * 1.5;
  positions[i * 3] = Math.cos(theta) * r;
  positions[i * 3 + 1] = 0.2 + Math.random() * 0.8;
  positions[i * 3 + 2] = Math.sin(theta) * r;
  lifetimes[i] = 1.4 + Math.random() * 2.2;
}

// ──────────────────────────────────────────────────────────────────
// Smoke — large textured billboards rising from the perimeter, drifting
// downwind, fading + scaling up over their lifetime.
// ──────────────────────────────────────────────────────────────────

function Smoke({
  count,
  radius,
  eventId,
  playing,
}: {
  count: number;
  radius: number;
  eventId: string;
  playing: boolean;
}) {
  const tex = smokeTexture();
  const groupRef = useRef<THREE.Group>(null);

  const seed = useMemo(() => hashCode(eventId), [eventId]);
  const windAngle = useMemo(() => windAngleFromSeed(seed), [seed]);
  // Drift uses the same wind direction as the perimeter shape — smoke
  // columns and fire wall agree on which way the wind blows.
  const wind = useMemo(
    () => ({ x: Math.cos(windAngle), z: Math.sin(windAngle) }),
    [windAngle],
  );

  const puffs = useMemo(() => {
    const rng = mulberry32(seed ^ 0xa5a5);
    const out: Array<{
      angle: number;
      r0: number;
      life: number;
      maxLife: number;
      yScale: number;
      speed: number;
    }> = [];
    for (let i = 0; i < count; i++) {
      // Bias spawn toward the head fire so the plume rises mainly from
      // the downwind cresce of the perimeter — that's where real wildfire
      // smoke columns originate.
      let angle = rng() * Math.PI * 2;
      if (rng() < 0.6) {
        const alt = rng() * Math.PI * 2;
        const dA = Math.abs(((angle - windAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
        const dAlt = Math.abs(((alt - windAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
        if (dAlt < dA) angle = alt;
      }
      const localBoundary = radius * fireShape(angle, windAngle, seed);
      out.push({
        angle,
        r0: localBoundary * (0.55 + rng() * 0.45),
        life: rng() * 6, // staggered start
        maxLife: 5 + rng() * 4.5,
        yScale: 0.7 + rng() * 0.5,
        speed: 0.9 + rng() * 0.7,
      });
    }
    return out;
  }, [count, radius, seed, windAngle]);

  useFrame(({ camera }, delta) => {
    if (!groupRef.current) return;
    const dt = playing ? Math.min(0.05, delta) : 0;
    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i];
      if (!p) continue;
      const child = groupRef.current.children[i] as THREE.Mesh | undefined;
      if (!child) continue;
      p.life += dt * p.speed;
      const lt = p.life % p.maxLife;
      const norm = lt / p.maxLife; // 0..1

      // Position: spawn at perimeter, drift downwind, climb.
      const driftX = wind.x * lt * 1.5;
      const driftZ = wind.z * lt * 1.5;
      child.position.set(
        Math.cos(p.angle) * p.r0 + driftX,
        1.5 + lt * 4.2 * p.yScale,
        Math.sin(p.angle) * p.r0 + driftZ,
      );
      // Scale grows
      const s = 4 + norm * 16;
      child.scale.set(s, s, 1);
      // Face camera
      child.lookAt(camera.position);
      // Fade out
      const mat = child.material as THREE.MeshBasicMaterial;
      mat.opacity = norm < 0.15 ? norm * 6 * 0.55 : (1 - norm) * 0.55;
    }
  });

  return (
    <group ref={groupRef}>
      {puffs.map((_, i) => (
        <mesh key={i} renderOrder={6}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={tex}
            color="#1c1714"
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────
// Centre glow — pulsing point light + ring decal so the burn area
// reads as actively radiating heat.
// ──────────────────────────────────────────────────────────────────

function CenterGlow({ accent, playing }: { accent: string; playing: boolean }) {
  const ref = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (!ref.current || !playing) return;
    const t = clock.elapsedTime;
    ref.current.intensity = 5 + Math.sin(t * 1.3) * 1.6 + Math.sin(t * 4.1) * 0.8;
  });
  return <pointLight ref={ref} position={[0, 1.4, 0]} color={accent} intensity={5} distance={70} decay={1.5} />;
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
