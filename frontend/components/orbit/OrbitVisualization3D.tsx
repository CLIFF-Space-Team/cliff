'use client';

import { Line, OrbitControls, Trail } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { ProceduralAsteroid } from '@/components/3d/asteroids/ProceduralAsteroid';
import {
  EarthReferenceOrbit,
  TrajectoryLine,
} from '@/components/3d/asteroids/TrajectoryLine';
import { PostFX } from '@/components/3d/postprocessing/PostFX';
import { Earth } from '@/components/3d/primitives/Earth';
import { StarField } from '@/components/3d/primitives/StarField';
import { CinematicSun } from '@/components/orbit/CinematicSun';
import { useLiteMode } from '@/hooks/useLiteMode';
import { useNeoRiskDetail } from '@/hooks/useNeoDetail';
import { useOrbit, type OrbitResponse } from '@/hooks/useOrbit';
import type { RiskRecord } from '@/lib/api-types';
import {
  EARTH_ELEMENTS,
  dateToJd,
  eclipticToScene,
  jdToDate,
  periodOf,
  positionAt,
} from '@/lib/orbit-kepler';

const AU_SCALE = 12; // heliosentrik: 1 AU = 12 sahne birimi
const ORIGIN: [number, number, number] = [0, 0, 0];
const LUNAR_KM = 384_400;
const MOON_RING_R = 4; // yaklaşma perdesinde Ay yörüngesi referans yarıçapı (sahne birimi)

// Perde sınırları (döngü fazı 0..1).
const CUT = 0.46; // YÖRÜNGE → YAKLAŞMA kesme noktası
const CLOSEST = 0.74; // yaklaşma perdesinde en yakın geçiş anı

export interface OrbitSceneInfo {
  date: Date;
  caption: string;
  /** Ay uzaklığı cinsinden kaçırma mesafesi (örn. 6.7). */
  lunarRatio: number | null;
}

interface OrbitVisualization3DProps {
  neoId: string;
  playing: boolean;
  speed: number;
  onInfo: (info: OrbitSceneInfo) => void;
}

/**
 * Yönlendirilmiş yaklaşma sineması — iki perde:
 *  1) YÖRÜNGE: cismin Güneş etrafındaki gerçek Kepler yörüngesi (nereden geliyor).
 *  2) YAKLAŞMA: kamera Dünya'ya dalar; Ay'ın yörünge halkası referansıyla
 *     asteroidin gerçek kaçırma-mesafesinden geçişi (slow-mo, "Ay'dan X kat").
 * Veri gerçek (Horizons/Sentry/MC). Oynatırken kamera senaryoludur; duraklatınca
 * serbest gezilebilir.
 */
