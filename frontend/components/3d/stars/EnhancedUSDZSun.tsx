'use client'

import React, { useMemo, useRef, useEffect, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
// 🔧 CRITICAL FIX: Dynamic import Three.js to prevent SSR dispatchEvent bug
import { useEnhancedUSDZLoader, createUSDZMaterial } from '@/hooks/use-usdz-loader'

interface EnhancedUSDZSunProps {
  position?: [number, number, number]
  scale?: number
  quality?: 'low' | 'medium' | 'high' | 'ultra'
  enableCorona?: boolean
  enableSolarFlares?: boolean
  enableAnimation?: boolean
  lightIntensity?: number
  coronaIntensity?: number
}

export const EnhancedUSDZSun = React.memo(({
  position = [0, 0, 0],
  scale = 1,
  quality = 'high',
  enableCorona = true,
  enableSolarFlares = false,
  enableAnimation = true,
  lightIntensity = 10,
  coronaIntensity = 1.0
}: EnhancedUSDZSunProps) => {
  
  // Refs
  const sunRef = useRef<any>(null)
  const coronaRef = useRef<any>(null)
  const flareRef = useRef<any>(null)
  
  // State
  const [THREE, setTHREE] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [solarMaterial, setSolarMaterial] = useState<any>(null)
  
  // Dynamic Three.js import
  useEffect(() => {
    const loadTHREE = async () => {
      try {
        const threeModule = await import('three')
        setTHREE(threeModule)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to load Three.js for Sun:', error)
        setIsLoading(false)
      }
    }
    loadTHREE()
  }, [])
  
  // USDZ Model Loading - Fixed API call
  const { model: sunModel, isLoading: usdzLoading, error } = useEnhancedUSDZLoader(
    '/models/Sun.usdz',
    undefined, // no fallback
    {
      qualityLevel: quality,
      enableLOD: true,
      enableCaching: true,
      enablePerformanceMonitoring: true
    }
  )
  
  // Solar Surface Material - Fixed to use Promise-based API
  useEffect(() => {
    const loadMaterial = async () => {
      if (!THREE) return
      
      try {
        const material = await createUSDZMaterial(
          new THREE.Color('#FFA500'),
          {
            metalness: 0.0,
            roughness: 0.8,
            emissive: new THREE.Color('#FF6600'),
            emissiveIntensity: 2.0
          }
        )
        setSolarMaterial(material)
      } catch (error) {
        console.error('Failed to create solar material:', error)
      }
    }
    
    loadMaterial()
  }, [THREE])
  
  // Corona Material
  const coronaMaterial = useMemo(() => {
    if (!THREE || !enableCorona) return null
    
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPositionW;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPositionW = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float intensity;
        uniform vec3 color;
        varying vec3 vNormal;
        varying vec3 vPositionW;
        
        void main() {
          float fresnel = pow(1.0 + dot(vNormal, normalize(vPositionW - cameraPosition)), 2.0);
          float pulse = sin(time * 2.0) * 0.1 + 0.9;
          float alpha = fresnel * intensity * pulse;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: {
        time: { value: 0 },
        intensity: { value: coronaIntensity },
        color: { value: new THREE.Color('#FFD700') }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    })
  }, [THREE, enableCorona, coronaIntensity])
  
  // Solar Flare Effect
  const solarFlareGeometry = useMemo(() => {
    if (!THREE || !enableSolarFlares || quality === 'low') return null
    
    const geometry = new THREE.BufferGeometry()
    const flareCount = quality === 'ultra' ? 50 : 25
    const positions = new Float32Array(flareCount * 3)
    const colors = new Float32Array(flareCount * 3)
    
    for (let i = 0; i < flareCount; i++) {
      const i3 = i * 3
      const radius = 1.1 + Math.random() * 0.3
      const phi = Math.random() * Math.PI * 2
      const theta = Math.random() * Math.PI
      
      positions[i3] = radius * Math.sin(theta) * Math.cos(phi) * scale
      positions[i3 + 1] = radius * Math.cos(theta) * scale
      positions[i3 + 2] = radius * Math.sin(theta) * Math.sin(phi) * scale
      
      colors[i3] = 1.0
      colors[i3 + 1] = 0.6 + Math.random() * 0.4
      colors[i3 + 2] = 0.2 + Math.random() * 0.3
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    
    return geometry
  }, [THREE, enableSolarFlares, quality, scale])
  
  const solarFlareMaterial = useMemo(() => {
    if (!THREE || !enableSolarFlares) return null
    
    return new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })
  }, [THREE, enableSolarFlares])
  
  // Animation Loop
  useFrame((state, delta) => {
    if (!enableAnimation) return
    
    // Sun rotation
    if (sunRef.current) {
      sunRef.current.rotation.y += delta * 0.1
    }
    
    // Corona animation
    if (coronaRef.current && coronaMaterial) {
      coronaMaterial.uniforms.time.value = state.clock.elapsedTime
      coronaRef.current.rotation.y += delta * 0.05
    }
    
    // Solar flare animation
    if (flareRef.current && enableSolarFlares) {
      flareRef.current.rotation.x += delta * 0.2
      flareRef.current.rotation.z += delta * 0.1
    }
  })
  
  // Error handling
  if (error) {
    console.error('Sun model loading error:', error)
    return (
      <group position={position}>
        <mesh>
          <sphereGeometry args={[1 * scale, 32, 32]} />
          <meshStandardMaterial 
            color="#FFA500" 
            emissive="#FF4500" 
            emissiveIntensity={1.5}
          />
        </mesh>
      </group>
    )
  }
  
  // Loading fallback
  if (isLoading || !THREE || usdzLoading || !sunModel) {
    return (
      <group position={position}>
        <mesh>
          <sphereGeometry args={[0.8 * scale, 16, 16]} />
          <meshBasicMaterial 
            color="#FFD700" 
            transparent 
            opacity={0.6}
          />
        </mesh>
      </group>
    )
  }
  
  return (
    <group position={position}>
      {/* Main Sun Body */}
      <mesh ref={sunRef} scale={scale}>
        <primitive object={sunModel.scene} />
        {solarMaterial && <primitive object={solarMaterial} />}
      </mesh>
      
      {/* Corona Effect */}
      {enableCorona && coronaMaterial && (
        <mesh ref={coronaRef} scale={scale * 1.2}>
          <sphereGeometry args={[1, 32, 32]} />
          <primitive object={coronaMaterial} />
        </mesh>
      )}
      
      {/* Solar Flares */}
      {enableSolarFlares && solarFlareGeometry && solarFlareMaterial && (
        <points ref={flareRef}>
          <primitive object={solarFlareGeometry} />
          <primitive object={solarFlareMaterial} />
        </points>
      )}
      
      {/* Directional Light */}
      <directionalLight
        position={[0, 0, 0]}
        intensity={lightIntensity}
        color="#FFF8DC"
        castShadow={quality === 'high' || quality === 'ultra'}
        shadow-mapSize-width={quality === 'ultra' ? 2048 : 1024}
        shadow-mapSize-height={quality === 'ultra' ? 2048 : 1024}
        shadow-camera-near={0.1}
        shadow-camera-far={100}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      
      {/* Point Light for additional illumination */}
      <pointLight
        position={[0, 0, 0]}
        intensity={lightIntensity * 0.5}
        color="#FFFF00"
        distance={50}
        decay={2}
      />
      
      {/* Ambient contribution */}
      <ambientLight intensity={0.1} color="#FFE4B5" />
    </group>
  )
})

EnhancedUSDZSun.displayName = 'EnhancedUSDZSun'

export default EnhancedUSDZSun