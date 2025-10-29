// CLIFF 3D Solar System - Major Satellite Systems
// Specialized components for major moons and satellites

'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three/src/loaders/TextureLoader'
import * as THREE from 'three'
import { BaseSatelliteComponent, SatelliteComponentProps } from './BaseSatelliteComponent'
import { SIMPLE_MOONS, SIMPLE_PLANETS } from '../../../types/astronomical-data'

// Moon Component - Earth's satellite with libration and phases
interface MoonComponentProps extends SatelliteComponentProps {
  showPhases?: boolean
  showLibration?: boolean
  phaseAngle?: number
}

const MoonComponent: React.FC<MoonComponentProps> = (props) => {
  const {
    showPhases = true,
    showLibration = true,
    phaseAngle = 0,
    qualityLevel = 'high',
    parentBody: _,
    ...restProps
  } = props
  const moonData = SIMPLE_MOONS.moon
  const earthData = SIMPLE_PLANETS.earth

  const phaseRef = useRef<THREE.Mesh>(null)
  const [moonTexture, moonNormalTexture] = useLoader(TextureLoader, [
    '/textures/moon-surface.jpg',
    '/textures/moon-normal.jpg'
  ])
  
  // Create phase shadow geometry
  const phaseShadowGeometry = useMemo(() => {
    if (!showPhases) return null
    const radius = moonData.info.radius_km * 0.000005
    return new THREE.SphereGeometry(radius * 1.01, 32, 32)
  }, [showPhases, moonData])
  
  // Phase shadow material
  const phaseMaterial = useMemo(() => {
    if (!showPhases) return null
    return new THREE.MeshBasicMaterial({
      color: '#000000',
      transparent: true,
      opacity: 0.7,
      side: THREE.FrontSide
    })
  }, [showPhases])
  
  // Update phases
  useFrame((state) => {
    if (showPhases && phaseRef.current) {
      // Simple phase simulation based on angle from sun
      const phasePosition = Math.cos(phaseAngle) * 0.5 + 0.5
      phaseRef.current.position.x = (phasePosition - 0.5) * moonData.info.radius_km * 0.000005 * 0.1
    }
  })
  
  return (
    <BaseSatelliteComponent
      satelliteBody={moonData}
      parentBody={earthData}
      tidallyLocked={true}
      qualityLevel={qualityLevel}
      {...restProps}
    >
      {/* Moon surface features - Mare regions */}
      {qualityLevel !== 'low' && (
        <>
          {/* Mare Tranquillitatis */}
          <mesh position={[0, 0, moonData.info.radius_km * 0.000005 * 0.9]}>
            <sphereGeometry args={[moonData.info.radius_km * 0.000005 * 0.1, 8, 8]} />
            <meshStandardMaterial color="#444444" transparent opacity={0.6} />
          </mesh>
          
          {/* Mare Serenitatis */}
          <mesh position={[moonData.info.radius_km * 0.000005 * 0.5, moonData.info.radius_km * 0.000005 * 0.5, moonData.info.radius_km * 0.000005 * 0.7]}>
            <sphereGeometry args={[moonData.info.radius_km * 0.000005 * 0.08, 6, 6]} />
            <meshStandardMaterial color="#333333" transparent opacity={0.5} />
          </mesh>
        </>
      )}
      
      {/* Phase shadow overlay */}
      {showPhases && phaseShadowGeometry && phaseMaterial && (
        <mesh ref={phaseRef} geometry={phaseShadowGeometry} material={phaseMaterial} />
      )}
      
      {/* Libration visualization for ultra quality */}
      {showLibration && qualityLevel === 'ultra' && (
        <mesh position={[0, 0, moonData.info.radius_km * 0.000005 * 1.1]}>
          <sphereGeometry args={[moonData.info.radius_km * 0.000005 * 0.02, 4, 4]} />
          <meshBasicMaterial color="#FFFF00" transparent opacity={0.8} />
        </mesh>
      )}
    </BaseSatelliteComponent>
  )
}

