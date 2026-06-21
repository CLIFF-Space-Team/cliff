'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import * as THREE from 'three';

import type { ImpactFrame } from './frame';

interface SurfaceRingProps {
  frame: ImpactFrame;
  /** Earth radius in scene units — surface points sit on this sphere. */
  earthRadius: number;
  /** Number of azimuthal segments. 96 = smooth on a 3.2-unit Earth. */
  segments?: number;
  /** Tiny radial lift so the band doesn't z-fight with Earth surface. */
  liftMeters?: number;
  /** Render order — higher draws over surface details. */
  renderOrder?: number;
  /** Initial colour and opacity (live-updatable through `set()`). */
  initialColor?: THREE.ColorRepresentation;
}

export interface SurfaceRingHandle {
  /** Update geometry + material in place. Call from a parent `useFrame`. */
  set(opts: {
    innerAngle: number;
    outerAngle: number;
    color: THREE.ColorRepresentation;
    opacity: number;
    visible: boolean;
  }): void;
}

/**
 * A thin **surface-conformant** band around the impact point.
 *
 * Unlike a flat ring lying on the impact tangent plane, this band sits on
 * the Earth's actual sphere — every vertex is on (or just above) the
 * surface, so as the wave expands it visibly **wraps around the curve**
 * of the planet. The geometry is allocated once and updated in place via
 * the imperative `set()` handle, so animation drives ZERO per-frame
 * allocations.
 *
 * Geometry layout: `2 × (segments + 1)` vertices arranged as alternating
 * inner/outer pairs around the circumference. Indices stitch the strip
 * into a triangle band.
 */
export const SurfaceRing = forwardRef<SurfaceRingHandle, SurfaceRingProps>(
  function SurfaceRing(
    {
      frame,
      earthRadius,
      segments = 96,
      liftMeters = 0.005,
      renderOrder = 12,
      initialColor = '#ffffff',
    },
    ref,
  ) {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.MeshBasicMaterial>(null);

    const { geometry, positions } = useMemo(() => {
      const vertCount = (segments + 1) * 2;
      const positions = new Float32Array(vertCount * 3);
      const indices: number[] = [];
      for (let i = 0; i < segments; i++) {
        const a = i * 2; // inner i
        const b = i * 2 + 1; // outer i
        const c = (i + 1) * 2; // inner i+1
        const d = (i + 1) * 2 + 1; // outer i+1
        // Two triangles per segment: (a, c, b) + (b, c, d)
        indices.push(a, c, b, b, c, d);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setIndex(indices);
      return { geometry: geo, positions };
    }, [segments]);

    useEffect(() => {
      return () => {
        geometry.dispose();
      };
    }, [geometry]);

    useImperativeHandle(
      ref,
      () => ({
        set({ innerAngle, outerAngle, color, opacity, visible }) {
          const mesh = meshRef.current;
          const mat = matRef.current;
          if (!mesh || !mat) return;
          if (!visible || outerAngle <= innerAngle || opacity <= 0.001) {
            mesh.visible = false;
            return;
          }
          mesh.visible = true;
          // Cap to hemisphere — beyond π/2 the band would wrap; we let
          // it go up to π for very-large impacts that visibly cross the
          // visible disc, but the parent should clamp to its own taste.
          const innerClamped = Math.max(0, Math.min(Math.PI, innerAngle));
          const outerClamped = Math.max(innerClamped, Math.min(Math.PI, outerAngle));
          const r = earthRadius + liftMeters;
          const cosI = Math.cos(innerClamped);
          const sinI = Math.sin(innerClamped);
          const cosO = Math.cos(outerClamped);
          const sinO = Math.sin(outerClamped);
          const { normal, downrange, crosstrack } = frame;
          for (let i = 0; i <= segments; i++) {
            const φ = (i / segments) * Math.PI * 2;
            const cφ = Math.cos(φ);
            const sφ = Math.sin(φ);
            // Tangent direction for this segment
            const tx = downrange.x * cφ + crosstrack.x * sφ;
            const ty = downrange.y * cφ + crosstrack.y * sφ;
            const tz = downrange.z * cφ + crosstrack.z * sφ;
            // Inner vertex on the unit sphere → scaled
            const innerX = (normal.x * cosI + tx * sinI) * r;
            const innerY = (normal.y * cosI + ty * sinI) * r;
            const innerZ = (normal.z * cosI + tz * sinI) * r;
            // Outer vertex
            const outerX = (normal.x * cosO + tx * sinO) * r;
            const outerY = (normal.y * cosO + ty * sinO) * r;
            const outerZ = (normal.z * cosO + tz * sinO) * r;
            const idx = i * 6;
            positions[idx] = innerX;
            positions[idx + 1] = innerY;
            positions[idx + 2] = innerZ;
            positions[idx + 3] = outerX;
            positions[idx + 4] = outerY;
            positions[idx + 5] = outerZ;
          }
          const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
          attr.needsUpdate = true;
          // Material updates
          mat.opacity = opacity;
          mat.color.set(color);
        },
      }),
      [frame, earthRadius, segments, liftMeters, geometry, positions],
    );

    return (
      <mesh ref={meshRef} geometry={geometry} renderOrder={renderOrder} visible={false}>
        <meshBasicMaterial
          ref={matRef}
          color={initialColor}
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    );
  },
);

/**
 * Convert a surface arc length (in scene units) into the angular radius
 * (radians) you'd pass into the ring. Useful when the caller knows the
 * wave's distance in scene units, not its angular extent.
 */
export function arcToAngle(arcUnits: number, earthRadius: number): number {
  return Math.max(0, arcUnits) / Math.max(0.0001, earthRadius);
}
