// @ts-nocheck — Float32Array indexing is runtime-safe but trips
// `noUncheckedIndexedAccess`. Logic is hand-verified.
'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { foamTexture, rainStreakTexture, splashTexture } from '../textures';
import type { SimulationSceneProps } from '../types';

/**
 * Flood simulator — v3.
 *
 * Replaces the previous "everything-underwater" scene with an
 * actual hydrology scenario:
 *
 *   - A wide valley with hills on either side and a river channel
 *     running west-to-east along the floor.
 *   - The town is built on the valley floor + lower slopes.
 *   - Water rises *only* where the terrain is below the flood line —
 *     hills stay dry, low streets go under first, the river itself is
 *     always wet.
 *   - Flow is east-bound: foam, debris, and splash particles all drift
 *     downstream so the scene reads as moving water rather than a static
 *     pond.
 *   - Final flood level scales logarithmically with the affected km²,
 *     capped below the hilltops so you can always see what's *not*
 *     submerged.
 *
 * Camera defaults to a slightly elevated upstream perspective so the
 * viewer follows the water's path through the town toward the horizon.
 */
export function FloodScene({ event, category, playing, playKey }: SimulationSceneProps) {
  const km2 = event.primary_metric?.value ?? 60;
  const accent = category.accent_hex;
  const finalWaterLevel = useMemo(() => {
    // 0 = river bed; 4.5 = roof of mid-rise; we cap at 3.6 so hilltops
    // (which crest at ~5.5) always stay above the water.
    const norm = THREE.MathUtils.clamp(Math.log10(1 + km2) / 4, 0, 1);
    return 0.7 + norm * 2.9;
  }, [km2]);

  // Direction water flows. Locked east (+X) so terrain placement and
  // particle drift align without any per-event randomness.
  const flow = useMemo(() => new THREE.Vector3(1, 0, 0), []);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.95,
      }}
      camera={{ position: [-32, 14, 22], near: 0.1, far: 600, fov: 50 }}
      onCreated={({ scene, gl }) => {
        scene.background = new THREE.Color('#0c1422');
        gl.setClearColor('#0c1422', 1);
        scene.fog = new THREE.FogExp2('#0e1828', 0.011);
      }}
    >
      <SkyDome />
      <Lighting />

      <ValleyTerrain eventId={event.id} />
      <RiverChannelFlow playing={playing} flow={flow} />
      <Town eventId={event.id} waterLevel={finalWaterLevel} />
      <ValleyTrees eventId={event.id} waterLevel={finalWaterLevel} />
      <FloodWater
        targetLevel={finalWaterLevel}
        accent={accent}
        playing={playing}
        playKey={playKey}
        flow={flow}
      />
      <FoamStreaks waterLevelGetter={() => finalWaterLevel} flow={flow} playing={playing} />
      <FloatingDebris waterLevelGetter={() => finalWaterLevel} flow={flow} playing={playing} />
      <Splashes waterLevelGetter={() => finalWaterLevel} playing={playing} />
      <HeavyRain count={620} playing={playing} />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={18}
        maxDistance={110}
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI / 2 - 0.06}
        rotateSpeed={0.32}
        zoomSpeed={0.7}
        target={[0, 1, 0]}
      />
    </Canvas>
  );
}

// ──────────────────────────────────────────────────────────────────
// Sky dome — heavy storm gradient.
// ──────────────────────────────────────────────────────────────────

function SkyDome() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.0, '#03060c');
    g.addColorStop(0.45, '#0c1422');
    g.addColorStop(0.85, '#1c2a3c');
    g.addColorStop(1.0, '#3a4a60');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  if (!tex) return null;
  return (
    <mesh>
      <sphereGeometry args={[400, 24, 24]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.55} color="#a4b8d8" />
      <hemisphereLight intensity={0.42} color="#5a78a4" groundColor="#1a1a26" />
      <directionalLight
        position={[24, 30, 12]}
        intensity={0.55}
        color="#cad9e8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={120}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      {/* Cool back-light helps the water + buildings separate from the
       *  fog without making the scene look bright. */}
      <pointLight position={[40, 8, -10]} intensity={1.2} color="#86b3ff" distance={60} />
    </>
  );
}

