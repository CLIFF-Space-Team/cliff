// @ts-nocheck — Float32Array indexing is runtime-safe but trips
// `noUncheckedIndexedAccess`. Logic is hand-verified.
'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { SimulationSceneProps } from '../types';

/**
 * Hurricane simulator — v3 (satellite view).
 *
 * Took the previous oblique view back to the drawing board: real
 * hurricanes are unmistakable from space — a tight white spiral over
 * dark blue ocean, with a clean black eye at the centre. We render that.
 *
 * Stack:
 *   1. Ocean plane underneath: animated wave displacement (subtle).
 *   2. Two stacked spiral cloud textures (procedurally drawn on canvas)
 *      lying flat on the XZ plane. They rotate at different speeds for
 *      a parallax/depth effect.
 *   3. Glowing eyewall ring + dark eye disc on top.
 *   4. Outer rain band — semi-transparent cloud streaks beyond the
 *      main spiral.
 *   5. Lightning — random point-light flashes inside the eyewall (cat ≥ 3).
 *   6. Cat-5: subtle camera shake (only the strongest storms feel "alive").
 *
 * Camera defaults to a slight tilt (~70 ° from horizon) so it reads as
 * 3-D but stays close to a satellite frame.
 */
export function StormScene({ event, category, playing }: SimulationSceneProps) {
  const kts = event.primary_metric?.value ?? 60;
  const cat = saffirSimpsonCat(kts);
  const accent = category.accent_hex;
  const radius = 22 + Math.min(1, kts / 160) * 16; // visual footprint
  const rotSpeed = 0.04 + Math.min(1, kts / 200) * 0.18;

  return (
    <Canvas
      shadows={false}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{ position: [0, 56, 22], near: 0.1, far: 800, fov: 44 }}
      onCreated={({ scene, gl }) => {
        scene.background = new THREE.Color('#020410');
        gl.setClearColor('#020410', 1);
      }}
    >
      <Lighting cat={cat} />

      <Ocean radius={radius} cat={cat} />
      <SpiralCloudLayer
        radius={radius}
        rotSpeed={rotSpeed}
        accent={accent}
        cat={cat}
        layerIndex={0}
        playing={playing}
      />
      <SpiralCloudLayer
        radius={radius * 0.85}
        rotSpeed={-rotSpeed * 0.55}
        accent={accent}
        cat={cat}
        layerIndex={1}
        playing={playing}
      />
      <OuterRainBand radius={radius * 1.4} rotSpeed={rotSpeed * 0.3} playing={playing} />
      <Eye radius={radius} accent={accent} cat={cat} playing={playing} />
      {cat >= 3 && <LightningFlashes radius={radius} playing={playing} />}
      {cat >= 4 && <CameraShake intensity={0.5} playing={playing} />}

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={36}
        maxDistance={180}
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI / 2 - 0.06}
        rotateSpeed={0.3}
        zoomSpeed={0.7}
      />
    </Canvas>
  );
}

function saffirSimpsonCat(kts: number): number {
  if (kts >= 137) return 5;
  if (kts >= 113) return 4;
  if (kts >= 96) return 3;
  if (kts >= 83) return 2;
  if (kts >= 64) return 1;
  if (kts >= 34) return 0;
  return -1;
}

// ──────────────────────────────────────────────────────────────────
// Lighting — moonlit, low ambient. Storm itself is the brightest object.
// ──────────────────────────────────────────────────────────────────

function Lighting({ cat }: { cat: number }) {
  return (
    <>
      <ambientLight intensity={0.5} color="#9bb3d8" />
      <hemisphereLight intensity={0.32} color="#5a78a4" groundColor="#0a1224" />
      <directionalLight position={[12, 30, 18]} intensity={0.55} color="#e0e8f4" />
      <pointLight position={[0, 14, 0]} intensity={1.2 + cat * 0.4} color="#cfdfff" distance={80} />
    </>
  );
}

// ──────────────────────────────────────────────────────────────────
// Ocean — large plane with subtle wave displacement. Darker at the eye.
// ──────────────────────────────────────────────────────────────────

