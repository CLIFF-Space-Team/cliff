'use client';

import { Trail } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { ProceduralAsteroid } from '@/components/3d/asteroids/ProceduralAsteroid';
import type { Composition } from '@/lib/impact-physics';

const ASTEROID_MAP_TYPE: Record<Composition, 'M' | 'S' | 'C' | 'V'> = {
  iron: 'M',
  stony: 'S',
  carbonaceous: 'C',
  icy: 'V',
};

// Bileşime göre parçalanma karakteri — parça sayısı çarpanı + kor rengi (HSL).
// icy buraya düşmez (CometEntry ile render edilir) ama bütünlük için tanımlı.
const COMP_FRAGMENT: Record<Composition, { countMul: number; hue: number; sat: number; light: number }> = {
  iron: { countMul: 0.7, hue: 0.09, sat: 0.35, light: 0.72 }, // beyaz-akkor metalik kıvılcım
  stony: { countMul: 1.0, hue: 0.05, sat: 0.85, light: 0.55 }, // turuncu kor
  carbonaceous: { countMul: 1.7, hue: 0.03, sat: 0.9, light: 0.42 }, // koyu/kızıl, çok parça
  icy: { countMul: 1.4, hue: 0.55, sat: 0.5, light: 0.7 },
};

// ── Zaman çizelgesi ────────────────────────────────────────────
//  0.00 – 0.46  tek kaya yaklaşımı (derin uzay → atmosfer üstü)
//  0.46         AERODİNAMİK PARÇALANMA — kaya patlar, flaş + parça saçılması
//  0.46 – 0.62  parça yağmuru (her biri plazma izi bırakarak iner)
//  > 0.62       çarpma (parçalar flaşa karışır, gizlenir)
const BREAKUP = 0.46;
const IMPACT = 0.62;

interface AsteroidEntryProps {
  diameterM: number;
  composition: Composition;
  /** Yüzeydeki çarpma noktası (sahne-uzayı). */
  target: [number, number, number];
  progress: number;
}

/**
 * Bilimsel atmosferik parçalanma: cisim, en yüksek aerodinamik basınç
 * altında (atmosfer üstünde) çoklu parçaya bölünür — gerçek bolide breakup
 * (Çelyabinsk 2013). Tek kaya girer, parça yağmuruna dönüşüp inerek çarpar.
 */
export function AsteroidEntry({
  diameterM,
  composition,
  target,
  progress,
}: AsteroidEntryProps) {
  const visualSize = Math.max(0.06, Math.min(0.5, Math.log10(diameterM + 1) * 0.16));
  const seed = useMemo(
    () => (composition.charCodeAt(0) * 7919 + Math.round(diameterM)) >>> 0,
    [composition, diameterM],
  );

  const targetV = useMemo(() => new THREE.Vector3(...target), [target]);
  const normal = useMemo(() => targetV.clone().normalize(), [targetV]);
  const startPos = useMemo(
    () => new THREE.Vector3(target[0] + 6, target[1] + 11, target[2] + 6),
    [target],
  );
  // Parçalanma noktası — yüzeyin ~2.4 birim üstünde (atmosfer üst katmanı).
  const breakupPos = useMemo(
    () => targetV.clone().add(normal.clone().multiplyScalar(2.4)),
    [targetV, normal],
  );

  // Bileşim parçalanma karakteri:
  //  • carbonaceous (rubble pile) → çok sayıda parça, koyu/kızıl ve sönük kor
  //  • iron (metalik) → az ama dayanıklı parça, beyaz-akkor metal kıvılcımları
  //  • stony → arada (varsayılan)
  const compFrag = COMP_FRAGMENT[composition] ?? COMP_FRAGMENT.stony;
  const baseFrag = diameterM > 300 ? 9 : diameterM > 60 ? 7 : 5;
  const fragCount = Math.max(3, Math.min(14, Math.round(baseFrag * compFrag.countMul)));

  const frags = useMemo(() => {
    const rng = mulberry32(seed);
    // Yüzeye teğet baz — parçaları yanlara saçmak için.
    let t1 = new THREE.Vector3(0, 1, 0).cross(normal);
    if (t1.lengthSq() < 1e-4) t1 = new THREE.Vector3(1, 0, 0).cross(normal);
    t1.normalize();
    const t2 = normal.clone().cross(t1).normalize();

    return Array.from({ length: fragCount }, (_, i) => {
      const ang = rng() * Math.PI * 2;
      const spread = 0.35 + rng() * 1.0;
      const lateral = t1
        .clone()
        .multiplyScalar(Math.cos(ang) * spread)
        .addScaledVector(t2, Math.sin(ang) * spread);
      // İniş noktası — çarpma çevresine küçük saçılma, yüzeye oturtulur.
      const land = targetV
        .clone()
        .add(lateral.clone().multiplyScalar(0.22 + rng() * 0.4));
      land.normalize().multiplyScalar(targetV.length());
      return {
        size: visualSize * (0.3 + rng() * 0.55),
        land,
        spin: new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(10),
        seed: (seed + i * 131 + 17) >>> 0,
        delay: rng() * 0.05,
        hue: compFrag.hue + rng() * 0.03,
        sat: compFrag.sat,
        light: compFrag.light,
      };
    });
  }, [seed, normal, targetV, visualSize, fragCount, compFrag]);

  // Trail'ler ve parçalar yalnızca kendi aktif pencerelerinde MOUNT edilir —
  // aksi halde drei <Trail> tüm timeline boyunca her kare bir meshline çizip
  // geometri günceller (görünmez olsa bile). Pencere dışında mount edilmezler.
  const showMain = progress < BREAKUP;
  const showFlash = progress >= BREAKUP && progress <= BREAKUP + 0.08;
  const showFrags = progress >= BREAKUP - 0.02 && progress < IMPACT;

  return (
    <>
      {showMain && (
        <MainRock
          visualSize={visualSize}
          composition={composition}
          seed={seed}
          startPos={startPos}
          breakupPos={breakupPos}
          progress={progress}
        />
      )}
      {showFlash && <BreakupFlash position={breakupPos} progress={progress} />}
      {showFrags &&
        frags.map((f, i) => (
          <Fragment key={i} frag={f} breakupPos={breakupPos} progress={progress} />
        ))}
    </>
  );
}

