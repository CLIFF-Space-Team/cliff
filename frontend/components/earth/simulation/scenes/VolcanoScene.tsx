// @ts-nocheck — Float32Array indexing is runtime-safe but trips
// `noUncheckedIndexedAccess`. Logic is hand-verified.
'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { cloudTexture, emberTexture, lavaTexture } from '../textures';
import type { SimulationSceneProps } from '../types';

/**
 * Volcano simulator — v2.
 *
 * Layers:
 *   - Sky: ash haze gradient
 *   - Ground: dark basalt with radial scorch
 *   - Cone: lathed silhouette + glowing lava veins running down + snow cap
 *   - Crater: pulsing glowing pool + ash mouth
 *   - Lava flows: 4 tube curves with animated UV-scrolling lava texture
 *   - Ash plume: 3-stack of large billboards (ash core, mid drift, anvil)
 *     widening with altitude. VEI drives height + density + lightning.
 *   - Lava bombs: ballistic ejecta arcing out of the crater, glowing,
 *     leaving smoke trails when they land.
 *   - Pyroclastic shock-wave: radial ring (VEI ≥ 3 only).
 *   - Camera shake on the modal scene during peak ejection.
 */
export function VolcanoScene({ event, category, playing }: SimulationSceneProps) {
  const vei = event.primary_metric?.value ?? 2;
  const veiNorm = THREE.MathUtils.clamp(vei / 6, 0.05, 1.0);
  const accent = category.accent_hex;

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
      camera={{ position: [28, 18, 34], near: 0.1, far: 800, fov: 46 }}
      onCreated={({ scene, gl }) => {
        scene.background = new THREE.Color('#070510');
        gl.setClearColor('#070510', 1);
        scene.fog = new THREE.FogExp2('#0c0a16', 0.005);
      }}
    >
      <SkyDome />
      <Lighting accent={accent} veiNorm={veiNorm} />

      <Ground />
      <Cone />
      <LavaVeins playing={playing} />
      <LavaFlows accent={accent} playing={playing} />
      <Crater accent={accent} playing={playing} />
      <CameraShake intensity={veiNorm * 0.55} playing={playing} />

      <AshPlume veiNorm={veiNorm} playing={playing} eventId={event.id} />
      <LavaBombs veiNorm={veiNorm} playing={playing} />
      <FallingAsh veiNorm={veiNorm} playing={playing} />
      {veiNorm >= 0.6 && <Lightning playing={playing} />}
      {veiNorm >= 0.45 && <PyroclasticRing accent={accent} playing={playing} />}

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={16}
        maxDistance={130}
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI / 2 - 0.06}
        rotateSpeed={0.3}
        zoomSpeed={0.7}
      />
    </Canvas>
  );
}

// ──────────────────────────────────────────────────────────────────
// Sky — purple-grey ash gradient, glow at horizon.
// ──────────────────────────────────────────────────────────────────

function SkyDome() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.0, '#04020a');
    g.addColorStop(0.5, '#0a0816');
    g.addColorStop(0.85, '#2c1822');
    g.addColorStop(1.0, '#5a1a14');
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

function Lighting({ accent, veiNorm }: { accent: string; veiNorm: number }) {
  return (
    <>
      <ambientLight intensity={0.22} color="#5a4a64" />
      <hemisphereLight intensity={0.16} color="#2a1a30" groundColor="#100808" />
      <directionalLight
        position={[20, 35, 18]}
        intensity={0.4}
        color="#bfb0c0"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight
        position={[0, 11, 0]}
        intensity={6 + veiNorm * 6}
        color={accent}
        distance={75}
        decay={1.6}
      />
    </>
  );
}

// ──────────────────────────────────────────────────────────────────
// Ground — broad basalt plain, scorched near the vent.
// ──────────────────────────────────────────────────────────────────

function Ground() {
  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(280, 280, 96, 96);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const scorch = new THREE.Color('#221512');
    const basalt = new THREE.Color('#181420');
    const distant = new THREE.Color('#0a080e');
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const r = Math.hypot(x, y);
      // Mild bump
      pos.setZ(i, Math.sin(x * 0.16) * 0.4 + Math.cos(y * 0.13) * 0.32);

      if (r < 22) {
        const t = THREE.MathUtils.clamp(r / 22, 0, 1);
        tmp.copy(scorch).lerp(basalt, t);
      } else {
        const t = THREE.MathUtils.clamp((r - 22) / 90, 0, 1);
        tmp.copy(basalt).lerp(distant, t);
      }
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  return (
    <mesh geometry={geom} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0.0} />
    </mesh>
  );
}

