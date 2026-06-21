'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

/** Kameraya dönük yumuşak hale için radyal gradyan dokusu (bir kez üretilir). */
function makeGlowTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0.0, 'rgba(255,252,242,1)');
    g.addColorStop(0.16, 'rgba(255,232,182,0.85)');
    g.addColorStop(0.38, 'rgba(255,186,104,0.34)');
    g.addColorStop(0.7, 'rgba(255,142,64,0.08)');
    g.addColorStop(1.0, 'rgba(255,120,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface CinematicSunProps {
  position?: [number, number, number];
  /** Parlak çekirdek yarıçapı (sahne birimi). */
  coreRadius?: number;
}

/**
 * Sinematik, profesyonel Güneş. Karanlık SDO dokusu yerine HDR parlak beyaz-sıcak
 * çekirdek (bloom ile patlar) + iki yumuşak korona kabuğu + kameraya daima dönük
 * radyal hale sprite'ı (AAA uzay sahnelerindeki gibi). Gerçek bir yıldız gibi
 * ışıldar; sahneyi de aydınlatır (pointLight).
 */
export function CinematicSun({ position = [0, 0, 0], coreRadius = 0.7 }: CinematicSunProps) {
  const coreRef = useRef<THREE.Mesh>(null);
  const glowTex = useMemo(makeGlowTexture, []);
  useEffect(() => () => glowTex.dispose(), [glowTex]);

  useFrame((_, dt) => {
    if (coreRef.current) coreRef.current.rotation.y += dt * 0.03;
  });

  return (
    <group position={position}>
      {/* Çekirdek — HDR (>1) renk + toneMapped:false → bloom beyaz-sıcağa taşır */}
      <mesh ref={coreRef} scale={coreRadius}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial color={new THREE.Color(3.6, 3.0, 2.3)} toneMapped={false} />
      </mesh>

      {/* Korona kabukları — yumuşak sıcak parıltı */}
      <mesh scale={coreRadius * 1.35}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#ffdf9a"
          transparent
          opacity={0.45}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh scale={coreRadius * 2.1}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#ffb65c"
          transparent
          opacity={0.16}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Kameraya dönük yumuşak hale */}
      <sprite scale={[coreRadius * 17, coreRadius * 17, 1]}>
        <spriteMaterial
          map={glowTex}
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>

      <pointLight color="#ffe8c4" intensity={3} distance={3000} decay={0.85} />
    </group>
  );
}
