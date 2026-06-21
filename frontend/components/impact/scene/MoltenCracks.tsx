'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface MoltenCracksProps {
  impactPoint: [number, number, number];
  earthRadius: number;
  /** 0..1 — cracks spread from 0.63 onward. */
  progress: number;
  /** Patlama enerjisi (Mt) — çatlakların ne kadar yayılacağını belirler.
   *  Küçük çarpma: lokal birkaç çatlak. Dev çarpma: gezegeni saran lav ağı. */
  energyMegatons: number;
}

interface CrackLine {
  positions: Float32Array;
  colors: Float32Array;
  segCount: number;
  delay: number;
}

/**
 * Solar Smash tarzı erimiş lav çatlak ağı. Çatlaklar çarpma noktasından
 * KÜRE YÜZEYİNİ takip ederek (büyük-çember yürüyüşü) yayılır. Performans:
 * ~30-40 ayrı THREE.Line yerine TEK bir LineSegments (1 draw call). Kademeli
 * açılma + per-çatlak opaklık, LineBasicMaterial'ı onBeforeCompile ile
 * genişleterek (vT/vDelay attribute + uLocal uniform) reproduce edilir —
 * vertexColors/additive/tonemap/colorspace davranışı birebir korunur.
 */
export function MoltenCracks({
  impactPoint,
  earthRadius,
  progress,
  energyMegatons,
}: MoltenCracksProps) {
  const groupRef = useRef<THREE.Group>(null);

  const { segments, uLocal, geometry, material } = useMemo(() => {
    const start = new THREE.Vector3(...impactPoint).normalize();
    let t1 = new THREE.Vector3(0, 1, 0).cross(start);
    if (t1.lengthSq() < 1e-4) t1 = new THREE.Vector3(1, 0, 0).cross(start);
    t1.normalize();
    const t2 = start.clone().cross(t1).normalize();

    const e = Math.max(0, Math.log10(Math.max(1, energyMegatons)));
    const reachAngle = THREE.MathUtils.clamp(0.16 + e * 0.3, 0.16, 2.8);
    const count = Math.round(THREE.MathUtils.clamp(8 + e * 1.6, 8, 26));

    let s = 982451653 >>> 0;
    const rng = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };

    const walk = (
      p0: THREE.Vector3,
      dir0: THREE.Vector3,
      arc: number,
      hotStart: number,
    ): { positions: Float32Array; colors: Float32Array; segCount: number } => {
      const segs = Math.max(10, Math.round(arc / 0.045));
      const positions = new Float32Array((segs + 1) * 3);
      const colors = new Float32Array((segs + 1) * 3);
      const p = p0.clone();
      const dir = dir0.clone();
      const step = arc / segs;
      for (let i = 0; i <= segs; i++) {
        const surf = p.clone().multiplyScalar(earthRadius * 1.006);
        positions[i * 3] = surf.x;
        positions[i * 3 + 1] = surf.y;
        positions[i * 3 + 2] = surf.z;
        const t = i / segs;
        const heat = (1 - t) * hotStart;
        colors[i * 3] = 0.6 + heat * 2.6;
        colors[i * 3 + 1] = 0.06 + heat * 1.5;
        colors[i * 3 + 2] = 0.02 + heat * 0.4;
        const axis = new THREE.Vector3().crossVectors(p, dir).normalize();
        const q = new THREE.Quaternion().setFromAxisAngle(axis, step);
        p.applyQuaternion(q).normalize();
        dir.applyQuaternion(q);
        const wander = (rng() - 0.5) * 0.5;
        dir.applyAxisAngle(p, wander).normalize();
        dir.sub(p.clone().multiplyScalar(dir.dot(p))).normalize();
      }
      return { positions, colors, segCount: segs };
    };

    const lines: CrackLine[] = [];
    for (let i = 0; i < count; i++) {
      const baseAngle = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.4;
      const dir = t1
        .clone()
        .multiplyScalar(Math.cos(baseAngle))
        .addScaledVector(t2, Math.sin(baseAngle))
        .normalize();
      const arc = reachAngle * (0.55 + rng() * 0.55);
      const main = walk(start, dir, arc, 1.0);
      lines.push({ ...main, delay: (i % 6) * 0.025 });

      if (rng() < 0.55) {
        const bi = Math.floor(main.segCount * (0.4 + rng() * 0.35));
        const bp = new THREE.Vector3(
          main.positions[bi * 3]!,
          main.positions[bi * 3 + 1]!,
          main.positions[bi * 3 + 2]!,
        ).normalize();
        let bt1 = new THREE.Vector3(0, 1, 0).cross(bp);
        if (bt1.lengthSq() < 1e-4) bt1 = new THREE.Vector3(1, 0, 0).cross(bp);
        bt1.normalize();
        const bdir = bt1.applyAxisAngle(bp, rng() * Math.PI * 2).normalize();
        const branch = walk(bp, bdir, arc * (0.3 + rng() * 0.3), 0.6);
        lines.push({ ...branch, delay: (i % 6) * 0.025 + 0.06 });
      }
    }

    // ── Tüm çatlakları TEK LineSegments'e birleştir (segment-çifti köşeleri). ──
    let vtxCount = 0;
    for (const ln of lines) vtxCount += ln.segCount * 2;

    const position = new Float32Array(vtxCount * 3);
    const color = new Float32Array(vtxCount * 3);
    const aT = new Float32Array(vtxCount); // çatlak boyunca 0..1 (açılma cephesi)
    const aDelay = new Float32Array(vtxCount); // çatlağın başlama gecikmesi
    let w = 0;
    for (const ln of lines) {
      const { positions, colors, segCount, delay } = ln;
      for (let i = 0; i < segCount; i++) {
        for (const j of [i, i + 1]) {
          position[w * 3] = positions[j * 3]!;
          position[w * 3 + 1] = positions[j * 3 + 1]!;
          position[w * 3 + 2] = positions[j * 3 + 2]!;
          color[w * 3] = colors[j * 3]!;
          color[w * 3 + 1] = colors[j * 3 + 1]!;
          color[w * 3 + 2] = colors[j * 3 + 2]!;
          aT[w] = j / segCount;
          aDelay[w] = delay;
          w++;
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(color, 3));
    geo.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
    geo.setAttribute('aDelay', new THREE.BufferAttribute(aDelay, 1));

    const uLocalUniform = { value: 0 };
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    // Kademeli açılma + per-çatlak opaklık — LineBasicMaterial'ı genişlet.
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uLocal = uLocalUniform;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          attribute float aT;
          attribute float aDelay;
          varying float vT;
          varying float vDelay;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vT = aT;
          vDelay = aDelay;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uLocal;
          varying float vT;
          varying float vDelay;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float _t = clamp((uLocal - vDelay) / 0.55, 0.0, 1.0);
          if (vT > _t) discard;
          diffuseColor.a *= min(1.0, _t * 1.6);`,
        );
    };
    mat.customProgramCacheKey = () => 'molten-cracks-reveal';

    const lineSegments = new THREE.LineSegments(geo, mat);
    lineSegments.frustumCulled = false;
    return { segments: lineSegments, uLocal: uLocalUniform, geometry: geo, material: mat };
  }, [impactPoint, earthRadius, energyMegatons]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const inWin = progress >= 0.63;
    g.visible = inWin;
    if (!inWin) return;
    uLocal.value = (progress - 0.63) / 0.37;
  });

  if (!segments) return null;
  return (
    <group ref={groupRef}>
      <primitive object={segments} />
    </group>
  );
}
