'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface CraterProps {
  impactPoint: [number, number, number];
  /** Crater rim diameter in scene units (peak after impact). */
  radius: number;
  /** 0..1 reveal driver. */
  reveal: number;
  /** Impact angle (degrees from horizontal). 90 = vertical = circular crater.
   *  Lower angles produce elongated craters along the impact direction. */
  angleDeg?: number;
  /** Impact azimuth (degrees from north, clockwise). 0 = N, 90 = E.
   *  Determines which compass direction the elongation points. */
  azimuthDeg?: number;
}

/**
 * Bowl-shaped crater drawn on the Earth surface. Built from a deformed disc
 * mesh: vertices near the center pushed inward (depth), rim pulled slightly
 * outward, gradient color from charred-black at center to grey-brown at rim.
 * Persists once revealed.
 */
export function Crater({
  impactPoint,
  radius,
  reveal,
  angleDeg = 90,
  azimuthDeg = 90,
}: CraterProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Orientation: align local +Z with surface normal, then rotate around the
  // normal so the local +X axis points along the impact azimuth (so the
  // ellipse stretches in the right compass direction).
  const orientation = useMemo(() => {
    const normal = new THREE.Vector3(...impactPoint).normalize();
    // Build the same orthonormal basis used by the shared `frame.ts` so
    // the crater stretches the same way thermal/ejecta do.
    const worldUp = new THREE.Vector3(0, 1, 0);
    let north = worldUp.clone().sub(normal.clone().multiplyScalar(worldUp.dot(normal)));
    if (north.lengthSq() < 1e-6) {
      const worldX = new THREE.Vector3(1, 0, 0);
      north = worldX.clone().sub(normal.clone().multiplyScalar(worldX.dot(normal)));
    }
    north.normalize();
    const east = new THREE.Vector3().crossVectors(normal, north).normalize();
    const az = (azimuthDeg * Math.PI) / 180;
    const downrange = north
      .clone()
      .multiplyScalar(Math.cos(az))
      .addScaledVector(east, Math.sin(az))
      .normalize();
    const crosstrack = new THREE.Vector3().crossVectors(normal, downrange).normalize();
    const m = new THREE.Matrix4().makeBasis(downrange, crosstrack, normal);
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }, [impactPoint, azimuthDeg]);

  // Elongation factor along the downrange axis. Vertical impacts stay
  // round; oblique ones grow up to 1.8× longer than wide.
  const elongation = useMemo(() => {
    const angleRad = (Math.max(5, angleDeg) * Math.PI) / 180;
    const raw = 1 / Math.sin(angleRad); // 90° → 1.0, 30° → 2.0
    return THREE.MathUtils.clamp(raw, 1.0, 1.8);
  }, [angleDeg]);

  const { geometry, material } = useMemo(() => {
    const SEG = 96;
    const RINGS = 24;
    const geo = new THREE.CircleGeometry(1, SEG, 0, Math.PI * 2);
    // CircleGeometry has 1 center vertex + SEG ring vertices (only one ring).
    // Replace with a multi-ring disc so we can deform.
    const positions: number[] = [0, 0, 0];
    const colors: number[] = [];
    const tmp = new THREE.Color();

    for (let r = 1; r <= RINGS; r++) {
      const ringR = r / RINGS; // 0..1 normalized radius
      for (let s = 0; s < SEG; s++) {
        const a = (s / SEG) * Math.PI * 2;
        const x = Math.cos(a) * ringR;
        const y = Math.sin(a) * ringR;
        // Bowl depth profile (deeper + sharper than before so the crater
        // reads as a punched-in hole, not a polite dent):
        //   center (r=0)     → -0.55 (deep pit)
        //   bowl floor flat-ish until 0.55, then climbs steeply to rim
        //   rim   (r=0.88)   → +0.07 raised lip
        //   outer (r=1)      → tapered ejecta blanket back to ground
        let z: number;
        if (ringR < 0.88) {
          z = -0.55 * Math.pow(1 - ringR / 0.88, 1.4);
        } else {
          z = 0.07 * (1 - (ringR - 0.88) / 0.12);
        }
        positions.push(x, y, z);
      }
    }

    // Center colour — pitch-black scorch
    tmp.setRGB(0.02, 0.015, 0.012);
    colors.push(tmp.r, tmp.g, tmp.b);
    for (let r = 1; r <= RINGS; r++) {
      const ringR = r / RINGS;
      // Center charred (black) → mid molten-rust → rim sandy-tan ejecta
      let cr = 0.03 + ringR * 0.40;
      let cg = 0.02 + ringR * 0.25;
      let cb = 0.015 + ringR * 0.18;
      // Rim splash (lighter ejecta blanket)
      if (ringR > 0.82 && ringR < 0.96) {
        cr += 0.10;
        cg += 0.07;
        cb += 0.05;
      }
      for (let s = 0; s < SEG; s++) {
        colors.push(cr, cg, cb);
      }
    }

    // Index triangles: center + first ring is a fan; subsequent rings are quads.
    const indices: number[] = [];
    for (let s = 0; s < SEG; s++) {
      indices.push(0, 1 + s, 1 + ((s + 1) % SEG));
    }
    for (let r = 1; r < RINGS; r++) {
      const ring0 = 1 + (r - 1) * SEG;
      const ring1 = 1 + r * SEG;
      for (let s = 0; s < SEG; s++) {
        const a = ring0 + s;
        const b = ring0 + ((s + 1) % SEG);
        const c = ring1 + s;
        const d = ring1 + ((s + 1) % SEG);
        indices.push(a, c, b, b, c, d);
      }
    }

    const customGeo = new THREE.BufferGeometry();
    customGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    customGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    customGeo.setIndex(indices);
    customGeo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.98,
      metalness: 0.0,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      // Render slightly *over* the Earth surface so we don't lose to z-fighting
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    geo.dispose();
    return { geometry: customGeo, material: mat };
  }, []);

  useFrame(() => {
    // Fully opaque once revealed; the emissive scorch pit needs to read.
    const target = Math.min(1, reveal * 1.2);
    material.opacity = THREE.MathUtils.lerp(material.opacity, target, 0.1);
  });

  if (radius <= 0) return null;
  return (
    <group ref={groupRef} position={impactPoint} quaternion={orientation}>
      {/* Floats just above the Earth shell so the rim reads against clouds.
       *  X scale > Y scale → ellipse elongated along the downrange axis. */}
      <mesh
        geometry={geometry}
        material={material}
        scale={[radius * elongation, radius, radius * 0.7]}
      />
    </group>
  );
}
