'use client';

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { pickRepresentativePoint } from '@/lib/earth-geometry';
import {
  EARTH_SEVERITY_RANK,
  type EarthCategoryMeta,
  type EarthEvent,
} from '@/lib/earth-types';

const DEG = Math.PI / 180;

interface MarkerDatum {
  id: string;
  event: EarthEvent;
  /** Outward unit normal at the event location. */
  dir: THREE.Vector3;
  pos: THREE.Vector3;
  color: THREE.Color;
  rank: number;
}

/** lon/lat → unit direction on the sphere (matches the equirectangular day
 *  texture wrapping; Z negated like the impact scene's verified convention). */
function lonLatDir(lng: number, lat: number, out: THREE.Vector3): THREE.Vector3 {
  const phi = (90 - lat) * DEG;
  const theta = lng * DEG;
  return out.set(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    -Math.sin(phi) * Math.sin(theta),
  );
}

interface LiveEventMarkersProps {
  events: EarthEvent[];
  categoryMap: Map<string, EarthCategoryMeta>;
  selectedId: string | null;
  radius: number;
  onSelect: (e: EarthEvent) => void;
  onHover: (e: EarthEvent | null) => void;
}

const _o = new THREE.Object3D();
const _q = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 0, 1);
const _c = new THREE.Color();

const coreScale = (radius: number, rank: number) => radius * (0.009 + rank * 0.006);
const ringBase = (radius: number, rank: number) => radius * (0.018 + rank * 0.013);

/**
 * Pulsing event beacons on the live globe. Performance: cores + pulse rings +
 * invisible hit-targets are each ONE InstancedMesh (≤4 draw calls for any
 * number of events). Cores glow by category accent (bloom-bright), sized by
 * severity; rings expand+fade in a synced "heartbeat"; the selected event gets
 * a bright highlight ring.
 */
export function LiveEventMarkers({
  events,
  categoryMap,
  selectedId,
  radius,
  onSelect,
  onHover,
}: LiveEventMarkersProps) {
  const coreRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.InstancedMesh>(null);
  const hitRef = useRef<THREE.InstancedMesh>(null);
  const selRef = useRef<THREE.Mesh>(null);

  const markers = useMemo<MarkerDatum[]>(() => {
    const out: MarkerDatum[] = [];
    const dir = new THREE.Vector3();
    for (const e of events) {
      const pt = pickRepresentativePoint(e);
      if (!pt) continue;
      lonLatDir(pt[0], pt[1], dir);
      const accent = categoryMap.get(e.category)?.accent_hex ?? '#ffffff';
      out.push({
        id: e.id,
        event: e,
        dir: dir.clone(),
        pos: dir.clone().multiplyScalar(radius * 1.004),
        color: new THREE.Color(accent),
        rank: EARTH_SEVERITY_RANK[e.severity],
      });
    }
    return out;
  }, [events, categoryMap, radius]);

  const n = markers.length;

  const selectedMarker = useMemo(
    () => (selectedId ? markers.find((m) => m.id === selectedId) ?? null : null),
    [markers, selectedId],
  );

  // Initial placement: cores (static) + per-instance accent color + hit targets.
  useEffect(() => {
    const core = coreRef.current;
    const ring = ringRef.current;
    const hit = hitRef.current;
    for (let i = 0; i < n; i++) {
      const m = markers[i]!;
      if (core) {
        _o.position.copy(m.pos);
        _o.rotation.set(0, 0, 0);
        _o.scale.setScalar(coreScale(radius, m.rank));
        _o.updateMatrix();
        core.setMatrixAt(i, _o.matrix);
        // Boost (>1) so bloom catches the dot; toneMapped:false keeps it HDR.
        _c.copy(m.color).multiplyScalar(1.5);
        core.setColorAt(i, _c);
      }
      if (ring) ring.setColorAt(i, m.color);
      if (hit) {
        // Larger invisible sphere = comfortable click/hover target.
        _o.position.copy(m.pos);
        _o.scale.setScalar(Math.max(radius * 0.03, coreScale(radius, m.rank) * 2.6));
        _o.updateMatrix();
        hit.setMatrixAt(i, _o.matrix);
      }
    }
    if (core) {
      core.instanceMatrix.needsUpdate = true;
      if (core.instanceColor) core.instanceColor.needsUpdate = true;
    }
    if (ring && ring.instanceColor) ring.instanceColor.needsUpdate = true;
    if (hit) hit.instanceMatrix.needsUpdate = true;
  }, [markers, n, radius]);

  useFrame(({ clock }) => {
    const ring = ringRef.current;
    if (ring && n > 0) {
      const t = (clock.elapsedTime % 2.4) / 2.4; // 0..1 loop (heartbeat)
      const grow = 0.35 + t * 1.7;
      for (let i = 0; i < n; i++) {
        const m = markers[i]!;
        _q.setFromUnitVectors(_up, m.dir);
        _o.position.copy(m.dir).multiplyScalar(radius * 1.002);
        _o.quaternion.copy(_q);
        _o.scale.setScalar(ringBase(radius, m.rank) * grow);
        _o.updateMatrix();
        ring.setMatrixAt(i, _o.matrix);
      }
      ring.instanceMatrix.needsUpdate = true;
      (ring.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.7;
    }

    // Selected highlight — bright ring that breathes at the chosen event.
    const sel = selRef.current;
    if (sel) {
      if (selectedMarker) {
        sel.visible = true;
        _q.setFromUnitVectors(_up, selectedMarker.dir);
        sel.position.copy(selectedMarker.dir).multiplyScalar(radius * 1.004);
        sel.quaternion.copy(_q);
        const breathe = 1 + Math.sin(clock.elapsedTime * 4) * 0.12;
        sel.scale.setScalar(radius * 0.05 * breathe);
      } else {
        sel.visible = false;
      }
    }
  });

  if (n === 0) return null;

  return (
    <>
      {/* Pulse rings — synced expanding heartbeat */}
      <instancedMesh ref={ringRef} args={[undefined, undefined, n]} frustumCulled={false}>
        <ringGeometry args={[0.74, 1, 28]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </instancedMesh>

      {/* Glowing cores */}
      <instancedMesh ref={coreRef} args={[undefined, undefined, n]} frustumCulled={false}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* Invisible hit targets — comfortable hover/click */}
      <instancedMesh
        ref={hitRef}
        args={[undefined, undefined, n]}
        frustumCulled={false}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          const id = e.instanceId;
          if (id != null && markers[id]) onHover(markers[id]!.event);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          const id = e.instanceId;
          if (id != null && markers[id]) onSelect(markers[id]!.event);
        }}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </instancedMesh>

      {/* Selected highlight ring */}
      <mesh ref={selRef} visible={false}>
        <ringGeometry args={[0.82, 1, 36]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}