// ── Ana kaya — parçalanmaya kadar tek cisim ────────────────────
function MainRock({
  visualSize,
  composition,
  seed,
  startPos,
  breakupPos,
  progress,
}: {
  visualSize: number;
  composition: Composition;
  seed: number;
  startPos: THREE.Vector3;
  breakupPos: THREE.Vector3;
  progress: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const heatRef = useRef<THREE.Mesh>(null);
  const heatMat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    if (progress >= BREAKUP) {
      g.visible = false;
      return;
    }
    g.visible = true;
    const t = THREE.MathUtils.clamp(progress / BREAKUP, 0, 1);
    const eased = Math.pow(t, 1.5);
    g.position.lerpVectors(startPos, breakupPos, eased);
    g.rotation.x += 0.04;
    g.rotation.y += 0.06;
    // Plazma zarfı — son %35'te alevlenir.
    const heat = Math.max(0, (t - 0.55) / 0.45);
    if (heatRef.current && heatMat.current) {
      heatRef.current.visible = heat > 0.01;
      heatMat.current.opacity = 0.9 * heat;
    }
  });

  return (
    <Trail width={visualSize * 7} length={6} decay={2.2} attenuation={(t) => t * t} color={'#ffb347'}>
      <group ref={groupRef}>
        <ProceduralAsteroid
          position={[0, 0, 0]}
          scale={visualSize}
          type={ASTEROID_MAP_TYPE[composition]}
          seed={seed}
          detail={3}
        />
        <mesh ref={heatRef} scale={visualSize * 1.6} visible={false}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial
            ref={heatMat}
            color="#ff8a3a"
            transparent
            opacity={0}
            side={THREE.BackSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
    </Trail>
  );
}

// ── Parçalanma flaşı — patlama anı ─────────────────────────────
function BreakupFlash({
  position,
  progress,
}: {
  position: THREE.Vector3;
  progress: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const inWin = progress >= BREAKUP && progress <= BREAKUP + 0.08;
    m.visible = inWin;
    if (!inWin) return;
    const local = (progress - BREAKUP) / 0.08;
    m.scale.setScalar(0.3 + local * 2.2);
    (m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - local) * 0.9;
  });
  return (
    <mesh ref={ref} position={position} visible={false}>
      <sphereGeometry args={[1, 20, 20]} />
      <meshBasicMaterial
        color="#fff2cf"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

interface FragData {
  size: number;
  land: THREE.Vector3;
  spin: THREE.Vector3;
  seed: number;
  delay: number;
  hue: number;
  sat: number;
  light: number;
}

// ── Tek parça — plazma izi bırakarak iner ──────────────────────
function Fragment({
  frag,
  breakupPos,
  progress,
}: {
  frag: FragData;
  breakupPos: THREE.Vector3;
  progress: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const rng = mulberry32(frag.seed);
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      v.multiplyScalar(0.78 + rng() * 0.44);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }, [frag.seed]);
  // geometry={geometry} prop'u R3F tarafından auto-dispose EDİLMEZ → sızıntıyı önle.
  useEffect(() => () => geometry.dispose(), [geometry]);

  const color = useMemo(
    () => new THREE.Color().setHSL(frag.hue, frag.sat, frag.light),
    [frag.hue, frag.sat, frag.light],
  );

  useFrame((_, dt) => {
    const g = groupRef.current;
    if (!g) return;
    const inWin = progress >= BREAKUP && progress < IMPACT;
    g.visible = inWin;
    if (!inWin) return;

    const span = IMPACT - BREAKUP;
    const local = THREE.MathUtils.clamp((progress - BREAKUP - frag.delay) / (span - frag.delay), 0, 1);
    // Hafif başta dağıl, sonra hızlanarak yüzeye in.
    const eased = Math.pow(local, 1.35);
    g.position.lerpVectors(breakupPos, frag.land, eased);
    g.rotation.x += dt * frag.spin.x;
    g.rotation.y += dt * frag.spin.y;
    g.rotation.z += dt * frag.spin.z;
    // İndikçe daha çok ısınır → glow parlar.
    if (glowMat.current) {
      glowMat.current.opacity = 0.35 + 0.55 * local;
    }
  });

  return (
    <Trail
      width={frag.size * 9}
      length={5}
      decay={2.6}
      attenuation={(t) => t * t}
      color={color}
    >
      <group ref={groupRef} scale={frag.size} visible={false}>
        {/* Kaya çekirdeği — karanlık, ısınan emissive */}
        <mesh geometry={geometry}>
          <meshStandardMaterial
            color="#2a221c"
            roughness={0.95}
            metalness={0.05}
            emissive={color}
            emissiveIntensity={1.4}
          />
        </mesh>
        {/* Plazma parıltı zarfı */}
        <mesh scale={1.8}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            ref={glowMat}
            color={color}
            transparent
            opacity={0.4}
            side={THREE.BackSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
    </Trail>
  );
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
