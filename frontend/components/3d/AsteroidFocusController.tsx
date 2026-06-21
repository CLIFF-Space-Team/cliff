'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

interface AsteroidFocusControllerProps {
  target: [number, number, number] | null;
  defaultPosition?: [number, number, number];
  defaultLookAt?: [number, number, number];
}

const _camPos = new THREE.Vector3();
const _lookAt = new THREE.Vector3();

/**
 * When `target` is set, smoothly slides the camera to look at it from a
 * close offset and disables OrbitControls panning. When null, returns to the
 * default position. Lerp speed picked so the move takes ~0.6s.
 */
export function AsteroidFocusController({
  target,
  defaultPosition = [0, 10, 38],
  defaultLookAt = [0, 0, 0],
}: AsteroidFocusControllerProps) {
  const { camera, controls } = useThree();
  // Offset the camera ~12 units away from the focused asteroid so it fills
  // roughly 1/8th of the frame instead of dominating it. Asteroids in the
  // scene have visual radii up to ~1.7 units, so this leaves comfortable
  // headroom for the focus overlay UI on the right side.
  const focusOffset = useRef(new THREE.Vector3(7.5, 4.0, 7.5));

  useFrame((_, dt) => {
    const k = Math.min(1, dt * 4.5);

    if (target) {
      _lookAt.set(target[0], target[1], target[2]);
      _camPos.copy(_lookAt).add(focusOffset.current);
    } else {
      _camPos.set(defaultPosition[0], defaultPosition[1], defaultPosition[2]);
      _lookAt.set(defaultLookAt[0], defaultLookAt[1], defaultLookAt[2]);
    }

    camera.position.lerp(_camPos, k);

    const c = controls as { target?: THREE.Vector3 } | null;
    if (c && c.target) {
      c.target.lerp(_lookAt, k);
    } else {
      camera.lookAt(_lookAt);
    }
  });

  return null;
}
