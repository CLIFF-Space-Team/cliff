// CLIFF 3D Solar System - Base Planet Component
// Base class for all planetary components with common functionality

'use client'

import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame, useLoader, ThreeEvent } from '@react-three/fiber'
import { TextureLoader } from 'three/src/loaders/TextureLoader'
import * as THREE from 'three'
import {
  SimpleCelestialBody,
  SOLAR_SYSTEM_DATA,
  SOLAR_SYSTEM_CONSTANTS
} from '../../../types/astronomical-data'
import { OrbitalMechanicsEngine } from '../engines/OrbitalMechanicsEngine'

export interface PlanetComponentProps {
  planetId: string
  position?: [number, number, number]
  scale?: number
  showTrails?: boolean
  showOrbits?: boolean
  timeScale?: number
  currentTime?: number
  qualityLevel?: 'low' | 'medium' | 'high' | 'ultra'
  onClick?: () => void
  onHover?: (hovered: boolean) => void
}

export interface PlanetComponentState {
  position: THREE.Vector3
  rotation: THREE.Vector3
  orbitalPhase: number
  distanceFromSun: number
  isVisible: boolean
}

export interface BasePlanetComponentProps extends PlanetComponentProps {
  celestialBody: SimpleCelestialBody
  children?: React.ReactNode
}

