export interface RenderOptions {
  lat: number
  lng: number
  craterDiameter_m: number
  energy_mt: number
  locationName: string
  asteroidDiameter_m: number
  customText?: string
}
export class RealisticMemeRenderer {
  private static MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
  private static getMetersPerPixel(latitude: number, zoom: number): number {
    const earthCircumference = 40075017
    const latitudeRadians = latitude * (Math.PI / 180)
    return (earthCircumference * Math.cos(latitudeRadians)) / (256 * Math.pow(2, zoom))
  }
  private static calculateOptimalZoom(craterDiameter_m: number, width: number = 1280): number {
    const targetCraterPixels = width * 0.4
    for (let zoom = 20; zoom >= 1; zoom--) {
      const metersPerPixel = this.getMetersPerPixel(0, zoom)
      const craterPixels = craterDiameter_m / metersPerPixel
      if (craterPixels >= targetCraterPixels * 0.8 && craterPixels <= targetCraterPixels * 1.5) {
        return zoom
      }
    }
    return 13
  }
  private static async loadMapboxImage(lat: number, lng: number, zoom: number): Promise<HTMLImageElement> {
    const url = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},${zoom}/1920x1080?access_token=${this.MAPBOX_TOKEN}`
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  }
  static async render(options: RenderOptions): Promise<string> {
    const { lat, lng, craterDiameter_m, energy_mt, locationName, asteroidDiameter_m, customText } = options
    const canvas = document.createElement('canvas')
    canvas.width = 1920
    canvas.height = 1080
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    try {
      const zoom = this.calculateOptimalZoom(craterDiameter_m)
      console.log(`📍 Rendering at zoom ${zoom} for ${craterDiameter_m}m crater`)
      const baseImage = await this.loadMapboxImage(lat, lng, zoom)
      ctx.drawImage(baseImage, 0, 0, baseImage.width, baseImage.height, 0, 0, 1920, 1080)
      const metersPerPixel = this.getMetersPerPixel(lat, zoom)
      const craterRadiusPx = (craterDiameter_m / 2) / metersPerPixel
      const centerX = 960
      const centerY = 540
      console.log(`🎯 Crater: ${craterDiameter_m}m = ${craterRadiusPx * 2}px`)
      await this.renderCrater(ctx, centerX, centerY, craterRadiusPx)
      await this.renderEjecta(ctx, centerX, centerY, craterRadiusPx)
      await this.renderFireGlow(ctx, centerX, centerY, craterRadiusPx)
      await this.renderSmokePlume(ctx, centerX, centerY, craterRadiusPx)
      await this.applyAtmosphericEffects(ctx, centerX, centerY, craterRadiusPx)
      this.applyColorGrading(ctx)
      this.renderTextOverlay(ctx, locationName, energy_mt, asteroidDiameter_m, craterDiameter_m, customText)
      return canvas.toDataURL('image/png', 1.0)
    } catch (error) {
      console.error('Realistic meme render hatası:', error)
      throw error
    }
  }
  private static async renderCrater(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number
  ): Promise<void> {
    ctx.save()
    const deepCrater = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius * 0.7
    )
    deepCrater.addColorStop(0, '#000000')
    deepCrater.addColorStop(0.4, '#0a0806')
    deepCrater.addColorStop(0.7, '#1a1410')
    deepCrater.addColorStop(1, '#2d2520')
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = deepCrater
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * 0.7, 0, Math.PI * 2)
    ctx.fill()
    const innerWall = ctx.createRadialGradient(
      centerX, centerY, radius * 0.7,
      centerX, centerY, radius
    )
    innerWall.addColorStop(0, '#2d2520')
    innerWall.addColorStop(0.3, '#3d3025')
    innerWall.addColorStop(0.6, '#4a3d2f')
    innerWall.addColorStop(1, 'rgba(74, 61, 47, 0)')
    ctx.globalCompositeOperation = 'darken'
    ctx.fillStyle = innerWall
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fill()
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8
      const rimX = centerX + Math.cos(angle) * radius * 1.05
      const rimY = centerY + Math.sin(angle) * radius * 1.05
      const rimGradient = ctx.createRadialGradient(
        rimX, rimY, 0,
        rimX, rimY, radius * 0.15
      )
      rimGradient.addColorStop(0, 'rgba(70, 60, 45, 0.5)')
      rimGradient.addColorStop(0.5, 'rgba(55, 48, 38, 0.3)')
      rimGradient.addColorStop(1, 'transparent')
      ctx.globalCompositeOperation = 'overlay'
      ctx.fillStyle = rimGradient
      ctx.beginPath()
      ctx.arc(rimX, rimY, radius * 0.15, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'multiply'
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'
    ctx.lineWidth = 2
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.3
      const crackLength = radius * (1.2 + Math.random() * 0.8)
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(
        centerX + Math.cos(angle) * crackLength,
        centerY + Math.sin(angle) * crackLength
      )
      ctx.stroke()
    }
    ctx.restore()
  }
  private static async renderEjecta(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number
  ): Promise<void> {
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    const debrisCount = 800
    for (let i = 0; i < debrisCount; i++) {
      const angle = (Math.PI * 2 * i) / debrisCount
      const randomAngleOffset = (Math.random() - 0.5) * 0.4
      const finalAngle = angle + randomAngleOffset
      const minDist = radius * 1.05
      const maxDist = radius * 4
      const distance = minDist + Math.pow(Math.random(), 1.5) * (maxDist - minDist)
      const x = centerX + Math.cos(finalAngle) * distance
      const y = centerY + Math.sin(finalAngle) * distance
      const falloff = Math.pow(1 - ((distance - minDist) / (maxDist - minDist)), 2)
      const size = (1 + Math.random() * 6) * falloff
      const darkness = 20 + Math.random() * 30
      ctx.fillStyle = `rgba(${darkness}, ${darkness - 5}, ${darkness - 10}, ${falloff * 0.7})`
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
      if (Math.random() > 0.95) {
        const bigSize = size * (2 + Math.random() * 3)
        ctx.fillStyle = `rgba(${darkness}, ${darkness - 5}, ${darkness - 10}, ${falloff * 0.5})`
        ctx.beginPath()
        ctx.arc(x, y, bigSize, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  }
  private static async renderSmokePlume(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number
  ): Promise<void> {
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    const smokeParticles = 150
    for (let i = 0; i < smokeParticles; i++) {
      const height = -radius * (0.2 + Math.random() * 1.5)
      const spread = (Math.random() - 0.5) * radius * 1.2
      const drift = (Math.random() - 0.5) * radius * 0.3
      const x = centerX + spread + drift
      const y = centerY + height
      const particleRadius = radius * (0.15 + Math.random() * 0.35)
      const density = 0.85 - (Math.abs(height) / (radius * 2))
      const opacity = (0.15 + Math.random() * 0.2) * density
      const smokeGradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, particleRadius
      )
      smokeGradient.addColorStop(0, `rgba(40, 35, 30, ${opacity})`)
      smokeGradient.addColorStop(0.4, `rgba(60, 55, 50, ${opacity * 0.7})`)
      smokeGradient.addColorStop(0.7, `rgba(80, 75, 70, ${opacity * 0.4})`)
      smokeGradient.addColorStop(1, 'rgba(100, 95, 90, 0)')
      ctx.fillStyle = smokeGradient
      ctx.beginPath()
      ctx.arc(x, y, particleRadius, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'overlay'
    const dustCloud = ctx.createRadialGradient(
      centerX, centerY, radius,
      centerX, centerY, radius * 2.5
    )
    dustCloud.addColorStop(0, 'rgba(100, 90, 80, 0.25)')
    dustCloud.addColorStop(0.5, 'rgba(80, 75, 70, 0.15)')
    dustCloud.addColorStop(1, 'rgba(60, 55, 50, 0)')
    ctx.fillStyle = dustCloud
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  private static async renderFireGlow(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number
  ): Promise<void> {
    ctx.save()
    const coreHeat = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius * 0.3
    )
    coreHeat.addColorStop(0, 'rgba(255, 220, 180, 0.4)')
    coreHeat.addColorStop(0.5, 'rgba(255, 160, 80, 0.2)')
    coreHeat.addColorStop(1, 'rgba(200, 80, 40, 0)')
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = coreHeat
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * 0.3, 0, Math.PI * 2)
    ctx.fill()
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2
      const distance = radius * (0.3 + Math.random() * 0.6)
      const x = centerX + Math.cos(angle) * distance
      const y = centerY + Math.sin(angle) * distance
      const fireSize = radius * (0.02 + Math.random() * 0.05)
      const intensity = 0.3 + Math.random() * 0.3
      const fireSpot = ctx.createRadialGradient(x, y, 0, x, y, fireSize)
      fireSpot.addColorStop(0, `rgba(255, 180, 100, ${intensity})`)
      fireSpot.addColorStop(0.5, `rgba(220, 100, 50, ${intensity * 0.5})`)
      fireSpot.addColorStop(1, 'rgba(150, 50, 20, 0)')
      ctx.fillStyle = fireSpot
      ctx.beginPath()
      ctx.arc(x, y, fireSize, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
  private static async applyAtmosphericEffects(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number
  ): Promise<void> {
    ctx.save()
    ctx.globalCompositeOperation = 'lighten'
    const innerShock = ctx.createRadialGradient(
      centerX, centerY, radius * 1.5,
      centerX, centerY, radius * 2
    )
    innerShock.addColorStop(0, 'rgba(220, 210, 200, 0.12)')
    innerShock.addColorStop(0.5, 'rgba(200, 190, 180, 0.06)')
    innerShock.addColorStop(1, 'rgba(180, 170, 160, 0)')
    ctx.fillStyle = innerShock
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'overlay'
    const outerShock = ctx.createRadialGradient(
      centerX, centerY, radius * 2,
      centerX, centerY, radius * 3.5
    )
    outerShock.addColorStop(0, 'rgba(180, 170, 160, 0.08)')
    outerShock.addColorStop(0.5, 'rgba(150, 140, 130, 0.04)')
    outerShock.addColorStop(1, 'rgba(120, 110, 100, 0)')
    ctx.fillStyle = outerShock
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  private static applyColorGrading(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    const vignette = ctx.createRadialGradient(960, 540, 100, 960, 540, 1200)
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
    vignette.addColorStop(0.6, 'rgba(0, 0, 0, 0)')
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.3)')
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, 1920, 1080)
    ctx.globalCompositeOperation = 'overlay'
    ctx.fillStyle = 'rgba(128, 128, 128, 0.1)'
    ctx.fillRect(0, 0, 1920, 1080)
    ctx.restore()
  }
  private static renderTextOverlay(
    ctx: CanvasRenderingContext2D,
    locationName: string,
    energy_mt: number,
    asteroidDiameter_m: number,
    craterDiameter_m: number,
    customText?: string
  ): void {
    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
    ctx.fillRect(0, 0, 1920, 220)
    ctx.font = 'bold 80px Arial'
    ctx.fillStyle = '#FF4444'
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 4
    ctx.textAlign = 'center'
    const mainText = customText || `${locationName}'A ASTEROİD DÜŞTÜ! 💥`
    ctx.strokeText(mainText, 960, 100)
    ctx.fillText(mainText, 960, 100)
    ctx.font = 'bold 52px Arial'
    ctx.fillStyle = '#FFA500'
    const subText = `${energy_mt.toFixed(1)} MT TNT Etkisi!`
    ctx.strokeText(subText, 960, 180)
    ctx.fillText(subText, 960, 180)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.fillRect(0, 900, 1920, 180)
    ctx.font = '36px Arial'
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'left'
    const stats = [
      `📍 Konum: ${locationName}`,
      `☄️ Asteroid: ${asteroidDiameter_m}m çap`,
      `🔥 Krater: ${(craterDiameter_m / 1000).toFixed(2)} km`
    ]
    stats.forEach((stat, i) => {
      ctx.fillText(stat, 60, 950 + i * 50)
    })
    ctx.textAlign = 'right'
    ctx.font = 'bold 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillStyle = '#FFFFFF'
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.strokeText('CLIFF', 1860, 1015)
    ctx.fillText('CLIFF', 1860, 1015)
    ctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillStyle = '#999999'
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.lineWidth = 1
    ctx.strokeText('cliff.kynux.dev', 1860, 1050)
    ctx.fillText('cliff.kynux.dev', 1860, 1050)
    ctx.restore()
  }
}
