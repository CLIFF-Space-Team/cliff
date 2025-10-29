// CLIFF 3D Solar System - Planet Components Index
// All planetary components with specialized features

'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { BasePlanetComponent, PlanetComponentProps } from './BasePlanetComponent'
import { EarthComponent } from './EarthComponent'
import { SaturnComponent } from './SaturnComponent'
import { SIMPLE_PLANETS } from '../../../types/astronomical-data'

// Sun Component - Self-illuminated star
export const SunComponent: React.FC<PlanetComponentProps> = (props) => {
  const sunData = SIMPLE_PLANETS.sun
  
  return (
    <BasePlanetComponent 
      celestialBody={sunData} 
      {...props}
    >
      {/* Corona effect for ultra quality */}
      {props.qualityLevel === 'ultra' && (
        <>
          <mesh scale={1.2}>
            <sphereGeometry args={[sunData.info.radius_km * 0.0001, 32, 32]} />
            <meshBasicMaterial 
              color="#FFD700" 
              transparent 
              opacity={0.1} 
              side={THREE.BackSide}
            />
          </mesh>
          <mesh scale={1.5}>
            <sphereGeometry args={[sunData.info.radius_km * 0.0001, 16, 16]} />
            <meshBasicMaterial 
              color="#FFA500" 
              transparent 
              opacity={0.05} 
              side={THREE.BackSide}
            />
          </mesh>
        </>
      )}
    </BasePlanetComponent>
  )
}

// Mercury Component - Heavily cratered, no atmosphere
export const MercuryComponent: React.FC<PlanetComponentProps> = (props) => {
  const mercuryData = SIMPLE_PLANETS.mercury
  
  return (
    <BasePlanetComponent 
      celestialBody={mercuryData} 
      {...props}
    />
  )
}

// Venus Component - Thick atmosphere with cloud layers
export const VenusComponent: React.FC<PlanetComponentProps> = (props) => {
  const venusData = SIMPLE_PLANETS.venus
  
  return (
    <BasePlanetComponent 
      celestialBody={venusData} 
      {...props}
    >
      {/* Dense atmosphere */}
      <mesh scale={1.05}>
        <sphereGeometry args={[venusData.info.radius_km * 0.00001, 32, 32]} />
        <meshStandardMaterial 
          color="#FFC649" 
          transparent 
          opacity={0.8}
          roughness={1.0}
        />
      </mesh>
    </BasePlanetComponent>
  )
}

// Mars Component - Red planet with polar ice caps
export const MarsComponent: React.FC<PlanetComponentProps> = (props) => {
  const marsData = SIMPLE_PLANETS.mars
  
  return (
    <BasePlanetComponent 
      celestialBody={marsData} 
      {...props}
    >
      {/* Polar ice caps */}
      {props.qualityLevel !== 'low' && (
        <>
          <mesh position={[0, marsData.info.radius_km * 0.00001 * 0.9, 0]}>
            <sphereGeometry args={[marsData.info.radius_km * 0.00001 * 0.1, 8, 8]} />
            <meshStandardMaterial color="#FFFFFF" transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, -marsData.info.radius_km * 0.00001 * 0.9, 0]}>
            <sphereGeometry args={[marsData.info.radius_km * 0.00001 * 0.05, 8, 8]} />
            <meshStandardMaterial color="#FFFFFF" transparent opacity={0.6} />
          </mesh>
        </>
      )}
      
      {/* Thin atmosphere */}
      <mesh scale={1.02}>
        <sphereGeometry args={[marsData.info.radius_km * 0.00001, 16, 16]} />
        <meshBasicMaterial 
          color="#CD5C5C" 
          transparent 
          opacity={0.1} 
          side={THREE.BackSide}
        />
      </mesh>
    </BasePlanetComponent>
  )
}

