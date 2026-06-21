'use client';

import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface CameraControlsProps {
  minDistance?: number;
  maxDistance?: number;
  enablePan?: boolean;
}

/**
 * Touch behaviour:
 *  - 1 finger  → rotate the scene
 *  - 2 fingers → pinch-to-zoom + dolly
 *  - This is the inverse of three.js's default (which uses 1 finger to pan
 *    when pan is allowed). Mapping rotate to single-finger feels natural on
 *    a phone and prevents the camera from drifting unexpectedly.
 */
export function CameraControls({
  minDistance = 12,
  maxDistance = 480,
  enablePan = true,
}: CameraControlsProps) {
  return (
    <OrbitControls
      // Register as the scene's default controls so other components can
      // reach it via `useThree().controls` (camera rigs in particular need
      // to see 'start'/'end' events to back off while the user is driving).
      makeDefault
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.55}
      zoomSpeed={0.6}
      panSpeed={0.45}
      minDistance={minDistance}
      maxDistance={maxDistance}
      enablePan={enablePan}
      target={[0, 0, 0]}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: enablePan ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
      }}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: enablePan ? THREE.TOUCH.DOLLY_PAN : THREE.TOUCH.DOLLY_ROTATE,
      }}
    />
  );
}
