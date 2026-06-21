'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface FallenForestProps {
  impactPoint: [number, number, number];
  shockRadiusFn: () => number;
  footprint?: number;
  count?: number;
}

interface TreeSlot {
  ox: number;
  oz: number;
  /** Outward azimuth (radians) so falling tree points away from epicenter. */
  azimuth: number;
  dist: number;
  height: number;
}

// Paylaşılan birim geometri + malzeme — 200 ayrı mesh yerine tek InstancedMesh.
// Birim yükseklikli silindir (radius geometriden sabit); yükseklik per-instance
// scale.y ile uygulanır.
const TREE_GEO = new THREE.CylinderGeometry(0.004, 0.005, 1, 6);
const TREE_MAT = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#3a2a1e'),
  roughness: 0.95,
  metalness: 0,
});

// Matris scratch — kare başına tahsisat yok.
const _fm = new THREE.Matrix4();
const _fm2 = new THREE.Matrix4();

/** Ağacın matrisini orijinal iç içe dönüşümle kur: T_pos · R_yaw · T_up · R_tilt · S.
 *  Devrilme (R_tilt) ağacın ORTA NOKTASI etrafında döner (orijinal mesh
 *  position=[0,height/2,0] + rotation.x davranışı birebir). */
function buildTreeMatrix(
  out: THREE.Matrix4,
  ox: number,
  oz: number,
  azimuth: number,
  height: number,
  tilt: number,
): void {
  out.makeTranslation(ox, 0, oz);
  _fm2.makeRotationY(azimuth);
  out.multiply(_fm2);
  _fm2.makeTranslation(0, height / 2, 0);
  out.multiply(_fm2);
  _fm2.makeRotationX(tilt);
  out.multiply(_fm2);
  _fm2.makeScale(1, height, 1);
  out.multiply(_fm2);
}

/**
 * Tunguska tarzı radyal devrilme: ince silindirler önce dik durur, şok dalgası
 * ulaşınca dışa doğru yatar — meşhur "kelebek" deseni. Performans: tek
 * InstancedMesh (200 ağaç → 1 draw call), per-instance matris ile devrilme.
 */
export function FallenForest({
  impactPoint,
  shockRadiusFn,
  footprint = 0.7,
  count = 200,
}: FallenForestProps) {
  const slots = useMemo<TreeSlot[]>(() => {
    const out: TreeSlot[] = [];
    let seed = 91;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    for (let i = 0; i < count; i++) {
      const r = 0.18 + Math.pow(rng(), 0.55) * (footprint - 0.18);
      const angle = rng() * Math.PI * 2;
      const ox = Math.cos(angle) * r;
      const oz = Math.sin(angle) * r;
      out.push({
        ox,
        oz,
        azimuth: angle,
        dist: Math.hypot(ox, oz),
        height: 0.05 + rng() * 0.05,
      });
    }
    return out;
  }, [count, footprint]);

  const orientation = useMemo(() => {
    const normal = new THREE.Vector3(...impactPoint).normalize();
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    return quat;
  }, [impactPoint]);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const fallen = useRef<boolean[]>([]);
  const dirty = useRef<boolean[]>([]);
  const curTilt = useRef<number[]>([]);

  // Başlangıç: tüm ağaçlar dik (tilt 0).
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const n = slots.length;
    fallen.current = new Array(n).fill(false);
    dirty.current = new Array(n).fill(false);
    curTilt.current = new Array(n).fill(0);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < n; i++) {
      const s = slots[i]!;
      buildTreeMatrix(_fm, s.ox, s.oz, s.azimuth, s.height, 0);
      mesh.setMatrixAt(i, _fm);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [slots]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const shockR = shockRadiusFn();
    let touched = false;
    const target = -Math.PI / 2;

    for (let i = 0; i < slots.length; i++) {
      const s = slots[i]!;
      if (!fallen.current[i] && shockR > s.dist) {
        fallen.current[i] = true;
        dirty.current[i] = true;
      }
      if (!dirty.current[i]) continue; // dik + dokunulmamış → atla

      const tilt = THREE.MathUtils.lerp(curTilt.current[i]!, target, 0.08);
      curTilt.current[i] = tilt;
      buildTreeMatrix(_fm, s.ox, s.oz, s.azimuth, s.height, tilt);
      mesh.setMatrixAt(i, _fm);
      touched = true;
      if (Math.abs(tilt - target) < 1e-3) dirty.current[i] = false; // yakınsadı
    }

    if (touched) mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={impactPoint} quaternion={orientation}>
      <instancedMesh
        ref={meshRef}
        args={[TREE_GEO, TREE_MAT, count]}
        frustumCulled={false}
      />
    </group>
  );
}