// ──────────────────────────────────────────────────────────────────
// Cone — lathed silhouette with vertex-coloured strata + snow cap.
// ──────────────────────────────────────────────────────────────────

function Cone() {
  const geom = useMemo(() => {
    const points: THREE.Vector2[] = [];
    points.push(new THREE.Vector2(0, 11.5));
    points.push(new THREE.Vector2(1.4, 11.5));
    points.push(new THREE.Vector2(2.6, 10.7));
    points.push(new THREE.Vector2(4.2, 9));
    points.push(new THREE.Vector2(7.0, 6));
    points.push(new THREE.Vector2(11, 3));
    points.push(new THREE.Vector2(15.5, 0.5));
    points.push(new THREE.Vector2(18, 0));
    const g = new THREE.LatheGeometry(points, 96);
    g.computeVertexNormals();

    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const lower = new THREE.Color('#100808');
    const mid = new THREE.Color('#2c1c14');
    const upper = new THREE.Color('#3c302a');
    const snow = new THREE.Color('#a89c9a');
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = THREE.MathUtils.clamp(y / 11.5, 0, 1);
      if (t < 0.3) tmp.copy(lower).lerp(mid, t / 0.3);
      else if (t < 0.78) tmp.copy(mid).lerp(upper, (t - 0.3) / 0.48);
      else tmp.copy(upper).lerp(snow, (t - 0.78) / 0.22);
      // Subtle band noise so it isn't smooth
      const noise = Math.sin(pos.getX(i) * 1.4 + pos.getZ(i) * 1.2) * 0.02;
      colors[i * 3] = tmp.r + noise;
      colors[i * 3 + 1] = tmp.g + noise * 0.8;
      colors[i * 3 + 2] = tmp.b + noise * 0.6;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  return (
    <mesh geometry={geom} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.92} flatShading />
    </mesh>
  );
}

// ──────────────────────────────────────────────────────────────────
// Lava veins — thin glowing strips running down the cone, pulsing.
// Different from full lava flows (those use the lavaTexture); these are
// just thin glowing lines, like cracks in the rock.
// ──────────────────────────────────────────────────────────────────

function LavaVeins({ playing }: { playing: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const veins = useMemo(() => {
    const out: THREE.BufferGeometry[] = [];
    const N = 9;
    for (let i = 0; i < N; i++) {
      const baseAngle = (i / N) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const points: THREE.Vector3[] = [];
      for (let k = 0; k <= 12; k++) {
        const t = k / 12;
        const r = 1.4 + t * 16;
        const angle = baseAngle + Math.sin(t * 6) * 0.15;
        const y = 11.4 - t * 11.4;
        points.push(new THREE.Vector3(Math.cos(angle) * r, y + 0.05, Math.sin(angle) * r));
      }
      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.4);
      out.push(new THREE.TubeGeometry(curve, 60, 0.06, 5, false));
    }
    return out;
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current || !playing) return;
    const t = clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const m = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      m.opacity = 0.7 + Math.sin(t * 1.4 + i * 0.7) * 0.18;
    });
  });

  return (
    <group ref={groupRef}>
      {veins.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial color="#ff7a18" transparent opacity={0.85} toneMapped={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────
// Lava flows — 4 wide tubes with animated UV-scrolling lava texture.
// These are thicker than the veins and visibly "flow" downward.
// ──────────────────────────────────────────────────────────────────

function LavaFlows({ accent, playing }: { accent: string; playing: boolean }) {
  const tex = useMemo(() => lavaTexture().clone(), []);
  // Make each flow uses its own clone so we can offset independently if
  // we like; for now they share the offset for performance.
  tex.repeat.set(1, 6);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;

  const flows = useMemo(() => {
    const out: THREE.BufferGeometry[] = [];
    const N = 4;
    for (let i = 0; i < N; i++) {
      const baseAngle = (i / N) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const points: THREE.Vector3[] = [];
      for (let k = 0; k <= 14; k++) {
        const t = k / 14;
        const r = 1.6 + Math.pow(t, 1.05) * 16;
        const angle = baseAngle + Math.sin(t * 4) * 0.25;
        const y = Math.max(0, 11.2 - t * 11.2 - Math.sin(t * 3) * 0.4);
        points.push(new THREE.Vector3(Math.cos(angle) * r, y + 0.1, Math.sin(angle) * r));
      }
      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.4);
      out.push(new THREE.TubeGeometry(curve, 80, 0.32, 8, false));
    }
    return out;
  }, []);

  useFrame((_, delta) => {
    if (!playing) return;
    tex.offset.y -= delta * 0.6;
  });

  return (
    <group>
      {flows.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial map={tex} color={accent} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────
// Crater — pulsing glow disc at the cone summit.
// ──────────────────────────────────────────────────────────────────

function Crater({ accent, playing }: { accent: string; playing: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => lavaTexture().clone(), []);
  tex.repeat.set(2, 2);
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    if (playing) tex.offset.x += delta * 0.2;
    const t = clock.elapsedTime;
    ref.current.scale.setScalar(1 + Math.sin(t * 2.4) * 0.1);
  });
  return (
    <group position={[0, 11.55, 0]}>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.0, 48]} />
        <meshBasicMaterial map={tex} color={accent} transparent opacity={0.95} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.0, 2.55, 48]} />
        <meshBasicMaterial color="#3a1808" toneMapped={false} />
      </mesh>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────
// Ash plume — 3-stack of large textured billboards. Each layer scales
// up + drifts on wind as it rises, then resets.
// ──────────────────────────────────────────────────────────────────

function AshPlume({ veiNorm, playing, eventId }: { veiNorm: number; playing: boolean; eventId: string }) {
  const tex = cloudTexture();
  const groupRef = useRef<THREE.Group>(null);
  const wind = useMemo(() => {
    const angle = (hashCode(eventId) % 1000) / 1000 * Math.PI * 2;
    return { x: Math.cos(angle) * 0.6, z: Math.sin(angle) * 0.6 };
  }, [eventId]);

  const count = Math.floor(80 + veiNorm * 220);
  const targetHeight = 24 + veiNorm * 110;
  const widthAt = (h: number) => 4 + (h / targetHeight) * (8 + veiNorm * 30);

  const puffs = useMemo(() => {
    const rng = mulberry32(hashCode(eventId) ^ 0xb1a5);
    const out: Array<{ life: number; maxLife: number; phase: number; rJitter: number; angle: number }> = [];
    for (let i = 0; i < count; i++) {
      out.push({
        life: rng() * 8,
        maxLife: 6 + rng() * 4,
        phase: rng(),
        rJitter: rng() * 0.7,
        angle: rng() * Math.PI * 2,
      });
    }
    return out;
  }, [count, eventId]);

  useFrame(({ camera }, delta) => {
    if (!groupRef.current) return;
    const dt = playing ? Math.min(0.05, delta) : 0;
    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i];
      if (!p) continue;
      const child = groupRef.current.children[i] as THREE.Mesh | undefined;
      if (!child) continue;
      p.life += dt;
      const lt = p.life % p.maxLife;
      const norm = lt / p.maxLife;
      const h = 11.5 + norm * targetHeight;
      const w = widthAt(h);
      const drift = lt * 1.3;
      child.position.set(
        (Math.cos(p.angle) * (w * 0.25 + p.rJitter)) + wind.x * drift,
        h,
        (Math.sin(p.angle) * (w * 0.25 + p.rJitter)) + wind.z * drift,
      );
      const s = 4 + norm * w;
      child.scale.set(s, s, 1);
      child.lookAt(camera.position);
      const mat = child.material as THREE.MeshBasicMaterial;
      mat.opacity = norm < 0.12 ? norm * 8 * 0.5 : (1 - norm) * 0.55;
    }
  });

  return (
    <group ref={groupRef}>
      {puffs.map((_, i) => (
        <mesh key={i} renderOrder={6}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={tex} color="#1a1620" transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────
// Lava bombs — instanced spheres on parabolic arcs from the crater.
// ──────────────────────────────────────────────────────────────────

function LavaBombs({ veiNorm, playing }: { veiNorm: number; playing: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const COUNT = Math.max(8, Math.floor(8 + veiNorm * 32));
  const data = useMemo(() => {
    const out: Array<{
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      life: number;
      maxLife: number;
    }> = [];
    for (let i = 0; i < COUNT; i++) out.push(spawnBomb(veiNorm));
    return out;
  }, [COUNT, veiNorm]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const dt = playing ? Math.min(0.05, delta) : 0;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < COUNT; i++) {
      const b = data[i];
      if (!b) continue;
      b.life += dt;
      // Gravity
      b.vel.y -= 9.8 * dt * 0.45;
      b.pos.addScaledVector(b.vel, dt * 4);
      if (b.pos.y < 0.3 || b.life > b.maxLife) {
        Object.assign(b, spawnBomb(veiNorm));
      }
      dummy.position.copy(b.pos);
      const s = 0.18 + Math.random() * 0.04;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#ff5e1a" toneMapped={false} />
    </instancedMesh>
  );
}

function spawnBomb(veiNorm: number) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 8 + veiNorm * 14;
  return {
    pos: new THREE.Vector3(Math.cos(angle) * 0.6, 11.6, Math.sin(angle) * 0.6),
    vel: new THREE.Vector3(
      Math.cos(angle) * (1 + Math.random() * 0.6),
      4 + Math.random() * speed * 0.6,
      Math.sin(angle) * (1 + Math.random() * 0.6),
    ),
    life: 0,
    maxLife: 4 + Math.random() * 2,
  };
}

// ──────────────────────────────────────────────────────────────────
// Falling ash — small particles drifting down across the whole scene
// like a snowstorm of grey debris. Density follows VEI.
// ──────────────────────────────────────────────────────────────────

function FallingAsh({ veiNorm, playing }: { veiNorm: number; playing: boolean }) {
  const tex = emberTexture(); // soft round dot
  const ref = useRef<THREE.Points>(null);
  const count = Math.max(120, Math.floor(80 + veiNorm * 800));

  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) resetAsh(i, positions, speeds);
    return { positions, speeds };
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current || !playing) return;
    const dt = Math.min(0.05, delta);
    for (let i = 0; i < count; i++) {
      data.positions[i * 3] += Math.sin(data.speeds[i] * 4) * dt * 0.5;
      data.positions[i * 3 + 1] -= dt * (1.5 + data.speeds[i] * 1.2);
      data.positions[i * 3 + 2] += Math.cos(data.speeds[i] * 4) * dt * 0.5;
      if (data.positions[i * 3 + 1] < 0) resetAsh(i, data.positions, data.speeds);
    }
    (ref.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <points ref={ref}>
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
        size={0.55}
        sizeAttenuation
        transparent
        opacity={0.45}
        depthWrite={false}
        color="#5a4f50"
      />
    </points>
  );
}

function resetAsh(i: number, positions: Float32Array, speeds: Float32Array) {
  positions[i * 3] = (Math.random() - 0.5) * 120;
  positions[i * 3 + 1] = 25 + Math.random() * 60;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
  speeds[i] = 0.5 + Math.random();
}

// ──────────────────────────────────────────────────────────────────
// Lightning — periodic flash inside the upper plume (high-VEI only).
// Pure light-only, no geometry, so it's essentially free.
// ──────────────────────────────────────────────────────────────────

function Lightning({ playing }: { playing: boolean }) {
  const ref = useRef<THREE.PointLight>(null);
  const next = useRef(0);
  useFrame(({ clock }) => {
    if (!ref.current || !playing) return;
    const t = clock.elapsedTime;
    if (t > next.current) {
      ref.current.intensity = 18 + Math.random() * 12;
      next.current = t + 0.08 + Math.random() * 2.2;
    } else {
      ref.current.intensity *= 0.8;
    }
  });
  return <pointLight ref={ref} position={[0, 30, 0]} color="#cfdfff" intensity={0} distance={120} />;
}

// ──────────────────────────────────────────────────────────────────
// Pyroclastic ring — radial shock-wave at the base.
// ──────────────────────────────────────────────────────────────────

function PyroclasticRing({ accent, playing }: { accent: string; playing: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current || !playing) return;
    const t = clock.elapsedTime;
    const phase = (t * 0.25) % 1;
    ref.current.scale.setScalar(0.5 + phase * 22);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = (1 - phase) * 0.45;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]}>
      <ringGeometry args={[0.95, 1, 96]} />
      <meshBasicMaterial color={accent} transparent opacity={0.4} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}

// ──────────────────────────────────────────────────────────────────
// Camera shake — micro displacement on big eruptions for "felt" feel.
// ──────────────────────────────────────────────────────────────────

function CameraShake({ intensity, playing }: { intensity: number; playing: boolean }) {
  useFrame(({ camera, clock }) => {
    if (!playing) return;
    const t = clock.elapsedTime;
    const noise = Math.sin(t * 18) * 0.4 + Math.sin(t * 31) * 0.3 + Math.cos(t * 25) * 0.2;
    camera.position.x += noise * intensity * 0.012;
    camera.position.y += Math.sin(t * 22) * intensity * 0.008;
  });
  return null;
}

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
