'use client'
import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
interface SeismicWavesProps {
  impactPosition: THREE.Vector3
  magnitude: number
  progress: number
}
function SingleSeismicWave({
  position,
  quaternion,
  radius,
  amplitude,
  color,
  frequency
}: {
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  radius: number
  amplitude: number
  color: string
  frequency: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const waveMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        waveRadius: { value: radius },
        amplitude: { value: amplitude },
        color: { value: new THREE.Color(color) },
        frequency: { value: frequency },
        time: { value: 0 }
      },
      vertexShader: `
        uniform float waveRadius;
        uniform float amplitude;
        uniform float frequency;
        uniform float time;
        varying vec2 vUv;
        varying float vWave;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float dist = length(pos.xy);
          float wave = sin((dist - waveRadius) * frequency * 20.0 + time * 5.0);
          wave *= amplitude;
          wave *= smoothstep(waveRadius + 0.3, waveRadius, dist);
          wave *= smoothstep(0.0, waveRadius - 0.2, dist);
          vWave = wave;
          pos.z += wave * 0.1;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float waveRadius;
        varying vec2 vUv;
        varying float vWave;
        void main() {
          float intensity = abs(vWave) * 2.0;
          float alpha = intensity * 0.6;
          gl_FragColor = vec4(color, alpha);
        }
      `
    })
  }, [radius, amplitude, color, frequency])
  useFrame((state) => {
    if (waveMaterial.uniforms) {
      waveMaterial.uniforms.waveRadius.value = radius
      waveMaterial.uniforms.amplitude.value = amplitude
      waveMaterial.uniforms.time.value = state.clock.elapsedTime
    }
  })
  return (
    <mesh
      ref={meshRef}
      position={position}
      quaternion={quaternion}
    >
      <planeGeometry args={[radius * 3, radius * 3, 64, 64]} />
      <primitive object={waveMaterial} attach="material" />
    </mesh>
  )
}
export function SeismicWaves({
  impactPosition,
  magnitude,
  progress
}: SeismicWavesProps) {
  const P_WAVE_VELOCITY = 6
  const S_WAVE_VELOCITY = 3.5
  const SURFACE_WAVE_VELOCITY = 3
  const time_s = progress * 40
  const pWaveRadius = (time_s * P_WAVE_VELOCITY) / 6371 * 1.8
  const sWaveRadius = (time_s * S_WAVE_VELOCITY) / 6371 * 1.8
  const surfaceWaveRadius = (time_s * SURFACE_WAVE_VELOCITY) / 6371 * 1.8
  const pAmplitude = magnitude * 0.3
  const sAmplitude = magnitude * 0.6
  const surfaceAmplitude = magnitude * 1.0
  const normal = useMemo(() => impactPosition.clone().normalize(), [impactPosition])
  const quaternion = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0)
    return new THREE.Quaternion().setFromUnitVectors(up, normal)
  }, [normal])
  if (progress < 0.28 || progress > 0.95) {
    return <group visible={false} />
  }
  return (
    <group>
      <SingleSeismicWave
        position={impactPosition}
        quaternion={quaternion}
        radius={pWaveRadius}
        amplitude={pAmplitude}
        color="#4488ff"
        frequency={5}
      />
      <SingleSeismicWave
        position={impactPosition}
        quaternion={quaternion}
        radius={sWaveRadius}
        amplitude={sAmplitude}
        color="#ff4488"
        frequency={3}
      />
      <SingleSeismicWave
        position={impactPosition}
        quaternion={quaternion}
        radius={surfaceWaveRadius}
        amplitude={surfaceAmplitude}
        color="#ff8844"
        frequency={1}
      />
    </group>
  )
}
