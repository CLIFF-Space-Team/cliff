import { wrapEffect } from '@react-three/postprocessing';
import { Effect } from 'postprocessing';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import { Uniform, Vector2 } from 'three';

// Ekran-uzayı şok dalgası bozulması: çarpma noktasından dışa yayılan radyal bir
// halka, ekran UV'sini iterek "tüm ekran sarsılıp dalgalanıyor" hissi verir
// (Solar Smash / AAA tarzı). uRadius zamanla büyür → halka dışa koşar.
const fragmentShader = /* glsl */ `
uniform vec2 uCenter;
uniform float uRadius;
uniform float uAmplitude;
uniform float uAspect;
uniform float uWidth;

void mainUv(inout vec2 uv) {
  vec2 d = uv - uCenter;
  d.x *= uAspect;                 // dairesel kalsın diye en-boy düzelt
  float dist = length(d);
  float ring = dist - uRadius;
  float env = exp(-(ring * ring) / (uWidth * uWidth)); // halka zarfı
  float wave = env * sin(ring * 48.0);
  vec2 dir = dist > 1e-4 ? d / dist : vec2(0.0);
  dir.x /= uAspect;
  uv += dir * wave * uAmplitude;
}
`;

export class ShockwaveEffectImpl extends Effect {
  constructor() {
    super('ShockwaveEffect', fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ['uCenter', new Uniform(new Vector2(0.5, 0.5))],
        ['uRadius', new Uniform(-1)],
        ['uAmplitude', new Uniform(0)],
        ['uAspect', new Uniform(1)],
        ['uWidth', new Uniform(0.12)],
      ]),
    });
  }
}

// wrapEffect'in tip imzası props'u `never` çıkarıyor; kullanılabilir bir
// JSX bileşen tipine (sadece ref alan) cast et.
export const ShockwaveEffect = wrapEffect(
  ShockwaveEffectImpl,
) as unknown as ForwardRefExoticComponent<RefAttributes<ShockwaveEffectImpl>>;
