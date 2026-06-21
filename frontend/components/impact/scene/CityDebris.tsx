'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CityDebrisProps {
  impactPoint: [number, number, number];
  /** Returns current shockwave radius (scene units) — drives launch timing. */
  shockRadiusFn: () => number;
  footprint?: number;
  count?: number;
  lite?: boolean;
}

interface DebrisChunk {
  ox: number;
  oz: number;
  dist: number;
  /** Local launch direction (x,z = tangent plane, y = up along surface normal). */
  dir: THREE.Vector3;
  speed: number;
  spin: THREE.Vector3;
  /** Slab dimensions. */
  sx: number;
  sy: number;
  sz: number;
  color: THREE.Color;
}

// Malzeme paleti: beton (gri), cam (mavimsi), metal (açık gri-çelik).
const CONCRETE = new THREE.Color('#8b837a');
const GLASS = new THREE.Color('#9fc7e8');
const METAL = new THREE.Color('#c2c6cc');

/**
 * Çöken binalardan havaya/dışa saçılan enkaz: şok dalgası bir binanın ayak
 * izine ulaşınca o noktadan beton/cam/metal parçaları yukarı-dışa fırlar,
 * tepe yapıp yere düşer. Tek InstancedMesh (instanceColor ile malzeme rengi).
 * CityCluster ile aynı footprint'i paylaşır; bağımsızdır (shockRadiusFn okur).
 */
export function CityDebris({
  impactPoint,
  shockRadiusFn,
  footprint = 0.5,
  count = 110,
  lite = false,
}: CityDebrisProps) {
  const n = lite ? Math.round(count / 2) : count;
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const orientation = useMemo(() => {
    const normal = new THREE.Vector3(...impactPoint).normalize();
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    return quat;
  }, [impactPoint]);

  const chunks = useMemo<DebrisChunk[]>(() => {
    let seed = 90210;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    const out: DebrisChunk[] = [];
    for (let i = 0; i < n; i++) {
      const angle = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * footprint;
      const ox = Math.cos(angle) * r;
      const oz = Math.sin(angle) * r;
      // Yön: merkezden dışa + güçlü yukarı bileşen.
      const out2 = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const dir = out2
        .multiplyScalar(0.35 + rng() * 0.7)
        .add(new THREE.Vector3(0, 1.2 + rng() * 1.1, 0))
        .add(new THREE.Vector3(rng() - 0.5, 0, rng() - 0.5).multiplyScalar(0.4))
        .normalize();
      const matRoll = rng();
      const color =
        matRoll > 0.78 ? METAL : matRoll > 0.5 ? GLASS : CONCRETE;
      const isGlass = color === GLASS;
      const base = 0.012 + rng() * 0.02;
      out.push({
        ox,
        oz,
        dist: Math.hypot(ox, oz),
        dir,
        speed: 0.5 + Math.pow(rng(), 1.4) * 1.7,
        spin: new THREE.Vector3(rng() * 6 - 3, rng() * 6 - 3, rng() * 6 - 3),
        sx: base * (0.8 + rng() * 0.8),
        sy: isGlass ? base * 0.25 : base * (0.6 + rng() * 0.9),
        sz: base * (0.8 + rng() * 0.8),
        color,
      });
    }
    return out;
  }, [n, footprint]);

  // Bir parçanın fırlatıldığı an (yerel saat). -1 = henüz değil.
  const births = useRef<Float32Array>(new Float32Array(n).fill(-1));
  const tick = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Malzeme renklerini bir kez ata.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < n; i++) {
      const c = chunks[i];
      if (c) mesh.setColorAt(i, c.color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // Başlangıçta hepsi gizli (sıfır ölçek).
    dummy.scale.setScalar(0);
    dummy.position.set(0, -999, 0);
    dummy.updateMatrix();
    for (let i = 0; i < n; i++) mesh.setMatrixAt(i, dummy.matrix);
    mesh.instanceMatrix.needsUpdate = true;
  }, [chunks, n, dummy]);

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    tick.current += dt;
    const shockR = shockRadiusFn();
    const lifetime = 2.0;
    let anyVisible = false;

    for (let i = 0; i < n; i++) {
      const c = chunks[i]!;
      let birth = births.current[i]!;
      if (birth < 0) {
        if (shockR > c.dist && shockR > 0) {
          birth = tick.current;
          births.current[i] = birth;
        } else {
          continue; // henüz fırlamadı (matris zaten sıfır ölçek)
        }
      }
      const age = tick.current - birth;
      if (age > lifetime) {
        dummy.scale.setScalar(0);
        dummy.position.set(0, -999, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }
      anyVisible = true;
      const travel = c.speed * age;
      const y = c.dir.y * travel - 0.5 * 2.4 * age * age; // yerçekimi parabolü
      dummy.position.set(c.ox + c.dir.x * travel, Math.max(-0.02, y), c.oz + c.dir.z * travel);
      dummy.rotation.set(c.spin.x * age, c.spin.y * age, c.spin.z * age);
      // Son %25'te küçülerek kaybol.
      const shrink = age > lifetime * 0.75 ? 1 - (age - lifetime * 0.75) / (lifetime * 0.25) : 1;
      dummy.scale.set(c.sx * shrink, c.sy * shrink, c.sz * shrink);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.visible = anyVisible;
  });

  return (
    <group position={impactPoint} quaternion={orientation}>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, n]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.7} metalness={0.25} />
      </instancedMesh>
    </group>
  );
}