// Jupiter Component - Gas giant with Great Red Spot
export const JupiterComponent: React.FC<PlanetComponentProps> = (props) => {
  const jupiterData = SIMPLE_PLANETS.jupiter
  
  return (
    <BasePlanetComponent 
      celestialBody={jupiterData} 
      {...props}
    >
      {/* Great Red Spot */}
      {props.qualityLevel !== 'low' && (
        <mesh position={[jupiterData.info.radius_km * 0.00001 * 0.9, 0, 0]}>
          <sphereGeometry args={[jupiterData.info.radius_km * 0.00001 * 0.1, 8, 8]} />
          <meshBasicMaterial color="#AA4444" transparent opacity={0.8} />
        </mesh>
      )}
      
      {/* Atmospheric bands effect */}
      {props.qualityLevel === 'ultra' && (
        <mesh scale={1.01}>
          <sphereGeometry args={[jupiterData.info.radius_km * 0.00001, 64, 32]} />
          <meshBasicMaterial 
            color="#D8CA9D" 
            transparent 
            opacity={0.3}
            wireframe
          />
        </mesh>
      )}
    </BasePlanetComponent>
  )
}

// Uranus Component - Ice giant tilted on its side
export const UranusComponent: React.FC<PlanetComponentProps> = (props) => {
  const uranusData = SIMPLE_PLANETS.uranus
  
  return (
    <group rotation={[0, 0, Math.PI / 2]}> {/* Uranus rotates on its side */}
      <BasePlanetComponent 
        celestialBody={uranusData} 
        {...props}
      >
        {/* Faint ring system */}
        {props.qualityLevel !== 'low' && (
          <group rotation={[Math.PI / 2, 0, 0]}>
            <mesh>
              <ringGeometry args={[uranusData.info.radius_km * 0.00001 * 1.5, uranusData.info.radius_km * 0.00001 * 2.0, 32]} />
              <meshBasicMaterial 
                color="#4FD0E7" 
                transparent 
                opacity={0.2} 
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        )}
        
        {/* Methane atmosphere glow */}
        <mesh scale={1.03}>
          <sphereGeometry args={[uranusData.info.radius_km * 0.00001, 24, 24]} />
          <meshBasicMaterial 
            color="#4FD0E7" 
            transparent 
            opacity={0.2} 
            side={THREE.BackSide}
          />
        </mesh>
      </BasePlanetComponent>
    </group>
  )
}

// Neptune Component - Deep blue ice giant with winds
export const NeptuneComponent: React.FC<PlanetComponentProps> = (props) => {
  const neptuneData = SIMPLE_PLANETS.neptune
  
  return (
    <BasePlanetComponent 
      celestialBody={neptuneData} 
      {...props}
    >
      {/* Great Dark Spot */}
      {props.qualityLevel !== 'low' && (
        <mesh position={[neptuneData.info.radius_km * 0.00001 * 0.8, 0, 0]}>
          <sphereGeometry args={[neptuneData.info.radius_km * 0.00001 * 0.15, 8, 8]} />
          <meshBasicMaterial color="#001144" transparent opacity={0.6} />
        </mesh>
      )}
      
      {/* Atmospheric glow */}
      <mesh scale={1.05}>
        <sphereGeometry args={[neptuneData.info.radius_km * 0.00001, 32, 32]} />
        <meshBasicMaterial 
          color="#4B70DD" 
          transparent 
          opacity={0.3} 
          side={THREE.BackSide}
        />
      </mesh>
    </BasePlanetComponent>
  )
}

