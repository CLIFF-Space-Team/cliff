'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';

import { Asteroid } from './asteroids/Asteroid';
import { AsteroidFocusController } from './AsteroidFocusController';
import { PlanetaryBackdrop } from './PlanetaryBackdrop';
import { TrajectoryLine, EarthReferenceOrbit } from './asteroids/TrajectoryLine';
import { CameraControls } from './controls/CameraControls';
import { PostFX } from './postprocessing/PostFX';
import { Earth } from './primitives/Earth';
import { Moon } from './primitives/Moon';
import { StarField } from './primitives/StarField';
import { Sun } from './primitives/Sun';
import { useOrbit } from '@/hooks/useOrbit';

interface AsteroidPlacement {
  neoId: string;
  name?: string;
  hazardous?: boolean;
  position: [number, number, number];
  scale: number;
}

interface SolarSystemSceneProps {
  asteroids?: AsteroidPlacement[];
  quality?: 'low' | 'medium' | 'high';
  selectedNeoId?: string | null;
  onSelectAsteroid?: (neoId: string | null) => void;
  className?: string;
}

const EARTH_POSITION: [number, number, number] = [0, 0, 0];
const SUN_POSITION: [number, number, number] = [-220, 28, 60];

/** Internal: fetches Keplerian orbit for the selected NEO and renders the
 *  trajectory line + Earth reference circle around the Sun. Hidden when no
 *  orbit data is available (some NEOs lack `orbital_data` in NeoWs). */
function SelectedAsteroidOrbit({
  neoId,
  sunPosition,
}: {
  neoId: string;
  sunPosition: [number, number, number];
}) {
  const { data } = useOrbit(neoId);
  if (!data) return null;
  return (
    <>
      <EarthReferenceOrbit origin={sunPosition} auScale={12} />
      <TrajectoryLine
        orbit={data}
        origin={sunPosition}
        auScale={12}
        color="#ffd28a"
        opacity={0.7}
      />
    </>
  );
}

/**
 * Earth-centric mission-control scene.
 *
 * - Earth at origin, Moon orbiting it.
 * - Sun far off-screen (provides directional key light + visible disk).
 * - Asteroids cluster in a 6–24 unit shell around Earth (dashboard-friendly,
 *   not real-scale).
 * - Selected asteroid: camera flies to it, others fade to ~20% opacity.
 *   Click any empty space to deselect.
 */
export function SolarSystemScene({
  asteroids = [],
  quality = 'high',
  selectedNeoId = null,
  onSelectAsteroid,
  className,
}: SolarSystemSceneProps) {
  const placements = useMemo(() => asteroids.slice(0, 30), [asteroids]);
  const selected = useMemo(
    () => placements.find((p) => p.neoId === selectedNeoId) ?? null,
    [placements, selectedNeoId],
  );

  return (
    <Canvas
      className={className}
      shadows={quality === 'high'}
      dpr={[1, quality === 'low' ? 1.25 : 2]}
      gl={{
        antialias: quality !== 'low',
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{ position: [0, 10, 38], near: 0.1, far: 4000, fov: 45 }}
      onCreated={({ scene, gl }) => {
        scene.background = new THREE.Color(0x000000);
        gl.setClearColor(0x000000, 1);
      }}
      onPointerMissed={() => onSelectAsteroid?.(null)}
    >
      {/* Düşük ambient + Güneş ile hizalı güçlü yönlü ışık = dramatik,
          bilimsel aydınlatma (gündüz/gece kontrastı belirgin). */}
      <ambientLight intensity={0.1} />
      <hemisphereLight args={['#101725', '#000000', 0.06]} />
      <directionalLight
        position={[-200, 26, 56]}
        intensity={2.4}
        color="#fff3da"
        castShadow={quality === 'high'}
      />

      <Suspense fallback={null}>
        <StarField count={quality === 'low' ? 6000 : 18_000} radius={600} />

        {/* Uzak gezegen arka planı (Merkür/Venüs/Mars/Jüpiter/Satürn + dış
            debris halkası) — kamera menzilinin ötesinde dekoratif derinlik. */}
        <PlanetaryBackdrop quality={quality} />

        <Sun position={SUN_POSITION} scale={5.5} />

        <Earth
          position={EARTH_POSITION}
          scale={3.6}
          sunDirection={[-0.958, 0.122, 0.261]}
        />
        <Moon parentPosition={EARTH_POSITION} orbitRadius={6.4} scale={0.65} speed={0.2} />

        {selectedNeoId && (
          <SelectedAsteroidOrbit neoId={selectedNeoId} sunPosition={SUN_POSITION} />
        )}

        {placements.map((a) => {
          const isSelected = a.neoId === selectedNeoId;
          const isDimmed = !!selectedNeoId && !isSelected;
          return (
            <Asteroid
              key={a.neoId}
              neoId={a.neoId}
              name={a.name}
              hazardous={a.hazardous}
              position={a.position}
              scale={a.scale}
              quality={quality}
              selected={isSelected}
              dimmed={isDimmed}
              onSelect={onSelectAsteroid}
            />
          );
        })}
      </Suspense>

      <CameraControls
        minDistance={selected ? 8 : 12}
        maxDistance={selected ? 24 : 90}
        enablePan={!selected}
      />
      <AsteroidFocusController target={selected ? selected.position : null} />
      <PostFX quality={quality} />
    </Canvas>
  );
}
