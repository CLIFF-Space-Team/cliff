import * as THREE from 'three'
export const AtmosphericScatteringShader = {
  uniforms: {
    time: { value: 0.0 },
    sunPosition: { value: new THREE.Vector3(-20, 0, 0) },
    planetRadius: { value: 1.0 },
    atmosphereRadius: { value: 1.05 },
    rayleighCoefficient: { value: new THREE.Vector3(5.5e-6, 13.0e-6, 22.4e-6) },
    mieCoefficient: { value: 21e-6 },
    mieDirectionalG: { value: 0.8 },
    intensity: { value: 1.0 },
    scatterStrength: { value: 0.028 },
    sunIntensity: { value: 20.0 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 sunPosition;
    uniform float planetRadius;
    uniform float atmosphereRadius;
    uniform vec3 rayleighCoefficient;
    uniform float mieCoefficient;
    uniform float mieDirectionalG;
    uniform float intensity;
    uniform float scatterStrength;
    uniform float sunIntensity;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    const float PI = 3.141592653589793;
    const int NUM_SAMPLES = 16;
    float rayleighPhase(float cosTheta) {
      return (3.0 / (16.0 * PI)) * (1.0 + cosTheta * cosTheta);
    }
    float miePhase(float cosTheta, float g) {
      float g2 = g * g;
      float num = (1.0 - g2);
      float denom = pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5);
      return (1.0 / (4.0 * PI)) * (num / denom);
    }
    vec3 calculateScattering(vec3 rayDir, vec3 sunDir) {
      float cosTheta = dot(rayDir, sunDir);
      vec3 rayleigh = rayleighCoefficient * rayleighPhase(cosTheta);
      float mie = mieCoefficient * miePhase(cosTheta, mieDirectionalG);
      float distance = length(vPosition);
      float atmosphereDepth = smoothstep(planetRadius, atmosphereRadius, distance);
      float sunAngle = dot(vNormal, normalize(sunDir));
      float dayNightTransition = smoothstep(-0.1, 0.3, sunAngle);
      vec3 scattering = rayleigh * scatterStrength + vec3(mie * 0.5);
      scattering *= intensity * dayNightTransition * atmosphereDepth;
      float horizonFactor = pow(abs(cosTheta), 0.5);
      vec3 sunsetColor = vec3(1.0, 0.6, 0.3) * (1.0 - horizonFactor) * 0.5;
      return scattering + sunsetColor * dayNightTransition;
    }
    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      vec3 sunDir = normalize(sunPosition);
      vec3 scatterColor = calculateScattering(viewDir, sunDir);
      float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.0);
      vec3 finalColor = scatterColor * sunIntensity;
      float alpha = fresnel * intensity * 0.6;
      alpha = clamp(alpha, 0.0, 0.8);
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
}
export function createAtmosphericScatteringMaterial(options: {
  sunPosition?: THREE.Vector3
  planetRadius?: number
  atmosphereRadius?: number
  intensity?: number
  scatterStrength?: number
}): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(AtmosphericScatteringShader.uniforms),
    vertexShader: AtmosphericScatteringShader.vertexShader,
    fragmentShader: AtmosphericScatteringShader.fragmentShader,
    transparent: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  if (options.sunPosition) {
    material.uniforms.sunPosition.value = options.sunPosition
  }
  if (options.planetRadius !== undefined) {
    material.uniforms.planetRadius.value = options.planetRadius
  }
  if (options.atmosphereRadius !== undefined) {
    material.uniforms.atmosphereRadius.value = options.atmosphereRadius
  }
  if (options.intensity !== undefined) {
    material.uniforms.intensity.value = options.intensity
  }
  if (options.scatterStrength !== undefined) {
    material.uniforms.scatterStrength.value = options.scatterStrength
  }
  return material
}
export function updateAtmosphericScattering(
  material: THREE.ShaderMaterial, 
  delta: number,
  sunPosition?: THREE.Vector3
) {
  if (material.uniforms.time) {
    material.uniforms.time.value += delta
  }
  if (sunPosition && material.uniforms.sunPosition) {
    material.uniforms.sunPosition.value.copy(sunPosition)
  }
}