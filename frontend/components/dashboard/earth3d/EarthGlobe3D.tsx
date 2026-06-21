'use client';

import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';

interface EarthGlobe3DProps {
  /** World radius in scene units. */
  radius: number;
  /** Auto-rotation speed (rad/s). 0 freezes. */
  rotationSpeed?: number;
  /** External rotation override — when set, becomes the *target* the globe
   *  smoothly lerps toward (used when the user picks a marker). */
  targetRotationY?: number | null;
  /** Children render inside the globe's rotating frame so any markers
   *  attached to lat/lon stay locked to the surface. */
  children?: ReactNode;
}

/**
 * Photographic Earth globe — uses the same NASA Blue Marble + night-lights +
 * cloud + normal + specular texture set as the dashboard's solar system, but
 * sized for the Earth Live page. The whole sphere + its atmosphere live
 * inside a single rotating group so caller-supplied markers (children) stay
 * pinned to their geographic coordinates.
 */
export function EarthGlobe3D({
  radius,
  rotationSpeed = 0.045,
  targetRotationY = null,
  children,
}: EarthGlobe3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const [day, night, clouds, normal, specular] = useTexture([
    '/textures/earth-day.jpg',
    '/textures/earth-night.jpg',
    '/textures/earth-clouds.jpg',
    '/textures/earth-normal.jpg',
    '/textures/earth-specular.jpg',
  ]) as [THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture];
  day.colorSpace = THREE.SRGBColorSpace;
  night.colorSpace = THREE.SRGBColorSpace;
  clouds.colorSpace = THREE.SRGBColorSpace;

  const material = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        map: day,
        normalMap: normal,
        specularMap: specular,
        specular: new THREE.Color('#0a3a72'),
        shininess: 22,
        emissiveMap: night,
        emissive: new THREE.Color('#aa9966'),
        emissiveIntensity: 0.55,
      }),
    [day, night, normal, specular],
  );

  useFrame((_, dt) => {
    const group = groupRef.current;
    if (!group) return;
    if (targetRotationY != null) {
      // Lerp the globe toward the requested orientation. Wrapping is handled
      // by always taking the shorter arc (Δ in (-π, π]).
      const cur = group.rotation.y;
      let delta = targetRotationY - cur;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      group.rotation.y = cur + delta * Math.min(1, dt * 2.5);
    } else {
      group.rotation.y += dt * rotationSpeed;
    }
    // Clouds drift slightly faster for parallax.
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += dt * 0.014;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh scale={radius}>
        <sphereGeometry args={[1, 96, 96]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh ref={cloudsRef} scale={radius * 1.012}>
        <sphereGeometry args={[1, 96, 96]} />
        <meshLambertMaterial map={clouds} transparent opacity={0.42} depthWrite={false} />
      </mesh>
      {/* Subtle atmosphere — soft bluish backside fade only. The previous
       *  shader produced a strong rim halo that read like a Saturn ring at
       *  this camera distance, so we use a plain back-side mesh tuned to
       *  match the dashboard's photographic Earth. */}
      <mesh scale={radius * 1.025}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial
          color={'#4d8fd6'}
          transparent
          opacity={0.07}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      {children}
    </group>
  );
}

/**
 * Convert geographic coordinates to a Cartesian position on a sphere of
 * `radius` units, matching Three.js SphereGeometry's default UV wrapping for
 * an equirectangular Earth texture (u=0.5 → Greenwich at +X, u=0.75 → 90°E
 * at -Z). Without the Z negation Istanbul drifts ~90° east of where the
 * texture renders it, so a Minnesota wildfire ends up over the Sahara.
 */
export function latLngToVec3(lat: number, lng: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = lng * (Math.PI / 180);
  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    -radius * Math.sin(phi) * Math.sin(theta),
  ];
}