// Io Component - Jupiter's volcanic moon
const IoComponent: React.FC<SatelliteComponentProps> = (props) => {
  // Mock Io data - in real implementation this would come from SATELLITE_SYSTEMS
  const ioData = {
    id: 'io',
    name: 'Io',
    type: 'moon' as const,
    parentId: 'jupiter',
    physical: {
      radius: 1821.6,
      mass: 8.931938e22,
      density: 3.528,
      gravity: 1.796,
      escapeVelocity: 2.558,
      rotationPeriod: 42.459,
      axialTilt: 0.05,
      albedo: 0.63
    },
    orbital: {
      semiMajorAxis: 0.002819,
      eccentricity: 0.0041,
      inclination: 2.21,
      longitudeOfAscendingNode: 0,
      argumentOfPeriapsis: 0,
      meanAnomalyAtEpoch: 0,
      epoch: 2451545.0,
      orbitalPeriod: 1.769,
      meanMotion: 203.4889
    },
    atmosphere: {
      hasAtmosphere: true,
      pressure: 0.0000003,
      composition: [{ component: 'Sulfur Dioxide', percentage: 100 }]
    },
    textures: { diffuse: '/textures/io-surface.jpg' },
    color: '#FFFF99'
  }
  
  const jupiterData = SIMPLE_PLANETS.jupiter
  
  return (
    <BaseSatelliteComponent
      satelliteBody={ioData}
      tidallyLocked={true}
      {...props}
      {...props}
      parentBody={jupiterData}
    >
      {props.qualityLevel !== 'low' && (
        <>
          {/* Active volcanoes */}
          <mesh position={[ioData.physical.radius * 0.000005 * 0.9, 0, 0]}>
            <sphereGeometry args={[ioData.physical.radius * 0.000005 * 0.05, 4, 4]} />
            <meshStandardMaterial 
              color="#FF4400" 
              emissive="#FF2200" 
              emissiveIntensity={0.5} 
            />
          </mesh>
          
          <mesh position={[0, ioData.physical.radius * 0.000005 * 0.8, 0]}>
            <sphereGeometry args={[ioData.physical.radius * 0.000005 * 0.03, 4, 4]} />
            <meshStandardMaterial 
              color="#FFAA00" 
              emissive="#FF4400" 
              emissiveIntensity={0.3} 
            />
          </mesh>
        </>
      )}
      
      {/* Sulfur dioxide plumes */}
      {props.qualityLevel === 'ultra' && (
        <mesh position={[ioData.physical.radius * 0.000005 * 0.9, ioData.physical.radius * 0.000005 * 0.5, 0]}>
          <coneGeometry args={[ioData.physical.radius * 0.000005 * 0.02, ioData.physical.radius * 0.000005 * 0.2, 8]} />
          <meshBasicMaterial color="#FFFF88" transparent opacity={0.3} />
        </mesh>
      )}
    </BaseSatelliteComponent>
  )
}

