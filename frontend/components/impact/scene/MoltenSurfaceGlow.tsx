'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface MoltenSurfaceGlowProps {
  impactPoint: [number, number, number];
  earthRadius: number;
  progress: number;
  energyMegatons: number;
}

/**
 * Çarpma bölgesinin akkor parıltısı — yüzey erir. Geodezik açıya göre radyal
 * sıcaklık gradyanı (merkezde beyaz-sıcak → kenarda kızıl). Enerji büyüdükçe
 * parıltı yarımküreye, dev çarpmada tüm görünür yüze yayılır. Additive + bloom
 * = erimiş gezegen. Çarpma sonrası yavaşça soğur.
 */
export function MoltenSurfaceGlow({
  impactPoint,
  earthRadius,
  progress,
  energyMegatons,
}: MoltenSurfaceGlowProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const impactDir = useMemo(
    () => new THREE.Vector3(...impactPoint).normalize(),
    [impactPoint],
  );

  const glowAngle = useMemo(() => {
    const e = Math.max(0, Math.log10(Math.max(1, energyMegatons)));
    return THREE.MathUtils.clamp(0.13 + e * 0.24, 0.13, 2.4);
  }, [energyMegatons]);

  // Malzeme bir KEZ kurulur; impactDir/glowAngle her kare uniform olarak itilir.
  // (Eskiden [impactDir, glowAngle] deps → her senaryo değişiminde yeni
  //  ShaderMaterial + GLSL recompile + sızıntı.)
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uImpact: { value: new THREE.Vector3(0, 1, 0) },
          uAngle: { value: 0.13 },
          uIntensity: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vN;
          void main() {
            vN = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vN;
          uniform vec3 uImpact;
          uniform float uAngle;
          uniform float uIntensity;
          void main() {
            float d = acos(clamp(dot(normalize(vN), normalize(uImpact)), -1.0, 1.0));
            float g = 1.0 - smoothstep(0.0, uAngle, d);
            // Merkez akkor (beyaz-sıcak, >1 bloom için) → kenar kızıl.
            vec3 hot = mix(vec3(0.45, 0.04, 0.0), vec3(3.2, 1.25, 0.25), pow(g, 1.4));
            float a = pow(g, 1.2) * uIntensity;
            gl_FragColor = vec4(hot, clamp(a, 0.0, 1.0));
          }
        `,
      }),
    [],
  );

  useFrame((_, dt) => {
    const m = matRef.current;
    if (!m) return;
    // Senaryoya bağlı değerleri uniform olarak güncelle (recompile yok).
    (m.uniforms.uImpact!.value as THREE.Vector3).copy(impactDir);
    m.uniforms.uAngle!.value = glowAngle;
    // 0.62'de parla, sonra yavaşça soğu (tam sönmez — kalıcı yara izi).
    let target = 0;
    if (progress >= 0.62) {
      const since = (progress - 0.62) / 0.38;
      target = THREE.MathUtils.clamp(1.0 - since * 0.45, 0.0, 1.0);
    }
    const u = m.uniforms.uIntensity;
    if (!u) return;
    const cur = u.value as number;
    u.value = THREE.MathUtils.lerp(cur, target, Math.min(1, dt * 5));
  });

  return (
    <mesh scale={earthRadius * 1.008}>
      <sphereGeometry args={[1, 96, 96]} />
      <primitive ref={matRef} object={material} attach="material" />
    </mesh>
  );
}