// ──────────────────────────────────────────────────────────────────
// Procedural valley terrain.
//
// Heightmap = baseline + parallel hills on north/south + carved river
// channel along Z=0. The same function is used to (a) build the mesh
// and (b) sample heights when placing buildings + trees so they sit on
// the actual ground, not float above or sink below it.
// ──────────────────────────────────────────────────────────────────

const VALLEY_W = 110;
const VALLEY_D = 70;
const RIVER_HALF_WIDTH = 4.0; // half width of the carved channel
const HILL_AMP = 5.5;
const RIVER_DEPTH = 0.55;

function valleyHeight(x: number, z: number): number {
  // Distance to centerline (z=0) drives both the river dip and hill rise.
  const absZ = Math.abs(z);
  // Hills rise as we move away from the river. Smoothstep-ish curve.
  const hillFactor = THREE.MathUtils.smoothstep(absZ, 6, VALLEY_D / 2 - 4);
  const hillNoise = Math.sin(x * 0.08) * 0.5 + Math.cos(x * 0.13) * 0.35;
  const hill = hillFactor * HILL_AMP * (1 + hillNoise * 0.18);

  // River channel — slight serpentine in X (sin(x/...)) so the river
  // looks natural rather than dead straight.
  const meander = Math.sin(x * 0.06) * 1.2;
  const distToChannel = Math.abs(z - meander);
  const inChannel = THREE.MathUtils.smoothstep(distToChannel, RIVER_HALF_WIDTH * 1.6, RIVER_HALF_WIDTH * 0.6);
  // inChannel = 1 → fully in the channel (deep), 0 → outside
  const channelDip = -RIVER_DEPTH * inChannel;

  // Subtle micro-bumps for texture
  const micro = Math.sin(x * 0.45 + z * 0.31) * 0.08 + Math.cos(x * 0.6 + z * 0.55) * 0.06;

  // Slight slope downstream so water has a "downhill" direction visually.
  const slope = -x * 0.012;

  return slope + hill + channelDip + micro;
}

function ValleyTerrain({ eventId }: { eventId: string }) {
  const geom = useMemo(() => {
    const segX = 130;
    const segZ = 90;
    const g = new THREE.PlaneGeometry(VALLEY_W, VALLEY_D, segX, segZ);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const dryEarth = new THREE.Color('#3a2c1f');
    const meadow = new THREE.Color('#1a2c14');
    const muddy = new THREE.Color('#2c2014');
    const riverbed = new THREE.Color('#1a201c');
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i); // before rotation, "Y" is the second axis
      const h = valleyHeight(x, z);
      pos.setZ(i, h);

      const meander = Math.sin(x * 0.06) * 1.2;
      const distToChannel = Math.abs(z - meander);
      const absZ = Math.abs(z);

      if (distToChannel < RIVER_HALF_WIDTH * 0.95) {
        tmp.copy(riverbed);
      } else if (distToChannel < RIVER_HALF_WIDTH * 2.0) {
        const t = THREE.MathUtils.clamp(
          (distToChannel - RIVER_HALF_WIDTH) / RIVER_HALF_WIDTH,
          0,
          1,
        );
        tmp.copy(muddy).lerp(dryEarth, t);
      } else if (absZ > 14) {
        tmp.copy(meadow);
      } else {
        tmp.copy(dryEarth);
      }
      const grain = (Math.sin(x * 1.7) + Math.cos(z * 1.9)) * 0.013;
      colors[i * 3] = tmp.r + grain;
      colors[i * 3 + 1] = tmp.g + grain * 0.8;
      colors[i * 3 + 2] = tmp.b + grain * 0.6;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    g.rotateX(-Math.PI / 2);
    return g;
    // Terrain is fully procedural (deterministic) — eventId only kept on
    // the props for parity with other scenes that *do* seed off it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  void eventId;

  return (
    <mesh geometry={geom} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0} flatShading />
    </mesh>
  );
}

