'use client';

import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface SaturnProps {
  position: [number, number, number];
  scale?: number;
  ringInner?: number;
  ringOuter?: number;
}

export function Saturn({
  position,
  scale = 4,
  ringInner = 1.4,
  ringOuter = 2.4,
}: SaturnProps) {
  const groupRef = useRef<THREE.Group>(null);
  const planetRef = useRef<THREE.Mesh>(null);
  const map = useTexture('/textures/nasa/saturn/saturn_cassini_2k.jpg');
  map.colorSpace = THREE.SRGBColorSpace;

  // Ring vertex colors so the inner ring is brighter than the outer.
  const ringMaterial = useMemo(() => {
    const inner = new THREE.Color('#d6c5a3');
    const outer = new THREE.Color('#736149');
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, inner.getStyle());
      gradient.addColorStop(0.4, '#a08a6a');
      gradient.addColorStop(0.55, '#5b4d3a');
      gradient.addColorStop(0.7, '#a08a6a');
      gradient.addColorStop(1, outer.getStyle());
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
    });
  }, []);

  useFrame((_, dt) => {
    if (planetRef.current) planetRef.current.rotation.y += dt * 0.08;
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.005;
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh ref={planetRef} scale={scale}>
        <sphereGeometry args={[1, 96, 96]} />
        <meshStandardMaterial map={map} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh rotation={[Math.PI / 2.2, 0, 0]} scale={scale}>
        <ringGeometry args={[ringInner, ringOuter, 96]} />
        <primitive object={ringMaterial} attach="material" />
      </mesh>
    </group>
  );
}
