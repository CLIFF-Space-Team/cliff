'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface CityClusterProps {
  impactPoint: [number, number, number];
  shockRadiusFn: () => number;
  footprint?: number;
  count?: number;
}

interface BuildingSlot {
  ox: number;
  oz: number;
  dist: number;
  height: number;
  width: number;
  /** 0 = box, 1 = tower, 2 = wedge */
  shape: 0 | 1 | 2;
  /** Per-building lit window tint (warm). Drives both diffuse + emissive via instanceColor. */
  litColor: THREE.Color;
  seed: number;
}

interface DustPuff {
  ox: number;
  oz: number;
  /** Birth time; -1 = not active. */
  birth: number;
}

// ── Paylaşılan birim geometriler (instance başına özel attribute YOK — düzen
//    ve çökme instanceMatrix'te, ışık durumu instanceColor'da taşınır). ────────
const BOX_GEO = new THREE.BoxGeometry(1, 1, 1);
const CYL_GEO = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
const WEDGE_GEO = (() => {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > 0) {
      p.setX(i, p.getX(i) * 0.6);
      p.setZ(i, p.getZ(i) * 0.6);
    }
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
})();
const SHAPE_GEO: THREE.BufferGeometry[] = [BOX_GEO, CYL_GEO, WEDGE_GEO];

// Çöken binanın diffuse + emissive'ini birlikte söndüren hedef ton.
const COLLAPSED_TINT = new THREE.Color(0.16, 0.13, 0.11);

// Scratch — kare başına tahsisat yok.
const _obj = new THREE.Object3D();
const _col = new THREE.Color();

// Toz/köz bulutları için paylaşılan instanced kaynaklar. Additive: köz parlar
// (bloom yakalar), duman hafifçe yayılır. Per-puff opaklık + ısı instanceColor'a
// gömülür (tek InstancedMesh = 1 draw call; yüksek enerjide ~140 ayrı mesh yerine).
const DUST_GEO = new THREE.SphereGeometry(1, 10, 10);
const DUST_MAT = new THREE.MeshBasicMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
});

/**
 * Instanced şehir kümesi (performans): binalar üç InstancedMesh'te (kutu/kule/
 * kama) — ~140 ayrı mesh yerine ~3 draw call. Düzen + dramatik çökme
 * instanceMatrix'te; pencere ışıklarının sönmesi instanceColor üzerinden
 * (onBeforeCompile emissive'i instanceColor ile çarpar). Şok dalgası bir binanın
 * mesafesini geçince bina çöker ve ayak izinde bir köz→duman bulutu doğar.
 */
