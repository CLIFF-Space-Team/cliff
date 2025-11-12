import * as THREE from 'three'
export interface PostProcessingConfig {
  enableHDR: boolean
  enableBloom: boolean
  enableColorGrading: boolean
  enableAntiAliasing: boolean
  bloomStrength: number
  bloomRadius: number
  bloomThreshold: number
  exposure: number
  contrast: number
  saturation: number
  temperature: number
  tint: number
  renderScale: number
  enableAdaptiveQuality: boolean
}
export interface HDRSettings {
  toneMapping: THREE.ToneMapping
  toneMappingExposure: number
  outputColorSpace: THREE.ColorSpace
  shadowType: THREE.ShadowMapType
}
export class PostProcessingManager {
  private scene: THREE.Scene
  private camera: THREE.Camera
  private renderer: THREE.WebGLRenderer
  private config: PostProcessingConfig
  private hdrSettings: HDRSettings
  private frameTime: number = 0
  private performanceThreshold: number = 16.67 // 60 FPS in ms
  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    config: Partial<PostProcessingConfig> = {}
  ) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.config = {
      enableHDR: true,
      enableBloom: false, // Will be handled by @react-three/postprocessing
      enableColorGrading: true,
      enableAntiAliasing: true,
      bloomStrength: 0.2,
      bloomRadius: 0.4,
      bloomThreshold: 0.85,
      exposure: 1.0,
      contrast: 1.1,
      saturation: 1.2,
      temperature: 6500,
      tint: 0,
      renderScale: 1.0,
      enableAdaptiveQuality: true,
      ...config
    }
    this.hdrSettings = {
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.0,
      outputColorSpace: THREE.SRGBColorSpace,
      shadowType: THREE.PCFSoftShadowMap
    }
    this.initializeHDR()
    console.log('🎨 Modern PostProcessingManager initialized')
  }
  private initializeHDR(): void {
    if (!this.config.enableHDR) return
    this.renderer.toneMapping = this.hdrSettings.toneMapping
    this.renderer.toneMappingExposure = this.hdrSettings.toneMappingExposure
    this.renderer.outputColorSpace = this.hdrSettings.outputColorSpace
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = this.hdrSettings.shadowType
    console.log('✨ HDR rendering configured')
  }
  public render(): void {
    const startTime = performance.now()
    this.renderer.render(this.scene, this.camera)
    this.frameTime = performance.now() - startTime
    if (this.config.enableAdaptiveQuality) {
      this.adjustQuality()
    }
  }
  private adjustQuality(): void {
    if (this.frameTime > this.performanceThreshold) {
      if (this.config.renderScale > 0.5) {
        this.config.renderScale = Math.max(0.5, this.config.renderScale - 0.1)
      }
    } else if (this.frameTime < this.performanceThreshold * 0.8) {
      if (this.config.renderScale < 1.0) {
        this.config.renderScale = Math.min(1.0, this.config.renderScale + 0.05)
      }
    }
  }
  public resize(width: number, height: number): void {
    const renderWidth = width * this.config.renderScale
    const renderHeight = height * this.config.renderScale
    this.renderer.setSize(renderWidth, renderHeight)
    console.log(`📐 PostProcessing resized: ${renderWidth}x${renderHeight}`)
  }
  public updateConfig(newConfig: Partial<PostProcessingConfig>): void {
    Object.assign(this.config, newConfig)
    if (newConfig.enableHDR !== undefined) {
      this.initializeHDR()
    }
    console.log('⚙️ PostProcessing config updated')
  }
  public getConfig(): PostProcessingConfig {
    return { ...this.config }
  }
  public getPerformanceMetrics(): {
    frameTime: number
    fps: number
    renderScale: number
  } {
    return {
      frameTime: this.frameTime,
      fps: 1000 / Math.max(this.frameTime, 1),
      renderScale: this.config.renderScale
    }
  }
  public toggleEffect(effect: keyof PostProcessingConfig, enabled: boolean): void {
    (this.config as any)[effect] = enabled
    if (effect === 'enableHDR') {
      this.initializeHDR()
    }
    console.log(`🔄 Effect ${effect} toggled: ${enabled}`)
  }
  public getHDRSettings(): HDRSettings {
    return { ...this.hdrSettings }
  }
  public getBloomSettings() {
    return {
      intensity: this.config.bloomStrength,
      threshold: this.config.bloomThreshold,
      radius: this.config.bloomRadius
    }
  }
  public getColorGradingSettings() {
    return {
      exposure: this.config.exposure,
      contrast: this.config.contrast,
      saturation: this.config.saturation,
      temperature: this.config.temperature,
      tint: this.config.tint
    }
  }
  public dispose(): void {
    console.log('🗑️ PostProcessingManager disposed')
  }
}
export interface PostProcessingEffectsProps {
  config: PostProcessingConfig
}
export default PostProcessingManager
