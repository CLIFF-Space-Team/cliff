'use client'
import React from 'react'
import { NASARealisticSolarSystem } from './NASARealisticSolarSystem'
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