'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useLiteMode } from '@/hooks/useLiteMode';

interface Keyframe {
  t: number; // 0..1 normalize
  pos: [number, number, number];
  lookAt: [number, number, number];
  caption: string;
}

const KEYFRAMES: readonly Keyframe[] = [
  {
    t: 0,
    pos: [-50, 8, 0],
    lookAt: [0, 0, 0],
    caption: 'Güneş Sistemi — Dünya yörünge düzleminde',
  },
  {
    t: 0.18,
    pos: [-30, 18, 35],
    lookAt: [0, 0, 0],
    caption: "İç gezegenler — Dünya'nın komşuları",
  },
  {
    t: 0.4,
    pos: [-15, 8, 18],
    lookAt: [0, 0, 0],
    caption: 'Dünya — atmosferi ve tek doğal uydusu Ay',
  },
  {
    t: 0.6,
    pos: [-8, 5, 12],
    lookAt: [6, 0, 6],
    caption: 'Yer-yakın asteroit — yörüngesi Dünya yörüngesini kesiyor',
  },
  {
    t: 0.78,
    pos: [10, 4, -2],
    lookAt: [6, 0, 6],
    caption: 'NEO yakın geçişi — JPL Horizons takibi altında',
  },
  {
    t: 0.92,
    pos: [-25, 25, 25],
    lookAt: [0, 0, 0],
    caption: 'CLIFF — gerçek-zamanlı tehdit izleme',
  },
  {
    t: 1.0,
    pos: [-50, 8, 0],
    lookAt: [0, 0, 0],
    caption: 'Yeniden başa',
  },
];

const TOUR_DURATION_S = 30;

interface CinematicSceneProps {
  /** Caption text update için callback — overlay içinden gösterilir */
  onCaptionChange?: (caption: string, progress: number) => void;
}

function lerp3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function CameraTour({
  onCaptionChange,
}: {
  onCaptionChange?: (caption: string, progress: number) => void;
}) {
  const startTime = useRef<number | null>(null);

  useFrame(({ clock, camera }) => {
    if (startTime.current == null) startTime.current = clock.elapsedTime;
    const elapsed = (clock.elapsedTime - startTime.current) % TOUR_DURATION_S;
    const t = elapsed / TOUR_DURATION_S;

    // Find segment
    let prev = KEYFRAMES[0]!;
    let next = KEYFRAMES[KEYFRAMES.length - 1]!;
    for (let i = 0; i < KEYFRAMES.length - 1; i += 1) {
      const a = KEYFRAMES[i]!;
      const b = KEYFRAMES[i + 1]!;
      if (t >= a.t && t <= b.t) {
        prev = a;
        next = b;
        break;
      }
    }
    const segT =
      next.t === prev.t ? 0 : (t - prev.t) / (next.t - prev.t);
    // Smooth easing (smoothstep)
    const eased = segT * segT * (3 - 2 * segT);

    const pos = lerp3(prev.pos, next.pos, eased);
    const lookAt = lerp3(prev.lookAt, next.lookAt, eased);

    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(new THREE.Vector3(...lookAt));

    onCaptionChange?.(prev.caption, t);
  });

  return null;
}

function Asteroid({ position }: { position: [number, number, number] }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (mesh.current) {
      mesh.current.rotation.x += delta * 0.4;
      mesh.current.rotation.y += delta * 0.2;
    }
  });
  return (
    <mesh ref={mesh} position={position}>
      <icosahedronGeometry args={[1.2, 1]} />
      <meshStandardMaterial
        color="#a89070"
        roughness={0.95}
        metalness={0.05}
      />
    </mesh>
  );
}

function Earth() {
  const mesh = useRef<THREE.Mesh>(null);
  const moonPivot = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * 0.1;
    if (moonPivot.current) moonPivot.current.rotation.y += delta * 0.3;
  });
  return (
    <group>
      <mesh ref={mesh}>
        <sphereGeometry args={[3, 48, 48]} />
        <meshStandardMaterial
          color="#1e3a8a"
          roughness={0.6}
          metalness={0.1}
          emissive="#0c1a44"
          emissiveIntensity={0.15}
        />
      </mesh>
      <group ref={moonPivot}>
        <mesh position={[6, 0, 0]}>
          <sphereGeometry args={[0.6, 24, 24]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.95} />
        </mesh>
      </group>
    </group>
  );
}

function Sun() {
  return (
    <mesh position={[-220, 28, 60]}>
      <sphereGeometry args={[8, 32, 32]} />
      <meshBasicMaterial color="#fff5b3" />
      <pointLight color="#fff8d8" intensity={3.5} distance={2000} decay={0.3} />
    </mesh>
  );
}

function StarField({ count = 4000 }: { count?: number }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const r = 300 + Math.random() * 200;
      const phi = Math.random() * Math.PI * 2;
      const cosTheta = Math.random() * 2 - 1;
      const theta = Math.acos(cosTheta);
      arr[i * 3] = r * Math.sin(theta) * Math.cos(phi);
      arr[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      arr[i * 3 + 2] = r * Math.cos(theta);
    }
    return arr;
  }, [count]);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.6}
        sizeAttenuation
        transparent
        opacity={0.8}
      />
    </points>
  );
}

export function CinematicScene({ onCaptionChange }: CinematicSceneProps) {
  const liteMode = useLiteMode();
  const dpr: [number, number] = liteMode ? [1, 1] : [1, 1.5];
  const starCount = liteMode ? 1500 : 4000;

  return (
    <Canvas
      shadows={false}
      dpr={dpr}
      gl={{
        antialias: !liteMode,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
      }}
      camera={{ position: [-50, 8, 0], near: 0.1, far: 2000, fov: 50 }}
      onCreated={({ scene, gl }) => {
        scene.background = new THREE.Color(0x000000);
        gl.setClearColor(0x000000, 1);
      }}
    >
      <CameraTour onCaptionChange={onCaptionChange} />
      <ambientLight intensity={0.2} />
      <hemisphereLight args={['#1a2030', '#000000', 0.07]} />
      <directionalLight
        position={[-180, 60, 80]}
        intensity={1.4}
        color="#fff5e0"
      />
      <StarField count={starCount} />
      <Sun />
      <Earth />
      <Asteroid position={[6, 0, 6]} />
      <Asteroid position={[-4, 2, -8]} />
    </Canvas>
  );
}

export { TOUR_DURATION_S };