export function OrbitVisualization3D({
  neoId,
  playing,
  speed,
  onInfo,
}: OrbitVisualization3DProps) {
  const orbit = useOrbit(neoId);
  const detail = useNeoRiskDetail(neoId);
  const liteMode = useLiteMode();

  return (
    <Canvas
      dpr={liteMode ? [1, 1] : [1, 2]}
      gl={{
        antialias: !liteMode,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{ position: [0, 30, 70], near: 0.1, far: 6000, fov: 42 }}
      onCreated={({ scene, gl }) => {
        scene.background = new THREE.Color(0x000000);
        gl.setClearColor(0x000000, 1);
      }}
    >
      <StarField count={liteMode ? 1800 : 4500} radius={500} />
      <ambientLight intensity={0.16} />
      {/* Yaklaşma perdesi Dünya aydınlatması (Güneş görseli o perdede gizli). */}
      <directionalLight position={[40, 18, 30]} intensity={1.4} color="#fff4e6" />

      {orbit.data && (
        <DirectorScene
          orbit={orbit.data}
          record={detail.data ?? null}
          playing={playing}
          speed={speed}
          onInfo={onInfo}
        />
      )}

      <OrbitControls
        makeDefault
        enabled={!playing}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={2}
        maxDistance={2000}
      />
      <PostFX quality={liteMode ? 'low' : 'high'} />
    </Canvas>
  );
}

// ════════════════════════════════════════════════════════════
// Yönetmen — perde geçişleri, kamera, iki sahne grubu
// ════════════════════════════════════════════════════════════
function DirectorScene({
  orbit,
  record,
  playing,
  speed,
  onInfo,
}: {
  orbit: OrbitResponse;
  record: RiskRecord | null;
  playing: boolean;
  speed: number;
  onInfo: (info: OrbitSceneInfo) => void;
}) {
  const { camera } = useThree();
  const helioGroup = useRef<THREE.Group>(null);
  const geoGroup = useRef<THREE.Group>(null);
  const phaseRef = useRef(0);
  const lastEmit = useRef(-1);

  // ── Heliosentrik veriler ──
  const period = useMemo(() => periodOf(orbit.elements), [orbit.elements]);
  const approachJd = useMemo(() => {
    const nowJd = dateToJd(new Date());
    return record?.next_approach_at ? dateToJd(new Date(record.next_approach_at)) : nowJd;
  }, [record?.next_approach_at]);
  const startJd = approachJd - period / 2;
  const maxExtent = useMemo(() => {
    let m = AU_SCALE;
    for (const [x, y, z] of orbit.points_au) {
      const r = Math.hypot(x, y, z) * AU_SCALE;
      if (r > m) m = r;
    }
    return m;
  }, [orbit.points_au]);

  // ── Yaklaşma (geosentrik) geometrisi ──
  const lunarRatio = useMemo(() => {
    if (record?.miss_distance_km && record.miss_distance_km > 0) {
      return record.miss_distance_km / LUNAR_KM;
    }
    return null;
  }, [record?.miss_distance_km]);
  const flyby = useMemo(() => {
    const ratio = lunarRatio ?? 3;
    // Görsel mesafe netlik için ~2.6× Ay yarıçapıyla sınırlı (gerçek oran caption'da);
    // Ay'dan yakın geçişler (<1) gerçek konumda → halkanın İÇİNDE belirir.
    const minDist = MOON_RING_R * THREE.MathUtils.clamp(ratio, 0.12, 2.6);
    // Geçiş sola-yukarı yönde — sağdaki bilgi panelinin arkasına denk gelmesin.
    const closestDir = new THREE.Vector3(-0.55, 0.4, 0.5).normalize();
    const along = closestDir.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
    const closest = closestDir.multiplyScalar(minDist);
    const span = Math.max(minDist * 2.4, MOON_RING_R * 4);
    return { minDist, closest, along, span };
  }, [lunarRatio]);

  // Yaklaşma perdesi kamera çerçevesi — Dünya + Ay halkası + geçiş bir arada.
  const geoFrame = useMemo(() => {
    const d = Math.max(flyby.minDist, MOON_RING_R) * 2.1;
    const look = flyby.closest.clone().multiplyScalar(0.5);
    const pos = look.clone().add(new THREE.Vector3(0.22, 0.46, 1).normalize().multiplyScalar(d));
    return { look, pos };
  }, [flyby]);

  // Scratch
  const tmpA = useRef(new THREE.Vector3());
  const tmpB = useRef(new THREE.Vector3());
  const camPos = useRef(new THREE.Vector3());
  const camLook = useRef(new THREE.Vector3());
  const moonRef = useRef<THREE.Mesh>(null);
  const flyAstRef = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (playing) {
      const loop = 30;
      phaseRef.current += (dt / loop) * speed * slowmo(phaseRef.current);
      if (phaseRef.current >= 1) phaseRef.current -= 1;
    }
    const p = phaseRef.current;
    const inOrbitAct = p < CUT;

    if (helioGroup.current) helioGroup.current.visible = inOrbitAct;
    if (geoGroup.current) geoGroup.current.visible = !inOrbitAct;

    // ── YÖRÜNGE perdesi: cisimleri gerçek zamanla hareket ettir ──
    if (inOrbitAct && helioGroup.current) {
      const local = p / CUT; // 0..1
      const jd = startJd + local * period;
      const a = eclipticToScene(positionAt(orbit.elements, jd), ORIGIN, AU_SCALE);
      const e = eclipticToScene(positionAt(EARTH_ELEMENTS, jd), ORIGIN, AU_SCALE);
      const ast = helioGroup.current.getObjectByName('helioAst');
      const ear = helioGroup.current.getObjectByName('helioEarth');
      if (ast) ast.position.set(a[0], a[1], a[2]);
      if (ear) {
        ear.position.set(e[0], e[1], e[2]);
        ear.rotation.y += dt * 0.1;
      }
      // Kamera: yörüngeyi yukarıdan yavaşça döndürerek izle.
      if (playing) {
        const ang = local * 0.9;
        const d = maxExtent * 2.1;
        camPos.current.set(Math.sin(ang) * d * 0.5, d * 0.55, Math.cos(ang) * d);
        camera.position.lerp(camPos.current, 0.06);
        camLook.current.set(0, 0, 0);
        camera.lookAt(camLook.current);
      }
      emit(jd, 'YÖRÜNGE — cismin Güneş etrafındaki gerçek yolu');
    }

    // ── YAKLAŞMA perdesi: Ay halkası + gerçek-oranlı geçiş ──
    if (!inOrbitAct) {
      const local = (p - CUT) / (1 - CUT); // 0..1
      const u = local * 2 - 1; // -1..1, en yakın u=0
      tmpA.current.copy(flyby.closest).addScaledVector(flyby.along, u * flyby.span);
      if (flyAstRef.current) flyAstRef.current.position.copy(tmpA.current);
      if (moonRef.current) {
        const ma = p * 6.0;
        moonRef.current.position.set(Math.cos(ma) * MOON_RING_R, 0, -Math.sin(ma) * MOON_RING_R);
      }
      if (playing) {
        // Hafif yörünge + en yakın geçişte hafif yakınlaşma.
        const closeBoost = 1 - Math.min(1, Math.abs(p - CLOSEST) / 0.12) * 0.18;
        camPos.current.copy(geoFrame.pos).multiplyScalar(closeBoost);
        const ang = local * 0.3;
        tmpB.current.set(
          camPos.current.x * Math.cos(ang) - camPos.current.z * Math.sin(ang),
          camPos.current.y,
          camPos.current.x * Math.sin(ang) + camPos.current.z * Math.cos(ang),
        );
        camera.position.lerp(tmpB.current, 0.07);
        camera.lookAt(geoFrame.look);
      }
      const ratioTxt = lunarRatio
        ? `YAKLAŞMA — Dünya'ya en yakın geçiş · Ay'dan ${lunarRatio.toFixed(1)} kat ${lunarRatio < 1 ? '(Ay\'dan yakın!)' : 'uzaktan'}`
        : 'YAKLAŞMA — Dünya\'ya en yakın geçiş';
      emit(approachJd, ratioTxt);
    }

    function emit(jd: number, caption: string) {
      if (Math.abs(p - lastEmit.current) > 0.01) {
        lastEmit.current = p;
        onInfo({ date: jdToDate(jd), caption, lunarRatio });
      }
    }
  });

  const seed = useMemo(() => {
    let s = 0;
    for (let i = 0; i < orbit.neo_id.length; i++) s = (s * 31 + orbit.neo_id.charCodeAt(i)) >>> 0;
    return s;
  }, [orbit.neo_id]);

  return (
    <>
      {/* ───────── YÖRÜNGE perdesi (heliosentrik) ───────── */}
      <group ref={helioGroup}>
        <CinematicSun position={ORIGIN} coreRadius={Math.max(0.5, maxExtent * 0.045)} />
        <EarthReferenceOrbit origin={ORIGIN} auScale={AU_SCALE} />
        <TrajectoryLine orbit={orbit} origin={ORIGIN} auScale={AU_SCALE} color="#ffb066" opacity={0.75} />
        <group name="helioEarth">
          <Earth position={ORIGIN} scale={Math.max(0.3, maxExtent * 0.02)} rotationSpeed={0} />
        </group>
        <Trail width={2.2} length={6} decay={2} attenuation={(t) => t * t} color="#ffcaa0">
          <group name="helioAst">
            <ProceduralAsteroid position={ORIGIN} scale={Math.max(0.28, maxExtent * 0.016)} type="S" seed={seed} detail={3} />
          </group>
        </Trail>
      </group>

      {/* ───────── YAKLAŞMA perdesi (geosentrik) ───────── */}
      <group ref={geoGroup} visible={false}>
        <Earth position={ORIGIN} scale={0.78} rotationSpeed={0.12} />
        <MoonOrbitRing />
        <mesh ref={moonRef}>
          <sphereGeometry args={[0.2, 24, 24]} />
          <meshStandardMaterial color="#cfcfcf" roughness={1} metalness={0} />
        </mesh>
        {/* Gerçek-oranlı geçiş — asteroit Ay halkasına göre kaçırma mesafesinden geçer */}
        <Trail width={3.4} length={9} decay={1.7} attenuation={(t) => t * t} color="#ff9a5a">
          <group ref={flyAstRef}>
            <ProceduralAsteroid position={ORIGIN} scale={0.4} type="S" seed={seed} detail={3} />
            <mesh scale={1}>
              <sphereGeometry args={[1, 16, 16]} />
              <meshBasicMaterial color="#ffcaa0" transparent opacity={0.26} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
            </mesh>
          </group>
        </Trail>
      </group>
    </>
  );
}

/** Ay'ın yörünge halkası — yaklaşma perdesinde "ne kadar yakın?" referansı. */
function MoonOrbitRing() {
  const points = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      out.push([Math.cos(a) * MOON_RING_R, 0, -Math.sin(a) * MOON_RING_R]);
    }
    return out;
  }, []);
  return (
    <Line points={points} color="#7fa8d8" lineWidth={1} transparent opacity={0.45} dashed dashSize={0.5} gapSize={0.3} depthWrite={false} />
  );
}

// Slow-motion — en yakın geçiş (CLOSEST) çevresinde zaman ağırlaşır.
function slowmo(p: number): number {
  const d = Math.abs(p - CLOSEST);
  if (d > 0.14) return 1;
  const x = d / 0.14;
  const ease = x * x * (3 - 2 * x);
  return 0.2 + 0.8 * ease;
}
