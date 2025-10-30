'use client'

import React, { useMemo, useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
// 🔧 CRITICAL FIX: Dynamic import Three.js to prevent SSR dispatchEvent bug
import { useAsteroidData } from '@/hooks/use-asteroid-data'
import { DetailedAsteroid } from './DetailedAsteroid'

interface ProceduralAsteroidSystemProps {
  count?: number
  quality?: 'low' | 'medium' | 'high' | 'ultra'
  enableAnimation?: boolean
  distributionRadius?: [number, number]
  enableThreatVisualization?: boolean
  enableOrbitalMechanics?: boolean
  maxAsteroids?: number
}

interface AsteroidInstanceData {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: [number, number, number]
  speed: number
  orbitRadius: number
  orbitAngle: number
  threatLevel: number
  isNearEarthObject: boolean
}

export const ProceduralAsteroidSystem = React.memo(({
  count = 100,
  quality = 'high',
  enableAnimation = true,
  distributionRadius = [12, 28],
  enableThreatVisualization = true,
  enableOrbitalMechanics = true,
  maxAsteroids = 200
}: ProceduralAsteroidSystemProps) => {
  
  // Refs
  const asteroidGroupRef = useRef<any>(null)
  const instancedMeshRef = useRef<any>(null)
  
  // State
  const [THREE, setTHREE] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [asteroidInstances, setAsteroidInstances] = useState<AsteroidInstanceData[]>([])
  const [pointPositions, setPointPositions] = useState<Float32Array | null>(null)
  const { camera } = useThree()
  
  // Dynamic Three.js import
  useEffect(() => {
    const loadTHREE = async () => {
      try {
        const threeModule = await import('three')
        setTHREE(threeModule)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to load Three.js for Asteroids:', error)
        setIsLoading(false)
      }
    }
    loadTHREE()
  }, [])
  
  // Mock Asteroid Data - API çağrısı yok
  const { asteroids, isLoading: asteroidsLoading } = useAsteroidData({
    autoRefresh: false, // Auto-refresh kapalı
    refreshInterval: 300000 // 5 minutes
  })
  
  // Enhanced Asteroid Geometry with professional modeling
  const asteroidGeometry = useMemo(() => {
    if (!THREE) return null
    
    const segments = {
      low: 12,
      medium: 16,
      high: 20,
      ultra: 28
    }[quality] || 20
    
    // Create high-detail irregular asteroid geometry
    const geometry = new THREE.IcosahedronGeometry(1, Math.floor(segments / 6))
    
    // Professional asteroid surface deformation
    const positions = geometry.getAttribute('position')
    const vertex = new THREE.Vector3()
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i)
      
      // Multi-layer realistic asteroid surface noise
      const noise1 = Math.sin(vertex.x * 8) * Math.cos(vertex.y * 6) * Math.sin(vertex.z * 10)
      const noise2 = Math.sin(vertex.x * 16) * Math.cos(vertex.y * 12) * Math.sin(vertex.z * 20)
      const noise3 = Math.sin(vertex.x * 32) * Math.cos(vertex.y * 24) * Math.sin(vertex.z * 40)
      const noise4 = Math.sin(vertex.x * 64) * Math.cos(vertex.y * 48) * Math.sin(vertex.z * 80)
      
      // Crater and impact patterns
      const craterNoise = Math.sin(vertex.x * 4) * Math.cos(vertex.y * 3) * Math.sin(vertex.z * 5)
      const impactNoise = Math.sin(vertex.x * 12) * Math.cos(vertex.y * 9) * Math.sin(vertex.z * 15)
      
      // Combine noise layers for realistic asteroid surface
      const combinedNoise = (
        noise1 * 0.4 + 
        noise2 * 0.3 + 
        noise3 * 0.2 + 
        noise4 * 0.1 +
        craterNoise * 0.3 +
        impactNoise * 0.2
      ) * 0.5
      
      // Apply surface irregularities
      vertex.normalize()
      vertex.multiplyScalar(1.0 + combinedNoise)
      
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z)
    }
    
    positions.needsUpdate = true
    geometry.computeVertexNormals()
    geometry.normalizeNormals()
    
    return geometry
  }, [THREE, quality])
  
  // Enhanced Asteroid Material with realistic PBR
  const asteroidMaterial = useMemo(() => {
    if (!THREE) return null
    
    // Create realistic asteroid texture
    const canvas = document.createElement('canvas')
    const size = quality === 'ultra' ? 1024 : quality === 'high' ? 512 : 256
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    
    // Generate realistic asteroid surface pattern
    const imageData = ctx.createImageData(size, size)
    const pixelData = imageData.data
    
    for (let i = 0; i < pixelData.length; i += 4) {
      const x = (i / 4) % size
      const y = Math.floor((i / 4) / size)
      
      // Multi-layer asteroid surface noise
      const noise1 = Math.sin(x * 0.05) * Math.cos(y * 0.04)
      const noise2 = Math.sin(x * 0.1) * Math.cos(y * 0.08) * 0.6
      const noise3 = Math.sin(x * 0.2) * Math.cos(y * 0.15) * 0.4
      const noise4 = Math.sin(x * 0.4) * Math.cos(y * 0.3) * 0.2
      
      // Mineral veins and cracks
      const veinPattern = Math.sin(x * 0.02 + y * 0.03) * Math.cos(x * 0.025 + y * 0.02)
      const crackPattern = Math.sin(x * 0.08 + y * 0.06) * Math.cos(x * 0.09 + y * 0.07)
      
      const combinedNoise = (noise1 + noise2 + noise3 + noise4) + (veinPattern * 0.3) + (crackPattern * 0.2)
      const intensity = Math.max(40, Math.min(200, 110 + combinedNoise * 45))
      
      // Realistic asteroid color variations
      pixelData[i] = intensity * 0.7       // Red
      pixelData[i + 1] = intensity * 0.6   // Green  
      pixelData[i + 2] = intensity * 0.5   // Blue
      pixelData[i + 3] = 255               // Alpha
    }
    
    ctx.putImageData(imageData, 0, 0)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1, 1)
    texture.anisotropy = 16
    
    const mat = new THREE.MeshStandardMaterial({
      color: '#8B7355',
      map: texture,
      metalness: 0.05,
      roughness: 0.95,
      bumpScale: 0.5
    })
    
    return mat
  }, [THREE, quality])
  
  // Generate procedural asteroid instances
  useEffect(() => {
    if (!THREE || !asteroidGeometry) return
    
    const instances: AsteroidInstanceData[] = []
    const actualCount = Math.min(count, maxAsteroids)
    
    // Use NASA data if available, otherwise generate procedurally
    const sourceData = asteroids.length > 0 ? asteroids.slice(0, actualCount) : []
    
    for (let i = 0; i < actualCount; i++) {
      const nasaAsteroid = sourceData[i]
      
      // Orbital parameters
      const orbitRadius = distributionRadius[0] + 
        Math.random() * (distributionRadius[1] - distributionRadius[0])
      const orbitAngle = Math.random() * Math.PI * 2
      const orbitInclination = (Math.random() - 0.5) * Math.PI * 0.2
      
      // Position based on orbital mechanics
      const x = orbitRadius * Math.cos(orbitAngle)
      const y = orbitRadius * Math.sin(orbitInclination) * Math.sin(orbitAngle)
      const z = orbitRadius * Math.sin(orbitAngle)
      
      // Scale based on NASA data if available - Fixed to use correct property
      const estimatedRadius = nasaAsteroid?.info?.radius_km || (0.1 + Math.random() * 2.0)
      const scale = Math.min(estimatedRadius / 10, 0.3) // Scale down for visibility
      
      // Threat assessment - Fixed to use correct property
      const isNEO = nasaAsteroid?.is_hazardous || Math.random() < 0.05
      const threatLevel = isNEO ? 0.8 + Math.random() * 0.2 : Math.random() * 0.3
      
      // Color based on threat level and composition
      const baseColor = [0.55, 0.45, 0.33] // Rocky asteroid color
      const threatColor = threatLevel > 0.5 ? [1.0, 0.4, 0.2] : baseColor // Red for high threat
      const color: [number, number, number] = [
        baseColor[0] + (threatColor[0] - baseColor[0]) * threatLevel,
        baseColor[1] + (threatColor[1] - baseColor[1]) * threatLevel,
        baseColor[2] + (threatColor[2] - baseColor[2]) * threatLevel
      ]
      
      instances.push({
        position: [x, y, z],
        rotation: [
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ],
        scale: [scale, scale * (0.8 + Math.random() * 0.4), scale],
        color,
        // Gerçekçi çok yavaş dönüş hızları (gerçek asteroidler saatlerce döner)
        speed: 0.0002 + Math.random() * 0.0005,
        orbitRadius,
        orbitAngle,
        threatLevel,
        isNearEarthObject: isNEO
      })
    }
    
    setAsteroidInstances(instances)
    // Far LOD as points
    const far = new Float32Array(actualCount * 3)
    for (let i = 0; i < actualCount; i++) {
      const p = instances[i].position
      far[i * 3] = p[0]
      far[i * 3 + 1] = p[1]
      far[i * 3 + 2] = p[2]
    }
    setPointPositions(far)
    
    console.log(`🪨 Generated ${instances.length} asteroids (${sourceData.length} from NASA data)`)
    
  }, [THREE, asteroidGeometry, count, maxAsteroids, distributionRadius, asteroids])
  
  // Setup instanced rendering for performance
  const instancedMatrix = useMemo(() => {
    if (!THREE || asteroidInstances.length === 0) return null
    return new Float32Array(asteroidInstances.length * 16)
  }, [THREE, asteroidInstances.length])

  useEffect(() => {
    if (!THREE || !instancedMeshRef.current || !instancedMatrix || asteroidInstances.length === 0) return
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const rotation = new THREE.Euler()
    const scaleV = new THREE.Vector3()

    asteroidInstances.forEach((instance, i) => {
      position.set(...instance.position)
      rotation.set(...instance.rotation)
      scaleV.set(...instance.scale)
      matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scaleV)
      matrix.toArray(instancedMatrix, i * 16)
    })

    instancedMeshRef.current.instanceMatrix.needsUpdate = true
  }, [THREE, asteroidInstances, instancedMatrix])
  
  // Animation loop
  useFrame((state, delta) => {
    if (!enableAnimation || !instancedMeshRef.current || !THREE || !instancedMatrix || asteroidInstances.length === 0) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const scaleV = new THREE.Vector3()
    const rotation = new THREE.Euler()

    asteroidInstances.forEach((instance, i) => {
      if (enableOrbitalMechanics) {
        instance.orbitAngle += delta * instance.speed * 0.02
        const x = instance.orbitRadius * Math.cos(instance.orbitAngle)
        const y = instance.position[1]
        const z = instance.orbitRadius * Math.sin(instance.orbitAngle)
        instance.position = [x, y, z]
      }

      // Asteroidler artık dönmüyor - sabit kalıyorlar
      // instance.rotation[0] += delta * instance.speed * 0.5
      // instance.rotation[1] += delta * instance.speed * 0.3
      // instance.rotation[2] += delta * instance.speed * 0.2

      position.set(...instance.position)
      scaleV.set(...instance.scale)
      rotation.set(...instance.rotation)
      matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scaleV)
      matrix.toArray(instancedMatrix, i * 16)
    })

    instancedMeshRef.current.instanceMatrix.needsUpdate = true
  })
  
  // Loading fallback
  if (isLoading || !THREE || !asteroidGeometry || !asteroidMaterial) {
    return (
      <group>
        {/* Simple loading asteroids */}
        {Array.from({ length: Math.min(10, count) }).map((_, i) => (
          <mesh 
            key={i}
            position={[
              (distributionRadius[0] + Math.random() * (distributionRadius[1] - distributionRadius[0])) * Math.cos(i),
              (Math.random() - 0.5) * 5,
              (distributionRadius[0] + Math.random() * (distributionRadius[1] - distributionRadius[0])) * Math.sin(i)
            ]}
            scale={0.1 + Math.random() * 0.2}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#666666" transparent opacity={0.3} />
          </mesh>
        ))}
      </group>
    )
  }
  
  return (
    <group ref={asteroidGroupRef}>
      {/* Instanced Asteroids for Performance */}
      {instancedMatrix && asteroidInstances.length > 0 && asteroidGeometry && asteroidMaterial && (
        <instancedMesh
          ref={instancedMeshRef}
          args={[asteroidGeometry, asteroidMaterial, asteroidInstances.length]}
          castShadow={quality === 'high' || quality === 'ultra'}
          receiveShadow={quality === 'ultra'}
        />
      )}

      {/* Far-field as Points for additional LOD */}
      {pointPositions && quality !== 'ultra' && THREE && (
        <points frustumCulled>
          <bufferGeometry>
            <primitive object={new THREE.BufferAttribute(pointPositions, 3)} attach="attributes-position" />
          </bufferGeometry>
          <pointsMaterial size={0.06} color="#bfa892" sizeAttenuation depthWrite={false} />
        </points>
      )}
      
      {/* Individual High-Threat Asteroids (special rendering) */}
      {enableThreatVisualization && asteroidInstances
        .filter(instance => instance.isNearEarthObject && instance.threatLevel > 0.7)
        .slice(0, 6)
        .map((instance, i) => (
          <DetailedAsteroid
            key={`neo-${i}`}
            neoId={undefined}
            name={instance.isNearEarthObject ? 'PHA' : 'NEO'}
            hazardous={true}
            quality={quality}
            position={instance.position as any}
            scale={Math.max(0.3, instance.scale[0] * 1.6)}
            showLabel={true}
          />
        ))}
      
      {/* Orbital Path Indicators (for ultra quality) */}
      {quality === 'ultra' && enableOrbitalMechanics && (
        <group>
          {[distributionRadius[0], distributionRadius[1]].map((radius, i) => (
            <mesh key={`orbit-${i}`} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radius - 0.1, radius + 0.1, 64]} />
              <meshBasicMaterial
                color="#444444"
                transparent
                opacity={0.05}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
        </group>
      )}
      
      {/* Loading/Status Indicators */}
      {asteroidsLoading && (
        <mesh position={[0, 10, 0]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  )
})

ProceduralAsteroidSystem.displayName = 'ProceduralAsteroidSystem'

export default ProceduralAsteroidSystem