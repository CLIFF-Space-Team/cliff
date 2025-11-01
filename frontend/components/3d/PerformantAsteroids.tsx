'use client'

import React, { useMemo, useRef, useEffect, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SimpleCelestialBody } from '@/types/astronomical-data'

interface PerformantAsteroidsProps {
  count?: number
  enableAnimation?: boolean
  quality?: 'low' | 'medium' | 'high'
  distributionRadius?: [number, number]
  nasaAsteroidsData?: SimpleCelestialBody[]
  useRealData?: boolean
}

// Global geometry cache to prevent recreation
const geometryCache = new Map<string, THREE.BufferGeometry>()
const materialCache = new Map<string, THREE.Material>()

// Pre-computed asteroid data structure
interface AsteroidInstance {
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: number
  rotationSpeed: THREE.Vector3
  orbitSpeed: number
  orbitAngle: number
  orbitRadius: number
  isHazardous: boolean
  matrix: THREE.Matrix4
}

export const PerformantAsteroids = React.memo<PerformantAsteroidsProps>(({
  count = 300,
  enableAnimation = true,
  quality = 'high',
  distributionRadius = [10, 45],
  nasaAsteroidsData = [],
  useRealData = false
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const dummyObject = useMemo(() => new THREE.Object3D(), [])
  const lastUpdateTime = useRef(0)
  const updateInterval = useRef(16) // ~60fps
  
  // Dünya boyutlarına göre asteroid boyutunu hesapla
  const calculateScaleFromEarth = (asteroidRadiusKm: number): number => {
    const earthRadiusKm = 6371
    const earthScaleInScene = 1.5 // Sahnedeki dünya boyutu
    
    // Asteroid'in gerçek boyutunu dünya boyutuna oranla hesapla
    const realRatio = asteroidRadiusKm / earthRadiusKm
    
    // Çok küçük asteroitleri görünür yapmak için minimum boyut
    const minScale = 0.05
    const maxScale = 2.0
    
    // Orantılı boyut hesapla ve görünür aralıkta tut
    const scaledSize = realRatio * earthScaleInScene * 100 // 100x büyütme faktörü
    return Math.max(minScale, Math.min(maxScale, scaledSize))
  }
  
  // Mesafe verilerinden pozisyon hesapla
  const calculatePositionFromDistance = (distanceKm: number, index: number): THREE.Vector3 => {
    const earthDistanceKm = 149597870.7 // 1 AU
    const sceneScale = 0.0001 // Sahne ölçek faktörü
    
    // Mesafeyi AU cinsinden hesapla
    const distanceAU = distanceKm / earthDistanceKm
    
    // 3D sahneye uygun mesafeye çevir (dünya merkezden)
    const sceneDistance = Math.max(8, Math.min(35, distanceAU * 15))
    
    // Dairesel dağılım için rastgele açı
    const angle = (index * 137.5 * Math.PI / 180) + Math.random() * 0.5 // Golden angle distribution
    const heightVariation = THREE.MathUtils.randFloat(-2, 2)
    
    return new THREE.Vector3(
      Math.cos(angle) * sceneDistance,
      heightVariation,
      Math.sin(angle) * sceneDistance
    )
  }

  // Optimized asteroid data generation with pre-computed matrices
  const asteroidInstances = useMemo((): AsteroidInstance[] => {
    const instances: AsteroidInstance[] = []
    let actualCount = count
    
    if (useRealData && nasaAsteroidsData.length > 0) {
      actualCount = Math.min(count, nasaAsteroidsData.length)
      
      for (let i = 0; i < actualCount; i++) {
        const nasaAsteroid = nasaAsteroidsData[i]
        if (!nasaAsteroid) continue
        
        const asteroidRadiusKm = nasaAsteroid.info.radius_km || 0.5
        const scale = calculateScaleFromEarth(asteroidRadiusKm)
        
        let position = new THREE.Vector3()
        if (nasaAsteroid.orbital_data?.miss_distance?.kilometers) {
          const distanceKm = parseFloat(nasaAsteroid.orbital_data.miss_distance.kilometers)
          if (!isNaN(distanceKm)) {
            position = calculatePositionFromDistance(distanceKm, i)
          }
        }
        
        if (position.length() === 0) {
          const distance = distributionRadius[0] + Math.random() * (distributionRadius[1] - distributionRadius[0])
          const angle = (i * 137.5 * Math.PI / 180)
          const height = THREE.MathUtils.randFloat(-2, 2)
          position = new THREE.Vector3(
            Math.cos(angle) * distance,
            height,
            Math.sin(angle) * distance
          )
        }
        
        const baseRotSpeed = 0.00001
        let rotSpeedMultiplier = 1.0
        
        if (nasaAsteroid.orbital_data?.relative_velocity?.kilometers_per_second) {
          const velocityKms = parseFloat(nasaAsteroid.orbital_data.relative_velocity.kilometers_per_second)
          if (!isNaN(velocityKms)) {
            rotSpeedMultiplier = Math.max(0.2, Math.min(1.5, velocityKms / 30))
          }
        }
        
        const rotation = new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        )
        
        const rotationSpeed = new THREE.Vector3(
          (Math.random() - 0.5) * baseRotSpeed * rotSpeedMultiplier,
          (Math.random() - 0.5) * baseRotSpeed * rotSpeedMultiplier,
          (Math.random() - 0.5) * baseRotSpeed * rotSpeedMultiplier * 0.3
        )
        
        const matrix = new THREE.Matrix4()
        matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), new THREE.Vector3(scale, scale, scale))
        
        instances.push({
          position,
          rotation,
          scale,
          rotationSpeed,
          orbitSpeed: THREE.MathUtils.randFloat(0.00001, 0.00005),
          orbitAngle: Math.atan2(position.z, position.x),
          orbitRadius: position.length(),
          isHazardous: nasaAsteroid.is_hazardous || false,
          matrix
        })
      }
    } else {
      for (let i = 0; i < actualCount; i++) {
        const distance = THREE.MathUtils.randFloat(distributionRadius[0], distributionRadius[1])
        const angle = Math.random() * Math.PI * 2
        const height = THREE.MathUtils.randFloat(-3, 3)
        
        const position = new THREE.Vector3(
          Math.cos(angle) * distance,
          height,
          Math.sin(angle) * distance
        )
        
        const rotation = new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        )
        
        const scale = THREE.MathUtils.randFloat(0.3, 1.2)
        const matrix = new THREE.Matrix4()
        matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), new THREE.Vector3(scale, scale, scale))
        
        instances.push({
          position,
          rotation,
          scale,
          rotationSpeed: new THREE.Vector3(
            (Math.random() - 0.5) * 0.00002,
            (Math.random() - 0.5) * 0.00002,
            (Math.random() - 0.5) * 0.00001
          ),
          orbitSpeed: THREE.MathUtils.randFloat(0.00001, 0.00005),
          orbitAngle: angle,
          orbitRadius: distance,
          isHazardous: Math.random() > 0.8,
          matrix
        })
      }
    }
    
    return instances
  }, [count, distributionRadius, nasaAsteroidsData, useRealData])

  // Cached geometry generation
  const geometry = useMemo(() => {
    const cacheKey = `asteroid_${quality}`
    
    if (geometryCache.has(cacheKey)) {
      return geometryCache.get(cacheKey)!
    }
    
    const baseGeometry = new THREE.IcosahedronGeometry(1, quality === 'low' ? 2 : quality === 'medium' ? 3 : 4)
    
    // Simplified noise for better performance
    const positionAttribute = baseGeometry.getAttribute('position')
    const vertex = new THREE.Vector3()
    
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i)
      
      // Simplified single-layer noise
      const noise = Math.sin(vertex.x * 6) * Math.cos(vertex.y * 5) * Math.sin(vertex.z * 7) * 0.1
      
      vertex.normalize()
      vertex.multiplyScalar(1.0 + noise)
      
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z)
    }
    
    baseGeometry.computeVertexNormals()
    baseGeometry.normalizeNormals()
    
    geometryCache.set(cacheKey, baseGeometry)
    return baseGeometry
  }, [quality])

  // Cached material generation
  const material = useMemo(() => {
    const cacheKey = `asteroid_material_${quality}`
    
    if (materialCache.has(cacheKey)) {
      return materialCache.get(cacheKey)!
    }
    
    // Simplified material without procedural texture
    const material = new THREE.MeshStandardMaterial({
      color: '#8B7355',
      roughness: 0.95,
      metalness: 0.05
    })
    
    materialCache.set(cacheKey, material)
    return material
  }, [quality])

  // Cached hazardous material
  const hazardousMaterial = useMemo(() => {
    const cacheKey = `hazardous_material_${quality}`
    
    if (materialCache.has(cacheKey)) {
      return materialCache.get(cacheKey)!
    }
    
    const material = new THREE.MeshStandardMaterial({
      color: '#D2691E',
      roughness: 0.85,
      metalness: 0.15
    })
    
    materialCache.set(cacheKey, material)
    return material
  }, [quality])

  // Optimized initialization with pre-computed matrices
  useEffect(() => {
    if (!meshRef.current) return
    
    asteroidInstances.forEach((asteroid, i) => {
      meshRef.current.setMatrixAt(i, asteroid.matrix)
    })
    
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [asteroidInstances])

  // Throttled animation update for better performance
  const updateAsteroids = useCallback((delta: number) => {
    if (!meshRef.current || !enableAnimation) return
    
    const now = performance.now()
    if (now - lastUpdateTime.current < updateInterval.current) return
    
    lastUpdateTime.current = now
    
    asteroidInstances.forEach((asteroid, i) => {
      // Asteroidler artık dönmüyor - sabit kalıyorlar
      // asteroid.rotation.x += asteroid.rotationSpeed.x * delta * 0.05
      // asteroid.rotation.y += asteroid.rotationSpeed.y * delta * 0.05
      // asteroid.rotation.z += asteroid.rotationSpeed.z * delta * 0.05
      
      // Update orbit
      asteroid.orbitAngle += asteroid.orbitSpeed * delta * 0.02
      asteroid.position.x = Math.cos(asteroid.orbitAngle) * asteroid.orbitRadius
      asteroid.position.z = Math.sin(asteroid.orbitAngle) * asteroid.orbitRadius
      
      // Update matrix
      asteroid.matrix.compose(
        asteroid.position,
        new THREE.Quaternion().setFromEuler(asteroid.rotation),
        new THREE.Vector3(asteroid.scale, asteroid.scale, asteroid.scale)
      )
      
      meshRef.current.setMatrixAt(i, asteroid.matrix)
    })
    
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [asteroidInstances, enableAnimation])

  useFrame((state, delta) => {
    updateAsteroids(delta)
  })

  // Separate hazardous and normal asteroids
  const hazardousAsteroids = asteroidInstances.filter(a => a.isHazardous)
  const normalAsteroids = asteroidInstances.filter(a => !a.isHazardous)

  return (
    <group>
      {/* Normal asteroitler */}
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, normalAsteroids.length]}
        castShadow={quality !== 'low'}
        receiveShadow={quality !== 'low'}
      />
      
      {/* Tehlikeli asteroitler - farklı renkte */}
      {hazardousAsteroids.length > 0 && (
        <instancedMesh
          args={[geometry, hazardousMaterial, hazardousAsteroids.length]}
          castShadow={quality !== 'low'}
          receiveShadow={quality !== 'low'}
        />
      )}
    </group>
  )
})

PerformantAsteroids.displayName = 'PerformantAsteroids'