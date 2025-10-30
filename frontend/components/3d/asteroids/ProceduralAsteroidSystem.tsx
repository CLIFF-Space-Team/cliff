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
  spinAxis: [number, number, number]
  spinAngVel: number // rad/sec
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
  const SPIN_VISUAL_SCALE = 12
  
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
  
  // Asteroid Geometry (optimized by quality)
  const asteroidGeometry = useMemo(() => {
    if (!THREE) return null
    
    const segments = {
      low: 8,
      medium: 12,
      high: 16,
      ultra: 24
    }[quality] || 16
    
    // Create irregular asteroid geometry
    const geometry = new THREE.IcosahedronGeometry(1, Math.floor(segments / 8))
    
    // Add noise to make it look more asteroid-like
    const positions = geometry.getAttribute('position')
    const vertex = new THREE.Vector3()
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i)
      
      // Add random noise to create irregular shape
      const noise = 0.1 + Math.random() * 0.3
      vertex.multiplyScalar(noise + 0.7)
      
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z)
    }
    
    positions.needsUpdate = true
    geometry.computeVertexNormals()
    
    return geometry
  }, [THREE, quality])
  
  // Asteroid Material (PBR)
  const asteroidMaterial = useMemo(() => {
    if (!THREE) return null
    const mat = new THREE.MeshStandardMaterial({
      color: '#8B7355',
      metalness: 0.08,
      roughness: 0.96
    })
    return mat
  }, [THREE])
  
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
      
      // Spin parameters (realistic: 4-16 hours; small bodies spin faster)
      const radiusKm = estimatedRadius || 0.5
      const sizeFactor = Math.max(0.6, Math.min(1.6, 1.0 / Math.sqrt(Math.max(0.05, radiusKm))))
      const baseHours = 4 + Math.random() * 12
      const periodHours = Math.max(2, baseHours / sizeFactor)
      const spinAngVel = (2 * Math.PI) / (periodHours * 3600)
      const axisVec = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()

      instances.push({
        position: [x, y, z],
        rotation: [
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ],
        scale: [scale, scale * (0.8 + Math.random() * 0.4), scale],
        color,
        // speed: orbital speed scalar
        speed: 0.005 + Math.random() * 0.01,
        orbitRadius,
        orbitAngle,
        threatLevel,
        isNearEarthObject: isNEO,
        spinAxis: [axisVec.x, axisVec.y, axisVec.z],
        spinAngVel: spinAngVel
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

      // Çok daha yavaş, gerçekçi spin: açısal hız ve eksen ile
      instance.rotation[0] += delta * instance.spinAngVel * SPIN_VISUAL_SCALE * instance.spinAxis[0]
      instance.rotation[1] += delta * instance.spinAngVel * SPIN_VISUAL_SCALE * instance.spinAxis[1]
      instance.rotation[2] += delta * instance.spinAngVel * SPIN_VISUAL_SCALE * instance.spinAxis[2]

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