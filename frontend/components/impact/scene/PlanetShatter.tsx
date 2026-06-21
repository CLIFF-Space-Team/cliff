'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Üstünde gezegenin parçalandığı enerji eşiği (Mt). K-Pg sınıfı ve üstü. */
export const PLANET_SHATTER_THRESHOLD_MT = 1_000_000;

interface PlanetShatterProps {
  earthRadius: number;
  /** 0..1 timeline cursor. */
  progress: number;
  /** Parça sayısını ölçekler (daha çok enerji → daha çok kabuk parçası). */
  energyMegatons: number;
  lite?: boolean;
}

// Parçalanma çarpma doruğunda başlar.
const SHATTER_START = 0.64;
const SHATTER_SPAN = 0.3;

/**
 * Solar Smash finali: aşırı enerjide (≥ ~1e6 Mt) gezegenin kabuğu kırılır —
 * N kalkan-parçası küreden ayrılıp uzaya fırlar, altta akkor erimiş çekirdek
 * açığa çıkar. Yalnızca eşik üstünde MOUNT edilir (ImpactVisualization3D
 * tarafından kapı tutulur), bu yüzden burada her zaman aktif kabul edilir.
 */
export function PlanetShatter({
  earthRadius,
  progress,
  energyMegatons,
  lite = false,
}: PlanetShatterProps) {
  const e = useMemo(
    () => THREE.MathUtils.clamp(Math.log10(energyMegatons + 1), 6, 12),
    [energyMegatons],
  );
  // 6 (eşik) → ~40 parça, 12 (uç) → ~110 parça.
  const n = useMemo(() => {
    const base = Math.round(40 + (e - 6) * 12);
    return lite ? Math.round(base / 2) : Math.min(120, base);
  }, [e, lite]);

  const coreRef = useRef<THREE.Mesh>(null);
  const coreMat = useRef<THREE.MeshStandardMaterial>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);
  const shardsRef = useRef<THREE.InstancedMesh>(null);

  // Fibonacci küresi — kabuk parçalarının başlangıç yönleri (yüzeyi kaplar).
  const shards = useMemo(() => {
    const out: {
      dir: THREE.Vector3;
      quat: THREE.Quaternion;
      launch: number;
      spinAxis: THREE.Vector3;
      spinRate: number;
      size: number;
    }[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    let seed = 1234567;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / Math.max(1, n - 1)) * 2; // 1 → -1
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      const dir = new THREE.Vector3(
        Math.cos(theta) * radius,
        y,
        Math.sin(theta) * radius,
      ).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir,
      );
      out.push({
        dir,
        quat,
        launch: 0.7 + rng() * 2.2,
        spinAxis: new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(),
        spinRate: 2 + rng() * 5,
        size: (0.9 + rng() * 0.7) * earthRadius * 0.26,
      });
    }
    return out;
  }, [n, earthRadius]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const spinQuat = useMemo(() => new THREE.Quaternion(), []);

  useFrame(() => {
    const shatterT = THREE.MathUtils.clamp(
      (progress - SHATTER_START) / SHATTER_SPAN,
      0,
      1,
    );
    const active = progress >= SHATTER_START;

    // ── Erimiş çekirdek — kabuk açılınca parlar, hafif büyür ──
    if (coreRef.current && coreMat.current) {
      coreRef.current.visible = active;
      const fade = Math.min(1, shatterT * 2.2);
      coreMat.current.opacity = fade;
      coreMat.current.emissiveIntensity = 1.0 + shatterT * 3.2;
      const s = earthRadius * (1.004 + shatterT * 0.03);
      coreRef.current.scale.setScalar(s);
    }
    if (glowRef.current && glowMat.current) {
      glowRef.current.visible = active;
      glowMat.current.opacity = Math.min(0.7, shatterT * 0.8);
      glowRef.current.scale.setScalar(earthRadius * (1.05 + shatterT * 0.12));
    }

    // ── Kabuk parçaları — küreden dışa fırlar, döner ──
    const mesh = shardsRef.current;
    if (mesh) {
      mesh.visible = active && shatterT > 0.001;
      if (mesh.visible) {
        for (let i = 0; i < n; i++) {
          const s = shards[i]!;
          const radial = earthRadius * 1.01 + shatterT * s.launch * earthRadius;
          dummy.position.copy(s.dir).multiplyScalar(radial);
          spinQuat.setFromAxisAngle(s.spinAxis, shatterT * s.spinRate);
          tmpQuat.copy(spinQuat).multiply(s.quat);
          dummy.quaternion.copy(tmpQuat);
          const pop = Math.min(1, shatterT * 6);
          // Kalkan plakası: teğet düzlemde geniş, kalınlık ince (y ekseni).
          dummy.scale.set(s.size * pop, s.size * 0.18 * pop, s.size * pop);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      {/* Erimiş çekirdek — dokulu Dünya'yı örten akkor küre */}
      <mesh ref={coreRef} visible={false}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial
          ref={coreMat}
          color="#3a0a02"
          emissive="#ff5a1e"
          emissiveIntensity={1.0}
          roughness={0.6}
          metalness={0.0}
          toneMapped={false}
          transparent
          opacity={0}
        />
      </mesh>

      {/* Çekirdek dış parıltısı (bloom halesi) */}
      <mesh ref={glowRef} visible={false}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          ref={glowMat}
          color="#ff7a30"
          transparent
          opacity={0}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Kabuk-kalkan parçaları */}
      <instancedMesh
        ref={shardsRef}
        args={[undefined, undefined, n]}
        frustumCulled={false}
        visible={false}
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#2b2622"
          roughness={0.9}
          metalness={0.05}
          emissive="#5a1a06"
          emissiveIntensity={0.4}
          flatShading
        />
      </instancedMesh>
    </group>
  );
}
