'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

import { StarField } from '@/components/3d/primitives/StarField';

import { EarthGlobe3D } from './EarthGlobe3D';
import { EventMarkers3D } from './EventMarkers3D';
import type { LiveEvent } from './types';

interface EarthLive3DProps {
  events: LiveEvent[];
  selectedId: string | null;
  selectedEvent: LiveEvent | null;
  onSelect: (event: LiveEvent) => void;
}

const EARTH_RADIUS = 2.4;

/**
 * Full R3F scene for the "Earth Live" page — replaces the flat Leaflet map
 * with a rotating, photographic Earth. The globe spins continuously until
 * the user picks a marker, at which point the camera/orientation focus on
 * that geographic point and the matching simulation overlay plays.
 */
export function EarthLive3D({
  events,
  selectedId,
  selectedEvent,
  onSelect,
}: EarthLive3DProps) {
  // When an event is selected, rotate the globe so that point faces the
  // camera (camera looks down -Z, so we want the marker to land near +Z).
  // For lng=L the marker sits at angle (-L) around Y from +X, so rotating
  // the group by (-π/2 - L) brings it to +Z. Y-axis only — latitude stays
  // baked into the marker's vertical position, no tumble needed.
  const targetRotationY =
    selectedEvent != null
      ? -Math.PI / 2 - selectedEvent.lng * (Math.PI / 180)
      : null;

  return (
    <Canvas
      shadows={false}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{ position: [0, 0.6, 7.2], near: 0.1, far: 80, fov: 38 }}
      onCreated={({ scene, gl }) => {
        scene.background = new THREE.Color(0x000000);
        gl.setClearColor(0x000000, 1);
      }}
    >
      <ambientLight intensity={0.18} />
      <directionalLight position={[6, 4, 5]} intensity={1.6} color="#fff5e0" />
      <pointLight position={[-6, -2, -4]} intensity={0.45} color="#5fb3ff" />

      <StarField count={3500} radius={50} />

      <EarthGlobe3D
        radius={EARTH_RADIUS}
        rotationSpeed={selectedEvent ? 0 : 0.045}
        targetRotationY={targetRotationY}
      >
        <EventMarkers3D
          events={events}
          radius={EARTH_RADIUS}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </EarthGlobe3D>

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={4.5}
        maxDistance={14}
        rotateSpeed={0.5}
      />
    </Canvas>
  );
}
