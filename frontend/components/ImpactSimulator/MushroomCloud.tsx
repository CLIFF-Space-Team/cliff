'use client'
import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
interface MushroomCloudProps {
  position: THREE.Vector3
  energy_megatons: number
  progress: number
}
export function MushroomCloud({
  position,
  energy_megatons,
  progress
}: MushroomCloudProps) {
  const stemRef = useRef<THREE.Mesh>(null)
  const capRef = useRef<THREE.Mesh>(null)
  const cloudHeight = 12 * Math.pow(energy_megatons, 0.25)
  const cloudDiameter = 3 * cloudHeight
  const cloudMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
        progress: { value: 0 },
        cloudColor: { value: new THREE.Color('#aa8866') }
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        void main() {
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float progress;
        uniform vec3 cloudColor;
        varying vec3 vPosition;
        varying vec3 vNormal;
        float noise(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 45.543))) * 43758.5453);
        }
        float fbm(vec3 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for(int i = 0; i < 3; i++) {
            value += amplitude * noise(p);
            p *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }
        void main() {
          vec3 animPos = vPosition + vec3(time * 0.2);
          float turbulence = fbm(animPos * 2.0);
          float edgeFade = 1.0 - abs(dot(vNormal, vec3(0, 0, 1)));
          vec3 color = cloudColor + turbulence * 0.2;
          float alpha = (0.4 + turbulence * 0.3) * progress * edgeFade;
          gl_FragColor = vec4(color, alpha);
        }
      `
    })
  }, [])
  useFrame((state) => {
    if (!stemRef.current || !capRef.current) return
    if (progress < 0.35 || progress > 0.95) {
      stemRef.current.visible = false
      capRef.current.visible = false
      return
    }
    stemRef.current.visible = true
    capRef.current.visible = true
    const localProgress = (progress - 0.35) / 0.60
    const smoothProgress = Math.pow(localProgress, 0.6)
    const currentHeight = (cloudHeight / 6371) * 1.8 * smoothProgress
    const currentDiameter = (cloudDiameter / 6371) * 1.8 * smoothProgress
    const normal = position.clone().normalize()
    stemRef.current.position.copy(position.clone().add(normal.clone().multiplyScalar(currentHeight * 0.3)))
    stemRef.current.scale.set(currentDiameter * 0.3, currentHeight * 0.6, currentDiameter * 0.3)
    capRef.current.position.copy(position.clone().add(normal.clone().multiplyScalar(currentHeight * 0.8)))
    capRef.current.scale.set(currentDiameter * 0.8, currentHeight * 0.4, currentDiameter * 0.8)
    if (cloudMaterial.uniforms) {
      cloudMaterial.uniforms.time.value = state.clock.elapsedTime
      cloudMaterial.uniforms.progress.value = smoothProgress
    }
  })
  return (
    <group>
      <mesh ref={stemRef} visible={false}>
        <cylinderGeometry args={[0.5, 0.8, 1, 16, 8]} />
        <primitive object={cloudMaterial} attach="material" />
      </mesh>
      <mesh ref={capRef} visible={false}>
        <sphereGeometry args={[1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <primitive object={cloudMaterial} attach="material" />
      </mesh>
    </group>
  )
}
