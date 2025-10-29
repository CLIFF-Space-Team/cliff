'use client'

import React from 'react'
import { NASARealisticSolarSystem } from './NASARealisticSolarSystem'

// Professional 3D Solar System Component - Now powered by NASA Realistic Textures
function ProfessionalSolarSystem() {
  return (
    <NASARealisticSolarSystem
      quality="high"
      showOrbits={true}
      showStars={true}
      enableRotation={true}
    />
  )
}

export default ProfessionalSolarSystem