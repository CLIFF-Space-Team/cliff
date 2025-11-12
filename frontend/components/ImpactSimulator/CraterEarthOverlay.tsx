'use client'
import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
interface CraterEarthOverlayProps {
  impactPosition: THREE.Vector3
  craterDiameter_m: number
  craterDepth_m: number
  progress: number
  earthTexture: THREE.Texture
  earthNormalMap: THREE.Texture
}
export function CraterEarthOverlay({
  impactPosition,
  craterDiameter_m,
  craterDepth_m,
  progress,
  earthTexture,
  earthNormalMap
}: CraterEarthOverlayProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const earthRadius = 1.8
  const craterRadius_km = craterDiameter_m / 2000
  const overlayGeometry = useMemo(() => {
    const segments = 256
    const size = (craterDiameter_m * 2 / 6371000) * earthRadius
    const geo = new THREE.PlaneGeometry(size, size, segments, segments)
    const positions = geo.getAttribute('position')
    const uvs = geo.getAttribute('uv')
    const vertex = new THREE.Vector3()
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i)
      const dist = Math.sqrt(vertex.x * vertex.x + vertex.y * vertex.y)
      const normalizedDist = dist / (size / 2)
      if (normalizedDist < 1.0) {
        const craterDepth = -craterDepth_m / 1000 * (1.0 - normalizedDist * normalizedDist)
        const rimPos = 0.92
        const rimWidth = 0.08
        const rimFactor = Math.exp(-Math.pow((normalizedDist - rimPos) / rimWidth, 2))
        const rimHeight = (craterDiameter_m * 0.04 / 1000) * rimFactor
        const totalDisplacement = craterDepth + rimHeight
        positions.setZ(i, totalDisplacement * (size / craterRadius_km))
      }
    }
    geo.computeVertexNormals()
    geo.computeTangents()
    return geo
  }, [craterDiameter_m, craterDepth_m, craterRadius_km, earthRadius])
  const blendMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        progress: { value: 0 },
        earthTexture: { value: earthTexture },
        earthNormalMap: { value: earthNormalMap },
        craterCenter: { value: impactPosition },
        craterRadius: { value: craterRadius_km },
        time: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying float vDistFromCenter;
        uniform vec3 craterCenter;
        uniform float craterRadius;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          float dist = length(vPosition.xy);
          vDistFromCenter = dist / craterRadius;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float progress;
        uniform sampler2D earthTexture;
        uniform sampler2D earthNormalMap;
        uniform float time;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying float vDistFromCenter;
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        void main() {
          vec4 earthColor = texture2D(earthTexture, vUv);
          vec3 earthNormal = texture2D(earthNormalMap, vUv).xyz * 2.0 - 1.0;
          vec3 craterBedrock = vec3(0.35, 0.30, 0.25);
          vec3 craterRim = vec3(0.65, 0.55, 0.45);
          vec3 impactMelt = vec3(0.20, 0.18, 0.16);
          vec3 baseColor = earthColor.rgb;
          if (vDistFromCenter < 1.0) {
            float craterMix = smoothstep(1.0, 0.8, vDistFromCenter);
            if (vDistFromCenter < 0.5) {
              float meltMix = smoothstep(0.5, 0.0, vDistFromCenter);
              baseColor = mix(craterBedrock, impactMelt, meltMix);
            } else {
              baseColor = craterBedrock;
            }
            if (vDistFromCenter > 0.85) {
              float rimMix = smoothstep(0.85, 0.95, vDistFromCenter);
              baseColor = mix(baseColor, craterRim, rimMix);
            }
            if (vDistFromCenter > 0.7) {
              float edgeBlend = smoothstep(0.7, 1.0, vDistFromCenter);
              baseColor = mix(baseColor, earthColor.rgb, edgeBlend);
            }
          }
          float ao = 1.0;
          if (vDistFromCenter < 0.8) {
            ao = 0.4 + 0.6 * vDistFromCenter;
          }
          baseColor *= ao;
          vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
          float NdotL = max(0.3, dot(vNormal, lightDir));
          baseColor *= NdotL;
          float noise = hash(vUv * 100.0);
          baseColor += vec3(noise * 0.03 - 0.015);
          float feather = smoothstep(0.95, 1.0, vDistFromCenter);
          float alpha = (1.0 - feather) * progress;
          gl_FragColor = vec4(baseColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending
    })
  }, [earthTexture, earthNormalMap, impactPosition, craterRadius_km])
  useFrame((state) => {
    if (!meshRef.current) return
    if (progress < 0.28 || progress > 0.95) {
      meshRef.current.visible = false
      return
    }
    meshRef.current.visible = true
    const localProgress = (progress - 0.28) / 0.67
    const smoothProgress = Math.pow(localProgress, 0.4)
    if (blendMaterial.uniforms) {
      blendMaterial.uniforms.progress.value = smoothProgress
      blendMaterial.uniforms.time.value = state.clock.elapsedTime
    }
  })
  const normal = useMemo(() => impactPosition.clone().normalize(), [impactPosition])
  const quaternion = useMemo(() => {
    const up = new THREE.Vector3(0, 0, 1)
    return new THREE.Quaternion().setFromUnitVectors(up, normal)
  }, [normal])
  return (
    <mesh
      ref={meshRef}
      position={impactPosition}
      quaternion={quaternion}
      visible={false}
    >
      <primitive object={overlayGeometry} attach="geometry" />
      <primitive object={blendMaterial} attach="material" />
    </mesh>
  )
}