// Pluto Component - Dwarf planet with heart-shaped feature (Pluto verisi yok, basit veri oluşturalım)
export const PlutoComponent: React.FC<PlanetComponentProps> = (props) => {
  const plutoData = {
    id: 'pluto',
    name: 'Pluto',
    turkish_name: 'Plüton',
    type: 'dwarf_planet' as const,
    color: '#8C7853',
    info: {
      radius_km: 1188,
      distance_from_sun: 5900000000,
      orbital_period_days: 90520,
      rotation_period_hours: 153.3,
      temperature_range: { min: -375, max: -400 },
      mass_relative_to_earth: 0.002,
      gravity_relative_to_earth: 0.063,
      has_atmosphere: true,
      has_rings: false,
      number_of_moons: 5,
      tilt_degrees: 122.5,
      moon_count: 5,
      surface_temp_celsius: { min: -240, max: -218, average: -230 }
    },
    orbit: {
      semi_major_axis: 39.48,
      eccentricity: 0.244,
      inclination: 17.14,
      orbital_period: 248.09,
      distance_from_sun: 5900000000,
      orbital_period_days: 90520,
      rotation_period_hours: 153.3,
      tilt_degrees: 122.5
    },
    description: 'Güneş Sistemi\'nin en dış cüce gezegeni',
    interesting_facts: [
      'Kalp şeklinde Tombaugh Regio bölgesi',
      'Charon adlı büyük uydusu var',
      '1930 yılında keşfedildi'
    ]
  }
  
  return (
    <BasePlanetComponent 
      celestialBody={plutoData} 
      {...props}
    >
      {/* Tombaugh Regio (heart-shaped feature) */}
      {props.qualityLevel === 'ultra' && (
        <mesh position={[plutoData.info.radius_km * 0.00001 * 0.9, 0, 0]}>
          <sphereGeometry args={[plutoData.info.radius_km * 0.00001 * 0.2, 6, 6]} />
          <meshBasicMaterial color="#FFDDAA" transparent opacity={0.8} />
        </mesh>
      )}
    </BasePlanetComponent>
  )
}

// Planet component factory function
export function createPlanetComponent(planetId: string): React.FC<PlanetComponentProps> {
  const components = {
    sun: SunComponent,
    mercury: MercuryComponent,
    venus: VenusComponent,
    earth: EarthComponent,
    mars: MarsComponent,
    jupiter: JupiterComponent,
    saturn: SaturnComponent,
    uranus: UranusComponent,
    neptune: NeptuneComponent,
    pluto: PlutoComponent
  }
  
  return components[planetId as keyof typeof components] || BasePlanetComponent
}

// All planets array for easy iteration
export const ALL_PLANETS = [
  { id: 'sun', component: SunComponent, name: 'Sun', type: 'star' },
  { id: 'mercury', component: MercuryComponent, name: 'Mercury', type: 'planet' },
  { id: 'venus', component: VenusComponent, name: 'Venus', type: 'planet' },
  { id: 'earth', component: EarthComponent, name: 'Earth', type: 'planet' },
  { id: 'mars', component: MarsComponent, name: 'Mars', type: 'planet' },
  { id: 'jupiter', component: JupiterComponent, name: 'Jupiter', type: 'planet' },
  { id: 'saturn', component: SaturnComponent, name: 'Saturn', type: 'planet' },
  { id: 'uranus', component: UranusComponent, name: 'Uranus', type: 'planet' },
  { id: 'neptune', component: NeptuneComponent, name: 'Neptune', type: 'planet' },
  { id: 'pluto', component: PlutoComponent, name: 'Pluto', type: 'dwarf_planet' }
] as const

// Solar System component that renders all planets
interface SolarSystemProps extends Omit<PlanetComponentProps, 'planetId'> {
  planetFilter?: string[]
  centerOnSun?: boolean
}

export const SolarSystemComponent: React.FC<SolarSystemProps> = ({
  planetFilter,
  centerOnSun = true,
  ...commonProps
}) => {
  const planetsToRender = useMemo(() => {
    if (!planetFilter) return ALL_PLANETS
    return ALL_PLANETS.filter(planet => planetFilter.includes(planet.id))
  }, [planetFilter])
  
  return (
    <group>
      {planetsToRender.map(({ id, component: PlanetComp }) => (
        <PlanetComp
          key={id}
          planetId={id}
          {...commonProps}
        />
      ))}
    </group>
  )
}

// Export individual components
export {
  BasePlanetComponent,
  EarthComponent,
  SaturnComponent
}

// Export types
export type { PlanetComponentProps } from './BasePlanetComponent'