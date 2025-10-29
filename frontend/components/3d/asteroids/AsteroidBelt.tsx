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
      instancedMeshRef.current.rotation.y += delta * 0.01;
    }
  });

  return (
    <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, ASTEROID_COUNT]}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshStandardMaterial color="#8B4513" roughness={0.7} metalness={0.3} />
      {asteroidTransforms.map((matrix, i) => (
        <primitive key={i} object={new THREE.Matrix4().copy(matrix)} />
      ))}
    </instancedMesh>
  );
};

export default AsteroidBelt;