'use client'
import React, { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Environment } from '@react-three/drei'
import { useQuery } from '@tanstack/react-query'
import Earth from '@/components/3d/planets/EarthComponent'
import { Sun } from '@/components/3d/stars/Sun'
import { Asteroid } from '@/components/3d/asteroids/Asteroid'
import { SimpleCelestialBody } from '@/types/astronomical-data'
interface HeaderEarthSunModelProps {
  showAsteroids?: boolean
}
const fetchAsteroids = async (): Promise<SimpleCelestialBody[]> => {
  console.log('🚫 Header asteroids API çağrısı engellendi - mock veri modu')
  return Promise.resolve([]) // Boş array döndür
}
const HeaderEarthSunModel: React.FC<HeaderEarthSunModelProps> = ({ showAsteroids = true }) => {
  const { data: asteroidData } = useQuery({
    queryKey: ['header-asteroids'],
    queryFn: fetchAsteroids,
    refetchInterval: false, // Auto-refetch kapalı
    enabled: false, // Query tamamen kapalı
  })
  return (
    <div 
      className="h-[400px] md:h-[300px] lg:h-[400px]"
      style={{ zIndex: 'var(--z-dashboard-header)' }}
    >
      <Canvas>
        <Suspense fallback={null}>
          <ambientLight intensity={0.1} />
          <Sun />
          <Earth planetId="earth" />
          {showAsteroids && asteroidData?.map((asteroid) => (
            <Asteroid key={asteroid.id} data={asteroid} />
          ))}
           <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
          <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            minPolarAngle={Math.PI / 4} 
            maxPolarAngle={3 * Math.PI / 4} 
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
export default HeaderEarthSunModel