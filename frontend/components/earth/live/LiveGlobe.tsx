'use client';

import { OrbitControls, useTexture } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

import { PostFX } from '@/components/3d/postprocessing/PostFX';
import { StarField } from '@/components/3d/primitives/StarField';
import { useLiteMode } from '@/hooks/useLiteMode';
import type { EarthCategoryMeta, EarthEvent } from '@/lib/earth-types';

import { LiveEventMarkers } from './LiveEventMarkers';

const GLOBE_R = 2;
const DEG = Math.PI / 180;
const SUN = new THREE.Vector3(5, 2.2, 4).normalize();

interface LiveGlobeProps {
  events: EarthEvent[];
  categoryMap: Map<string, EarthCategoryMeta>;
  selectedId: string | null;
  selectedPoint: [number, number] | null; // [lng, lat] of the selected event
  onSelect: (e: EarthEvent) => void;
  onHover: (e: EarthEvent | null) => void;
}

/**
 * Cinematic live globe: NASA day/night Earth + atmosphere fresnel + starfield +
 * bloom, gently auto-orbiting. Real natural-event beacons pulse on the surface;
 * selecting one flies the camera to face it. Untilted so [lon,lat] markers align
 * with the equirectangular texture.
 */
export function LiveGlobe({
  events,
  categoryMap,
  selectedId,
  selectedPoint,
  onSelect,
  onHover,
}: LiveGlobeProps) {
  const liteMode = useLiteMode();
  const dpr: [number, number] = liteMode ? [1, 1] : [1, 2];

  return (
    <Canvas
      dpr={dpr}
      gl={{
        antialias: !liteMode,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{ position: [0, 0.6, 5.6], near: 0.1, far: 200, fov: 40 }}
      onCreated={({ scene, gl }) => {
        scene.background = new THREE.Color(0x000000);
        gl.setClearColor(0x000000, 1);
      }}
    >
      <StarField count={liteMode ? 1800 : 4500} radius={90} />
      <ambientLight intensity={0.22} />
      <directionalLight position={[5, 2.2, 4]} intensity={1.5} color="#fff4e6" />
      <directionalLight position={[-6, -2, -4]} intensity={0.28} color="#4d74ff" />

      <Suspense fallback={null}>
        <EarthSurface />
      </Suspense>
      <LiveEventMarkers
        events={events}
        categoryMap={categoryMap}
        selectedId={selectedId}
        radius={GLOBE_R}
        onSelect={onSelect}
        onHover={onHover}
      />

      <CameraFocusRig selectedPoint={selectedPoint} selectedId={selectedId} />
      <PostFX quality={liteMode ? 'low' : 'high'} />
    </Canvas>
  );
}

// ── Earth surface + clouds + atmosphere ────────────────────────
function EarthSurface() {
  const [day, night, clouds, normal, specular] = useTexture([
    '/textures/earth-day.jpg',
    '/textures/earth-night.jpg',
    '/textures/earth-clouds.jpg',
    '/textures/earth-normal.jpg',
    '/textures/earth-specular.jpg',
  ]) as [THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture];
  day.colorSpace = THREE.SRGBColorSpace;
  night.colorSpace = THREE.SRGBColorSpace;
  clouds.colorSpace = THREE.SRGBColorSpace;
  for (const t of [day, night, clouds, normal, specular]) t.anisotropy = 8;

  const cloudsRef = useRef<THREE.Mesh>(null);

  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
        depthWrite: false,
        uniforms: {
          uColor: { value: new THREE.Color('#5aa9ff') },
          uSun: { value: SUN.clone() },
        },
        vertexShader: /* glsl */ `
          varying vec3 vN;
          varying vec3 vView;
          void main() {
            vN = normalize(mat3(modelMatrix) * normal);
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vView = normalize(cameraPosition - wp.xyz);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vN;
          varying vec3 vView;
          uniform vec3 uColor;
          uniform vec3 uSun;
          void main() {
            float fres = pow(1.0 - max(dot(vN, vView), 0.0), 2.6);
            float sunLit = smoothstep(-0.35, 0.5, dot(vN, normalize(uSun)));
            float a = fres * (0.25 + 0.75 * sunLit);
            gl_FragColor = vec4(uColor, clamp(a, 0.0, 1.0));
          }
        `,
      }),
    [],
  );
  useEffect(() => () => atmosphereMaterial.dispose(), [atmosphereMaterial]);

  useFrame((_, dt) => {
    if (cloudsRef.current) cloudsRef.current.rotation.y += dt * 0.006;
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[GLOBE_R, 96, 96]} />
        <meshStandardMaterial
          map={day}
          normalMap={normal}
          normalScale={new THREE.Vector2(0.7, 0.7)}
          roughnessMap={specular}
          roughness={0.9}
          metalness={0.05}
          emissiveMap={night}
          emissive={new THREE.Color('#c8a86a')}
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh ref={cloudsRef} scale={1.008}>
        <sphereGeometry args={[GLOBE_R, 64, 64]} />
        <meshLambertMaterial map={clouds} transparent opacity={0.32} depthWrite={false} />
      </mesh>
      <mesh scale={1.045}>
        <sphereGeometry args={[GLOBE_R, 64, 64]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>
      <mesh scale={1.16}>
        <sphereGeometry args={[GLOBE_R, 32, 32]} />
        <meshBasicMaterial
          color={new THREE.Color('#3d7fd6')}
          transparent
          opacity={0.05}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ── Camera focus rig — fly to the selected event, gentle auto-orbit idle ──
function CameraFocusRig({
  selectedPoint,
  selectedId,
}: {
  selectedPoint: [number, number] | null;
  selectedId: string | null;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const focusing = useRef(false);
  const target = useRef(new THREE.Vector3());

  useEffect(() => {
    if (selectedPoint) {
      const [lng, lat] = selectedPoint;
      const phi = (90 - lat) * DEG;
      const theta = lng * DEG;
      target.current.set(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        -Math.sin(phi) * Math.sin(theta),
      );
      focusing.current = true;
    } else {
      focusing.current = false;
    }
  }, [selectedPoint, selectedId]);

  useFrame(() => {
    const c = controlsRef.current;
    if (!c) return;
    // Auto-orbit when nothing is selected; hold still (user-controllable) when
    // an event is focused so it doesn't drift off-screen.
    c.autoRotate = !selectedId;

    if (focusing.current && selectedId) {
      const dir = target.current;
      const az = Math.atan2(dir.x, dir.z);
      const pol = THREE.MathUtils.clamp(
        Math.acos(THREE.MathUtils.clamp(dir.y, -1, 1)),
        0.4,
        Math.PI - 0.4,
      );
      const curAz = c.getAzimuthalAngle();
      const curPol = c.getPolarAngle();
      let dAz = az - curAz;
      while (dAz > Math.PI) dAz -= Math.PI * 2;
      while (dAz < -Math.PI) dAz += Math.PI * 2;
      const nextAz = curAz + dAz * 0.09;
      const nextPol = curPol + (pol - curPol) * 0.09;
      c.setAzimuthalAngle(nextAz);
      c.setPolarAngle(nextPol);
      if (Math.abs(dAz) < 0.01 && Math.abs(pol - curPol) < 0.01) {
        focusing.current = false; // settled → release to the user
      }
    }
    c.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.45}
      autoRotate
      autoRotateSpeed={0.3}
      minDistance={2.7}
      maxDistance={9}
    />
  );
}
