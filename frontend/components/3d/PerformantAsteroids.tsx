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
        
        // Gerçek asteroidler saatlerce hatta günlerce dönerler - çok yavaş rotasyon
        const baseRotSpeed = 0.0001 // 10x daha yavaş
        let rotSpeedMultiplier = 1.0
        
        if (nasaAsteroid.orbital_data?.relative_velocity?.kilometers_per_second) {
          const velocityKms = parseFloat(nasaAsteroid.orbital_data.relative_velocity.kilometers_per_second)
          if (!isNaN(velocityKms)) {
            rotSpeedMultiplier = Math.max(0.3, Math.min(1.5, velocityKms / 25)) // Daha dengeli hız
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
            (Math.random() - 0.5) * baseRotSpeed * rotSpeedMultiplier * 0.5
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
            (Math.random() - 0.5) * 0.0002, // 10x daha yavaş
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
    // Daha detaylı geometri
    const baseGeometry = new THREE.IcosahedronGeometry(1, quality === 'low' ? 1 : quality === 'medium' ? 2 : 4)
    
    const positionAttribute = baseGeometry.getAttribute('position')
    const vertex = new THREE.Vector3()
    
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i)
      
      // Çok katmanlı noise ile gerçekçi asteroid yüzeyi
      const n1 = Math.sin(vertex.x * 5) * Math.cos(vertex.y * 4) * Math.sin(vertex.z * 6)
      const n2 = Math.sin(vertex.x * 15) * Math.cos(vertex.y * 12) * Math.sin(vertex.z * 18)
      const n3 = Math.sin(vertex.x * 35) * Math.cos(vertex.y * 28) * Math.sin(vertex.z * 40)
      
      const noise = (n1 * 0.5 + n2 * 0.3 + n3 * 0.2) * 0.2
      vertex.normalize()
      vertex.multiplyScalar(1.0 + noise)
      
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z)
    }
    
    baseGeometry.computeVertexNormals()
    return baseGeometry
  }, [quality])

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#8B7355',
      roughness: 0.98, // Çok pürüzlü taş yüzeyi
      metalness: 0.02, // Neredeyse hiç metalik içerik
      flatShading: false, // Smooth shading
      envMapIntensity: 0.2
    })
  }, [])

  // Tehlike seviyesine göre renk materyali
  const hazardousMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#A0522D', // Daha güçlü kahverengi ton
      roughness: 0.97,
      metalness: 0.03,
      flatShading: false,
      envMapIntensity: 0.25,
      emissive: '#2a1510', // Hafif iç ışıma
      emissiveIntensity: 0.1
    })
  }, [])

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
      // Gerçekçi yavaş asteroid rotasyonu (gerçek asteroidler saatlerce döner)
      asteroid.rotation.x += asteroid.rotationSpeed.x * delta * 0.5
      asteroid.rotation.y += asteroid.rotationSpeed.y * delta * 0.5
      asteroid.rotation.z += asteroid.rotationSpeed.z * delta * 0.5
      
      // Yörünge hareketi de daha yavaş
      asteroid.orbitAngle += asteroid.orbitSpeed * delta * 0.3
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