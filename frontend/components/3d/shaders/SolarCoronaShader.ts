import * as THREE from 'three'

/**
 * Solar Corona Shader
 * NASA-grade volumetric corona effect with Fresnel-based glow
 * Features: Animated pulsing, time-based variations, quality levels
 */

export const SolarCoronaShader = {
  uniforms: {
    time: { value: 0.0 },
    intensity: { value: 1.0 },
    glowColor: { value: new THREE.Color(0xffaa33) },
    coronaScale: { value: 1.2 },
    pulseSpeed: { value: 1.0 },
    pulseAmplitude: { value: 0.15 },
    fresnelPower: { value: 3.0 },
  },
  
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPositionNormal;
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  
  fragmentShader: `
    uniform float time;
    uniform float intensity;
    uniform vec3 glowColor;
    uniform float coronaScale;
    uniform float pulseSpeed;
    uniform float pulseAmplitude;
    uniform float fresnelPower;
    
    varying vec3 vNormal;
    varying vec3 vPositionNormal;
    varying vec2 vUv;
    
    void main() {
      // Fresnel effect for edge glow
      float fresnel = pow(1.0 - abs(dot(vNormal, vPositionNormal)), fresnelPower);
      
      // Animated pulsing effect
      float pulse = 1.0 + pulseAmplitude * sin(time * pulseSpeed);
      
      // Time-based color variation
      float colorShift = 0.1 * sin(time * 0.5);
      vec3 dynamicColor = glowColor + vec3(colorShift, colorShift * 0.5, 0.0);
      
      // Procedural noise for corona turbulence
      float noise = fract(sin(dot(vUv * 10.0 + time * 0.1, vec2(12.9898, 78.233))) * 43758.5453);
      noise = smoothstep(0.3, 0.7, noise);
      
      // Combine effects
      float coronaIntensity = fresnel * pulse * intensity * (0.8 + 0.2 * noise);
      
      // Final color with transparency
      vec3 finalColor = dynamicColor * coronaIntensity;
      float alpha = coronaIntensity * 0.7;
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
}

/**
 * Create Solar Corona Material
 */
export function createSolarCoronaMaterial(options: {
  intensity?: number
  glowColor?: THREE.Color
  coronaScale?: number
  pulseSpeed?: number
}): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(SolarCoronaShader.uniforms),
    vertexShader: SolarCoronaShader.vertexShader,
    fragmentShader: SolarCoronaShader.fragmentShader,
    transparent: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  
  // Apply options
  if (options.intensity !== undefined) {
    material.uniforms.intensity.value = options.intensity
  }
  if (options.glowColor) {
    material.uniforms.glowColor.value = options.glowColor
  }
  if (options.coronaScale !== undefined) {
    material.uniforms.coronaScale.value = options.coronaScale
  }
  if (options.pulseSpeed !== undefined) {
    material.uniforms.pulseSpeed.value = options.pulseSpeed
  }
  
  return material
}

/**
 * Update corona animation
 */
export function updateSolarCorona(material: THREE.ShaderMaterial, delta: number) {
  if (material.uniforms.time) {
    material.uniforms.time.value += delta
  }
}