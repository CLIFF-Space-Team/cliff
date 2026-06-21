'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { ProceduralAsteroid } from '@/components/3d/asteroids/ProceduralAsteroid';

// ── Zaman çizelgesi (buzlu kuyrukluyıldız) ─────────────────────
//  0.00 – 0.50  çekirdek yaklaşımı (koma + Güneş-karşıtı çift kuyruk)
//  0.50 – 0.58  atmosfer girişi — parlak ısınma, koma şişer
//  0.58         HAVA PATLAMASI — buz buharlaşır: flaş + buhar + parça saçılması
//  0.58 – 0.62  buzlu parça yağmuru yüzeye iner
//  > 0.62       çarpma (yer efektleri devralır)
const AIRBURST = 0.58;
const IMPACT = 0.62;

// Güneş yönü — Earth.tsx varsayılan sunDirection ile aynı. Kuyruk daima
// Güneş'in TERS yönüne uzanır (gerçek kuyrukluyıldız fiziği).
const SUN_DIR = new THREE.Vector3(-0.958, 0.122, 0.261).normalize();

interface CometEntryProps {
  diameterM: number;
  /** Yüzeydeki çarpma noktası (sahne-uzayı). */
  target: [number, number, number];
  progress: number;
}

/**
 * Buzlu cisim (komet) girişi: parlak koma + Güneş-karşıtı iyon/toz kuyruğu ile
 * yaklaşır, atmosferde yüksek irtifada patlar (buz hızla buharlaşır → güçlü
 * hava patlaması + buhar), ardından buzlu parçalar yüzeye iner. icy bileşim
 * seçildiğinde AsteroidEntry yerine bu render edilir.
 */
export function CometEntry({ diameterM, target, progress }: CometEntryProps) {
  const visualSize = Math.max(0.05, Math.min(0.3, Math.log10(diameterM + 1) * 0.12));
  const seed = useMemo(() => (86 * 7919 + Math.round(diameterM)) >>> 0, [diameterM]);

  const targetV = useMemo(() => new THREE.Vector3(...target), [target]);
  const normal = useMemo(() => targetV.clone().normalize(), [targetV]);
  const startPos = useMemo(
    () => new THREE.Vector3(target[0] + 6, target[1] + 11, target[2] + 6),
    [target],
  );
  // Patlama noktası — yüzeyin ~2.6 birim üstünde (icy cisimler yüksekte patlar).
  const burstPos = useMemo(
    () => targetV.clone().add(normal.clone().multiplyScalar(2.6)),
    [targetV, normal],
  );

  const fragCount = diameterM > 400 ? 10 : 8;
  const frags = useMemo(() => {
    const rng = mulberry32(seed);
    let t1 = new THREE.Vector3(0, 1, 0).cross(normal);
    if (t1.lengthSq() < 1e-4) t1 = new THREE.Vector3(1, 0, 0).cross(normal);
    t1.normalize();
    const t2 = normal.clone().cross(t1).normalize();
    return Array.from({ length: fragCount }, (_, i) => {
      const ang = rng() * Math.PI * 2;
      const spread = 0.4 + rng() * 1.1;
      const lateral = t1
        .clone()
        .multiplyScalar(Math.cos(ang) * spread)
        .addScaledVector(t2, Math.sin(ang) * spread);
      const land = targetV
        .clone()
        .add(lateral.clone().multiplyScalar(0.24 + rng() * 0.42));
      land.normalize().multiplyScalar(targetV.length());
      return {
        size: visualSize * (0.26 + rng() * 0.5),
        land,
        spin: new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(11),
        seed: (seed + i * 137 + 23) >>> 0,
        delay: rng() * 0.03,
      };
    });
  }, [seed, normal, targetV, visualSize, fragCount]);

  return (
    <>
      <CometNucleus
        visualSize={visualSize}
        seed={seed}
        startPos={startPos}
        burstPos={burstPos}
        progress={progress}
      />
      <AirburstFlash position={burstPos} progress={progress} size={visualSize} />
      <SteamPuff position={burstPos} progress={progress} size={visualSize} />
      {frags.map((f, i) => (
        <IcyFragment key={i} frag={f} burstPos={burstPos} progress={progress} />
      ))}
    </>
  );
}

