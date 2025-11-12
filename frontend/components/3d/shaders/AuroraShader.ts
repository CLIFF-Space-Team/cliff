import * as THREE from 'three'
export const AuroraShader = {
  uniforms: {
    time: { value: 0.0 },
    intensity: { value: 1.0 },
    primaryColor: { value: new THREE.Color(0x00ff88) }, // Green
    secondaryColor: { value: new THREE.Color(0x0088ff) }, // Blue
    tertiaryColor: { value: new THREE.Color(0x8800ff) }, // Purple
    waveSpeed: { value: 0.5 },
    waveAmplitude: { value: 0.3 },
    polarLatitude: { value: 65.0 }, // Degrees from equator
    polarWidth: { value: 25.0 }, // Width of aurora zone
    planetRadius: { value: 1.0 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying float vLatitude;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      vec3 normalizedPos = normalize(position);
      vLatitude = degrees(asin(normalizedPos.y));
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float intensity;
    uniform vec3 primaryColor;
    uniform vec3 secondaryColor;
    uniform vec3 tertiaryColor;
    uniform float waveSpeed;
    uniform float waveAmplitude;
    uniform float polarLatitude;
    uniform float polarWidth;
    uniform float planetRadius;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying float vLatitude;
    float noise(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    float smoothNoise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = noise(i);
      float b = noise(i + vec2(1.0, 0.0));
      float c = noise(i + vec2(0.0, 1.0));
      float d = noise(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    float fbm(vec2 st) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      for (int i = 0; i < 4; i++) {
        value += amplitude * smoothNoise(st * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }
    void main() {
      float distanceFromPole = abs(abs(vLatitude) - polarLatitude);
      float polarMask = smoothstep(polarWidth, 0.0, distanceFromPole);
      if (polarMask < 0.01) {
        discard;
      }
      vec2 waveCoord = vUv * 3.0 + vec2(time * waveSpeed * 0.3, 0.0);
      float wave1 = fbm(waveCoord);
      float wave2 = fbm(waveCoord * 2.0 + vec2(0.0, time * waveSpeed * 0.5));
      float waves = wave1 * 0.6 + wave2 * 0.4;
      waves = pow(waves, 1.5); // Enhance contrast
      float curtain = sin(vUv.x * 10.0 + time * waveSpeed) * waveAmplitude;
      waves += curtain * 0.3;
      vec3 color = mix(primaryColor, secondaryColor, wave1);
      color = mix(color, tertiaryColor, wave2 * 0.5);
      float shimmer = sin(time * 2.0 + vUv.x * 20.0) * 0.5 + 0.5;
      color += vec3(shimmer * 0.2);
      float finalIntensity = waves * polarMask * intensity;
      float pulse = 0.8 + 0.2 * sin(time * 1.5);
      finalIntensity *= pulse;
      vec3 finalColor = color * finalIntensity;
      float alpha = finalIntensity * 0.6;
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
}
export function createAuroraMaterial(options: {
  intensity?: number
  primaryColor?: THREE.Color
  secondaryColor?: THREE.Color
  tertiaryColor?: THREE.Color
  polarLatitude?: number
  polarWidth?: number
}): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(AuroraShader.uniforms),
    vertexShader: AuroraShader.vertexShader,
    fragmentShader: AuroraShader.fragmentShader,
    transparent: true,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  if (options.intensity !== undefined) {
    material.uniforms.intensity.value = options.intensity
  }
  if (options.primaryColor) {
    material.uniforms.primaryColor.value = options.primaryColor
  }
  if (options.secondaryColor) {
    material.uniforms.secondaryColor.value = options.secondaryColor
  }
  if (options.tertiaryColor) {
    material.uniforms.tertiaryColor.value = options.tertiaryColor
  }
  if (options.polarLatitude !== undefined) {
    material.uniforms.polarLatitude.value = options.polarLatitude
  }
  if (options.polarWidth !== undefined) {
    material.uniforms.polarWidth.value = options.polarWidth
  }
  return material
}
export function updateAurora(material: THREE.ShaderMaterial, delta: number) {
  if (material.uniforms.time) {
    material.uniforms.time.value += delta
  }
}