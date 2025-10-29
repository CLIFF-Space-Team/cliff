'use client'

import React, { useMemo, useRef, useEffect, useState } from 'react'
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
  
  const [textures, setTextures] = useState<{
    day?: THREE.Texture
    night?: THREE.Texture
    clouds?: THREE.Texture
    normal?: THREE.Texture
    specular?: THREE.Texture
  }>({})

  const segments = useMemo(() => {
    switch (quality) {
      case 'low': return 16
      case 'medium': return 32
      case 'high': return 64
      default: return 32
    }
  }, [quality])

  const earthSize = useMemo(() => scale * 1.0, [scale])

  // Texture yükleme
  useEffect(() => {
    const loader = new THREE.TextureLoader()
    const texturePromises: Promise<any>[] = []

    // Ana doku yüklemeleri
    texturePromises.push(
      new Promise((resolve, reject) => {
        loader.load(
          '/textures/nasa/earth/earth_blue_marble_2k.jpg',
          (texture) => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping
            resolve({ key: 'day', texture })
          },
          undefined,
          () => {
            // Fallback texture
            const canvas = document.createElement('canvas')
            canvas.width = 512
            canvas.height = 256
            const ctx = canvas.getContext('2d')!
            
            // Dünya benzeri desen oluştur
            const gradient = ctx.createLinearGradient(0, 0, 512, 256)
            gradient.addColorStop(0, '#4A90E2')
            gradient.addColorStop(0.3, '#7FB069') 
            gradient.addColorStop(0.6, '#D4A574')
            gradient.addColorStop(1, '#4A90E2')
            
            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, 512, 256)
            
            // Kıtalar ekle
            ctx.fillStyle = '#8B7355'
            ctx.fillRect(100, 80, 80, 60)
            ctx.fillRect(200, 100, 120, 80)
            ctx.fillRect(350, 70, 90, 70)
            
            const fallbackTexture = new THREE.CanvasTexture(canvas)
            fallbackTexture.wrapS = fallbackTexture.wrapT = THREE.RepeatWrapping
            resolve({ key: 'day', texture: fallbackTexture })
          }
        )
      })
    )

    if (showClouds) {
      texturePromises.push(
        new Promise((resolve, reject) => {
          loader.load(
            '/textures/earth-clouds.jpg',
            (texture) => {
              texture.wrapS = texture.wrapT = THREE.RepeatWrapping
              resolve({ key: 'clouds', texture })
            },
            undefined,
            () => {
              // Bulut fallback
              const canvas = document.createElement('canvas')
              canvas.width = 512
              canvas.height = 256
              const ctx = canvas.getContext('2d')!
              
              ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
              for (let i = 0; i < 50; i++) {
                const x = Math.random() * 512
                const y = Math.random() * 256
                const radius = Math.random() * 30 + 10
                ctx.beginPath()
                ctx.arc(x, y, radius, 0, Math.PI * 2)
                ctx.fill()
              }
              
              const fallbackTexture = new THREE.CanvasTexture(canvas)
              fallbackTexture.wrapS = fallbackTexture.wrapT = THREE.RepeatWrapping
              resolve({ key: 'clouds', texture: fallbackTexture })
            }
          )
        })
      )
    }

    Promise.allSettled(texturePromises).then((results) => {
      const loadedTextures: any = {}
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { key, texture } = result.value
          loadedTextures[key] = texture
        }
      })
      setTextures(loadedTextures)
    })
  }, [showClouds, quality])

  // Earth material
  const earthMaterial = useMemo(() => {
    const material = new THREE.MeshPhongMaterial({
      shininess: 30
    })

    if (textures.day) {
      material.map = textures.day
    } else {
      material.color = new THREE.Color('#4A90E2')
    }

    if (textures.normal && quality === 'high') {
      material.normalMap = textures.normal
    }

    if (textures.specular && quality === 'high') {
      material.specularMap = textures.specular
    }

    return material
  }, [textures, quality])

  // Clouds material
  const cloudMaterial = useMemo(() => {
    if (!showClouds) return null

    const material = new THREE.MeshPhongMaterial({
      transparent: true,
      opacity: quality === 'high' ? 0.4 : 0.3,
      color: '#ffffff'
    })

    if (textures.clouds) {
      material.map = textures.clouds
      material.alphaMap = textures.clouds
    }

    return material
  }, [showClouds, textures.clouds, quality])

  // Atmosphere material
  const atmosphereMaterial = useMemo(() => {
    if (!showAtmosphere) return null

    return new THREE.ShaderMaterial({
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
  }, [showAtmosphere, quality])

  // Animation
  useFrame((state, delta) => {
    if (!enableRotation) return

    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.1
    }
    
    if (cloudsRef.current && showClouds) {
      cloudsRef.current.rotation.y += delta * 0.12
    }
    
    if (atmosphereRef.current && atmosphereMaterial?.uniforms && showAtmosphere) {
      atmosphereMaterial.uniforms.time.value = state.clock.elapsedTime
    }
  })

  return (
    <group position={position}>
      {/* Earth */}
      <mesh ref={earthRef} castShadow receiveShadow>
        <sphereGeometry args={[earthSize, segments, segments]} />
        <primitive object={earthMaterial} />
      </mesh>
      
      {/* Clouds */}
      {showClouds && cloudMaterial && (
        <mesh ref={cloudsRef} scale={earthSize * 1.005}>
          <sphereGeometry args={[1, segments * 0.8, segments * 0.8]} />
          <primitive object={cloudMaterial} />
        </mesh>
      )}
      
      {/* Atmosphere */}
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