'use client'
import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
interface ShockWaveProps {
  center: THREE.Vector3
  progress: number
  maxRadius: number
  color: string
  opacity: number
  delay: number
}
export function ShockWave({
  center,
  progress,
  maxRadius,
  color,
  opacity,
  delay
}: ShockWaveProps) {
  const waveRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        time: { value: 0 },
        progress: { value: 0 },
        color: { value: new THREE.Color(color) },
        opacity: { value: opacity }
      },
      vertexShader: `
        uniform float progress;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying float vDistFromCenter;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec3 spherePos = normalize(position);
          vDistFromCenter = length(position.xy) / 2.0;
          float wave = sin(vDistFromCenter * 20.0 - progress * 10.0) * 0.02;
          vec3 displaced = position + normal * wave * progress;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float progress;
        uniform vec3 color;
        uniform float opacity;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying float vDistFromCenter;
        void main() {
          float dist = vDistFromCenter;
          float shockRing = smoothstep(progress - 0.03, progress, dist) * 
                           smoothstep(progress + 0.08, progress + 0.03, dist);
          float trailingWaves = sin((dist - progress) * 25.0 + time * 3.0) * 0.5 + 0.5;
          trailingWaves *= smoothstep(0.0, progress - 0.05, dist) * 
                          smoothstep(progress + 0.15, progress, dist);
          float edgeFade = smoothstep(0.0, 0.02, dist) * smoothstep(1.0, 0.9, dist);
          float alpha = (shockRing * 3.0 + trailingWaves * 1.2) * edgeFade * opacity;
          vec3 hotCore = vec3(1.0, 0.9, 0.6);
          vec3 finalColor = mix(color, hotCore, shockRing * 0.8);
          gl_FragColor = vec4(finalColor, alpha);
        }
      `
    })
  }, [color, opacity])
  const normal = useMemo(() => {
    return center.clone().normalize()
  }, [center])
  const quaternion = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0)
    return new THREE.Quaternion().setFromUnitVectors(up, normal)
  }, [normal])
  useFrame((state, delta) => {
    if (!waveRef.current || !materialRef.current) return
    const adjustedProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)))
    if (adjustedProgress <= 0 || progress >= 0.95) {
      waveRef.current.visible = false
      return
    }
    waveRef.current.visible = true
    const scale = maxRadius * Math.pow(adjustedProgress, 0.6)
    waveRef.current.scale.set(scale, scale, scale)
    waveRef.current.position.copy(center)
    materialRef.current.uniforms.time.value += delta
    materialRef.current.uniforms.progress.value = adjustedProgress
    materialRef.current.uniforms.opacity.value = opacity * Math.sin(adjustedProgress * Math.PI)
  })
  return (
    <mesh
      ref={waveRef}
      position={center}
      quaternion={quaternion}
    >
      {}
      <sphereGeometry args={[2, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <primitive ref={materialRef} object={shaderMaterial} attach="material" />
    </mesh>
  )
}
