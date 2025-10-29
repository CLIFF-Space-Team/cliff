'use client'

import React from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useLoader } from '@react-three/fiber'

function TestEarth() {
  const earthTexture = useLoader(THREE.TextureLoader, '/textures/earth-night.jpg')
  
  return (
    <mesh>
      <sphereGeometry args={[2, 64, 64]} />
      <meshStandardMaterial map={earthTexture} />
    </mesh>
  )
}

export default function TestTexturePage() {
  return (
    <div className="h-screen w-full bg-black">
      <h1 className="text-white text-2xl p-4 absolute z-10">Earth Night Texture Test</h1>
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <TestEarth />
        <OrbitControls />
      </Canvas>
    </div>
  )
}