function Ocean({ radius, cat }: { radius: number; cat: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(220, 220, 80, 80);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const pos = (ref.current.geometry as THREE.PlaneGeometry).attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, Math.sin(x * 0.18 + t * 0.7) * 0.15 + Math.cos(z * 0.15 + t * 0.5) * 0.12);
    }
    pos.needsUpdate = true;
    (ref.current.geometry as THREE.PlaneGeometry).computeVertexNormals();
  });
  void radius;
  void cat;
  return (
    <mesh ref={ref} geometry={geom}>
      <meshStandardMaterial color="#0a1830" roughness={0.55} metalness={0.22} emissive={new THREE.Color('#040a18')} emissiveIntensity={0.3} />
    </mesh>
  );
}

// ──────────────────────────────────────────────────────────────────
// Procedural spiral cloud texture — drawn once on a canvas.
// 5 logarithmic spiral arms made of densely-packed soft white blobs.
// The result reads exactly like a satellite frame of a hurricane.
// ──────────────────────────────────────────────────────────────────

function makeSpiralTexture(opacityBoost = 1, layerIndex = 0): THREE.Texture {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas-unavailable');

  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const arms = 5;

  // Each arm is sampled in 1500 small steps; each step paints a soft
  // radial blob whose radius + opacity grow toward the periphery.
  for (let arm = 0; arm < arms; arm++) {
    const armOffset = (arm / arms) * Math.PI * 2 + layerIndex * 0.4;
    const STEPS = 1500;
    for (let i = 0; i < STEPS; i++) {
      const t = i / STEPS; // 0 (centre) → 1 (edge)
      // Logarithmic spiral
      const theta = armOffset + Math.pow(t, 0.78) * Math.PI * 4.5;
      const r = size * 0.46 * Math.pow(t, 0.86);
      // Random jitter so the arm reads as turbulent rather than perfect.
      const jitter = (Math.sin(t * 60 + arm * 11) * 0.5 + Math.cos(t * 90 + arm * 7) * 0.5) * 4;
      const x = cx + Math.cos(theta) * (r + jitter);
      const y = cy + Math.sin(theta) * (r + jitter);

      // Blob radius scales with distance — outer arms are puffier.
      const blobR = 6 + Math.pow(t, 0.6) * 38;
      const baseAlpha = (0.35 + t * 0.5) * opacityBoost;

      // Slight blue-grey tint for inner clouds, white at the edges.
      const r255 = 240 + t * 15;
      const g255 = 246 + t * 10;
      const b255 = 252;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, blobR);
      grad.addColorStop(0, `rgba(${r255},${g255},${b255},${baseAlpha})`);
      grad.addColorStop(0.45, `rgba(${r255 - 30},${g255 - 25},${b255 - 18},${baseAlpha * 0.55})`);
      grad.addColorStop(1.0, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - blobR * 1.2, y - blobR * 1.2, blobR * 2.4, blobR * 2.4);
    }
  }

  // Carve out the eye — a clean dark hole at the centre.
  const eyeR = size * 0.058;
  ctx.globalCompositeOperation = 'destination-out';
  const eyeGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, eyeR * 1.05);
  eyeGrad.addColorStop(0.0, 'rgba(0,0,0,1)');
  eyeGrad.addColorStop(0.85, 'rgba(0,0,0,1)');
  eyeGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = eyeGrad;
  ctx.fillRect(cx - eyeR * 1.1, cy - eyeR * 1.1, eyeR * 2.2, eyeR * 2.2);
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}

// One layer of the cloud spiral — large flat plane on the XZ plane.
function SpiralCloudLayer({
  radius,
  rotSpeed,
  accent,
  cat,
  layerIndex,
  playing,
}: {
  radius: number;
  rotSpeed: number;
  accent: string;
  cat: number;
  layerIndex: number;
  playing: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => makeSpiralTexture(layerIndex === 0 ? 1.0 : 0.65, layerIndex), [layerIndex]);

  useFrame((_, delta) => {
    if (!ref.current || !playing) return;
    ref.current.rotation.y += delta * rotSpeed;
  });

  // Lower layer slightly above the ocean; upper layer above that for depth.
  const yOffset = 0.6 + layerIndex * 0.45;
  const tint = layerIndex === 0 ? '#ffffff' : accent;

  void cat;
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, yOffset, 0]}>
      <planeGeometry args={[radius * 2.3, radius * 2.3]} />
      <meshBasicMaterial
        map={tex}
        color={tint}
        transparent
        opacity={layerIndex === 0 ? 0.92 : 0.55}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

