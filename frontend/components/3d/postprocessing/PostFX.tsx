'use client';

import { useFrame } from '@react-three/fiber';
import {
  Bloom,
  EffectComposer,
  SMAA,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import { useRef } from 'react';
import * as THREE from 'three';

import { ShockwaveEffect, type ShockwaveEffectImpl } from './ShockwaveEffect';

interface PostFXProps {
  quality?: 'low' | 'medium' | 'high';
  /** Çarpma sahnesi için ekran şok dalgası bozulması — çarpma noktası + ilerleme. */
  shockwave?: { impactPoint: [number, number, number]; progress: number };
}

const _v = new THREE.Vector3();

/**
 * Restrained postprocessing — bloom (Güneş/ateş topu emissive'i), vignette ve
 * (çarpma sahnesinde) çarpma anında ekrana yayılan şok dalgası bozulması.
 */
export function PostFX({ quality = 'high', shockwave }: PostFXProps) {
  // Hook'lar erken return'den ÖNCE — koşullu hook ihlali olmasın.
  const shockRef = useRef<ShockwaveEffectImpl>(null);

  useFrame(({ camera, size }) => {
    const eff = shockRef.current;
    if (!eff || !shockwave) return;
    const u = eff.uniforms;
    const amp = u.get('uAmplitude');
    const rad = u.get('uRadius');
    const ctr = u.get('uCenter');
    const asp = u.get('uAspect');
    if (!amp || !rad || !ctr || !asp) return;

    const local = (shockwave.progress - 0.62) / 0.3;
    if (local < 0 || local > 1) {
      amp.value = 0;
      rad.value = -1;
      return;
    }
    // Çarpma noktasını ekran-uzayına yansıt (0..1, y yukarı).
    _v.set(shockwave.impactPoint[0], shockwave.impactPoint[1], shockwave.impactPoint[2]).project(camera);
    if (_v.z > 1) {
      amp.value = 0; // kameranın arkasında → bozulma yok
      return;
    }
    ctr.value.set(_v.x * 0.5 + 0.5, _v.y * 0.5 + 0.5);
    asp.value = size.width / Math.max(1, size.height);
    rad.value = local * 1.5; // halka ekran dışına koşar
    const ramp = local < 0.08 ? local / 0.08 : 1; // ani başla, sonra sön
    amp.value = (1 - local) * ramp * 0.045;
  });

  if (quality === 'low') return null;

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <SMAA />
      <Bloom
        intensity={quality === 'high' ? 0.95 : 0.6}
        luminanceThreshold={0.62}
        luminanceSmoothing={0.28}
        kernelSize={quality === 'high' ? KernelSize.LARGE : KernelSize.MEDIUM}
        mipmapBlur
      />
      {shockwave ? <ShockwaveEffect ref={shockRef} /> : <></>}
      <Vignette
        eskil={false}
        offset={0.2}
        darkness={0.62}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}
