'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

import { useTexture } from '@react-three/drei';

interface SunProps {
  position?: [number, number, number];
  scale?: number;
}

export function Sun({ position = [0, 0, 0], scale = 6 }: SunProps) {
  const ref = useRef<THREE.Mesh>(null);
  const texture = useTexture('/textures/nasa/sun/sun_sdo_2k.jpg');
  texture.colorSpace = THREE.SRGBColorSpace;

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.05;
  });

  return (
    <group position={position}>
      {/* Foton küresi — toneMapped=false + parlak doku → bloom yakalar */}
      <mesh ref={ref} scale={scale}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial map={texture} toneMapped={false} color={new THREE.Color('#fff0cf')} />
      </mesh>
      {/* Korona — iç içe geçen üç katman, dışa doğru sönümlenen sıcak parıltı */}
      <mesh scale={scale * 1.16}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial
          color={new THREE.Color('#ffcf7a')}
          transparent
          opacity={0.32}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh scale={scale * 1.55}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial
          color={new THREE.Color('#ffb14d')}
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh scale={scale * 2.4}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={new THREE.Color('#ff9a3c')}
          transparent
          opacity={0.05}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <pointLight color="#ffe4b0" intensity={2.6} distance={600} decay={1.2} />
    </group>
  );
}
