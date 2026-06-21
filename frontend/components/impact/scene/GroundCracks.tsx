'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface GroundCracksProps {
  impactPoint: [number, number, number];
  /** 0..1 cursor; cracks grow from 0.65 to 1.0. */
  progress: number;
  /** Maximum crack length in scene units. */
  peakRadius: number;
  /** Radius of the crater bowl (scene units). Cracks start *outside* this
   *  so they don't draw across the bowl floor (where the user can't see
   *  them anyway since the crater colour is pitch-black at the centre). */
  craterRadius?: number;
}

interface Crack {
  /** Polyline points in tangent space (Z-up plane). */
  points: THREE.Vector3[];
  /** Final radial reach for this crack. */
  reach: number;
  /** Hash for varied timing. */
  seed: number;
}

/**
 * Lightning-like radial fissures that grow outward from the impact point and
 * cling to the Earth surface. Each crack zigzags as it extends, evoking
 * crustal fracture rather than perfect circles.
 */
export function GroundCracks({
  impactPoint,
  progress,
  peakRadius,
  craterRadius = 0,
}: GroundCracksProps) {
  const groupRef = useRef<THREE.Group>(null);

  const orientation = useMemo(() => {
    const normal = new THREE.Vector3(...impactPoint).normalize();
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    return quat;
  }, [impactPoint]);

  const cracks = useMemo<Crack[]>(() => {
    const out: Crack[] = [];
    // Fewer, longer, slightly more sinuous cracks → reads as real geology
    // instead of a sun-burst sticker. Branches get added below.
    const COUNT = 9;
    let seed = 5141;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    for (let i = 0; i < COUNT; i++) {
      const baseAngle = (i / COUNT) * Math.PI * 2 + (rng() - 0.5) * 0.35;
      const reach = peakRadius * (0.6 + rng() * 0.5);
      const segments = 18 + Math.floor(rng() * 8);
      // Cracks start just outside the crater rim so they don't draw
      // across the bowl floor. craterRadius=0 (caller didn't pass it)
      // falls back to a fraction of peakRadius.
      const rimOffset = craterRadius > 0 ? craterRadius * 1.05 : peakRadius * 0.18;
      const startR = Math.min(rimOffset, reach * 0.4);
      const pts: THREE.Vector3[] = [
        new THREE.Vector3(Math.cos(baseAngle) * startR, Math.sin(baseAngle) * startR, 0.001),
      ];
      let r = startR;
      let angle = baseAngle;
      // Persistent random walk on angle — smoother than uniform jitter,
      // gives a fault-line wandering look.
      let angleVel = 0;
      for (let s = 1; s <= segments; s++) {
        const t = s / segments;
        r = startR + (reach - startR) * t;
        angleVel = angleVel * 0.6 + (rng() - 0.5) * 0.25;
        angle += angleVel;
        pts.push(
          new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, 0.001),
        );
      }
      out.push({ points: pts, reach, seed: i });

      // 50% chance of a forking branch around 60% of the parent's length
      if (rng() < 0.5) {
        const branchStart = Math.floor(segments * (0.45 + rng() * 0.3));
        if (branchStart < pts.length - 2) {
          const start = pts[branchStart]!;
          const branchSeg = 6 + Math.floor(rng() * 5);
          const branchAngle = Math.atan2(start.y, start.x) + (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.4);
          const branchReach = reach * (0.25 + rng() * 0.25);
          const bpts: THREE.Vector3[] = [start.clone()];
          let bAngle = branchAngle;
          let bAngleVel = 0;
          for (let s = 1; s <= branchSeg; s++) {
            const tt = s / branchSeg;
            const br = start.length() + branchReach * tt;
            bAngleVel = bAngleVel * 0.55 + (rng() - 0.5) * 0.3;
            bAngle += bAngleVel;
            bpts.push(new THREE.Vector3(Math.cos(bAngle) * br, Math.sin(bAngle) * br, 0.001));
          }
          out.push({ points: bpts, reach: branchReach, seed: i + 100 });
        }
      }
    }
    return out;
  }, [peakRadius, craterRadius]);

  // Build a real THREE.Line per crack so we don't fight JSX's lowercase
  // `<line>` (which TS resolves to SVGLineElement). We mount via <primitive>.
  const lineObjs = useMemo(() => {
    return cracks.map((c) => {
      const positions = new Float32Array(c.points.length * 3);
      c.points.forEach((p, i) => {
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      // Darker rust + additive blending so the cracks look like a glowing
      // hot fissure on dark crust, not paint stripes.
      const mat = new THREE.LineBasicMaterial({
        color: '#c63a14',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      return new THREE.Line(geo, mat);
    });
  }, [cracks]);

  useFrame(() => {
    const inWindow = progress >= 0.65;
    if (!groupRef.current) return;
    groupRef.current.visible = inWindow;
    if (!inWindow) return;

    const local = (progress - 0.65) / 0.35;
    cracks.forEach((c, i) => {
      const line = lineObjs[i];
      if (!line) return;
      const delay = (c.seed % 7) * 0.03;
      const t = Math.max(0, Math.min(1, (local - delay) / 0.5));
      const visiblePoints = Math.max(2, Math.floor(c.points.length * t));
      const geo = line.geometry as THREE.BufferGeometry;
      geo.setDrawRange(0, visiblePoints);
      const mat = line.material as THREE.LineBasicMaterial;
      mat.opacity = Math.min(1, t * 1.4) * 0.8;
    });
  });

  return (
    <group ref={groupRef} position={impactPoint} quaternion={orientation}>
      {lineObjs.map((obj, i) => (
        <primitive key={i} object={obj} />
      ))}
    </group>
  );
}
