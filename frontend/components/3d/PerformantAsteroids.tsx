'use client'

import React, { useMemo, useRef, useEffect } from 'react'
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

  // NASA verilerini kullanarak asteroid datası oluştur
  const asteroidData = useMemo(() => {
    const data = []
    let actualCount = count
    
    if (useRealData && nasaAsteroidsData.length > 0) {
      actualCount = Math.min(count, nasaAsteroidsData.length)
      console.log(`🌌 NASA verileri kullanılıyor: ${actualCount} asteroid`)
      
      // NASA verilerinden asteroidleri oluştur
      for (let i = 0; i < actualCount; i++) {
        const nasaAsteroid = nasaAsteroidsData[i]
        if (!nasaAsteroid) continue
        
        // Gerçek NASA verilerinden boyut hesapla
        const asteroidRadiusKm = nasaAsteroid.info.radius_km || 0.5
        const scale = calculateScaleFromEarth(asteroidRadiusKm)
        
        // Mesafe verilerinden pozisyon hesapla
        let distance = distributionRadius[0] + Math.random() * (distributionRadius[1] - distributionRadius[0])
        let position = new THREE.Vector3()
        
        if (nasaAsteroid.orbital_data?.miss_distance?.kilometers) {
          const distanceKm = parseFloat(nasaAsteroid.orbital_data.miss_distance.kilometers)
          if (!isNaN(distanceKm)) {
            position = calculatePositionFromDistance(distanceKm, i)
          }
        }
        
        if (position.length() === 0) {
          // Fallback pozisyon
          const angle = (i * 137.5 * Math.PI / 180) // Golden angle
          const height = THREE.MathUtils.randFloat(-2, 2)
          position = new THREE.Vector3(
            Math.cos(angle) * distance,
            height,
            Math.sin(angle) * distance
          )
        }
        
        // Gerçekçi çok yavaş rotasyon hızı (asteroidler saatlerce döner)
        const baseRotSpeed = 0.0001
        let rotSpeedMultiplier = 1.0
        
        if (nasaAsteroid.orbital_data?.relative_velocity?.kilometers_per_second) {
          const velocityKms = parseFloat(nasaAsteroid.orbital_data.relative_velocity.kilometers_per_second)
          if (!isNaN(velocityKms)) {
            rotSpeedMultiplier = Math.max(0.2, Math.min(1.5, velocityKms / 30)) // 30 km/s = normal hız
          }
        }
        
        data.push({
          name: nasaAsteroid.name || `Asteroid ${i + 1}`,
          nasaData: nasaAsteroid,
          position: position,
          rotation: new THREE.Euler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
          ),
          rotationSpeed: new THREE.Vector3(
            (Math.random() - 0.5) * baseRotSpeed * rotSpeedMultiplier,
            (Math.random() - 0.5) * baseRotSpeed * rotSpeedMultiplier,
            (Math.random() - 0.5) * baseRotSpeed * rotSpeedMultiplier * 0.3
          ),
          scale: scale,
          orbitSpeed: THREE.MathUtils.randFloat(0.0005, 0.003),
          orbitAngle: Math.atan2(position.z, position.x),
          orbitRadius: position.length(),
          isHazardous: nasaAsteroid.is_hazardous || false,
          threatLevel: nasaAsteroid.threat_level || 'Düşük'
        })
      }
    } else {
      // Fallback: Prosedürel asteroid oluştur
      console.log(`🌌 Prosedürel asteroidler oluşturuluyor: ${actualCount} adet`)
      for (let i = 0; i < actualCount; i++) {
        const distance = THREE.MathUtils.randFloat(distributionRadius[0], distributionRadius[1])
        const angle = Math.random() * Math.PI * 2
        const height = THREE.MathUtils.randFloat(-3, 3)
        
        data.push({
          name: `Procedural ${i + 1}`,
          position: new THREE.Vector3(
            Math.cos(angle) * distance,
            height,
            Math.sin(angle) * distance
          ),
          rotation: new THREE.Euler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
          ),
          rotationSpeed: new THREE.Vector3(
            (Math.random() - 0.5) * 0.0002,
            (Math.random() - 0.5) * 0.0002,
            (Math.random() - 0.5) * 0.0001
          ),
          scale: THREE.MathUtils.randFloat(0.3, 1.2),
          orbitSpeed: THREE.MathUtils.randFloat(0.001, 0.005),
          orbitAngle: angle,
          orbitRadius: distance,
          isHazardous: Math.random() > 0.8,
          threatLevel: Math.random() > 0.8 ? 'Yüksek' : Math.random() > 0.6 ? 'Orta' : 'Düşük'
        })
      }
    }
    
    return data
  }, [count, distributionRadius, nasaAsteroidsData, useRealData])

  const geometry = useMemo(() => {
    const baseGeometry = new THREE.IcosahedronGeometry(1, quality === 'low' ? 2 : quality === 'medium' ? 3 : 4)
    
    const positionAttribute = baseGeometry.getAttribute('position')
    const vertex = new THREE.Vector3()
    
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i)
      
      // Enhanced multi-layer asteroid surface noise
      const noise1 = Math.sin(vertex.x * 6) * Math.cos(vertex.y * 5) * Math.sin(vertex.z * 7)
      const noise2 = Math.sin(vertex.x * 12) * Math.cos(vertex.y * 10) * Math.sin(vertex.z * 14)
      const noise3 = Math.sin(vertex.x * 24) * Math.cos(vertex.y * 20) * Math.sin(vertex.z * 28)
      
      // Crater and impact patterns
      const craterNoise = Math.sin(vertex.x * 3) * Math.cos(vertex.y * 2.5) * Math.sin(vertex.z * 3.5)
      const impactNoise = Math.sin(vertex.x * 9) * Math.cos(vertex.y * 7.5) * Math.sin(vertex.z * 10.5)
      
      const combinedNoise = (
        noise1 * 0.4 + 
        noise2 * 0.3 + 
        noise3 * 0.2 +
        craterNoise * 0.3 +
        impactNoise * 0.2
      ) * 0.15
      
      vertex.normalize()
      vertex.multiplyScalar(1.0 + combinedNoise)
      
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z)
    }
    
    baseGeometry.computeVertexNormals()
    baseGeometry.normalizeNormals()
    return baseGeometry
  }, [quality])

  const material = useMemo(() => {
    // Create realistic asteroid texture
    const canvas = document.createElement('canvas')
    const size = quality === 'high' ? 512 : 256
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
      
      // Mineral veins and surface details
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
    
    return new THREE.MeshStandardMaterial({
      color: '#8B7355',
      map: texture,
      roughness: 0.95,
      metalness: 0.05,
      bumpScale: 0.5
    })
  }, [quality])

  // Enhanced hazardous asteroid material
  const hazardousMaterial = useMemo(() => {
    // Create hazardous asteroid texture
    const canvas = document.createElement('canvas')
    const size = quality === 'high' ? 512 : 256
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    
    // Generate hazardous asteroid surface pattern
    const imageData = ctx.createImageData(size, size)
    const pixelData = imageData.data
    
    for (let i = 0; i < pixelData.length; i += 4) {
      const x = (i / 4) % size
      const y = Math.floor((i / 4) / size)
      
      // Multi-layer hazardous asteroid surface noise
      const noise1 = Math.sin(x * 0.05) * Math.cos(y * 0.04)
      const noise2 = Math.sin(x * 0.1) * Math.cos(y * 0.08) * 0.6
      const noise3 = Math.sin(x * 0.2) * Math.cos(y * 0.15) * 0.4
      const noise4 = Math.sin(x * 0.4) * Math.cos(y * 0.3) * 0.2
      
      // Iron-rich mineral patterns for hazardous asteroids
      const ironVeinPattern = Math.sin(x * 0.02 + y * 0.03) * Math.cos(x * 0.025 + y * 0.02)
      const metallicPattern = Math.sin(x * 0.08 + y * 0.06) * Math.cos(x * 0.09 + y * 0.07)
      
      const combinedNoise = (noise1 + noise2 + noise3 + noise4) + (ironVeinPattern * 0.4) + (metallicPattern * 0.3)
      const intensity = Math.max(50, Math.min(220, 130 + combinedNoise * 50))
      
      // Hazardous asteroid color variations (reddish-brown with metallic hints)
      pixelData[i] = intensity * 0.9       // Red
      pixelData[i + 1] = intensity * 0.5   // Green  
      pixelData[i + 2] = intensity * 0.3   // Blue
      pixelData[i + 3] = 255               // Alpha
    }
    
    ctx.putImageData(imageData, 0, 0)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1, 1)
    texture.anisotropy = 16
    
    return new THREE.MeshStandardMaterial({
      color: '#D2691E',
      map: texture,
      roughness: 0.85,
      metalness: 0.15,
      bumpScale: 0.6
    })
  }, [quality])

  useEffect(() => {
    if (!meshRef.current) return
    
    asteroidData.forEach((asteroid, i) => {
      dummyObject.position.copy(asteroid.position)
      dummyObject.rotation.copy(asteroid.rotation)
      dummyObject.scale.setScalar(asteroid.scale)
      dummyObject.updateMatrix()
      
      meshRef.current.setMatrixAt(i, dummyObject.matrix)
    })
    
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [asteroidData, dummyObject])

  useFrame((state, delta) => {
    if (!meshRef.current || !enableAnimation) return
    
    asteroidData.forEach((asteroid, i) => {
      // Gerçekçi çok yavaş dönüş hızları (asteroidler saatlerce döner)
      asteroid.rotation.x += asteroid.rotationSpeed.x * delta * 10
      asteroid.rotation.y += asteroid.rotationSpeed.y * delta * 10
      asteroid.rotation.z += asteroid.rotationSpeed.z * delta * 10
      
      asteroid.orbitAngle += asteroid.orbitSpeed * delta * 5
      asteroid.position.x = Math.cos(asteroid.orbitAngle) * asteroid.orbitRadius
      asteroid.position.z = Math.sin(asteroid.orbitAngle) * asteroid.orbitRadius
      
      dummyObject.position.copy(asteroid.position)
      dummyObject.rotation.copy(asteroid.rotation)
      dummyObject.scale.setScalar(asteroid.scale)
      dummyObject.updateMatrix()
      
      meshRef.current.setMatrixAt(i, dummyObject.matrix)
    })
    
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  // Tehlikeli asteroitler için ayrı rendering
  const hazardousAsteroids = asteroidData.filter(a => a.isHazardous)
  const normalAsteroids = asteroidData.filter(a => !a.isHazardous)

  return (
    <group>
      {/* Normal asteroitler */}
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, normalAsteroids.length]}
        castShadow
        receiveShadow
      />
      
      {/* Tehlikeli asteroitler - farklı renkte */}
      {hazardousAsteroids.length > 0 && (
        <instancedMesh
          args={[geometry, hazardousMaterial, hazardousAsteroids.length]}
          castShadow
          receiveShadow
        />
      )}
    </group>
  )
})

PerformantAsteroids.displayName = 'PerformantAsteroids'