// ── Çekirdek + koma + çift kuyruk ──────────────────────────────
function CometNucleus({
  visualSize,
  seed,
  startPos,
  burstPos,
  progress,
}: {
  visualSize: number;
  seed: number;
  startPos: THREE.Vector3;
  burstPos: THREE.Vector3;
  progress: number;
}) {
  const groupRef = useRef<THREE.Group>(null); // sadece konum
  const nucleusRef = useRef<THREE.Group>(null); // sadece dönüş (kuyruğu döndürmesin)
  const comaMat = useRef<THREE.MeshBasicMaterial>(null);

  // Kuyruk yönü: Güneş'in tersi. Cone yerel +Y'sini bu yöne döndür.
  const tailQuat = useMemo(() => {
    const dir = SUN_DIR.clone().multiplyScalar(-1).normalize();
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return q;
  }, []);
  const tailLen = Math.max(2.2, visualSize * 22);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    if (progress >= AIRBURST) {
      g.visible = false;
      return;
    }
    g.visible = true;
    const t = THREE.MathUtils.clamp(progress / AIRBURST, 0, 1);
    const eased = Math.pow(t, 1.4);
    g.position.lerpVectors(startPos, burstPos, eased);
    if (nucleusRef.current) {
      nucleusRef.current.rotation.x += 0.03;
      nucleusRef.current.rotation.y += 0.05;
    }
    // Koma girişte (son %60) parlar.
    if (comaMat.current) {
      comaMat.current.opacity = 0.4 + 0.45 * Math.max(0, (t - 0.4) / 0.6);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Çekirdek — buzlu kaya (V-tipi), bağımsız döner */}
      <group ref={nucleusRef}>
        <ProceduralAsteroid position={[0, 0, 0]} scale={visualSize} type="V" seed={seed} detail={3} />
      </group>

      {/* Koma — buzlu mavi-beyaz parıltı zarfı */}
      <mesh scale={visualSize * 3.4}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          ref={comaMat}
          color="#bfe3ff"
          transparent
          opacity={0.4}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Çift kuyruk — Güneş-karşıtı. İyon (mavi, düz) + toz (sarımsı, geniş). */}
      <group quaternion={tailQuat}>
        <mesh position={[0, tailLen / 2, 0]}>
          <coneGeometry args={[visualSize * 2.4, tailLen, 20, 1, true]} />
          <meshBasicMaterial
            color="#7fc4ff"
            transparent
            opacity={0.26}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh position={[0, tailLen * 0.4, 0]} rotation={[0, 0, 0.14]}>
          <coneGeometry args={[visualSize * 3.0, tailLen * 0.78, 20, 1, true]} />
          <meshBasicMaterial
            color="#ffe6b0"
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
    </group>
  );
}

// ── Hava patlaması flaşı — buzlu detonasyon ────────────────────
function AirburstFlash({
  position,
  progress,
  size,
}: {
  position: THREE.Vector3;
  progress: number;
  size: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const inWin = progress >= AIRBURST && progress <= AIRBURST + 0.09;
    m.visible = inWin;
    if (!inWin) return;
    const local = (progress - AIRBURST) / 0.09;
    m.scale.setScalar(size * (3 + local * 22));
    (m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - local) * 0.95;
  });
  return (
    <mesh ref={ref} position={position} visible={false}>
      <sphereGeometry args={[1, 20, 20]} />
      <meshBasicMaterial
        color="#e8f4ff"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── Buhar bulutu — buz buharlaşır, yavaşça yayılıp dağılır ──────
function SteamPuff({
  position,
  progress,
  size,
}: {
  position: THREE.Vector3;
  progress: number;
  size: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const inWin = progress >= AIRBURST && progress <= 0.92;
    m.visible = inWin;
    if (!inWin) return;
    const local = (progress - AIRBURST) / 0.34;
    m.scale.setScalar(size * (2 + Math.min(1, local * 1.5) * 16));
    // Buhar diffuse — additive değil; yumuşak, yarı saydam beyaz-mavi.
    (m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.5 - local * 0.5);
  });
  return (
    <mesh ref={ref} position={position} visible={false}>
      <sphereGeometry args={[1, 20, 20]} />
      <meshBasicMaterial color="#dfeaff" transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

interface IcyFragData {
  size: number;
  land: THREE.Vector3;
  spin: THREE.Vector3;
  seed: number;
  delay: number;
}

// ── Buzlu parça — patlamadan sonra yüzeye iner ─────────────────
function IcyFragment({
  frag,
  burstPos,
  progress,
}: {
  frag: IcyFragData;
  burstPos: THREE.Vector3;
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
      v.multiplyScalar(0.74 + rng() * 0.5);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }, [frag.seed]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, dt) => {
    const g = groupRef.current;
    if (!g) return;
    const inWin = progress >= AIRBURST && progress < IMPACT;
    g.visible = inWin;
    if (!inWin) return;
    const span = IMPACT - AIRBURST;
    const local = THREE.MathUtils.clamp(
      (progress - AIRBURST - frag.delay) / (span - frag.delay),
      0,
      1,
    );
    const eased = Math.pow(local, 1.3);
    g.position.lerpVectors(burstPos, frag.land, eased);
    g.rotation.x += dt * frag.spin.x;
    g.rotation.y += dt * frag.spin.y;
    g.rotation.z += dt * frag.spin.z;
    if (glowMat.current) glowMat.current.opacity = 0.4 + 0.5 * local;
  });

  return (
    <group ref={groupRef} scale={frag.size} visible={false}>
      {/* Buz çekirdeği — soğuk parıltılı */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#cfe6ff"
          roughness={0.4}
          metalness={0.0}
          emissive="#8fd0ff"
          emissiveIntensity={1.2}
        />
      </mesh>
      {/* Buharlı parıltı zarfı */}
      <mesh scale={1.9}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          ref={glowMat}
          color="#bfe3ff"
          transparent
          opacity={0.45}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
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
