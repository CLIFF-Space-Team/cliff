import { ImpactResults, ImpactLocation, AsteroidParams } from '@/services/ImpactCalculator'
export interface MemeOptions {
  asteroidParams: AsteroidParams
  location: ImpactLocation
  results: ImpactResults
  canvasElement?: HTMLCanvasElement
  customText?: string
}
export interface MemeShareData {
  imageDataUrl: string
  shareId: string
  shareUrl: string
}
export class MemeComposer {
  private static async captureCanvas(canvas: HTMLCanvasElement): Promise<string> {
    return canvas.toDataURL('image/png', 1.0)
  }
  private static drawMapLayer(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    location: ImpactLocation
  ): void {
    const mapImageUrl = `https:
    ctx.save()
    ctx.globalAlpha = 0.3
    ctx.fillStyle = '#000'
    ctx.fillRect(0, height * 0.6, width, height * 0.4)
    ctx.restore()
  }
  private static drawTextOverlays(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    options: MemeOptions
  ): void {
    const { results, location, asteroidParams, customText } = options
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2
    ctx.fillStyle = '#FF4444'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    const mainText = customText || `${location.cityName || 'Bu Bölge'}'ye Asteroid Düştü! 💥☄️`
    ctx.fillText(mainText, width / 2, 80)
    ctx.fillStyle = '#FFAA00'
    ctx.font = 'bold 32px Arial'
    const impactText = `${results.energy.megatonsTNT.toFixed(1)} MT TNT Etkisi!`
    ctx.fillText(impactText, width / 2, 130)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '24px Arial'
    ctx.textAlign = 'left'
    const stats = [
      `🌍 Konum: ${location.cityName || `${location.lat.toFixed(2)}°, ${location.lng.toFixed(2)}°`}`,
      `☄️ Asteroid: ${asteroidParams.diameter_m}m çap, ${asteroidParams.velocity_kms} km/s`,
      `💥 Krater: ${(results.crater.finalDiameter_m / 1000).toFixed(2)} km çap`,
      `🔥 Ateş Topu: ${results.thermal.fireball_maxRadius_m.toFixed(0)} m`,
    ]
    let y = height - 150
    stats.forEach(stat => {
      ctx.fillText(stat, 30, y)
      y += 35
    })
    ctx.font = 'italic 18px Arial'
    ctx.textAlign = 'right'
    ctx.fillStyle = '#888888'
    ctx.fillText('CLIFF Asteroid Impact Simulator', width - 30, height - 30)
    ctx.restore()
  }
  private static drawWarningBorder(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    ctx.save()
    ctx.strokeStyle = '#FF4444'
    ctx.lineWidth = 10
    ctx.setLineDash([20, 10])
    ctx.strokeRect(5, 5, width - 10, height - 10)
    ctx.restore()
  }
  static async createMeme(options: MemeOptions): Promise<string> {
    const width = 1200
    const height = 1200
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas context oluşturulamadı')
    }
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)
    if (options.canvasElement) {
      try {
        const screenshotData = await this.captureCanvas(options.canvasElement)
        const img = new Image()
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = screenshotData
        })
        const scale = Math.min(width / img.width, height * 0.7 / img.height)
        const scaledWidth = img.width * scale
        const scaledHeight = img.height * scale
        const x = (width - scaledWidth) / 2
        const y = (height * 0.15)
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
      } catch (error) {
        console.error('3D görüntü ekleme hatası:', error)
      }
    }
    this.drawMapLayer(ctx, width, height, options.location)
    this.drawWarningBorder(ctx, width, height)
    this.drawTextOverlays(ctx, width, height, options)
    return canvas.toDataURL('image/png', 0.95)
  }
  static generateShareId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }
  static async createShareableLink(imageDataUrl: string): Promise<MemeShareData> {
    const shareId = this.generateShareId()
    if (typeof window !== 'undefined') {
      localStorage.setItem(`meme-${shareId}`, imageDataUrl)
    }
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'http:
    const shareUrl = `${baseUrl}/impact-meme/${shareId}`
    return {
      imageDataUrl,
      shareId,
      shareUrl
    }
  }
  static getMemeByShareId(shareId: string): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(`meme-${shareId}`)
  }
  static async shareToSocial(platform: 'twitter' | 'facebook' | 'whatsapp' | 'instagram', shareUrl: string, text: string = ''): Promise<void> {
    const encodedUrl = encodeURIComponent(shareUrl)
    const encodedText = encodeURIComponent(text || 'Arkadaşımın evine asteroid düştü! 💥☄️')
    let url = ''
    switch (platform) {
      case 'twitter':
        url = `https:
        break
      case 'facebook':
        url = `https:
        break
      case 'whatsapp':
        url = `https:
        break
      case 'instagram':
        alert('Instagram için görseli indirin ve Instagram uygulamasından paylaşın')
        return
    }
    if (url) {
      window.open(url, '_blank', 'width=600,height=400')
    }
  }
  static async copyToClipboard(shareUrl: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(shareUrl)
      return true
    } catch (error) {
      console.error('Kopyalama hatası:', error)
      return false
    }
  }
  static downloadImage(imageDataUrl: string, filename?: string): void {
    const link = document.createElement('a')
    link.download = filename || `asteroid-impact-meme-${Date.now()}.png`
    link.href = imageDataUrl
    link.click()
  }
}