export function CityCluster({
  impactPoint,
  shockRadiusFn,
  footprint = 0.5,
  count = 140,
}: CityClusterProps) {
  const slots = useMemo<BuildingSlot[]>(() => {
    const out: BuildingSlot[] = [];
    let seed = 1337;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * footprint;
      const ox = Math.cos(angle) * r;
      const oz = Math.sin(angle) * r;
      const heightRoll = rng();
      const height =
        heightRoll > 0.92
          ? 0.16 + rng() * 0.1
          : heightRoll > 0.7
            ? 0.08 + rng() * 0.06
            : 0.04 + rng() * 0.04;
      const width = 0.022 + rng() * 0.025;
      const shape = (rng() > 0.85 ? 2 : rng() > 0.7 ? 1 : 0) as 0 | 1 | 2;
      // Sıcak pencere tonu — hafif bina-bina çeşitlilik.
      const litColor = new THREE.Color().setHSL(0.09 + rng() * 0.03, 0.5, 0.6 + rng() * 0.08);
      out.push({ ox, oz, dist: Math.hypot(ox, oz), height, width, shape, litColor, seed: i });
    }
    return out;
  }, [count, footprint]);

  // Şekle göre global indeks grupları.
  const byShape = useMemo(() => {
    const groups: number[][] = [[], [], []];
    slots.forEach((s, i) => groups[s.shape]!.push(i));
    return groups;
  }, [slots]);

  // Pencere dokusu + onBeforeCompile'lı paylaşılan malzeme. emissive (pencereler)
  // instanceColor ile çarpılır → çöken binada ışıklar söner.
  const { texture, material } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1a1a1c';
      ctx.fillRect(0, 0, 64, 64);
      for (let y = 4; y < 60; y += 6) {
        for (let x = 4; x < 60; x += 6) {
          const lit = Math.random() > 0.4;
          ctx.fillStyle = lit
            ? `rgba(${230 + Math.random() * 25}, ${200 + Math.random() * 30}, ${110 + Math.random() * 60}, 0.95)`
            : '#0a0a0c';
          ctx.fillRect(x, y, 3, 3);
        }
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.repeat.set(2, 3);

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      color: new THREE.Color('#2a2622'),
      roughness: 0.5,
      metalness: 0.1,
      emissive: new THREE.Color('#ffd9a0'),
      emissiveMap: tex,
      emissiveIntensity: 1.1,
    });
    // emissive'i instanceColor (vColor) ile çarp → bina çökünce pencereler söner.
    // USE_INSTANCING_COLOR ile koru: instanceColor atanmadan derlenirse hata olmaz.
    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        #ifdef USE_INSTANCING_COLOR
          totalEmissiveRadiance *= vColor;
        #endif`,
      );
    };
    mat.customProgramCacheKey = () => 'city-building-emissive-instcolor';
    return { texture: tex, material: mat };
  }, []);

  useEffect(
    () => () => {
      texture.dispose();
      material.dispose();
    },
    [texture, material],
  );

  const orientation = useMemo(() => {
    const normal = new THREE.Vector3(...impactPoint).normalize();
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    return quat;
  }, [impactPoint]);

  // InstancedMesh ref'leri (şekil başına) + per-instance animasyon durumu.
  const meshRefs = useRef<(THREE.InstancedMesh | null)[]>([null, null, null]);
  const loc = useRef<{ shape: number; local: number }[]>([]);
  const collapsed = useRef<boolean[]>([]);
  const dirty = useRef<boolean[]>([]);
  const curScaleY = useRef<number[]>([]);
  const curTilt = useRef<number[]>([]);
  const curPosY = useRef<number[]>([]);
  const curDim = useRef<number[]>([]);

  const dustMeshRef = useRef<THREE.InstancedMesh>(null);
  const dustPuffs = useRef<DustPuff[]>([]);
  const tickRef = useRef(0);

  // Başlangıç durumunu kur: dik matrisler + ışıklı instanceColor.
  useEffect(() => {
    const n = slots.length;
    loc.current = new Array(n);
    collapsed.current = new Array(n).fill(false);
    dirty.current = new Array(n).fill(false);
    curScaleY.current = new Array(n);
    curTilt.current = new Array(n);
    curPosY.current = new Array(n);
    curDim.current = new Array(n);
    dustPuffs.current = slots.map(() => ({ ox: 0, oz: 0, birth: -1 }));

    // Toz instance'larını başlat (hepsi gizli — sıfır ölçek).
    const dm = dustMeshRef.current;
    if (dm) {
      dm.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      _obj.scale.setScalar(0);
      _obj.position.set(0, -999, 0);
      _obj.rotation.set(0, 0, 0);
      _obj.updateMatrix();
      _col.setRGB(0, 0, 0);
      for (let i = 0; i < slots.length; i++) {
        dm.setMatrixAt(i, _obj.matrix);
        dm.setColorAt(i, _col);
      }
      dm.instanceMatrix.needsUpdate = true;
      if (dm.instanceColor) dm.instanceColor.needsUpdate = true;
    }

    byShape.forEach((idxs, shape) => {
      const mesh = meshRefs.current[shape];
      if (!mesh) return;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      idxs.forEach((gi, local) => {
        const s = slots[gi]!;
        loc.current[gi] = { shape, local };
        curScaleY.current[gi] = s.height;
        curTilt.current[gi] = 0;
        curPosY.current[gi] = s.height / 2;
        curDim.current[gi] = 1;
        _obj.position.set(s.ox, s.height / 2, s.oz);
        _obj.rotation.set(0, 0, 0);
        _obj.scale.set(s.width, s.height, s.width);
        _obj.updateMatrix();
        mesh.setMatrixAt(local, _obj.matrix);
        mesh.setColorAt(local, s.litColor);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [slots, byShape, material]);

  useFrame((_, dt) => {
    tickRef.current += dt;
    const shockR = shockRadiusFn();
    const touched = [false, false, false];

    for (let i = 0; i < slots.length; i++) {
      const s = slots[i]!;
      // Şok dalgası ulaştı → çökmeyi tetikle + toz doğur (ucuz tarama).
      if (!collapsed.current[i] && shockR > 0 && shockR > s.dist) {
        collapsed.current[i] = true;
        dirty.current[i] = true;
        const p = dustPuffs.current[i];
        if (p) {
          p.ox = s.ox;
          p.oz = s.oz;
          p.birth = tickRef.current;
        }
      }
      if (!dirty.current[i]) continue; // dik + dokunulmamış → atla (gating)

      const l = loc.current[i];
      const mesh = l ? meshRefs.current[l.shape] : null;
      if (!l || !mesh) continue;

      const tScaleY = s.height * 0.08;
      const tiltSign = s.seed % 2 ? 1 : -1;
      const tTilt = tiltSign * (0.55 + (s.seed % 5) * 0.1);
      const tPosY = (s.height * 0.08) / 2;

      const sy = THREE.MathUtils.lerp(curScaleY.current[i]!, tScaleY, 0.22);
      const tl = THREE.MathUtils.lerp(curTilt.current[i]!, tTilt, 0.22);
      const py = THREE.MathUtils.lerp(curPosY.current[i]!, tPosY, 0.22);
      const dim = THREE.MathUtils.lerp(curDim.current[i]!, 0, 0.12);
      curScaleY.current[i] = sy;
      curTilt.current[i] = tl;
      curPosY.current[i] = py;
      curDim.current[i] = dim;

      _obj.position.set(s.ox, py, s.oz);
      _obj.rotation.set(0, 0, tl);
      _obj.scale.set(s.width, sy, s.width);
      _obj.updateMatrix();
      mesh.setMatrixAt(l.local, _obj.matrix);
      _col.copy(COLLAPSED_TINT).lerp(s.litColor, dim);
      mesh.setColorAt(l.local, _col);
      touched[l.shape] = true;

      // Yakınsadıysa animasyonu durdur (kalıcı per-frame yazımı bitir).
      if (Math.abs(sy - tScaleY) < 1e-4 && Math.abs(tl - tTilt) < 2e-3 && dim < 5e-3) {
        dirty.current[i] = false;
      }
    }

    touched.forEach((t, shape) => {
      if (!t) return;
      const mesh = meshRefs.current[shape];
      if (!mesh) return;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });

    // Toz/köz bulutları — tek InstancedMesh. Aktif olanlar çizilir, ömrü dolan
    // bir kez gizlenir (birth=-2 işareti). Köz+opaklık instanceColor'a gömülür.
    const dm = dustMeshRef.current;
    if (dm) {
      let dustTouched = false;
      const lifetime = 2.2;
      for (let i = 0; i < dustPuffs.current.length; i++) {
        const puff = dustPuffs.current[i]!;
        if (puff.birth < 0) continue; // -1 hiç doğmadı / -2 ömrü doldu
        const age = tickRef.current - puff.birth;
        if (age > lifetime) {
          _obj.scale.setScalar(0);
          _obj.position.set(0, -999, 0);
          _obj.updateMatrix();
          dm.setMatrixAt(i, _obj.matrix);
          puff.birth = -2;
          dustTouched = true;
          continue;
        }
        const t = age / lifetime;
        _obj.position.set(puff.ox, t * 0.12, puff.oz);
        _obj.scale.setScalar(0.03 + t * 0.16);
        _obj.rotation.set(0, 0, 0);
        _obj.updateMatrix();
        dm.setMatrixAt(i, _obj.matrix);
        const heat = Math.max(0, 1 - t / 0.3);
        const op = (1 - t) * (0.5 + heat * 0.35);
        // Additive yayım: duman gövdesi (gri-turuncu × opaklık) + akkor köz parıltısı.
        _col.setRGB(
          (0.48 + heat * 0.5) * op + heat * 2.0,
          (0.42 + heat * 0.16) * op + heat * 0.7,
          (0.38 - heat * 0.22) * op + heat * 0.15,
        );
        dm.setColorAt(i, _col);
        dustTouched = true;
      }
      if (dustTouched) {
        dm.instanceMatrix.needsUpdate = true;
        if (dm.instanceColor) dm.instanceColor.needsUpdate = true;
      }
    }
  });

  return (
    <group position={impactPoint} quaternion={orientation}>
      {byShape.map((idxs, shape) =>
        idxs.length > 0 ? (
          <instancedMesh
            key={shape}
            ref={(el) => {
              meshRefs.current[shape] = el;
            }}
            args={[SHAPE_GEO[shape], material, idxs.length]}
            frustumCulled={false}
          />
        ) : null,
      )}
      <instancedMesh
        ref={dustMeshRef}
        args={[DUST_GEO, DUST_MAT, count]}
        frustumCulled={false}
      />
    </group>
  );
}
