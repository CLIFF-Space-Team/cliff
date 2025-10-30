import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const ASTEROID_COUNT = 2000;
const ASTRONOMICAL_UNIT = 149.6e6 * 0.0000001; // Scaled down

const AsteroidBelt: React.FC = () => {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);

  const asteroidTransforms = useMemo(() => {
    const temp = new THREE.Object3D();
    const transforms = [];

    const innerRadius = 2.2 * ASTRONOMICAL_UNIT;
    const outerRadius = 3.2 * ASTRONOMICAL_UNIT;

    for (let i = 0; i < ASTEROID_COUNT; i++) {
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
      const angle = Math.random() * Math.PI * 2;
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const y = (Math.random() - 0.5) * (radius * 0.1);

      temp.position.set(x, y, z);
      
      const scale = 0.005 + Math.random() * 0.01;
      temp.scale.set(scale, scale, scale);
      
      temp.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      
      temp.updateMatrix();
      transforms.push(temp.matrix.clone());
    }
    return transforms;
  }, []);

  useFrame((state, delta) => {
    if (instancedMeshRef.current) {
      // Gerçekçi çok yavaş asteroid kuşağı dönüşü
      instancedMeshRef.current.rotation.y += delta * 0.0005;
    }
  });

  // Enhanced asteroid geometry for belt
  const asteroidGeometry = useMemo(() => {
    const geometry = new THREE.IcosahedronGeometry(0.1, 2)
    
    // Add surface noise for realistic asteroid appearance
    const positionAttribute = geometry.getAttribute('position')
    const vertex = new THREE.Vector3()
    
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i)
      
      const noise = Math.sin(vertex.x * 8) * Math.cos(vertex.y * 6) * Math.sin(vertex.z * 10) * 0.1
      vertex.normalize()
      vertex.multiplyScalar(0.1 * (1.0 + noise))
      
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z)
    }
    
    geometry.computeVertexNormals()
    return geometry
  }, [])

  // Enhanced asteroid material
  const asteroidMaterial = useMemo(() => {
    const canvas = document.createElement('canvas')
    const size = 256
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    
    // Generate realistic asteroid surface pattern
    const imageData = ctx.createImageData(size, size)
    const pixelData = imageData.data
    
    for (let i = 0; i < pixelData.length; i += 4) {
      const x = (i / 4) % size
      const y = Math.floor((i / 4) / size)
      
      const noise1 = Math.sin(x * 0.05) * Math.cos(y * 0.04)
      const noise2 = Math.sin(x * 0.1) * Math.cos(y * 0.08) * 0.6
      const noise3 = Math.sin(x * 0.2) * Math.cos(y * 0.15) * 0.4
      
      const combinedNoise = noise1 + noise2 + noise3
      const intensity = Math.max(40, Math.min(200, 110 + combinedNoise * 45))
      
      pixelData[i] = intensity * 0.7       // Red
      pixelData[i + 1] = intensity * 0.6   // Green  
      pixelData[i + 2] = intensity * 0.5   // Blue
      pixelData[i + 3] = 255               // Alpha
    }
    
    ctx.putImageData(imageData, 0, 0)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1, 1)
    
    return new THREE.MeshStandardMaterial({
      color: '#8B4513',
      map: texture,
      roughness: 0.9,
      metalness: 0.1,
      bumpScale: 0.3
    })
  }, [])

  return (
    <instancedMesh ref={instancedMeshRef} args={[asteroidGeometry, asteroidMaterial, ASTEROID_COUNT]}>
      {asteroidTransforms.map((matrix, i) => (
        <primitive key={i} object={new THREE.Matrix4().copy(matrix)} />
      ))}
    </instancedMesh>
  );
};

export default AsteroidBelt;