'use client';

import { AsteroidBelt } from './asteroids/AsteroidBelt';
import { Planet } from './primitives/Planet';
import { Saturn } from './primitives/Saturn';

/**
 * Uzak gezegen arka planı — Dünya-merkezli sahnenin etrafında, kamera
 * menzilinin (≈90 birim) çok ötesinde duran dekoratif gök cisimleri.
 *
 * NASA misyon dokularını kullanır (paketlenmiş ama daha önce hiçbir sahnede
 * render edilmiyordu). Asteroit kabuğunu (14–34 birim) ve Dünya odağını
 * bozmaz; sadece derinlik ve atmosfer katar.
 */
interface PlanetSpec {
  key: string;
  texture: string;
  position: [number, number, number];
  scale: number;
  rotationSpeed: number;
}

const PLANETS: PlanetSpec[] = [
  {
    key: 'mercury',
    texture: '/textures/nasa/mercury/mercury_messenger_2k.jpg',
    position: [-150, -12, -120],
    scale: 2.4,
    rotationSpeed: 0.02,
  },
  {
    key: 'venus',
    texture: '/textures/nasa/venus/venus_magellan_2k.jpg',
    position: [150, 44, -190],
    scale: 4.2,
    rotationSpeed: 0.015,
  },
  {
    key: 'mars',
    texture: '/textures/nasa/mars/mars_mro_2k.jpg',
    position: [185, -34, -72],
    scale: 3.0,
    rotationSpeed: 0.05,
  },
  {
    key: 'jupiter',
    texture: '/textures/nasa/jupiter/jupiter_juno_2k.jpg',
    position: [-150, 80, -300],
    scale: 13,
    rotationSpeed: 0.06,
  },
];

const SATURN_POSITION: [number, number, number] = [285, 26, -170];

export function PlanetaryBackdrop({
  quality,
}: {
  quality: 'low' | 'medium' | 'high';
}) {
  return (
    <group>
      {PLANETS.map((p) => (
        <Planet
          key={p.key}
          texture={p.texture}
          position={p.position}
          scale={p.scale}
          rotationSpeed={p.rotationSpeed}
          segments={quality === 'low' ? 32 : 64}
        />
      ))}
      <Saturn position={SATURN_POSITION} scale={9} ringInner={1.3} ringOuter={2.3} />
      {/* Dış debris halkası — Dünya/asteroit kabuğundan çok uzakta, sahneyi
          çerçeveler. Düşük kalitede atlanır (mobil/zayıf cihaz). */}
      {quality !== 'low' && (
        <AsteroidBelt
          count={quality === 'high' ? 600 : 500}
          innerRadius={360}
          outerRadius={470}
          thickness={12}
        />
      )}
    </group>
  );
}