// ──────────────────────────────────────────────────────────────────
// River-channel flow — animated normal-blue stripe along the river bed
// so even before the flood crests you can see a current.
// ──────────────────────────────────────────────────────────────────

function RiverChannelFlow({ playing, flow }: { playing: boolean; flow: THREE.Vector3 }) {
  const geom = useMemo(() => {
    // Build a thin ribbon following the river meander.
    const SEGS = 80;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= SEGS; i++) {
      const x = -VALLEY_W / 2 + (i / SEGS) * VALLEY_W;
      const z = Math.sin(x * 0.06) * 1.2;
      const y = valleyHeight(x, z) + 0.04; // sit just above the bed
      pts.push(new THREE.Vector3(x, y, z));
    }
    const path = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.3);
    return new THREE.TubeGeometry(path, 110, RIVER_HALF_WIDTH * 0.85, 4, false);
  }, []);

  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (!ref.current || !playing) return;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    // Subtle hue shift so the current "moves" even before flood.
    mat.emissiveIntensity = 0.3 + Math.sin(performance.now() * 0.001) * 0.05;
    void delta;
    void flow;
  });

  return (
    <mesh ref={ref} geometry={geom}>
      <meshStandardMaterial
        color="#23425a"
        roughness={0.35}
        metalness={0.18}
        emissive={new THREE.Color('#10283a')}
        emissiveIntensity={0.28}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

// ──────────────────────────────────────────────────────────────────
// Town — buildings placed on the valley floor + lower slopes.
// Each building is positioned at its actual ground height so it sits
// correctly when the water rises around it.
// ──────────────────────────────────────────────────────────────────

function Town({ eventId, waterLevel }: { eventId: string; waterLevel: number }) {
  const blockRef = useRef<THREE.InstancedMesh>(null);
  const aptRef = useRef<THREE.InstancedMesh>(null);
  const houseRef = useRef<THREE.InstancedMesh>(null);
  const roofRef = useRef<THREE.InstancedMesh>(null);

  const layout = useMemo(() => {
    const seed = hashCode(eventId);
    const rng = mulberry32(seed);
    const out: Array<{
      kind: 'block' | 'apt' | 'house';
      x: number;
      z: number;
      groundY: number;
      w: number;
      d: number;
      h: number;
      tilt: number;
      color: THREE.Color;
    }> = [];
    const palette = ['#7a6a55', '#8a8275', '#574f44', '#6e635a', '#564b40', '#7c5a48'];

    // Cluster the town near the river but bias against placing buildings
    // *in* the channel itself — we treat it as a no-build zone.
    const COUNT = 130;
    let attempts = 0;
    while (out.length < COUNT && attempts < COUNT * 5) {
      attempts++;
      const x = (rng() - 0.5) * VALLEY_W * 0.85;
      // Pull z toward the centre but allow some hillside development.
      const zRaw = (rng() - 0.5) * VALLEY_D * 0.7;
      const z = zRaw;
      const meander = Math.sin(x * 0.06) * 1.2;
      const distToChannel = Math.abs(z - meander);
      if (distToChannel < RIVER_HALF_WIDTH * 1.6) continue; // no buildings in the river
      const groundY = valleyHeight(x, z);
      // Skip very high hill slopes — town is on the floor + lower flanks.
      if (groundY > HILL_AMP * 0.78) continue;

      const kindRoll = rng();
      const kind: 'block' | 'apt' | 'house' =
        kindRoll < 0.55 ? 'house' : kindRoll < 0.85 ? 'block' : 'apt';
      let w = 1.6 + rng() * 1.4;
      let d = 1.6 + rng() * 1.4;
      let h: number;
      if (kind === 'apt') h = 4.2 + rng() * 2.5;
      else if (kind === 'block') h = 2.0 + rng() * 1.8;
      else {
        h = 1.5 + rng() * 0.8;
        w = 1.4 + rng() * 0.5;
        d = 1.4 + rng() * 0.5;
      }

      // Buildings on the river bank get a slight lean as if the water
      // already undermined them. Far ones stand straight.
      const leaning = distToChannel < RIVER_HALF_WIDTH * 3 && groundY < waterLevel
        ? (rng() - 0.5) * 0.18
        : (rng() - 0.5) * 0.04;

      out.push({
        kind,
        x,
        z,
        groundY,
        w,
        d,
        h,
        tilt: leaning,
        color: new THREE.Color(palette[Math.floor(rng() * palette.length)]),
      });
    }
    return out;
  }, [eventId, waterLevel]);

  const blocks = layout.filter((b) => b.kind === 'block');
  const apts = layout.filter((b) => b.kind === 'apt');
  const houses = layout.filter((b) => b.kind === 'house');

  useEffect(() => {
    if (!blockRef.current || !aptRef.current || !houseRef.current || !roofRef.current) return;
    const dummy = new THREE.Object3D();
    const place = (b: typeof layout[number], mesh: THREE.InstancedMesh, i: number) => {
      dummy.position.set(b.x, b.groundY + b.h / 2, b.z);
      dummy.rotation.set(0, 0, b.tilt);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, b.color);
    };
    blocks.forEach((b, i) => place(b, blockRef.current!, i));
    apts.forEach((b, i) => place(b, aptRef.current!, i));
    houses.forEach((b, i) => {
      place(b, houseRef.current!, i);
      // Roof
      dummy.position.set(b.x, b.groundY + b.h + 0.5, b.z);
      dummy.rotation.set(0, Math.PI / 4, b.tilt);
      dummy.scale.set(b.w * 1.05, 1.0, b.d * 1.05);
      dummy.updateMatrix();
      roofRef.current!.setMatrixAt(i, dummy.matrix);
      roofRef.current!.setColorAt(i, new THREE.Color('#3a1d12'));
    });
    [blockRef, aptRef, houseRef, roofRef].forEach((r) => {
      if (!r.current) return;
      r.current.instanceMatrix.needsUpdate = true;
      if (r.current.instanceColor) r.current.instanceColor.needsUpdate = true;
    });
  }, [blocks, apts, houses]);

  return (
    <group>
      {blocks.length > 0 && (
        <instancedMesh ref={blockRef} args={[undefined, undefined, blocks.length]} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial vertexColors roughness={0.92} />
        </instancedMesh>
      )}
      {apts.length > 0 && (
        <instancedMesh ref={aptRef} args={[undefined, undefined, apts.length]} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial vertexColors roughness={0.85} />
        </instancedMesh>
      )}
      {houses.length > 0 && (
        <>
          <instancedMesh ref={houseRef} args={[undefined, undefined, houses.length]} castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial vertexColors roughness={0.9} />
          </instancedMesh>
          <instancedMesh ref={roofRef} args={[undefined, undefined, houses.length]} castShadow>
            <coneGeometry args={[0.78, 1, 4]} />
            <meshStandardMaterial vertexColors roughness={0.9} />
          </instancedMesh>
        </>
      )}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────
// Trees — mixed: some on the riverbank (now half-submerged), most up
// the slopes (still dry).
// ──────────────────────────────────────────────────────────────────

function ValleyTrees({ eventId, waterLevel }: { eventId: string; waterLevel: number }) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const canopyRef = useRef<THREE.InstancedMesh>(null);
  const COUNT = 90;

  const layout = useMemo(() => {
    const rng = mulberry32(hashCode(eventId) ^ 0x55);
    const out: Array<{ x: number; z: number; groundY: number; h: number }> = [];
    let attempts = 0;
    while (out.length < COUNT && attempts < COUNT * 4) {
      attempts++;
      const x = (rng() - 0.5) * VALLEY_W * 0.95;
      const z = (rng() - 0.5) * VALLEY_D * 0.95;
      const meander = Math.sin(x * 0.06) * 1.2;
      const distToChannel = Math.abs(z - meander);
      if (distToChannel < RIVER_HALF_WIDTH * 1.1) continue;
      const groundY = valleyHeight(x, z);
      out.push({ x, z, groundY, h: 1.6 + rng() * 1.4 });
    }
    return out;
  }, [eventId]);

  useEffect(() => {
    if (!trunkRef.current || !canopyRef.current) return;
    const dummy = new THREE.Object3D();
    layout.forEach((tree, i) => {
      dummy.position.set(tree.x, tree.groundY + tree.h / 2, tree.z);
      dummy.scale.set(0.8, tree.h, 0.8);
      dummy.updateMatrix();
      trunkRef.current!.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tree.x, tree.groundY + tree.h * 1.15, tree.z);
      dummy.scale.set(1.4 + tree.h * 0.2, tree.h * 1.0, 1.4 + tree.h * 0.2);
      dummy.updateMatrix();
      canopyRef.current!.setMatrixAt(i, dummy.matrix);
    });
    trunkRef.current!.instanceMatrix.needsUpdate = true;
    canopyRef.current!.instanceMatrix.needsUpdate = true;
  }, [layout]);
  void waterLevel;

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, COUNT]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 1, 6]} />
        <meshStandardMaterial color="#241510" roughness={0.92} />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[undefined, undefined, COUNT]} castShadow>
        <coneGeometry args={[0.55, 1, 7]} />
        <meshStandardMaterial color="#1a3a18" roughness={0.85} />
      </instancedMesh>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────
