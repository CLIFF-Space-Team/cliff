// CLIFF 3D Solar System - Base Satellite Component
// Base class for all moon and satellite components

'use client'

import { useRef, useMemo, useState } from 'react'
import { useFrame, useLoader, ThreeEvent } from '@react-three/fiber'
import { TextureLoader } from 'three/src/loaders/TextureLoader'
import * as THREE from 'three'
import {
  SimpleCelestialBody,
  CelestialBody,
  ASTRONOMICAL_CONSTANTS
} from '../../../types/astronomical-data'
// Removed OrbitalMechanicsEngine import for simplified version

export interface SatelliteComponentProps {
  satelliteId: string
  parentBody: SimpleCelestialBody | CelestialBody
  position?: [number, number, number]
  scale?: number
  showTrail?: boolean
  showOrbit?: boolean
  timeScale?: number
  currentTime?: number
  qualityLevel?: 'low' | 'medium' | 'high' | 'ultra'
  tidallyLocked?: boolean
  onClick?: () => void
  onHover?: (hovered: boolean) => void
}

export interface SatelliteState {
  position: THREE.Vector3
  rotation: THREE.Vector3
  orbitalPhase: number
  distanceFromParent: number
  isVisible: boolean
  librationPhase?: number  // For Moon's libration
}

export interface BaseSatelliteComponentProps extends SatelliteComponentProps {
  satelliteBody: SimpleCelestialBody | any // Allow mock data temporarily
  children?: React.ReactNode
}

