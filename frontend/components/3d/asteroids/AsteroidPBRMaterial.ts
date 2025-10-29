'use client'

import * as THREE from 'three'

export interface AsteroidMaterialOptions {
  hazardous?: boolean
  quality?: 'low' | 'medium' | 'high' | 'ultra'
}

/**
 * createAsteroidPBRMaterial
 * - Taş benzeri PBR görünümlü malzeme
 * - Dokular yoksa procedural canvas ile üretir
 */
export function createAsteroidPBRMaterial(opts: AsteroidMaterialOptions = {}) {
  const { hazardous = false, quality = 'high' } = opts
  const size = quality === 'ultra' ? 1024 : quality === 'high' ? 512 : 256

  // Diffuse procedural texture
  const diffuse = document.createElement('canvas')
  diffuse.width = size
  diffuse.height = size
  const ctx = diffuse.getContext('2d')!
  const img = ctx.createImageData(size, size)
  const d = img.data
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const n1 = Math.sin(x * 0.05) * Math.cos(y * 0.035)
      const n2 = Math.sin(x * 0.12) * Math.cos(y * 0.09)
      const n3 = Math.sin(x * 0.28) * Math.cos(y * 0.22)
      const v = 120 + (n1 * 30 + n2 * 20 + n3 * 10)
      if (hazardous) {
        d[i] = v * 0.9; d[i + 1] = v * 0.6; d[i + 2] = v * 0.45
      } else {
        d[i] = v * 0.75; d[i + 1] = v * 0.76; d[i + 2] = v * 0.82
      }
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const map = new THREE.CanvasTexture(diffuse)
  map.wrapS = THREE.RepeatWrapping
  map.wrapT = THREE.RepeatWrapping

  // Normal procedural texture (very subtle)
  const normalCanvas = document.createElement('canvas')
  normalCanvas.width = size
  normalCanvas.height = size
  const nctx = normalCanvas.getContext('2d')!
  const nimg = nctx.createImageData(size, size)
  const nd = nimg.data
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const b = 128 + Math.sin(x * 0.35) * Math.cos(y * 0.27) * 16
      nd[i] = b
      nd[i + 1] = 128
      nd[i + 2] = b
      nd[i + 3] = 255
    }
  }
  nctx.putImageData(nimg, 0, 0)
  const normalMap = new THREE.CanvasTexture(normalCanvas)

  const material = new THREE.MeshStandardMaterial({
    color: hazardous ? new THREE.Color('#7b4a35') : new THREE.Color('#8c8c92'),
    metalness: 0.08,
    roughness: 0.96,
    map,
    normalMap,
    normalScale: new THREE.Vector2(0.6, 0.6)
  })
  return material
}

export default {}


