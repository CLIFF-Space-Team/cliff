'use client'
import React, { useMemo, useRef, useEffect, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { useEnhancedUSDZLoader, createUSDZMaterial } from '@/hooks/use-usdz-loader'
interface EnhancedUSDZEarthProps {
  position?: [number, number, number]
  scale?: number
  quality?: 'low' | 'medium' | 'high' | 'ultra'
  showClouds?: boolean
  showAtmosphere?: boolean
  showCityLights?: boolean
  showAurora?: boolean
  enableRotation?: boolean
  lightPosition?: any // THREE.Vector3
}
export const EnhancedUSDZEarth = React.memo(({
  position = [0, 0, 0],
  scale = 1,
  quality = 'high',
  showClouds = true,
  showAtmosphere = true,
  showCityLights = false,
  showAurora = false,
  enableRotation = true,
  lightPosition
}: EnhancedUSDZEarthProps) => {
  const earthRef = useRef<any>(null)
  const cloudsRef = useRef<any>(null)
  const atmosphereRef = useRef<any>(null)
  const auroraRef = useRef<any>(null)
  const [THREE, setTHREE] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [earthMaterial, setEarthMaterial] = useState<any>(null)
  const [cloudsMaterial, setCloudsMaterial] = useState<any>(null)
  useEffect(() => {
    const loadTHREE = async () => {
      try {
        const threeModule = await import('three')
        setTHREE(threeModule)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to load Three.js for Earth:', error)
        setIsLoading(false)
      }
    }
    loadTHREE()
  }, [])
  const { model: earthModel, isLoading: usdzLoading, error } = useEnhancedUSDZLoader(
    '/models/Earth.usdz',
    undefined, // no fallback  
    {
      qualityLevel: quality,
      enableLOD: true,
      enableCaching: true,
      enablePerformanceMonitoring: true
    }
  )
  useEffect(() => {
    const loadEarthMaterial = async () => {
      if (!THREE) return
      try {
        const material = await createUSDZMaterial(
          new THREE.Color('#4A90E2'),
          {
            metalness: 0.1,
            roughness: 0.7,
            emissive: new THREE.Color('#001122'),
            emissiveIntensity: showCityLights ? 0.3 : 0.0
          }
        )
        setEarthMaterial(material)
      } catch (error) {
        console.error('Failed to create earth material:', error)
      }
    }
    loadEarthMaterial()
  }, [THREE, showCityLights])
  useEffect(() => {
    const loadCloudsMaterial = async () => {
      if (!THREE || !showClouds) return
      try {
        const material = await createUSDZMaterial(
          new THREE.Color('#FFFFFF'),
          {
            metalness: 0.0,
            roughness: 1.0,
            emissive: new THREE.Color('#000000'),
            emissiveIntensity: 0.0
          }
        )
        material.transparent = true
        material.opacity = 0.4
        material.alphaTest = 0.1
        setCloudsMaterial(material)
      } catch (error) {
        console.error('Failed to create clouds material:', error)
      }
    }
    loadCloudsMaterial()
  }, [THREE, showClouds])
  const atmosphereMaterial = useMemo(() => {
    if (!THREE || !showAtmosphere) return null
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
        uniform vec3 lightPosition;
        uniform float atmosphereIntensity;
        varying vec3 vNormal;
        varying vec3 vPositionW;
        void main() {
          vec3 lightDir = normalize(lightPosition - vPositionW);
          float lightDot = max(dot(vNormal, lightDir), 0.0);
          float fresnel = pow(1.0 - dot(vNormal, normalize(cameraPosition - vPositionW)), 3.0);
          float alpha = fresnel * atmosphereIntensity * lightDot;
          vec3 atmosphereColor = mix(vec3(0.2, 0.5, 1.0), vec3(0.8, 0.9, 1.0), lightDot);
          gl_FragColor = vec4(atmosphereColor, alpha);
        }
      `,
      uniforms: {
        lightPosition: { value: lightPosition || new THREE.Vector3(-20, 0, 0) },
        atmosphereIntensity: { value: 0.6 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    })
  }, [THREE, showAtmosphere, lightPosition])
  const auroraGeometry = useMemo(() => {
    if (!THREE || !showAurora || quality === 'low') return null
    const geometry = new THREE.BufferGeometry()
    const auroraCount = quality === 'ultra' ? 200 : 100
    const positions = new Float32Array(auroraCount * 3)
    const colors = new Float32Array(auroraCount * 3)
    for (let i = 0; i < auroraCount; i++) {
      const i3 = i * 3
      const latitude = (Math.random() - 0.5) * 0.4 + (Math.random() > 0.5 ? 1.3 : -1.3)
      const longitude = Math.random() * Math.PI * 2
      const altitude = 1.05 + Math.random() * 0.1
      positions[i3] = altitude * Math.cos(latitude) * Math.cos(longitude) * scale
      positions[i3 + 1] = altitude * Math.sin(latitude) * scale  
      positions[i3 + 2] = altitude * Math.cos(latitude) * Math.sin(longitude) * scale
      const colorType = Math.random()
      if (colorType < 0.6) { // Green (most common)
        colors[i3] = 0.2; colors[i3 + 1] = 1.0; colors[i3 + 2] = 0.3
      } else if (colorType < 0.8) { // Blue
        colors[i3] = 0.3; colors[i3 + 1] = 0.5; colors[i3 + 2] = 1.0
      } else { // Purple/Pink
        colors[i3] = 1.0; colors[i3 + 1] = 0.3; colors[i3 + 2] = 0.8
      }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geometry
  }, [THREE, showAurora, quality, scale])
  const auroraMaterial = useMemo(() => {
    if (!THREE || !showAurora) return null
    return new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    })
  }, [THREE, showAurora])
  useFrame((state, delta) => {
    if (!enableRotation) return
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.05
    }
    if (cloudsRef.current && showClouds) {
      cloudsRef.current.rotation.y += delta * 0.07
    }
    if (auroraRef.current && showAurora) {
      auroraRef.current.rotation.y += delta * 0.1
      auroraRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }
  })
  if (error) {
    console.error('Earth model loading error:', error)
    return (
      <group position={position}>
        <mesh>
          <sphereGeometry args={[1 * scale, 32, 32]} />
          <meshStandardMaterial 
            color="#4A90E2" 
            emissive="#001122" 
            emissiveIntensity={0.1}
          />
        </mesh>
      </group>
    )
  }
  if (isLoading || !THREE || usdzLoading || !earthModel) {
    return (
      <group position={position}>
        <mesh>
          <sphereGeometry args={[0.8 * scale, 16, 16]} />
          <meshBasicMaterial 
            color="#4A90E2" 
            transparent 
            opacity={0.6}
          />
        </mesh>
      </group>
    )
  }
  return (
    <group position={position}>
      {}
      <mesh ref={earthRef} scale={scale}>
        <primitive object={earthModel.scene} />
        {earthMaterial && <primitive object={earthMaterial} />}
      </mesh>
      {}
      {showClouds && cloudsMaterial && (
        <mesh ref={cloudsRef} scale={scale * 1.01}>
          <sphereGeometry args={[1, 32, 32]} />
          <primitive object={cloudsMaterial} />
        </mesh>
      )}
      {}
      {showAtmosphere && atmosphereMaterial && (
        <mesh ref={atmosphereRef} scale={scale * 1.03}>
          <sphereGeometry args={[1, 32, 32]} />
          <primitive object={atmosphereMaterial} />
        </mesh>
      )}
      {}
      {showAurora && auroraGeometry && auroraMaterial && (
        <points ref={auroraRef}>
          <primitive object={auroraGeometry} />
          <primitive object={auroraMaterial} />
        </points>
      )}
    </group>
  )
})
EnhancedUSDZEarth.displayName = 'EnhancedUSDZEarth'
export default EnhancedUSDZEarth