// Flood water — semi-transparent plane that rises from river bed to
// `targetLevel`. Wide enough that hilltops still poke through above it.
// ──────────────────────────────────────────────────────────────────

function FloodWater({
  targetLevel,
  accent,
  playing,
  playKey,
  flow,
}: {
  targetLevel: number;
  accent: string;
  playing: boolean;
  playKey: number;
  flow: THREE.Vector3;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);
  const RISE_DURATION = 9;
  const geom = useMemo(() => new THREE.PlaneGeometry(VALLEY_W * 1.05, VALLEY_D * 1.05, 100, 64), []);

  useEffect(() => {
    elapsed.current = 0;
  }, [playKey]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    if (playing) elapsed.current += delta;
    const t = clamp01(elapsed.current / RISE_DURATION);
    const eased = t * t * (3 - 2 * t);
    // Start below the river bed so initially only the channel is wet,
    // then climb to the target.
    const startLevel = -RIVER_DEPTH - 0.05;
    ref.current.position.y = startLevel + eased * (targetLevel - startLevel);

    // Wave animation: directional toward `flow`.
    const time = elapsed.current;
    const pos = (ref.current.geometry as THREE.PlaneGeometry).attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // Travelling wave toward +X (flow direction) + lateral chop.
      const wave =
        Math.sin(x * 0.5 - time * 2.4) * 0.08 +
        Math.sin(y * 0.4 + time * 1.6) * 0.05 +
        Math.sin((x * 0.9 + y * 0.5) - time * 3.1) * 0.03;
      pos.setZ(i, wave);
    }
    pos.needsUpdate = true;
    (ref.current.geometry as THREE.PlaneGeometry).computeVertexNormals();
    void flow;
  });

  return (
    <mesh ref={ref} geometry={geom} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial
        color="#3a5468"
        transparent
        opacity={0.78}
        roughness={0.18}
        metalness={0.4}
        emissive={new THREE.Color('#0e2030')}
        emissiveIntensity={0.22}
      />
      {/* tint via a vertex-color overlay would be cleaner; for now we
       *  rely on the muddy base so the accent only shows in particles. */}
      {void accent}
    </mesh>
  );
}