// Europa Component - Jupiter's ice moon
const EuropaComponent: React.FC<SatelliteComponentProps> = (props) => {
  const europaData = {
    id: 'europa',
    name: 'Europa',
    type: 'moon' as const,
    parentId: 'jupiter',
    physical: {
      radius: 1560.8,
      mass: 4.799844e22,
      density: 3.013,
      gravity: 1.314,
      escapeVelocity: 2.025,
      rotationPeriod: 85.228,
      axialTilt: 0.1,
      albedo: 0.67
    },
    orbital: {
      semiMajorAxis: 0.004485,
      eccentricity: 0.009,
      inclination: 1.79,
      longitudeOfAscendingNode: 0,
      argumentOfPeriapsis: 0,
      meanAnomalyAtEpoch: 0,
      epoch: 2451545.0,
      orbitalPeriod: 3.551,
      meanMotion: 101.3747
    },
    atmosphere: { hasAtmosphere: false },
    textures: { diffuse: '/textures/europa-surface.jpg' },
    color: '#AACCFF'
  }
  
  const jupiterData = SIMPLE_PLANETS.jupiter
  
  return (
    <BaseSatelliteComponent
      satelliteBody={europaData}
      parentBody={jupiterData}
      tidallyLocked={true}
      {...props}
    >
      {/* Ice surface cracks */}
      {props.qualityLevel !== 'low' && (
        <mesh scale={1.005}>
          <sphereGeometry args={[europaData.physical.radius * 0.000005, 24, 24]} />
          <meshBasicMaterial 
            color="#FFFFFF" 
            transparent 
            opacity={0.8}
            wireframe={props.qualityLevel === 'ultra'}
          />
        </mesh>
      )}
      
      {/* Subsurface ocean glow */}
      {props.qualityLevel === 'ultra' && (
        <mesh scale={0.98}>
          <sphereGeometry args={[europaData.physical.radius * 0.000005, 16, 16]} />
          <meshBasicMaterial 
            color="#0066CC" 
            transparent 
            opacity={0.2}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </BaseSatelliteComponent>
  )
}

// Titan Component - Saturn's largest moon with atmosphere
const TitanComponent: React.FC<SatelliteComponentProps> = (props) => {
  const titanData = {
    id: 'titan',
    name: 'Titan',
    type: 'moon' as const,
    parentId: 'saturn',
    physical: {
      radius: 2574,
      mass: 1.3452e23,
      density: 1.88,
      gravity: 1.352,
      escapeVelocity: 2.639,
      rotationPeriod: 382.69,
      axialTilt: 0,
      albedo: 0.2
    },
    orbital: {
      semiMajorAxis: 0.008168,
      eccentricity: 0.0288,
      inclination: 0.34854,
      longitudeOfAscendingNode: 0,
      argumentOfPeriapsis: 0,
      meanAnomalyAtEpoch: 0,
      epoch: 2451545.0,
      orbitalPeriod: 15.945,
      meanMotion: 22.5769
    },
    atmosphere: {
      hasAtmosphere: true,
      pressure: 1.45,
      composition: [
        { component: 'Nitrogen', percentage: 94.2 },
        { component: 'Methane', percentage: 5.65 }
      ]
    },
    textures: { diffuse: '/textures/titan-surface.jpg' },
    color: '#FFA500'
  }
  
  const saturnData = SIMPLE_PLANETS.saturn
  
  return (
    <BaseSatelliteComponent
      satelliteBody={titanData}
      parentBody={saturnData}
      tidallyLocked={true}
      {...props}
    >
      {/* Thick atmosphere */}
      <mesh scale={1.1}>
        <sphereGeometry args={[titanData.physical.radius * 0.000005, 32, 32]} />
        <meshStandardMaterial 
          color="#FF6600" 
          transparent 
          opacity={0.6}
          roughness={1.0}
        />
      </mesh>
      
      {/* Methane lakes */}
      {props.qualityLevel !== 'low' && (
        <>
          <mesh position={[titanData.physical.radius * 0.000005 * 0.7, titanData.physical.radius * 0.000005 * 0.7, 0]}>
            <sphereGeometry args={[titanData.physical.radius * 0.000005 * 0.1, 6, 6]} />
            <meshStandardMaterial color="#001133" metalness={0.8} roughness={0.1} />
          </mesh>
          
          <mesh position={[-titanData.physical.radius * 0.000005 * 0.6, titanData.physical.radius * 0.000005 * 0.5, 0]}>
            <sphereGeometry args={[titanData.physical.radius * 0.000005 * 0.08, 6, 6]} />
            <meshStandardMaterial color="#001133" metalness={0.8} roughness={0.1} />
          </mesh>
        </>
      )}
      
      {/* Atmospheric haze */}
      <mesh scale={1.2}>
        <sphereGeometry args={[titanData.physical.radius * 0.000005, 16, 16]} />
        <meshBasicMaterial 
          color="#FFAA44" 
          transparent 
          opacity={0.1} 
          side={THREE.BackSide}
        />
      </mesh>
    </BaseSatelliteComponent>
  )
}

// Phobos Component - Mars' larger moon
const PhobosComponent: React.FC<SatelliteComponentProps> = (props) => {
  const phobosData = {
    id: 'phobos',
    name: 'Phobos',
    type: 'moon' as const,
    parentId: 'mars',
    physical: {
      radius: 11.3, // Irregular shape, using mean radius
      mass: 1.0659e16,
      density: 1.876,
      gravity: 0.0057,
      escapeVelocity: 0.0114,
      rotationPeriod: 7.6,
      axialTilt: 0,
      albedo: 0.071
    },
    orbital: {
      semiMajorAxis: 0.0000627,
      eccentricity: 0.0151,
      inclination: 1.093,
      longitudeOfAscendingNode: 0,
      argumentOfPeriapsis: 0,
      meanAnomalyAtEpoch: 0,
      epoch: 2451545.0,
      orbitalPeriod: 0.319, // 7.6 hours
      meanMotion: 1128.8445
    },
    atmosphere: { hasAtmosphere: false },
    textures: { diffuse: '/textures/phobos-surface.jpg' },
    color: '#8B4513'
  }
  
  const marsData = SIMPLE_PLANETS.mars
  
  return (
    <BaseSatelliteComponent
      satelliteBody={phobosData}
      parentBody={marsData}
      tidallyLocked={true}
      {...props}
    >
      {/* Stickney crater */}
      {props.qualityLevel !== 'low' && (
        <mesh position={[phobosData.physical.radius * 0.000005 * 0.8, 0, 0]}>
          <sphereGeometry args={[phobosData.physical.radius * 0.000005 * 0.4, 6, 6]} />
          <meshStandardMaterial color="#654321" />
        </mesh>
      )}
    </BaseSatelliteComponent>
  )
}

// Satellite system manager
interface SatelliteSystemProps extends Omit<SatelliteComponentProps, 'satelliteId' | 'parentBody'> {
  system: 'earth' | 'mars' | 'jupiter' | 'saturn'
  satelliteFilter?: string[]
}

export const SatelliteSystemComponent: React.FC<SatelliteSystemProps> = ({
  system,
  satelliteFilter,
  ...commonProps
}) => {
  const satellites = useMemo(() => {
    const satelliteComponents = {
      earth: [
        { id: 'moon', component: MoonComponent, name: 'Moon' }
      ],
      mars: [
        { id: 'phobos', component: PhobosComponent, name: 'Phobos' },
        { id: 'deimos', component: PhobosComponent, name: 'Deimos' } // Using Phobos as base for now
      ],
      jupiter: [
        { id: 'io', component: IoComponent, name: 'Io' },
        { id: 'europa', component: EuropaComponent, name: 'Europa' }
        // Ganymede and Callisto would be added here
      ],
      saturn: [
        { id: 'titan', component: TitanComponent, name: 'Titan' }
      ]
    }
    
    const systemSatellites = satelliteComponents[system] || []
    
    if (!satelliteFilter) return systemSatellites
    return systemSatellites.filter(sat => satelliteFilter.includes(sat.id))
  }, [system, satelliteFilter])
  
  const parentBody = SIMPLE_PLANETS[system]
  
  return (
    <group>
      {satellites.map(({ id, component: SatelliteComp }) => (
        <SatelliteComp
          key={id}
          satelliteId={id}
          parentBody={parentBody}
          {...commonProps}
        />
      ))}
    </group>
  )
}

// Export all satellite components
export {
  BaseSatelliteComponent,
  MoonComponent,
  IoComponent,
  EuropaComponent,
  TitanComponent,
  PhobosComponent
}

// Export types
export type { SatelliteComponentProps, SatelliteState } from './BaseSatelliteComponent'
