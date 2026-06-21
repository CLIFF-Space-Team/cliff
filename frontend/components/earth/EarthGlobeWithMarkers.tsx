'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { StarField } from '@/components/3d/primitives/StarField';
import { EarthGlobe3D } from '@/components/dashboard/earth3d/EarthGlobe3D';
import { pickRepresentativePoint as pickPoint } from '@/lib/earth-geometry';
import type { EarthCategoryMeta, EarthEvent, EarthEventSeverity } from '@/lib/earth-types';

interface EarthGlobeWithMarkersProps {
  events: EarthEvent[];
  categoryMap: Map<string, EarthCategoryMeta>;
  selectedId: string | null;
  selectedEvent: EarthEvent | null;
  onSelect: (event: EarthEvent) => void;
}

const EARTH_RADIUS = 2.4;
const MARKER_OFFSET = 0.012; // sit just above the surface

/**
 * Fully rebuilt 3D globe scene for the unified Earth events pipeline.
 *
 * - Reuses the existing `EarthGlobe3D` (Blue Marble + clouds + lighting).
 * - Marker color = `category.accent_hex` so the chip rail, list, 2D map
 *   and 3D pin all match.
 * - Marker scale is log-driven by `severity_score` so a critical wildfire
 *   visibly dwarfs a routine quake.
 * - Severity ≥ HIGH adds a pulsing halo. INFO/LOW have a still core only.
 */
export function EarthGlobeWithMarkers({
  events,
  categoryMap,
  selectedId,
  selectedEvent,
  onSelect,
}: EarthGlobeWithMarkersProps) {
  // When an event is selected, rotate the globe so its longitude faces
  // the camera. Same maths as the legacy scene — kept verbatim for
  // visual continuity.
  const targetRotationY = useMemo(() => {
    if (!selectedEvent) return null;
    const point = pickPoint(selectedEvent);
    if (!point) return null;
    const [lng] = point;
    return -Math.PI / 2 - lng * (Math.PI / 180);
  }, [selectedEvent]);

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
      <ambientLight intensity={0.16} />
      <directionalLight position={[6, 4, 6]} intensity={1.05} />
      <pointLight position={[-6, -3, -4]} intensity={0.3} color={0x6688ff} />

      <StarField count={3500} radius={70} />

      <EarthGlobe3D radius={EARTH_RADIUS} targetRotationY={targetRotationY}>
        {events.map((event) => {
          const point = pickPoint(event);
          if (!point) return null;
          const meta = categoryMap.get(event.category);
          return (
            <EventMarker
              key={event.id}
              lng={point[0]}
              lat={point[1]}
              accent={meta?.accent_hex ?? '#9ca3af'}
              severity={event.severity}
              severityScore={event.severity_score}
              isSelected={event.id === selectedId}
              onSelect={() => onSelect(event)}
            />
          );
        })}
      </EarthGlobe3D>

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={3.6}
        maxDistance={11}
        rotateSpeed={0.32}
        zoomSpeed={0.6}
      />
    </Canvas>
  );
}

interface EventMarkerProps {
  lng: number;
  lat: number;
  accent: string;
  severity: EarthEventSeverity;
  severityScore: number;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * One pin on the globe. Mounts as a child of the rotating globe group so
 * lat/lon stays locked to the surface as the planet spins.
 */
function EventMarker({
  lng,
  lat,
  accent,
  severity,
  severityScore,
  isSelected,
  onSelect,
}: EventMarkerProps) {
  const haloRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  // Log-driven core radius so a 0.95 critical fire lands ~3× larger than
  // a 0.2 minor quake while still fitting on the globe.
  const coreRadius = useMemo(() => {
    const base = 0.014;
    const factor = 1 + Math.log10(1 + Math.max(0, severityScore) * 9) * 1.6;
    return Math.min(0.075, base * factor);
  }, [severityScore]);

  const showHalo = severity === 'critical' || severity === 'high';

  // Convert (lng, lat, alt=R+offset) → cartesian. Globe rotates the whole
  // group so we just place this marker on the static reference frame.
  const position = useMemo<[number, number, number]>(() => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const r = EARTH_RADIUS + MARKER_OFFSET;
    return [
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta),
    ];
  }, [lng, lat]);

  useFrame(({ clock }) => {
    if (haloRef.current && showHalo) {
      const t = clock.elapsedTime;
      const pulse = 1 + Math.sin(t * 2.4) * 0.18;
      haloRef.current.scale.setScalar(pulse);
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.32 + Math.sin(t * 2.4) * 0.18;
    }
    if (coreRef.current && isSelected) {
      const t = clock.elapsedTime * 1.6;
      coreRef.current.scale.setScalar(1 + Math.sin(t) * 0.12);
    }
  });

  return (
    <group position={position}>
      {/* Invisible hit target — bigger than the visible core for easier picking. */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[Math.max(0.05, coreRadius * 3.5), 12, 12]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {showHalo && (
        <mesh ref={haloRef}>
          <sphereGeometry args={[coreRadius * 2.6, 24, 24]} />
          <meshBasicMaterial
            color={accent}
            transparent
            opacity={0.4}
            depthWrite={false}
          />
        </mesh>
      )}

      <mesh ref={coreRef}>
        <sphereGeometry args={[coreRadius, 24, 24]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>

      {isSelected && (
        <mesh>
          <ringGeometry args={[coreRadius * 1.6, coreRadius * 2.0, 48]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

