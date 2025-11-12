export const NoiseShaders = {
  perlin3D: `
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
  `,
  fbm: `
    float fbm(vec3 p, int octaves) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      for(int i = 0; i < 8; i++) {
        if(i >= octaves) break;
        value += amplitude * snoise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }
  `,
  worley2D: `
    vec2 hash2(vec2 p) {
      p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
      return -1.0 + 2.0*fract(sin(p)*43758.5453123);
    }
    float worley(vec2 p) {
      vec2 i_st = floor(p);
      vec2 f_st = fract(p);
      float minDist = 1.0;
      for (int y= -1; y <= 1; y++) {
        for (int x= -1; x <= 1; x++) {
          vec2 neighbor = vec2(float(x),float(y));
          vec2 point = hash2(i_st + neighbor);
          point = 0.5 + 0.5*sin(6.2831*point);
          vec2 diff = neighbor + point - f_st;
          float dist = length(diff);
          minDist = min(minDist, dist);
        }
      }
      return minDist;
    }
  `
}
export const PBRShaders = {
  pbrLighting: `
    vec3 fresnelSchlick(float cosTheta, vec3 F0) {
      return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
    }
    float distributionGGX(vec3 N, vec3 H, float roughness) {
      float a = roughness * roughness;
      float a2 = a * a;
      float NdotH = max(dot(N, H), 0.0);
      float NdotH2 = NdotH * NdotH;
      float num = a2;
      float denom = (NdotH2 * (a2 - 1.0) + 1.0);
      denom = 3.14159265359 * denom * denom;
      return num / denom;
    }
    float geometrySchlickGGX(float NdotV, float roughness) {
      float r = (roughness + 1.0);
      float k = (r*r) / 8.0;
      float num = NdotV;
      float denom = NdotV * (1.0 - k) + k;
      return num / denom;
    }
    float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
      float NdotV = max(dot(N, V), 0.0);
      float NdotL = max(dot(N, L), 0.0);
      float ggx2 = geometrySchlickGGX(NdotV, roughness);
      float ggx1 = geometrySchlickGGX(NdotL, roughness);
      return ggx1 * ggx2;
    }
  `,
  subsurfaceScattering: `
    vec3 subsurfaceScattering(
      vec3 normal,
      vec3 lightDir,
      vec3 viewDir,
      vec3 scatterColor,
      float thickness,
      float distortion,
      float power,
      float scale
    ) {
      vec3 H = normalize(lightDir + normal * distortion);
      float VdotH = pow(clamp(dot(viewDir, -H), 0.0, 1.0), power) * scale;
      return scatterColor * VdotH * thickness;
    }
  `,
  atmosphericScattering: `
    vec3 rayleighScattering(float cosTheta, vec3 wavelength) {
      const float sunIntensity = 20.0;
      vec3 betaR = vec3(5.8e-6, 1.35e-5, 3.31e-5) / (wavelength * wavelength * wavelength * wavelength);
      float phase = 0.75 * (1.0 + cosTheta * cosTheta);
      return betaR * phase * sunIntensity;
    }
    vec3 mieScattering(float cosTheta, float g) {
      const float sunIntensity = 20.0;
      float g2 = g * g;
      float phase = (3.0 / (8.0 * 3.14159)) * ((1.0 - g2) / (2.0 + g2)) * 
                    (1.0 + cosTheta * cosTheta) / pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5);
      return vec3(phase * sunIntensity * 0.001);
    }
  `
}
export const HeatShaders = {
  blackbodyColor: `
    vec3 blackbodyColor(float temperature) {
      if (temperature > 6000.0) return vec3(1.0, 1.0, 1.0);
      if (temperature > 4000.0) return mix(vec3(1.0, 0.9, 0.7), vec3(1.0, 1.0, 1.0), (temperature - 4000.0) / 2000.0);
      if (temperature > 2500.0) return mix(vec3(1.0, 0.6, 0.2), vec3(1.0, 0.9, 0.7), (temperature - 2500.0) / 1500.0);
      if (temperature > 1500.0) return mix(vec3(1.0, 0.3, 0.1), vec3(1.0, 0.6, 0.2), (temperature - 1500.0) / 1000.0);
      return vec3(0.5, 0.1, 0.0);
    }
  `,
  heatDistortion: `
    vec2 heatDistortion(vec2 uv, float time, float intensity) {
      float wave1 = sin(uv.y * 20.0 + time * 3.0) * intensity;
      float wave2 = sin(uv.y * 40.0 - time * 2.0) * intensity * 0.5;
      float wave3 = sin(uv.x * 15.0 + time * 2.5) * intensity * 0.3;
      return vec2(wave1 + wave3, wave2);
    }
  `,
  volumetricPlasma: `
    float volumetricDensity(vec3 pos, float time) {
      float noise = fbm(pos * 2.0 + vec3(0.0, time * 0.5, 0.0), 4);
      float sphere = 1.0 - length(pos);
      return max(0.0, sphere * 0.5 + noise * 0.5);
    }
    vec4 volumetricPlasma(vec3 pos, vec3 rayDir, float time, float temperature) {
      const int steps = 16;
      const float stepSize = 0.1;
      vec3 currentPos = pos;
      vec4 accumulatedColor = vec4(0.0);
      for(int i = 0; i < steps; i++) {
        float density = volumetricDensity(currentPos, time);
        if(density > 0.01) {
          vec3 plasmaColor = blackbodyColor(temperature * density);
          float alpha = density * 0.3;
          accumulatedColor.rgb += plasmaColor * alpha * (1.0 - accumulatedColor.a);
          accumulatedColor.a += alpha * (1.0 - accumulatedColor.a);
          if(accumulatedColor.a > 0.95) break;
        }
        currentPos += rayDir * stepSize;
      }
      return accumulatedColor;
    }
  `
}
export const CraterShaders = {
  terrainBlending: `
    vec3 blendTerrainLayers(
      vec3 bedrock,
      vec3 impactMelt,
      vec3 breccia,
      vec3 ejecta,
      float depth,
      float temperature
    ) {
      float meltLayer = smoothstep(0.7, 0.9, depth) * smoothstep(0.0, 0.2, temperature);
      float brecciaLayer = smoothstep(0.3, 0.6, depth) * (1.0 - meltLayer);
      float ejectaLayer = smoothstep(0.0, 0.3, depth) * (1.0 - meltLayer - brecciaLayer);
      vec3 result = bedrock;
      result = mix(result, breccia, brecciaLayer);
      result = mix(result, impactMelt, meltLayer);
      result = mix(result, ejecta, ejectaLayer);
      return result;
    }
  `,
  craterRim: `
    float craterRimProfile(float normalizedDist, float rimPos, float rimWidth) {
      float rimFactor = exp(-pow((normalizedDist - rimPos) / rimWidth, 2.0));
      return rimFactor;
    }
  `
}
export const DebrisShaders = {
  temperatureMaterial: `
    struct MaterialProps {
      float roughness;
      float metalness;
      float clearcoat;
      vec3 emissive;
    };
    MaterialProps getTemperatureMaterial(float temperature, float velocity) {
      MaterialProps props;
      if(temperature > 1800.0) {
        props.roughness = 0.15;
        props.metalness = 0.0;
        props.clearcoat = 0.8;
        props.emissive = blackbodyColor(temperature) * 2.0;
      } else if(temperature > 1200.0) {
        props.roughness = 0.35;
        props.metalness = 0.1;
        props.clearcoat = 0.4;
        props.emissive = blackbodyColor(temperature);
      } else if(temperature > 800.0) {
        props.roughness = 0.70;
        props.metalness = 0.05;
        props.clearcoat = 0.1;
        props.emissive = blackbodyColor(temperature) * 0.5;
      } else {
        props.roughness = 0.92;
        props.metalness = 0.02;
        props.clearcoat = 0.0;
        props.emissive = vec3(0.0);
      }
      return props;
    }
  `
}
export const EffectsShaders = {
  chromaticAberration: `
    vec3 chromaticAberration(sampler2D tex, vec2 uv, float amount) {
      float r = texture2D(tex, uv + vec2(amount, 0.0)).r;
      float g = texture2D(tex, uv).g;
      float b = texture2D(tex, uv - vec2(amount, 0.0)).b;
      return vec3(r, g, b);
    }
  `,
  radialBlur: `
    vec3 radialBlur(sampler2D tex, vec2 uv, vec2 center, float strength, int samples) {
      vec3 color = vec3(0.0);
      vec2 dir = uv - center;
      for(int i = 0; i < 10; i++) {
        if(i >= samples) break;
        float scale = 1.0 - strength * (float(i) / float(samples - 1));
        color += texture2D(tex, center + dir * scale).rgb;
      }
      return color / float(samples);
    }
  `
}
export const ShaderUtils = {
  getFullShader(includes: string[]): string {
    let shader = ''
    if (includes.includes('noise')) {
      shader += NoiseShaders.perlin3D + '\n' + NoiseShaders.fbm + '\n'
    }
    if (includes.includes('worley')) {
      shader += NoiseShaders.worley2D + '\n'
    }
    if (includes.includes('pbr')) {
      shader += PBRShaders.pbrLighting + '\n'
    }
    if (includes.includes('sss')) {
      shader += PBRShaders.subsurfaceScattering + '\n'
    }
    if (includes.includes('atmosphere')) {
      shader += PBRShaders.atmosphericScattering + '\n'
    }
    if (includes.includes('heat')) {
      shader += HeatShaders.blackbodyColor + '\n' + HeatShaders.heatDistortion + '\n'
    }
    if (includes.includes('volumetric')) {
      shader += HeatShaders.volumetricPlasma + '\n'
    }
    if (includes.includes('crater')) {
      shader += CraterShaders.terrainBlending + '\n' + CraterShaders.craterRim + '\n'
    }
    if (includes.includes('debris')) {
      shader += DebrisShaders.temperatureMaterial + '\n'
    }
    return shader
  }
}