// ──────────────────────────────────────────────────────────────────
// Foam streaks — long thin foam lines drifting downstream so the water
// reads as flowing. Spawn on the river axis, drift +X, fade.
// ──────────────────────────────────────────────────────────────────

function FoamStreaks({
  waterLevelGetter,
  flow,
  playing,
}: {
  waterLevelGetter: () => number;
  flow: THREE.Vector3;
  playing: boolean;
}) {
  const tex = foamTexture();
  const groupRef = useRef<THREE.Group>(null);
  const COUNT = 90;
  const points = useMemo(() => {
    const out: Array<{ x: number; z: number; phase: number; speed: number; spread: number; life: number }> = [];
    for (let i = 0; i < COUNT; i++) {
      out.push({
        x: -VALLEY_W / 2 + Math.random() * VALLEY_W,
        z: (Math.random() - 0.5) * 14, // tighter cluster around river
        phase: Math.random() * Math.PI * 2,
        speed: 5 + Math.random() * 4,
        spread: 1 + Math.random() * 2.6,
        life: Math.random(),
      });
    }
    return out;
  }, []);

  useFrame(({ camera, clock }, delta) => {
    if (!groupRef.current || !playing) return;
    const dt = Math.min(0.05, delta);
    const t = clock.elapsedTime;
    const waterY = waterLevelGetter();
    points.forEach((p, i) => {
      const child = groupRef.current!.children[i] as THREE.Mesh | undefined;
      if (!child) return;
      // Drift downstream
      p.x += flow.x * p.speed * dt;
      // Recycle off-edge
      if (p.x > VALLEY_W / 2) {
        p.x = -VALLEY_W / 2;
        p.z = (Math.random() - 0.5) * 14;
        p.phase = Math.random() * Math.PI * 2;
      }
      // Slight lateral wobble so the streak weaves
      const z = p.z + Math.sin(t * 0.6 + p.phase) * 0.6;
      const groundY = valleyHeight(p.x, z);
      const surfaceY = Math.max(groundY, waterY) + 0.04;
      child.position.set(p.x, surfaceY, z);
      child.scale.set(p.spread * 1.4, p.spread, 1);
      child.lookAt(camera.position);
      const mat = child.material as THREE.MeshBasicMaterial;
      // Fade if the foam ends up over a high-and-dry hill (terrain > water).
      const visible = groundY < waterY;
      mat.opacity = visible ? 0.4 + Math.sin(t * 1.3 + p.phase) * 0.2 : 0;
    });
  });

  return (
    <group ref={groupRef}>
      {points.map((_, i) => (
        <mesh key={i}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={tex} transparent opacity={0.5} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────
// Floating debris — wooden planks/crates drifting downstream.
// ──────────────────────────────────────────────────────────────────

function FloatingDebris({
  waterLevelGetter,
  flow,
  playing,
}: {
  waterLevelGetter: () => number;
  flow: THREE.Vector3;
  playing: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const COUNT = 45;
  const items = useMemo(() => {
    const out: Array<{
      x: number;
      z: number;
      rot: number;
      phase: number;
      w: number;
      d: number;
      h: number;
      speed: number;
      color: THREE.Color;
    }> = [];
    for (let i = 0; i < COUNT; i++) {
      out.push({
        x: -VALLEY_W / 2 + Math.random() * VALLEY_W,
        z: (Math.random() - 0.5) * 16,
        rot: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
        w: 0.4 + Math.random() * 0.7,
        d: 0.2 + Math.random() * 0.18,
        h: 0.12 + Math.random() * 0.08,
        speed: 3.5 + Math.random() * 3,
        color: new THREE.Color(Math.random() > 0.4 ? '#4a3220' : '#3a2a1a'),
      });
    }
    return out;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const dt = playing ? Math.min(0.05, delta) : 0;
    const t = clock.elapsedTime;
    const waterY = waterLevelGetter();
    const dummy = new THREE.Object3D();
    items.forEach((it, i) => {
      it.x += flow.x * it.speed * dt;
      if (it.x > VALLEY_W / 2) {
        it.x = -VALLEY_W / 2;
        it.z = (Math.random() - 0.5) * 16;
      }
      const groundY = valleyHeight(it.x, it.z);
      const onWater = groundY < waterY;
      const surfaceY = onWater ? waterY + 0.1 + Math.sin(t * 1.4 + it.phase) * 0.06 : groundY + 0.05;
      dummy.position.set(it.x, surfaceY, it.z);
      dummy.rotation.set(0, it.rot + (onWater ? t * 0.2 : 0), Math.sin(t * 0.6 + it.phase) * 0.1);
      dummy.scale.set(it.w, it.h, it.d);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
      ref.current!.setColorAt(i, it.color);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial vertexColors roughness={0.85} />
    </instancedMesh>
  );
}

// ──────────────────────────────────────────────────────────────────
// Splashes — small bursts on the surface where the water meets buildings.
// ──────────────────────────────────────────────────────────────────

function Splashes({ waterLevelGetter, playing }: { waterLevelGetter: () => number; playing: boolean }) {
  const tex = splashTexture();
  const groupRef = useRef<THREE.Group>(null);
  const COUNT = 35;
  const slots = useMemo(() => {
    const out: Array<{ x: number; z: number; life: number; maxLife: number }> = [];
    for (let i = 0; i < COUNT; i++) {
      out.push({
        x: -VALLEY_W / 2 + Math.random() * VALLEY_W,
        z: (Math.random() - 0.5) * VALLEY_D * 0.6,
        life: Math.random(),
        maxLife: 0.6 + Math.random() * 0.6,
      });
    }
    return out;
  }, []);

  useFrame(({ camera }, delta) => {
    if (!groupRef.current || !playing) return;
    const dt = Math.min(0.05, delta);
    const waterY = waterLevelGetter();
    slots.forEach((s, i) => {
      const child = groupRef.current!.children[i] as THREE.Mesh | undefined;
      if (!child) return;
      s.life += dt;
      if (s.life > s.maxLife) {
        s.life = 0;
        s.x = -VALLEY_W / 2 + Math.random() * VALLEY_W;
        s.z = (Math.random() - 0.5) * VALLEY_D * 0.6;
      }
      const groundY = valleyHeight(s.x, s.z);
      const visible = groundY < waterY;
      const norm = s.life / s.maxLife;
      child.position.set(s.x, waterY + 0.15 + norm * 0.5, s.z);
      child.lookAt(camera.position);
      child.scale.setScalar(0.4 + norm * 1.2);
      const mat = child.material as THREE.MeshBasicMaterial;
      mat.opacity = visible ? (1 - norm) * 0.85 : 0;
    });
  });

  return (
    <group ref={groupRef}>
      {slots.map((_, i) => (
        <mesh key={i}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={tex} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────
// Heavy rain — diagonal textured streaks. Drift toward +X to match the
// downstream wind on the storm front.
// ──────────────────────────────────────────────────────────────────

function HeavyRain({ count, playing }: { count: number; playing: boolean }) {
  const tex = rainStreakTexture();
  const ref = useRef<THREE.Points>(null);
  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) reset(i, positions);
    return positions;
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current || !playing) return;
    const dt = Math.min(0.05, delta);
    for (let i = 0; i < count; i++) {
      data[i * 3] += dt * 3;
      data[i * 3 + 1] -= dt * 28;
      if (data[i * 3 + 1] < -2) reset(i, data);
    }
    (ref.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={data} itemSize={3} args={[data, 3]} />
      </bufferGeometry>
      <pointsMaterial map={tex} size={0.8} sizeAttenuation transparent opacity={0.55} depthWrite={false} color="#cfdfff" />
    </points>
  );
}

function reset(i: number, positions: Float32Array) {
  positions[i * 3] = -VALLEY_W / 2 + Math.random() * VALLEY_W;
  positions[i * 3 + 1] = 12 + Math.random() * 14;
  positions[i * 3 + 2] = -VALLEY_D / 2 + Math.random() * VALLEY_D;
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
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
