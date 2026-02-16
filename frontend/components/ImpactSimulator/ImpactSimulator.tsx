'use client'
import React, { useState, useMemo, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { ImpactCalculator } from '@/services/ImpactCalculator'
import { AsteroidParams, ImpactLocation, ImpactResults } from './types'
import { ControlPanel } from './ControlPanel'
import { ProfessionalResultsPanel } from './ProfessionalResultsPanel'
import { ImpactVisualization3D } from './ImpactVisualization3D'
import { AnimationTimeline } from './AnimationTimeline'
import { SimulationControls } from './SimulationControls'
import { PerformanceMonitor, PerformanceIndicator } from './PerformanceMonitor'
import { QualitySettings, QualitySettings as QualitySettingsType } from './QualitySettings'
import { EnhancedAsteroidPreview } from './EnhancedAsteroidPreview'
import { motion, AnimatePresence } from 'framer-motion'
export function ImpactSimulator() {
  const [asteroid, setAsteroid] = useState<AsteroidParams>({
    diameter_m: 100,
    velocity_kms: 20,
    angle_deg: 45,
    density: 2600
  })
  const [location, setLocation] = useState<ImpactLocation>({
    lat: 41.0082,
    lng: 28.9784,
    isOcean: false,
    population: 15000000,
    cityName: 'İstanbul'
  })
  const [results, setResults] = useState<ImpactResults | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [animationProgress, setAnimationProgress] = useState(0)
  const [animationSpeed, setAnimationSpeed] = useState(1.0)
  const [resetAnimationFlag, setResetAnimationFlag] = useState(false)
  const [currentFps, setCurrentFps] = useState(60)
  const [qualitySettings, setQualitySettings] = useState<QualitySettingsType>({
    preset: 'auto',
    particles: 100,
    effects: true,
    postProcessing: true,
    autoAdjust: true
  })
  const calculator = useMemo(() => new ImpactCalculator(), [])
  const runSimulation = () => {
    const impact = calculator.calculate(asteroid, location)
    setResults(impact)
    setIsAnimating(true)
    setIsPaused(false)
    setAnimationProgress(0)
    setResetAnimationFlag(prev => !prev) 
  }
  const handleAnimationComplete = () => {
    setTimeout(() => {
      setIsPaused(true)
    }, 2000)
  }
  const handlePlayPause = () => {
    setIsPaused(!isPaused)
  }
  const handleRestart = () => {
    setAnimationProgress(0)
    setIsPaused(false)
    setIsAnimating(true)
    setResetAnimationFlag(prev => !prev) 
  }
  return (
    <div className="h-full w-full flex gap-4 p-4">
      {}
      <div className="w-80 flex-shrink-0">
        <ControlPanel
          asteroid={asteroid}
          onAsteroidChange={setAsteroid}
          location={location}
          onLocationChange={setLocation}
          onSimulate={runSimulation}
          isSimulating={isAnimating}
        />
      </div>
      {}
      <div className="flex-1 relative rounded-xl overflow-hidden bg-pure-black border border-cliff-white/10">
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <div className="bg-pure-black/80 backdrop-blur-md rounded-lg px-4 py-2 border border-cliff-white/10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-cliff-white font-semibold">
                Çarpma Simülatörü
              </span>
            </div>
          </div>
          <QualitySettings
            currentFps={currentFps}
            onSettingsChange={setQualitySettings}
          />
        </div>
        {location.cityName && (
          <div className="absolute top-4 right-4 z-10 bg-pure-black/80 backdrop-blur-md rounded-lg px-4 py-2 border border-cliff-white/10">
            <p className="text-sm text-cliff-white">
              📍 {location.cityName}
            </p>
          </div>
        )}
        <PerformanceIndicator fps={currentFps} />
        <Canvas
          camera={{ 
            position: [3, 2, 5],
            fov: 50,
            near: 0.1,
            far: 1000
          }}
          shadows
          gl={{ 
            antialias: true,
            powerPreference: 'high-performance',
            alpha: false,
            stencil: false,
            depth: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2
          }}
          dpr={[1, 2]}
        >
          <Suspense fallback={null}>
            <PerformanceMonitor onPerformanceChange={setCurrentFps} />
            <ImpactVisualization3D
              location={location}
              results={results}
              isAnimating={isAnimating && !isPaused}
              onAnimationComplete={handleAnimationComplete}
              onProgressChange={setAnimationProgress}
              animationSpeed={animationSpeed}
              enableEffects={qualitySettings.effects}
              enablePostProcessing={qualitySettings.postProcessing}
              particleMultiplier={qualitySettings.particles / 100}
              externalProgress={animationProgress}
              shouldResetAnimation={resetAnimationFlag}
              asteroidParams={{
                diameter_m: asteroid.diameter_m,
                velocity_kms: asteroid.velocity_kms
              }}
            />
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={2.5}
              maxDistance={15}
              enableDamping
              dampingFactor={0.05}
              zoomSpeed={0.8}
              target={[0, 0, 0]}
            />
          </Suspense>
        </Canvas>
        {isAnimating && (
          <>
            <AnimationTimeline
              progress={animationProgress}
              isPlaying={!isPaused}
              asteroidVelocity={asteroid.velocity_kms}
              asteroidDiameter={asteroid.diameter_m}
              impactEnergy={results?.energy.megatonsTNT}
            />
            <SimulationControls
              isPlaying={!isPaused}
              onPlayPause={handlePlayPause}
              onRestart={handleRestart}
              speed={animationSpeed}
              onSpeedChange={setAnimationSpeed}
              progress={animationProgress}
            />
          </>
        )}
      </div>
      {}
      <div className="w-96 flex-shrink-0 h-full">
        <AnimatePresence mode="wait">
          {results ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <ProfessionalResultsPanel 
                results={results} 
                location={location}
                asteroidParams={asteroid}
              />
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <EnhancedAsteroidPreview asteroid={asteroid} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
