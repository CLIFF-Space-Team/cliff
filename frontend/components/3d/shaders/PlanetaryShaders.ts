import * as THREE from 'three'
export const CityLightsShader = {
  uniforms: {
    dayTexture: { value: null },
    nightTexture: { value: null },
    sunPosition: { value: new THREE.Vector3(-20, 0, 0) },
    brightness: { value: 1.0 },
    transitionWidth: { value: 0.1 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D dayTexture;
    uniform sampler2D nightTexture;
    uniform vec3 sunPosition;
    uniform float brightness;
    uniform float transitionWidth;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vec3 sunDir = normalize(sunPosition - vPosition);
      float sunDot = dot(vNormal, sunDir);
      float dayNightFactor = smoothstep(-transitionWidth, transitionWidth, sunDot);
      vec4 dayColor = texture2D(dayTexture, vUv);
      vec4 nightColor = texture2D(nightTexture, vUv);
      nightColor.rgb *= brightness * 2.0;
      vec4 finalColor = mix(nightColor, dayColor, dayNightFactor);
      gl_FragColor = finalColor;
    }
  `
}
export const GasGiantBandsShader = {
  uniforms: {
    baseTexture: { value: null },
    time: { value: 0.0 },
    bandSpeed: { value: 0.1 },
    turbulence: { value: 0.3 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D baseTexture;
    uniform float time;
    uniform float bandSpeed;
    uniform float turbulence;
    varying vec2 vUv;
    varying vec3 vPosition;
    float noise(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    void main() {
      vec2 animatedUv = vUv;
      float latitude = vUv.y;
      float bandOffset = sin(latitude * 10.0) * bandSpeed * time;
      animatedUv.x += bandOffset * 0.01;
      float noiseValue = noise(vUv * 20.0 + time * 0.1);
      animatedUv.x += noiseValue * turbulence * 0.01;
      vec4 color = texture2D(baseTexture, animatedUv);
      color.rgb = pow(color.rgb, vec3(1.2));
      gl_FragColor = color;
    }
  `
}
export const ThinAtmosphereShader = {
  uniforms: {
    atmosphereColor: { value: new THREE.Color(0xffaa88) },
    intensity: { value: 0.3 },
    falloff: { value: 4.0 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 atmosphereColor;
    uniform float intensity;
    uniform float falloff;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      float fresnel = pow(1.0 - abs(dot(vNormal, vPosition)), falloff);
      vec3 color = atmosphereColor * fresnel * intensity;
      float alpha = fresnel * intensity * 0.5;
      gl_FragColor = vec4(color, alpha);
    }
  `
}
export const RingSystemShader = {
  uniforms: {
    ringTexture: { value: null },
    sunPosition: { value: new THREE.Vector3(-20, 0, 0) },
    innerRadius: { value: 1.5 },
    outerRadius: { value: 2.5 },
    opacity: { value: 0.8 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D ringTexture;
    uniform vec3 sunPosition;
    uniform float innerRadius;
    uniform float outerRadius;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vec4 ringColor = texture2D(ringTexture, vUv);
      vec3 sunDir = normalize(sunPosition - vPosition);
      float sunDot = max(dot(vNormal, sunDir), 0.0);
      ringColor.rgb *= (0.3 + 0.7 * sunDot);
      ringColor.a *= opacity;
      if (ringColor.a < 0.01) discard;
      gl_FragColor = ringColor;
    }
  `
}
export const ShaderUtils = {
  createCityLightsMaterial(
    dayTexture: THREE.Texture,
    nightTexture: THREE.Texture,
    sunPosition: THREE.Vector3
  ): THREE.ShaderMaterial {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        ...THREE.UniformsUtils.clone(CityLightsShader.uniforms),
        dayTexture: { value: dayTexture },
        nightTexture: { value: nightTexture },
        sunPosition: { value: sunPosition },
      },
      vertexShader: CityLightsShader.vertexShader,
      fragmentShader: CityLightsShader.fragmentShader,
    })
    return material
  },
  createGasGiantMaterial(texture: THREE.Texture): THREE.ShaderMaterial {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        ...THREE.UniformsUtils.clone(GasGiantBandsShader.uniforms),
        baseTexture: { value: texture },
      },
      vertexShader: GasGiantBandsShader.vertexShader,
      fragmentShader: GasGiantBandsShader.fragmentShader,
    })
    return material
  },
  createThinAtmosphereMaterial(
    color: THREE.Color,
    intensity: number = 0.3
  ): THREE.ShaderMaterial {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        ...THREE.UniformsUtils.clone(ThinAtmosphereShader.uniforms),
        atmosphereColor: { value: color },
        intensity: { value: intensity },
      },
      vertexShader: ThinAtmosphereShader.vertexShader,
      fragmentShader: ThinAtmosphereShader.fragmentShader,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    return material
  },
  createRingMaterial(
    texture: THREE.Texture,
    sunPosition: THREE.Vector3
  ): THREE.ShaderMaterial {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        ...THREE.UniformsUtils.clone(RingSystemShader.uniforms),
        ringTexture: { value: texture },
        sunPosition: { value: sunPosition },
      },
      vertexShader: RingSystemShader.vertexShader,
      fragmentShader: RingSystemShader.fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
    })
    return material
  },
}
export default ShaderUtils