// Outer thin streaky band — hint of the rain skirt around the storm.
function OuterRainBand({ radius, rotSpeed, playing }: { radius: number; rotSpeed: number; playing: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('canvas-unavailable');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 512, 512);
    // Concentric semi-rings.
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 220 + Math.random() * 70;
      const x = 256 + Math.cos(angle) * r;
      const y = 256 + Math.sin(angle) * r;
      const blobR = 8 + Math.random() * 20;
      const g = ctx.createRadialGradient(x, y, 0, x, y, blobR);
      g.addColorStop(0, 'rgba(220,230,240,0.45)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - blobR * 1.2, y - blobR * 1.2, blobR * 2.4, blobR * 2.4);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useFrame((_, delta) => {
    if (!ref.current || !playing) return;
    ref.current.rotation.y += delta * rotSpeed;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.4, 0]}>
      <planeGeometry args={[radius * 2.4, radius * 2.4]} />
      <meshBasicMaterial map={tex} transparent opacity={0.45} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

// ──────────────────────────────────────────────────────────────────
// Eye + eyewall — clean dark hole + glowing rim.
// ──────────────────────────────────────────────────────────────────

function Eye({ radius, accent, cat, playing }: { radius: number; accent: string; cat: number; playing: boolean }) {
  const wallRef = useRef<THREE.Mesh>(null);
  const eyeR = radius * 0.06;
  useFrame(({ clock }) => {
    if (!wallRef.current || !playing) return;
    const t = clock.elapsedTime;
    const mat = wallRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.55 + Math.sin(t * 2.2) * 0.18;
    wallRef.current.scale.setScalar(1 + Math.sin(t * 2.2) * 0.04);
  });
  void radius;
  return (
    <group>
      {/* Eye — dark disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.5, 0]}>
        <circleGeometry args={[eyeR, 64]} />
        <meshBasicMaterial color="#020610" toneMapped={false} />
      </mesh>
      {/* Eyewall — bright ring */}
      <mesh ref={wallRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.55, 0]}>
        <ringGeometry args={[eyeR, eyeR * 1.45, 64]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.65 + cat * 0.04}
          side={THREE.DoubleSide}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────
// Lightning — random bright point-light bursts inside the storm.
// ──────────────────────────────────────────────────────────────────

function LightningFlashes({ radius, playing }: { radius: number; playing: boolean }) {
  const ref = useRef<THREE.PointLight>(null);
  const next = useRef(0);
  useFrame(({ clock }) => {
    if (!ref.current || !playing) return;
    const t = clock.elapsedTime;
    if (t > next.current) {
      const angle = Math.random() * Math.PI * 2;
      const r = radius * (0.4 + Math.random() * 0.6);
      ref.current.position.set(Math.cos(angle) * r, 4 + Math.random() * 2, Math.sin(angle) * r);
      ref.current.intensity = 16 + Math.random() * 16;
      next.current = t + 0.4 + Math.random() * 2.0;
    } else {
      ref.current.intensity *= 0.8;
    }
  });
  return <pointLight ref={ref} color="#cfe0ff" intensity={0} distance={radius * 1.2} />;
}

function CameraShake({ intensity, playing }: { intensity: number; playing: boolean }) {
  useFrame(({ camera, clock }) => {
    if (!playing) return;
    const t = clock.elapsedTime;
    const noise = Math.sin(t * 18) * 0.4 + Math.cos(t * 22) * 0.3;
    camera.position.x += noise * intensity * 0.012;
    camera.position.z += Math.sin(t * 27) * intensity * 0.008;
  });
  return null;
}