export const BasePlanetComponent: React.FC<BasePlanetComponentProps> = ({
  celestialBody,
  position = [0, 0, 0],
  scale = 1,
  showTrails = false,
  showOrbits = false,
  timeScale = 1,
  currentTime = Date.now(),
  qualityLevel = 'high',
  onClick,
  onHover,
  children
}) => {
  // Refs for mesh and group
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const trailRef = useRef<THREE.Line>(null)
  const orbitRef = useRef<THREE.Line>(null)
  
  // Orbital mechanics engine
  const orbitalEngine = useMemo(() => new OrbitalMechanicsEngine(), [])
  
  // Planet state
  const [planetState, setPlanetState] = useState<PlanetComponentState>({
    position: new THREE.Vector3(...position),
    rotation: new THREE.Vector3(),
    orbitalPhase: 0,
    distanceFromSun: celestialBody.orbit?.distance_from_sun || 1,
    isVisible: true
  })
  
  // Load textures based on quality level (safe loading with fallbacks)
  const textureUrls = [
    celestialBody.texture_url || '',
    // Add more texture URLs as needed
  ].filter(Boolean)
  
  const textures = textureUrls.length > 0 ? useLoader(TextureLoader, textureUrls) : []
  
  // Create geometry with quality-appropriate segments
  const geometry = useMemo(() => {
    const segments = getSegmentsForQuality(qualityLevel, celestialBody.type)
    const radius = getScaledRadius(celestialBody) * scale
    return new THREE.SphereGeometry(radius, segments, segments)
  }, [qualityLevel, celestialBody, scale])
  
  // Create material with loaded textures
  const material = useMemo(() => {
    const materialProps: THREE.MeshStandardMaterialParameters = {
      color: new THREE.Color(celestialBody.color || '#FFFFFF'),
      roughness: 0.8,
      metalness: 0.1
    }
    
    // Apply textures if available
    if (textures[0]) materialProps.map = textures[0]
    
    // Star specific properties
    if (celestialBody.type === 'star') {
      materialProps.emissive = new THREE.Color(celestialBody.color || '#FFD700')
      materialProps.emissiveIntensity = 0.8
    }
    
    return new THREE.MeshStandardMaterial(materialProps)
  }, [textures, celestialBody, qualityLevel])
  
  // Create trail geometry for orbital path
  const trailGeometry = useMemo(() => {
    if (!showTrails || !celestialBody.orbit) return null
    
    const points: THREE.Vector3[] = []
    const segments = 100
    const orbitRadius = celestialBody.orbit.distance_from_sun * SOLAR_SYSTEM_CONSTANTS.DISTANCE_SCALE
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const x = orbitRadius * Math.cos(angle)
      const z = orbitRadius * Math.sin(angle)
      points.push(new THREE.Vector3(x, 0, z))
    }
    
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [showTrails, celestialBody])
  
  // Create orbit path geometry
  const orbitGeometry = useMemo(() => {
    if (!showOrbits || !celestialBody.orbit) return null
    
    const points: THREE.Vector3[] = []
    const segments = 128
    const orbitRadius = celestialBody.orbit.distance_from_sun * SOLAR_SYSTEM_CONSTANTS.DISTANCE_SCALE
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const x = orbitRadius * Math.cos(angle)
      const z = orbitRadius * Math.sin(angle)
      points.push(new THREE.Vector3(x, 0, z))
    }
    
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [showOrbits, celestialBody])
  
  // Update orbital position and rotation
  useFrame((state, delta) => {
    if (!meshRef.current || !groupRef.current || !celestialBody.orbit) return
    
    // Update orbital position for planets (not for sun)
    if (celestialBody.parent_id && celestialBody.parent_id !== celestialBody.id) {
      const time = state.clock.elapsedTime * timeScale
      const orbitRadius = celestialBody.orbit.distance_from_sun * SOLAR_SYSTEM_CONSTANTS.DISTANCE_SCALE
      const orbitSpeed = (2 * Math.PI) / (celestialBody.orbit.orbital_period_days * 0.1) // Speed up for demo
      const angle = time * orbitSpeed
      
      groupRef.current.position.set(
        orbitRadius * Math.cos(angle),
        0,
        orbitRadius * Math.sin(angle)
      )
      
      setPlanetState(prev => ({
        ...prev,
        position: new THREE.Vector3(orbitRadius * Math.cos(angle), 0, orbitRadius * Math.sin(angle)),
        orbitalPhase: angle,
        distanceFromSun: orbitRadius
      }))
    }
    
    // Update rotation
    if (celestialBody.orbit.rotation_period_hours > 0) {
      const rotationSpeed = (2 * Math.PI) / (celestialBody.orbit.rotation_period_hours * 0.01) // Speed up for demo
      const rotationDelta = rotationSpeed * delta * timeScale
      
      meshRef.current.rotation.y += rotationDelta
      
      // Apply axial tilt
      const tiltRadians = (celestialBody.orbit.tilt_degrees || 0) * (Math.PI / 180)
      meshRef.current.rotation.z = tiltRadians
    }
  })
  
  // Handle click events
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (onClick) onClick()
  }
  
  // Handle hover events
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
      {showTrails && trailGeometry && (
        <primitive object={new THREE.Line(trailGeometry, new THREE.LineBasicMaterial({ 
          color: celestialBody.color, 
          opacity: 0.5, 
          transparent: true 
        }))} />
      )}
      
      {/* Orbital path */}
      {showOrbits && orbitGeometry && (
        <primitive object={new THREE.Line(orbitGeometry, new THREE.LineBasicMaterial({ 
          color: celestialBody.color, 
          opacity: 0.3, 
          transparent: true 
        }))} />
      )}
      
      {/* Main planet mesh */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        castShadow={celestialBody.type !== 'star'}
        receiveShadow={celestialBody.type !== 'star'}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        {/* Additional planet-specific components */}
        {children}
      </mesh>
      
      {/* Point light for stars */}
      {celestialBody.type === 'star' && (
        <pointLight
          color={celestialBody.color}
          intensity={2}
          distance={1000}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
      )}
    </group>
  )
}

// Utility functions

function getSegmentsForQuality(quality: string, bodyType: string): number {
  const baseSegments = {
    ultra: 128,
    high: 64,
    medium: 32,
    low: 16
  }[quality] || 32
  
  switch (bodyType) {
    case 'star':
    case 'planet':
      return baseSegments
    case 'moon':
      return Math.max(baseSegments * 0.5, 8)
    default:
      return Math.max(baseSegments * 0.25, 6)
  }
}

function getScaledRadius(body: SimpleCelestialBody): number {
  // Scale factor for visibility (real scale would be too small/large)
  const baseScale = body.type === 'star' ? 0.01 : 0.0001
  return (body.info?.radius_km || 1000) * baseScale
}