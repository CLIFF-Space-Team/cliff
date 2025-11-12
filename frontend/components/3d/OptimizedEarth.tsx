'use client'
import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
interface OptimizedEarthProps {
  position?: [number, number, number]
  scale?: number
  quality?: 'low' | 'medium' | 'high'
  showClouds?: boolean
  showAtmosphere?: boolean
  enableRotation?: boolean
}
const textureCache = new Map<string, THREE.Texture>()
const materialCache = new Map<string, THREE.Material>()
export const OptimizedEarth = React.memo(({
  position = [0, 0, 0],
  scale = 1,
  quality = 'high',
  showClouds = true,
  showAtmosphere = true,
  enableRotation = true
}: OptimizedEarthProps) => {
  const earthRef = useRef<THREE.Mesh>(null)
  const cloudsRef = useRef<THREE.Mesh>(null)
  const atmosphereRef = useRef<THREE.Mesh>(null)
  const [texturesLoaded, setTexturesLoaded] = useState(false)
  const segments = useMemo(() => {
    switch (quality) {
      case 'low': return 16
      case 'medium': return 32
      case 'high': return 64
      default: return 32
    }
  }, [quality])
  const earthSize = useMemo(() => scale * 1.0, [scale])
  useEffect(() => {
    const loadTextures = async () => {
      const loader = new THREE.TextureLoader()
      const dayTextureKey = `earth_day_${quality}`
      const cloudsTextureKey = `earth_clouds_${quality}`
      let dayTexture = textureCache.get(dayTextureKey)
      let cloudsTexture = showClouds ? textureCache.get(cloudsTextureKey) : null
      if (!dayTexture) {
        try {
          dayTexture = await new Promise<THREE.Texture>((resolve) => {
            loader.load(
              '/textures/nasa/earth/earth_blue_marble_2k.jpg',
              (texture) => {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping
                resolve(texture)
              },
              undefined,
              () => {
                const fallbackTexture = new THREE.Texture()
                fallbackTexture.wrapS = fallbackTexture.wrapT = THREE.RepeatWrapping
                resolve(fallbackTexture)
              }
            )
          })
          textureCache.set(dayTextureKey, dayTexture)
        } catch (error) {
          console.warn('Failed to load earth texture:', error)
        }
      }
      if (showClouds && !cloudsTexture) {
        try {
          cloudsTexture = await new Promise<THREE.Texture>((resolve) => {
            loader.load(
              '/textures/earth-clouds.jpg',
              (texture) => {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping
                resolve(texture)
              },
              undefined,
              () => {
                const fallbackTexture = new THREE.Texture()
                fallbackTexture.wrapS = fallbackTexture.wrapT = THREE.RepeatWrapping
                resolve(fallbackTexture)
              }
            )
          })
          textureCache.set(cloudsTextureKey, cloudsTexture)
        } catch (error) {
          console.warn('Failed to load clouds texture:', error)
        }
      }
      setTexturesLoaded(true)
    }
    loadTextures()
  }, [showClouds, quality])
  const earthMaterial = useMemo(() => {
    const cacheKey = `earth_material_${quality}`
    if (materialCache.has(cacheKey)) {
      return materialCache.get(cacheKey) as THREE.MeshPhongMaterial
    }
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color('#4A90E2'),
      shininess: 30
    })
    materialCache.set(cacheKey, material)
    return material
  }, [quality])
  const cloudMaterial = useMemo(() => {
    if (!showClouds) return null
    const cacheKey = `clouds_material_${quality}`
    if (materialCache.has(cacheKey)) {
      return materialCache.get(cacheKey) as THREE.MeshPhongMaterial
    }
    const material = new THREE.MeshPhongMaterial({
      transparent: true,
      opacity: quality === 'high' ? 0.4 : 0.3,
      color: '#ffffff'
    })
    materialCache.set(cacheKey, material)
    return material
  }, [showClouds, quality])
  const atmosphereMaterial = useMemo(() => {
    if (!showAtmosphere) return null
    const cacheKey = `atmosphere_material_${quality}`
    if (materialCache.has(cacheKey)) {
      return materialCache.get(cacheKey) as THREE.ShaderMaterial
    }
    const material = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        time: { value: 0 },
        intensity: { value: quality === 'high' ? 0.6 : 0.4 }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float intensity;
        varying vec3 vNormal;
        void main() {
          float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
          rim = smoothstep(0.5, 1.0, rim);
          vec3 color = vec3(0.3, 0.6, 1.0) * rim * intensity;
          gl_FragColor = vec4(color, rim * 0.5);
        }
      `
    })
    materialCache.set(cacheKey, material)
    return material
  }, [showAtmosphere, quality])
  const lastAnimationTime = useRef(0)
  const animationInterval = useRef(16) // ~60fps
  const updateAnimation = useCallback((state: any, delta: number) => {
    if (!enableRotation) return
    const now = performance.now()
    if (now - lastAnimationTime.current < animationInterval.current) return
    lastAnimationTime.current = now
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.1
    }
    if (cloudsRef.current && showClouds) {
      cloudsRef.current.rotation.y += delta * 0.12
    }
    if (atmosphereRef.current && atmosphereMaterial?.uniforms && showAtmosphere) {
      atmosphereMaterial.uniforms.time.value = state.clock.elapsedTime
    }
  }, [enableRotation, showClouds, showAtmosphere, atmosphereMaterial])
  useFrame(updateAnimation)
  if (!texturesLoaded) {
    return (
      <group position={position}>
        <mesh ref={earthRef}>
          <sphereGeometry args={[earthSize, segments, segments]} />
          <primitive object={earthMaterial} />
        </mesh>
      </group>
    )
  }
  return (
    <group position={position}>
      {}
      <mesh 
        ref={earthRef} 
        castShadow={quality !== 'low'} 
        receiveShadow={quality !== 'low'}
      >
        <sphereGeometry args={[earthSize, segments, segments]} />
        <primitive object={earthMaterial} />
      </mesh>
      {}
      {showClouds && cloudMaterial && (
        <mesh ref={cloudsRef} scale={earthSize * 1.005}>
          <sphereGeometry args={[1, segments * 0.8, segments * 0.8]} />
          <primitive object={cloudMaterial} />
        </mesh>
      )}
      {}
      {showAtmosphere && atmosphereMaterial && (
        <mesh ref={atmosphereRef} scale={earthSize * 1.1}>
          <sphereGeometry args={[1, segments * 0.6, segments * 0.6]} />
          <primitive object={atmosphereMaterial} />
        </mesh>
      )}
    </group>
  )
})
export default OptimizedEarth