'use client'
import React, { useMemo, useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { EnhancedEarth } from './planets/EnhancedEarth'
import { EnhancedSun } from './stars/EnhancedSun'
import { PerformantAsteroids } from './PerformantAsteroids'
import { AsteroidDetailPanel } from '../dashboard/asteroid-detail-panel'
interface ThreatData {
  threat_id: string
  title: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  threat_type: string
  source: string
  final_risk_score: number
  confidence_score: number
  coordinates?: { lat: number; lng: number }
  time_to_impact_hours?: number
  impact_probability: number
}
interface AIThreatVisualizationProps {
  onAsteroidSelect?: (asteroid: ThreatData) => void
  enableAnimation?: boolean
  quality?: 'low' | 'medium' | 'high'
}
const useAIThreatData = () => {
  const [threats, setThreats] = useState<ThreatData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const fetchAIThreats = async () => {
      try {
        setLoading(true)
        const analysisResponse = await fetch('/api/v1/ai-analysis/analysis/comprehensive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sources: ['nasa_neo', 'nasa_eonet'], 
            lookback_days: 3,
            include_predictions: true
          })
        })
        if (!analysisResponse.ok) {
          throw new Error('AI analiz başlatılamadı')
        }
        const { session_id } = await analysisResponse.json()
        let attempts = 0
        const maxAttempts = 15
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          const statusResponse = await fetch(`/api/v1/ai-analysis/status/${session_id}`)
          if (statusResponse.ok) {
            const statusData = await statusResponse.json()
            if (statusData.status?.status === 'completed') {
              break
            }
          }
          attempts++
        }
        const resultsResponse = await fetch(`/api/v1/ai-analysis/results/${session_id}`)
        if (!resultsResponse.ok) {
          throw new Error('Sonuçlar alınamadı')
        }
        const results = await resultsResponse.json()
        const asteroidThreats = results.detailed_results?.comprehensive_assessments?.filter(
          (threat: any) => threat.threat_type === 'asteroid'
        ) || []
        setThreats(asteroidThreats)
        console.log(`🌌 AI Tehdit Görselleştirme: ${asteroidThreats.length} asteroid yüklendi`)
      } catch (err) {
        console.error('AI tehdit verisi hatası:', err)
        setError(err instanceof Error ? err.message : 'Veri yüklenemedi')
        setThreats([
          {
            threat_id: 'demo_1',
            title: 'Demo Asteroid A',
            severity: 'HIGH',
            threat_type: 'asteroid',
            source: 'nasa_neo',
            final_risk_score: 0.8,
            confidence_score: 0.9,
            impact_probability: 0.1,
            time_to_impact_hours: 48
          },
          {
            threat_id: 'demo_2', 
            title: 'Demo Asteroid B',
            severity: 'MEDIUM',
            threat_type: 'asteroid',
            source: 'nasa_neo',
            final_risk_score: 0.5,
            confidence_score: 0.8,
            impact_probability: 0.05
          }
        ])
      } finally {
        setLoading(false)
      }
    }
    fetchAIThreats()
  }, [])
  return { threats, loading, error }
}
const ThreatAsteroids: React.FC<{
  threats: ThreatData[]
  onSelect?: (threat: ThreatData) => void
  enableAnimation: boolean
}> = ({ threats, onSelect, enableAnimation }) => {
  const groupRef = useRef<THREE.Group>(null!)
  const asteroidInstances = useMemo(() => {
    return threats.map((threat, index) => {
      const getSeverityColor = (severity: string) => {
        switch (severity) {
          case 'CRITICAL': return '#FF1744'  
          case 'HIGH': return '#FF9800'      
          case 'MEDIUM': return '#FFC107'    
          case 'LOW': return '#4CAF50'       
          default: return '#9E9E9E'          
        }
      }
      const scale = 0.3 + (threat.final_risk_score * 1.2)
      const distance = 15 + (index % 10) * 2 
      const angle = (index * 137.5 * Math.PI / 180) % (2 * Math.PI) 
      const height = ((index % 7) - 3) * 0.8 
      return {
        threat,
        position: new THREE.Vector3(
          Math.cos(angle) * distance,
          height,
          Math.sin(angle) * distance
        ),
        scale,
        color: getSeverityColor(threat.severity),
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.001,
          y: (Math.random() - 0.5) * 0.001,
          z: (Math.random() - 0.5) * 0.0005
        }
      }
    })
  }, [threats])
  return (
    <group ref={groupRef}>
      {asteroidInstances.map((instance, index) => (
        <ThreatAsteroid
          key={instance.threat.threat_id}
          instance={instance}
          onSelect={onSelect}
          enableAnimation={enableAnimation}
        />
      ))}
    </group>
  )
}
const ThreatAsteroid: React.FC<{
  instance: any
  onSelect?: (threat: ThreatData) => void
  enableAnimation: boolean
}> = ({ instance, onSelect, enableAnimation }) => {
  const meshRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)
  const geometry = useMemo(() => {
    const baseGeometry = new THREE.IcosahedronGeometry(1, 2)
    const positionAttribute = baseGeometry.getAttribute('position')
    const vertex = new THREE.Vector3()
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i)
      const noise = Math.sin(vertex.x * 8) * Math.cos(vertex.y * 6) * Math.sin(vertex.z * 10) * 0.2
      vertex.normalize()
      vertex.multiplyScalar(1.0 + noise)
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z)
    }
    baseGeometry.computeVertexNormals()
    return baseGeometry
  }, [])
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: instance.color,
      roughness: 0.9,
      metalness: 0.1,
      emissive: instance.color,
      emissiveIntensity: hovered ? 0.3 : 0.1
    })
  }, [instance.color, hovered])
  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      uniforms: {
        time: { value: 0 },
        intensity: { value: hovered ? 2.0 : 1.0 },
        glowColor: { value: new THREE.Color(instance.color) }
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
        uniform vec3 glowColor;
        varying vec3 vNormal;
        void main() {
          float rim = 1.0 - abs(dot(vNormal, vec3(0, 0, 1)));
          rim = pow(rim, 2.0);
          float pulse = sin(time * 2.0) * 0.3 + 0.7;
          vec3 color = glowColor * rim * pulse * intensity;
          gl_FragColor = vec4(color, rim * 0.6);
        }
      `
    })
  }, [instance.color, hovered])
  useFrame((state, delta) => {
    if (!enableAnimation) return
    if (meshRef.current) {
      const targetScale = hovered ? 1.3 : 1.0
      const currentScale = meshRef.current.scale.x
      const newScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * 8)
      meshRef.current.scale.setScalar(newScale)
    }
    if (glowRef.current && glowMaterial) {
      glowMaterial.uniforms.time.value = state.clock.elapsedTime
      glowMaterial.uniforms.intensity.value = hovered ? 2.5 : 1.2
    }
  })
  const handleClick = () => {
    if (onSelect) {
      onSelect(instance.threat)
    }
  }
  return (
    <group position={instance.position}>
      {}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        scale={instance.scale}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onClick={handleClick}
        castShadow
        receiveShadow
      />
      {}
      <mesh
        ref={glowRef}
        geometry={geometry}
        material={glowMaterial}
        scale={instance.scale * 1.1}
      />
    </group>
  )
}
export const AIThreatVisualizationSolarSystem: React.FC<AIThreatVisualizationProps> = ({
  onAsteroidSelect,
  enableAnimation = false,
  quality = 'high'
}) => {
  const { threats, loading, error } = useAIThreatData()
  const [selectedAsteroid, setSelectedAsteroid] = useState<ThreatData | null>(null)
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false)
  const handleAsteroidSelect = (asteroid: ThreatData) => {
    setSelectedAsteroid(asteroid)
    setIsDetailPanelOpen(true)
    if (onAsteroidSelect) {
      onAsteroidSelect(asteroid)
    }
    console.log('🪨 Asteroid seçildi:', asteroid.title)
  }
  const handleCloseDetailPanel = () => {
    setIsDetailPanelOpen(false)
    setSelectedAsteroid(null)
  }
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>AI Tehdit Analizi Yükleniyor...</p>
          <p className="text-sm text-gray-400 mt-2">126 tehdit verisi işleniyor</p>
        </div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center text-red-400">
          <p>⚠️ Veri yüklenirken hata oluştu</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="w-full h-full bg-black relative">
      <Canvas
        camera={{ position: [0, 10, 25], fov: 60 }}
        shadows={quality !== 'low'}
        gl={{
          antialias: quality === 'high',
          alpha: true,
          powerPreference: 'high-performance'
        }}
      >
        {}
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 0, 0]} intensity={2} castShadow />
        {}
        <Stars
          radius={300}
          depth={60}
          count={quality === 'low' ? 2000 : quality === 'medium' ? 5000 : 8000}
          factor={6}
          saturation={0.8}
          fade
        />
        {}
        <EnhancedSun position={[0, 0, 0]} />
        {}
        <EnhancedEarth
          position={[8, 0, 0]}
        />
        {}
        <ThreatAsteroids
          threats={threats}
          onSelect={handleAsteroidSelect}
          enableAnimation={enableAnimation}
        />
        {}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={100}
          autoRotate={false}
          autoRotateSpeed={0.5}
        />
      </Canvas>
      {}
      <div className="absolute top-4 left-4 bg-black/80 text-white p-4 rounded-lg border border-cyan-400/40 max-w-sm backdrop-blur-sm">
        <h3 className="text-lg font-bold text-cyan-400 mb-2 flex items-center">
          🤖 AI Tehdit Analizi
          {selectedAsteroid && (
            <span className="ml-2 text-xs bg-cyan-600 px-2 py-1 rounded">
              SEÇİLDİ: {selectedAsteroid.title}
            </span>
          )}
        </h3>
        <div className="space-y-1 text-sm">
          <div>Toplam Tehdit: <span className="text-cyan-400 font-mono">{threats.length}</span></div>
          <div>Kritik: <span className="text-red-400 font-mono">{threats.filter(t => t.severity === 'CRITICAL').length}</span></div>
          <div>Yüksek: <span className="text-orange-400 font-mono">{threats.filter(t => t.severity === 'HIGH').length}</span></div>
          <div>Orta: <span className="text-yellow-400 font-mono">{threats.filter(t => t.severity === 'MEDIUM').length}</span></div>
          <div>Düşük: <span className="text-green-400 font-mono">{threats.filter(t => t.severity === 'LOW').length}</span></div>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          🎯 Asteroidler renk kodlıdır<br/>
          👆 Detaylar için tıklayın<br/>
          {selectedAsteroid ? '✅ Asteroid seçildi' : '⏳ Asteroid seçin'}
        </div>
      </div>
      {}
      <AsteroidDetailPanel
        asteroid={selectedAsteroid}
        isOpen={isDetailPanelOpen}
        onClose={handleCloseDetailPanel}
      />
    </div>
  )
}
export default AIThreatVisualizationSolarSystem