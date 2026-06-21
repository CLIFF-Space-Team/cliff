'use client';

import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface EarthProps {
  position?: [number, number, number];
  scale?: number;
  rotationSpeed?: number;
  /** Dünya→Güneş yön vektörü (dünya-uzayı, normalize). Atmosfer gündüz tarafını
   *  daha parlak yapar — bilimsel terminatör hissi. */
  sunDirection?: [number, number, number];
}

// Dünya'nın gerçek eksen eğikliği — 23.44°. Mevsimleri ve aydınlanma
// asimetrisini doğru kılar.
const AXIAL_TILT = THREE.MathUtils.degToRad(23.44);

/**
 * Bilimsel Dünya:
 *  - NASA Blue Marble gündüz + gece şehir ışıkları + bulut + normal + spekülar
 *  - 23.44° eksen eğikliği
 *  - Fresnel atmosfer kabuğu (limb'de mavi parıltı, gündüz tarafı daha parlak)
 */
export function Earth({
  position = [0, 0, 0],
  scale = 1.6,
  rotationSpeed = 0.04,
  sunDirection = [-0.92, 0.12, 0.25],
}: EarthProps) {
  const surfaceRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const [day, night, clouds, normal, specular] = useTexture([
    '/textures/earth-day.jpg',
    '/textures/earth-night.jpg',
    '/textures/earth-clouds.jpg',
    '/textures/earth-normal.jpg',
    '/textures/earth-specular.jpg',
  ]) as [THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture];
  day.colorSpace = THREE.SRGBColorSpace;
  night.colorSpace = THREE.SRGBColorSpace;
  clouds.colorSpace = THREE.SRGBColorSpace;
  for (const t of [day, night, clouds, normal, specular]) {
    t.anisotropy = 8;
  }

  const surfaceMaterial = useMemo(() => {
    return new THREE.MeshPhongMaterial({
      map: day,
      normalMap: normal,
      normalScale: new THREE.Vector2(0.85, 0.85),
      specularMap: specular,
      specular: new THREE.Color('#1b3a66'),
      shininess: 18,
      // Gece şehir ışıkları — düşük yoğunluk, gündüz tarafında ezilmesin diye.
      emissiveMap: night,
      emissive: new THREE.Color('#b89a5a'),
      emissiveIntensity: 0.42,
    });
  }, [day, night, normal, specular]);

  // Skalar deps — `sunDirection` varsayılan dizi literali her render'da yeni
  // referans olur; bunu skalara açmazsak sunVec (ve ona bağlı atmosphereMaterial)
  // oynatma sırasında HER KARE yeniden kurulur (saniyede ~60 ShaderMaterial).
  const [sunX, sunY, sunZ] = sunDirection;
  const sunVec = useMemo(
    () => new THREE.Vector3(sunX, sunY, sunZ).normalize(),
    [sunX, sunY, sunZ],
  );

  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
        depthWrite: false,
        uniforms: {
          uColor: { value: new THREE.Color('#5aa9ff') },
          uSun: { value: sunVec.clone() },
        },
        vertexShader: /* glsl */ `
          varying vec3 vN;
          varying vec3 vView;
          void main() {
            vN = normalize(mat3(modelMatrix) * normal);
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vView = normalize(cameraPosition - wp.xyz);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vN;
          varying vec3 vView;
          uniform vec3 uColor;
          uniform vec3 uSun;
          void main() {
            // Limb parıltısı — kenara doğru artar (fresnel).
            float fres = pow(1.0 - max(dot(vN, vView), 0.0), 2.6);
            // Gündüz tarafı daha parlak (terminatör asimetrisi).
            float sunLit = smoothstep(-0.35, 0.5, dot(vN, normalize(uSun)));
            float a = fres * (0.22 + 0.78 * sunLit);
            gl_FragColor = vec4(uColor, clamp(a, 0.0, 1.0));
          }
        `,
      }),
    [sunVec],
  );

  // <primitive object={...}> ile takılan malzemeler R3F tarafından auto-dispose
  // EDİLMEZ — değiştiklerinde/unmount'ta eski malzeme+program sızar.
  useEffect(() => () => surfaceMaterial.dispose(), [surfaceMaterial]);
  useEffect(() => () => atmosphereMaterial.dispose(), [atmosphereMaterial]);

  useFrame((_, dt) => {
    if (surfaceRef.current) surfaceRef.current.rotation.y += dt * rotationSpeed;
    if (cloudsRef.current) cloudsRef.current.rotation.y += dt * (rotationSpeed * 1.35);
  });

  return (
    <group position={position} rotation={[0, 0, AXIAL_TILT]}>
      {/* Yüzey — eksen etrafında döner */}
      <mesh ref={surfaceRef} scale={scale}>
        <sphereGeometry args={[1, 128, 128]} />
        <primitive object={surfaceMaterial} attach="material" />
      </mesh>
      {/* Bulut katmanı — biraz daha hızlı döner */}
      <mesh ref={cloudsRef} scale={scale * 1.01}>
        <sphereGeometry args={[1, 96, 96]} />
        <meshLambertMaterial map={clouds} transparent opacity={0.38} depthWrite={false} />
      </mesh>
      {/* Atmosfer — fresnel parıltı kabuğu */}
      <mesh scale={scale * 1.045}>
        <sphereGeometry args={[1, 96, 96]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>
      {/* Dış ince hale — yumuşak yayılma */}
      <mesh scale={scale * 1.16}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial
          color={new THREE.Color('#3d7fd6')}
          transparent
          opacity={0.05}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
