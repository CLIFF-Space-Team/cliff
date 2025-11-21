import * as THREE from 'three';
export interface ImpactMetrics {
  energy: number;
  craterDiameter: number;
  craterDepth: number;
  magnitude: number;
  thermalRadiation: number;
  maxWindSpeed: number;
  seismicMagnitude: number;
}
export interface RenderImpactOptions {
  lat: number;
  lng: number;
  impactMetrics: ImpactMetrics;
  asteroidDiameter?: number;
}
export class MemeComposer {
  private static textureCache: Map<string, THREE.Texture> = new Map();
  private static loadTexture(url: string): Promise<THREE.Texture> {
    if (this.textureCache.has(url)) {
      return Promise.resolve(this.textureCache.get(url)!);
    }
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.load(
        url,
        (texture) => {
          this.textureCache.set(url, texture);
          resolve(texture);
        },
        undefined,
        (error) => {
          console.error('Texture yükleme hatası:', url, error);
          reject(error);
        }
      );
    });
  }
  private static latLngToVector3(lat: number, lng: number, radius: number = 1): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  }
  static async renderImpact(options: RenderImpactOptions): Promise<string> {
    const { lat, lng, impactMetrics, asteroidDiameter = 100 } = options;
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(1920, 1080);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    try {
      const earthRadius = 1;
      const impactPosition = this.latLngToVector3(lat, lng, earthRadius);
      const earthTexture = await this.loadTexture('/textures/earth-day.jpg');
      const earthNormalMap = await this.loadTexture('/textures/earth-normal.jpg');
      const earthSpecularMap = await this.loadTexture('/textures/earth-specular.jpg');
      const earthGeometry = new THREE.SphereGeometry(earthRadius, 128, 128);
      const earthMaterial = new THREE.MeshPhongMaterial({
        map: earthTexture,
        normalMap: earthNormalMap,
        specularMap: earthSpecularMap,
        shininess: 10,
        normalScale: new THREE.Vector2(0.5, 0.5),
      });
      const earth = new THREE.Mesh(earthGeometry, earthMaterial);
      earth.castShadow = true;
      earth.receiveShadow = true;
      scene.add(earth);
      const starCount = 10000;
      const starsGeometry = new THREE.BufferGeometry();
      const starPositions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const radius = 50 + Math.random() * 50;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        starPositions[i * 3 + 2] = radius * Math.cos(phi);
      }
      starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      const starsMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.05,
        transparent: true,
        opacity: 0.9,
      });
      const stars = new THREE.Points(starsGeometry, starsMaterial);
      scene.add(stars);
      const atmosphereGeometry = new THREE.SphereGeometry(earthRadius * 1.05, 64, 64);
      const atmosphereMaterial = new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
          }
        `,
      });
      const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
      scene.add(atmosphere);
      const asteroidSize = (asteroidDiameter / 1000) * 0.01;
      const asteroidGeometry = new THREE.IcosahedronGeometry(asteroidSize, 2);
      const asteroidMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B7355,
        roughness: 0.9,
        metalness: 0.1,
        flatShading: true,
      });
      const asteroidPositionOffset = impactPosition.clone().multiplyScalar(1.08);
      const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
      asteroid.position.copy(asteroidPositionOffset);
      asteroid.castShadow = true;
      scene.add(asteroid);
      const impactGlowGeometry = new THREE.RingGeometry(
        asteroidSize * 2,
        asteroidSize * 6,
        32
      );
      const impactGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF4500,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      });
      const impactGlow = new THREE.Mesh(impactGlowGeometry, impactGlowMaterial);
      impactGlow.position.copy(impactPosition.clone().multiplyScalar(1.01));
      impactGlow.lookAt(new THREE.Vector3(0, 0, 0));
      scene.add(impactGlow);
      const impactLight = new THREE.PointLight(0xFFA500, 3, 5);
      impactLight.position.copy(impactPosition.clone().multiplyScalar(1.05));
      impactLight.castShadow = true;
      scene.add(impactLight);
      const particleCount = 500;
      const particlesGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        const offset = impactPosition.clone();
        offset.x += (Math.random() - 0.5) * asteroidSize * 8;
        offset.y += (Math.random() - 0.5) * asteroidSize * 8;
        offset.z += (Math.random() - 0.5) * asteroidSize * 8;
        positions[i * 3] = offset.x;
        positions[i * 3 + 1] = offset.y;
        positions[i * 3 + 2] = offset.z;
      }
      particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const particlesMaterial = new THREE.PointsMaterial({
        color: 0xFF6600,
        size: 0.015,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      });
      const particles = new THREE.Points(particlesGeometry, particlesMaterial);
      scene.add(particles);
      const shockwaveGeometry = new THREE.RingGeometry(
        asteroidSize * 4,
        asteroidSize * 8,
        64
      );
      const shockwaveMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      const shockwave = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial);
      shockwave.position.copy(impactPosition.clone().multiplyScalar(1.005));
      shockwave.lookAt(new THREE.Vector3(0, 0, 0));
      scene.add(shockwave);
      const sunLight = new THREE.DirectionalLight(0xFFFFFF, 1.5);
      sunLight.position.set(5, 3, 5);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      scene.add(sunLight);
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
      scene.add(ambientLight);
      const fillLight = new THREE.DirectionalLight(0x4080FF, 0.3);
      fillLight.position.set(-5, -3, -5);
      scene.add(fillLight);
      const cameraDistance = 2.5;
      const cameraOffset = impactPosition.clone().normalize().multiplyScalar(cameraDistance);
      camera.position.copy(cameraOffset);
      const tangent = new THREE.Vector3(0, 1, 0).cross(impactPosition).normalize();
      camera.position.add(tangent.multiplyScalar(0.5));
      camera.position.y += 0.3;
      camera.lookAt(impactPosition);
      renderer.render(scene, camera);
      const dataURL = canvas.toDataURL('image/png');
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      renderer.dispose();
      return dataURL;
    } catch (error) {
      console.error('3D render hatası:', error);
      renderer.dispose();
      throw error;
    }
  }
  static async renderCraterCrossSection(craterDiameter: number, craterDepth: number): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a15);
    scene.fog = new THREE.Fog(0x0a0a15, 5, 15);
    const camera = new THREE.PerspectiveCamera(50, 1.5, 0.1, 1000);
    camera.position.set(4, 2.5, 5);
    camera.lookAt(0, -0.3, 0);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(1200, 800);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const width = 5;
    const actualDepthRatio = craterDepth / craterDiameter;
    const depthScale = actualDepthRatio * width;
    console.log(`🌋 Krater render: Çap=${craterDiameter.toFixed(2)}km, Derinlik=${craterDepth.toFixed(3)}km, Oran=${actualDepthRatio.toFixed(3)}`);
    const groundGeometry = new THREE.PlaneGeometry(width * 3, width * 2);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3d2f,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);
    const craterGeometry = new THREE.SphereGeometry(width / 2, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const craterMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d2015,
      roughness: 0.95,
      metalness: 0.05,
      flatShading: false,
    });
    const craterMesh = new THREE.Mesh(craterGeometry, craterMaterial);
    craterMesh.rotation.x = Math.PI;
    craterMesh.position.y = -depthScale * 0.8;
    craterMesh.scale.y = depthScale / (width / 2);
    craterMesh.castShadow = true;
    craterMesh.receiveShadow = true;
    scene.add(craterMesh);
    const ringGeometry = new THREE.RingGeometry(width / 2, width / 2 + 0.2, 64);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0x5c4a35,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    ring.receiveShadow = true;
    scene.add(ring);
    for (let i = 0; i < 30; i++) {
      const size = 0.05 + Math.random() * 0.15;
      const debrisGeometry = new THREE.DodecahedronGeometry(size, 0);
      const debrisMaterial = new THREE.MeshStandardMaterial({
        color: 0x3d2f1f,
        roughness: 0.9,
      });
      const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
      const angle = Math.random() * Math.PI * 2;
      const distance = (width / 2) + Math.random() * width;
      debris.position.x = Math.cos(angle) * distance;
      debris.position.z = Math.sin(angle) * distance;
      debris.position.y = 0.05;
      debris.rotation.set(Math.random(), Math.random(), Math.random());
      debris.castShadow = true;
      scene.add(debris);
    }
    const keyLight = new THREE.DirectionalLight(0xfff5e6, 2);
    keyLight.position.set(5, 8, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x4080ff, 0.3);
    fillLight.position.set(-3, 2, -3);
    scene.add(fillLight);
    const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.4);
    scene.add(ambientLight);
    const rimLight = new THREE.DirectionalLight(0xff8844, 0.6);
    rimLight.position.set(-5, 3, -5);
    scene.add(rimLight);
    renderer.render(scene, camera);
    const dataURL = canvas.toDataURL('image/png');
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    renderer.dispose();
    return dataURL;
  }
  static async renderAtmosphericEntry(velocity: number, angle: number): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const scene = new THREE.Scene();
    const bgGradient = new THREE.Color(0x000428).lerp(new THREE.Color(0x001845), 0.5);
    scene.background = bgGradient;
    scene.fog = new THREE.Fog(0x000428, 3, 12);
    const camera = new THREE.PerspectiveCamera(60, 1.5, 0.1, 1000);
    camera.position.set(2, 1, 4);
    camera.lookAt(0, 0, 0);
    console.log(`🌍 Atmosfer render: Hız=${velocity}km/s, Açı=${angle}°`);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(1200, 800);
    const speedFactor = Math.min(velocity / 40, 1.5);
    const asteroidSize = 0.25 + speedFactor * 0.15;
    const asteroidGeometry = new THREE.IcosahedronGeometry(asteroidSize, 2);
    const heatIntensity = speedFactor * 0.4;
    const asteroidMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B7355,
      roughness: 0.95 - heatIntensity * 0.2,
      metalness: 0.1,
      emissive: new THREE.Color().setHSL(0.08, 1.0, heatIntensity),
      emissiveIntensity: heatIntensity,
    });
    const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
    const angleRad = (angle * Math.PI) / 180;
    asteroid.position.set(
      Math.sin(angleRad) * 0.5,
      0.2 - Math.cos(angleRad) * 0.3,
      0
    );
    asteroid.rotation.set(angleRad, 0.8, 0.3);
    scene.add(asteroid);
    const shieldGeometry = new THREE.SphereGeometry(0.45, 32, 32);
    const shieldMaterial = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.FrontSide,
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          vec3 hotColor = vec3(1.0, 0.4, 0.1);
          gl_FragColor = vec4(hotColor, intensity * 0.8);
        }
      `,
    });
    const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    shield.position.copy(asteroid.position);
    scene.add(shield);
    const trailLength = 2 + speedFactor * 2;
    const trailCount = Math.floor(300 + speedFactor * 200);
    const trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(trailCount * 3);
    const trailColors = new Float32Array(trailCount * 3);
    for (let i = 0; i < trailCount; i++) {
      const t = i / trailCount;
      const spread = (Math.random() - 0.5) * (0.2 + speedFactor * 0.2);
      const trailAngleRad = (angle * Math.PI) / 180;
      const xOffset = Math.sin(trailAngleRad) * t * trailLength;
      const yOffset = -Math.cos(trailAngleRad) * t * trailLength;
      trailPositions[i * 3] = xOffset + spread + (Math.random() - 0.5) * 0.2;
      trailPositions[i * 3 + 1] = yOffset - t * 2 + (Math.random() - 0.5) * 0.3;
      trailPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
      const heat = (1 - t) * speedFactor;
      trailColors[i * 3] = 1.0;
      trailColors[i * 3 + 1] = 0.3 + heat * 0.5;
      trailColors[i * 3 + 2] = heat * 0.3;
    }
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
    const trailMaterial = new THREE.PointsMaterial({
      size: 0.08,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    const trail = new THREE.Points(trailGeometry, trailMaterial);
    scene.add(trail);
    for (let i = 0; i < 3; i++) {
      const layerGeometry = new THREE.SphereGeometry(3 + i * 0.5, 32, 32);
      const layerMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.55 + i * 0.05, 0.8, 0.5),
        transparent: true,
        opacity: 0.03,
        side: THREE.BackSide,
      });
      const layer = new THREE.Mesh(layerGeometry, layerMaterial);
      scene.add(layer);
    }
    const asteroidLight = new THREE.PointLight(0xff6600, 3, 8);
    asteroidLight.position.copy(asteroid.position);
    scene.add(asteroidLight);
    const ambientLight = new THREE.AmbientLight(0x0a0a1a, 0.3);
    scene.add(ambientLight);
    const backLight = new THREE.DirectionalLight(0x1a3a6a, 0.5);
    backLight.position.set(-3, 2, -3);
    scene.add(backLight);
    renderer.render(scene, camera);
    const dataURL = canvas.toDataURL('image/png');
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    renderer.dispose();
    return dataURL;
  }
  static async renderThermalFireball(radius: number, temperature: number): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const camera = new THREE.PerspectiveCamera(55, 1.5, 0.1, 1000);
    camera.position.set(0, 0.5, 4);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(1200, 800);
    const normalizedRadius = Math.min(radius / 3000, 1.5);
    const tempFactor = Math.min(temperature / 10000, 1.5);
    const fireballScale = 0.8 + normalizedRadius * 0.6;
    console.log(`🔥 Ateş topu render: Yarıçap=${radius.toFixed(0)}m, Sıcaklık=${temperature.toFixed(0)}K, Scale=${fireballScale.toFixed(2)}`);
    const fireballGeometry = new THREE.SphereGeometry(fireballScale, 64, 64);
    const fireballMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 1.0 }
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        void main() {
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vPosition;
        varying vec3 vNormal;
        float noise(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
        }
        void main() {
          vec3 pos = vPosition * 2.0;
          float n = noise(pos + time);
          float dist = length(vPosition);
          float intensity = 1.0 - smoothstep(0.0, 1.2, dist);
          vec3 coreColor = vec3(1.0, 0.95, 0.8);    
          vec3 hotColor = vec3(1.0, 0.7, 0.2);      
          vec3 warmColor = vec3(1.0, 0.4, 0.1);     
          vec3 coolColor = vec3(0.8, 0.2, 0.05);    
          vec3 color;
          if (intensity > 0.8) {
            color = mix(hotColor, coreColor, (intensity - 0.8) * 5.0);
          } else if (intensity > 0.5) {
            color = mix(warmColor, hotColor, (intensity - 0.5) * 3.33);
          } else {
            color = mix(coolColor, warmColor, intensity * 2.0);
          }
          color += (n - 0.5) * 0.1 * intensity;
          float alpha = intensity * 0.95;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.FrontSide,
    });
    const fireball = new THREE.Mesh(fireballGeometry, fireballMaterial);
    scene.add(fireball);
    const innerGlowSize = fireballScale * 0.65;
    const innerGlowGeometry = new THREE.SphereGeometry(innerGlowSize, 32, 32);
    const coreHue = Math.max(0.08 - (tempFactor - 1) * 0.05, 0.02);
    const innerGlowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(coreHue, 1.0, 0.9),
      transparent: true,
      opacity: 0.3 + tempFactor * 0.2,
    });
    const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    scene.add(innerGlow);
    for (let i = 0; i < 3; i++) {
      const glowSize = fireballScale * (1.15 + i * 0.25);
      const glowGeometry = new THREE.SphereGeometry(glowSize, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.08 - i * 0.02, 1.0, 0.5),
        transparent: true,
        opacity: (0.15 - i * 0.04) * tempFactor,
        side: THREE.BackSide,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      scene.add(glow);
    }
    const heatParticleCount = Math.floor(200 + tempFactor * 200);
    const heatGeometry = new THREE.BufferGeometry();
    const heatPositions = new Float32Array(heatParticleCount * 3);
    const heatColors = new Float32Array(heatParticleCount * 3);
    for (let i = 0; i < heatParticleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = fireballScale * (0.5 + Math.random() * 1.0);
      heatPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      heatPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      heatPositions[i * 3 + 2] = r * Math.cos(phi);
      const heat = 1 - (r / fireballScale - 0.5) / 1.0;
      const colorShift = tempFactor * 0.1;
      heatColors[i * 3] = 1.0;
      heatColors[i * 3 + 1] = 0.4 + heat * 0.5 - colorShift;
      heatColors[i * 3 + 2] = heat * 0.3;
    }
    heatGeometry.setAttribute('position', new THREE.BufferAttribute(heatPositions, 3));
    heatGeometry.setAttribute('color', new THREE.BufferAttribute(heatColors, 3));
    const heatMaterial = new THREE.PointsMaterial({
      size: 0.05,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    const heatParticles = new THREE.Points(heatGeometry, heatMaterial);
    scene.add(heatParticles);
    const coreLight = new THREE.PointLight(0xffeedd, 4, 10);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);
    const ambientLight = new THREE.AmbientLight(0x0a0505, 0.2);
    scene.add(ambientLight);
    renderer.render(scene, camera);
    const dataURL = canvas.toDataURL('image/png');
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    renderer.dispose();
    return dataURL;
  }
  static async renderShockwave(radius: number): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x050510, 0.08);
    const camera = new THREE.PerspectiveCamera(65, 1.5, 0.1, 1000);
    camera.position.set(0, 4, 6);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(1200, 800);
    console.log(`💨 Şok dalgası render: 20psi yarıçap=${radius.toFixed(2)}km`);
    const groundGeometry = new THREE.PlaneGeometry(20, 20, 50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2a,
      roughness: 0.95,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const waveCount = 7;
    const maxRadius = Math.min(radius / 2, 5);
    for (let i = 0; i < waveCount; i++) {
      const waveRadius = 0.5 + (i / (waveCount - 1)) * maxRadius;
      const waveIntensity = 1 - (i / waveCount);
      const torusGeometry = new THREE.TorusGeometry(waveRadius, 0.08, 16, 64);
      const torusMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.55 + i * 0.05, 0.8, 0.4 + waveIntensity * 0.3),
        emissive: new THREE.Color().setHSL(0.55 + i * 0.05, 1.0, 0.3),
        emissiveIntensity: waveIntensity * 0.6,
        transparent: true,
        opacity: 0.7 - i * 0.08,
        roughness: 0.3,
        metalness: 0.2,
      });
      const torus = new THREE.Mesh(torusGeometry, torusMaterial);
      torus.rotation.x = Math.PI / 2;
      torus.position.y = 0.05 + i * 0.05;
      scene.add(torus);
      const distortionGeometry = new THREE.RingGeometry(waveRadius - 0.1, waveRadius + 0.1, 64);
      const distortionMaterial = new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          void main() {
            float dist = length(vUv - 0.5) * 2.0;
            float wave = sin(dist * 10.0) * 0.5 + 0.5;
            float alpha = (1.0 - dist) * wave * ${waveIntensity.toFixed(2)};
            gl_FragColor = vec4(0.7, 0.9, 1.0, alpha * 0.2);
          }
        `,
      });
      const distortionRing = new THREE.Mesh(distortionGeometry, distortionMaterial);
      distortionRing.rotation.x = -Math.PI / 2;
      distortionRing.position.y = 0.15 + i * 0.05;
      scene.add(distortionRing);
    }
    const epicenterGeometry = new THREE.SphereGeometry(0.15, 32, 32);
    const epicenterMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });
    const epicenter = new THREE.Mesh(epicenterGeometry, epicenterMaterial);
    epicenter.position.y = 0.15;
    scene.add(epicenter);
    const coreLight = new THREE.PointLight(0xaaddff, 6, 15);
    coreLight.position.set(0, 0.15, 0);
    scene.add(coreLight);
    const keyLight = new THREE.DirectionalLight(0x6699cc, 1.5);
    keyLight.position.set(3, 5, 3);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x334466, 0.5);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);
    const ambientLight = new THREE.AmbientLight(0x0a0a1a, 0.3);
    scene.add(ambientLight);
    renderer.render(scene, camera);
    const dataURL = canvas.toDataURL('image/png');
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    renderer.dispose();
    return dataURL;
  }
  static clearCache(): void {
    this.textureCache.forEach((texture) => texture.dispose());
    this.textureCache.clear();
  }
}