export const BaseSatelliteComponent: React.FC<BaseSatelliteComponentProps> = ({
  satelliteBody,
  parentBody,
  position = [0, 0, 0],
  scale = 1,
  showTrail = false,
  showOrbit = false,
  timeScale = 1,
  currentTime = ASTRONOMICAL_CONSTANTS.J2000_EPOCH,
  qualityLevel = 'high',
  tidallyLocked = true,
  onClick,
  onHover,
  children
}) => {
  // Refs
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const trailRef = useRef<THREE.Line>(null)
  const orbitRef = useRef<THREE.Line>(null)
  
  // Simple orbital calculation variables
  const [orbitalPhase, setOrbitalPhase] = useState(0)
  
  // Satellite state
  const [satelliteState, setSatelliteState] = useState<SatelliteState>({
    position: new THREE.Vector3(...position),
    rotation: new THREE.Vector3(),
    orbitalPhase: 0,
    distanceFromParent: satelliteBody.orbit?.distance_from_sun || satelliteBody.orbital?.semiMajorAxis || 1,
    isVisible: true,
    librationPhase: 0
  })
  
  // Load textures
  const textures = useLoader(TextureLoader, [
    satelliteBody.texture_url || satelliteBody.textures?.diffuse || '',
    // No normal or specular for simple version
  ].filter(Boolean))
  
  // Create geometry with appropriate detail level
  const geometry = useMemo(() => {
    const radius_km = satelliteBody.info?.radius_km || satelliteBody.physical?.radius || 1000
    const segments = getSatelliteSegments(qualityLevel, radius_km)
    const radius = getScaledSatelliteRadius(satelliteBody) * scale
    return new THREE.SphereGeometry(radius, segments, segments)
  }, [qualityLevel, satelliteBody, scale])
  
  // Create material
  const material = useMemo(() => {
    const materialProps: THREE.MeshStandardMaterialParameters = {
      color: new THREE.Color(satelliteBody.color),
      roughness: 0.9,
      metalness: 0.0
    }
    
    // Apply textures
    if (textures[0]) materialProps.map = textures[0]
    
    return new THREE.MeshStandardMaterial(materialProps)
  }, [textures, satelliteBody, qualityLevel])
  
  // Create trail geometry
  const trailGeometry = useMemo(() => {
    if (!showTrail) return null
    
    const points: THREE.Vector3[] = []
    const segments = 50
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const distance = (satelliteBody.orbit?.distance_from_sun || satelliteBody.orbital?.semiMajorAxis || 0.1) * 0.01
      const x = distance * Math.cos(angle)
      const z = distance * Math.sin(angle)
      points.push(new THREE.Vector3(x, 0, z))
    }
    
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [showTrail, satelliteBody])
  
  // Create orbit geometry
  const orbitGeometry = useMemo(() => {
    if (!showOrbit) return null
    
    const points: THREE.Vector3[] = []
    const segments = 64
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const distance = (satelliteBody.orbit?.distance_from_sun || satelliteBody.orbital?.semiMajorAxis || 0.1) * 0.01
      const x = distance * Math.cos(angle)
      const z = distance * Math.sin(angle)
      points.push(new THREE.Vector3(x, 0, z))
    }
    
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [showOrbit, satelliteBody])
  
  // Animation frame updates
  useFrame((state, delta) => {
    if (!meshRef.current || !groupRef.current) return
    
    // Simple orbital calculation
    const orbitalPeriod = satelliteBody.orbit?.orbital_period_days || satelliteBody.orbital?.orbitalPeriod || 27.3
    const orbitSpeed = (2 * Math.PI) / (orbitalPeriod * 24 * 3600) // rad/s
    const newPhase = orbitalPhase + (orbitSpeed * delta * timeScale)
    setOrbitalPhase(newPhase)
    
    // Calculate position in circular orbit (simplified)
    const distance = satelliteBody.orbit?.distance_from_sun || satelliteBody.orbital?.semiMajorAxis || 0.1
    const scaledDistance = distance * 0.01
    const x = scaledDistance * Math.cos(newPhase)
    const z = scaledDistance * Math.sin(newPhase)
    const y = 0 // Simplified - no inclination for now
    
    groupRef.current.position.set(x, y, z)
    
    // Handle rotation
    if (tidallyLocked) {
      // Tidally locked satellites always show the same face to their parent
      meshRef.current.rotation.y = newPhase
      
      // Add libration for the Moon
      if (satelliteBody.id === 'moon') {
        const libration = Math.sin(newPhase * 2) * 0.1 // Small oscillation
        meshRef.current.rotation.y += libration
        setSatelliteState(prev => ({
          ...prev,
          librationPhase: libration
        }))
      }
    } else {
      // Free rotation
      const rotationPeriod = satelliteBody.orbit?.rotation_period_hours || satelliteBody.physical?.rotationPeriod || 24
      if (rotationPeriod > 0) {
        const rotationSpeed = (2 * Math.PI) / (rotationPeriod * 3600)
        meshRef.current.rotation.y += rotationSpeed * delta * timeScale
      }
    }
    
    // Update state
    setSatelliteState(prev => ({
      ...prev,
      position: new THREE.Vector3(x, y, z),
      orbitalPhase: newPhase,
      distanceFromParent: scaledDistance
    }))
  })
  
  // Event handlers
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (onClick) onClick()
  }
  
  const handlePointerEnter = () => {
    document.body.style.cursor = 'pointer'
    if (onHover) onHover(true)
  }
  
  const handlePointerLeave = () => {
    document.body.style.cursor = 'auto'
    if (onHover) onHover(false)
  }
  
  return (
    <group ref={groupRef} position={position}>
      {/* Orbital trail */}
      {showTrail && trailGeometry && (
        <primitive object={new THREE.Line(trailGeometry, new THREE.LineBasicMaterial({ 
          color: satelliteBody.color, 
          opacity: 0.4, 
          transparent: true 
        }))} />
      )}
      
      {/* Orbital path */}
      {showOrbit && orbitGeometry && (
        <primitive object={new THREE.Line(orbitGeometry, new THREE.LineBasicMaterial({ 
          color: satelliteBody.color, 
          opacity: 0.2, 
          transparent: true 
        }))} />
      )}
      
      {/* Main satellite mesh */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        {/* Additional satellite-specific components */}
        {children}
      </mesh>
    </group>
  )
}

// Utility functions

function getSatelliteSegments(quality: string, radius: number): number {
  const baseSegments = {
    ultra: 32,
    high: 24,
    medium: 16,
    low: 8
  }[quality] || 16
  
  // Adjust segments based on satellite size
  if (radius > 2000) return baseSegments // Large moons (Moon, Ganymede, Titan)
  if (radius > 1000) return Math.max(baseSegments * 0.75, 8) // Medium moons
  return Math.max(baseSegments * 0.5, 6) // Small moons
}

function getScaledSatelliteRadius(satellite: any): number {
  // Scale factor for satellite visibility
  const radius = satellite.info?.radius_km || satellite.physical?.radius || 1000
  return radius * 0.000005 // Smaller scale factor than planets
}