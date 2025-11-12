export class GIBSService {
  private baseURL = 'https://gibs.earthdata.nasa.gov'
  private cache: Map<string, string> = new Map()
  async getEarthTexture(date: Date = new Date()): Promise<string> {
    const dateStr = this.formatDate(date)
    const cacheKey = `earth-${dateStr}`
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }
    const url = `${this.baseURL}/wms/epsg4326/best/wms.cgi?` +
                `version=1.1.1&service=WMS&request=GetMap&` +
                `srs=EPSG:4326&bbox=-180,-90,180,90&` +
                `width=2048&height=1024&` +
                `time=${dateStr}&` +
                `layers=MODIS_Terra_CorrectedReflectance_TrueColor&` +
                `format=image/jpeg&` +
                `transparent=false`
    this.cache.set(cacheKey, url)
    return url
  }
  async getRegionalTexture(
    lat: number,
    lng: number,
    radius: number = 1,
    date: Date = new Date()
  ): Promise<string> {
    const dateStr = this.formatDate(date)
    const bbox = `${lng - radius},${lat - radius},${lng + radius},${lat + radius}`
    const url = `${this.baseURL}/wms/epsg4326/best/wms.cgi?` +
                `version=1.1.1&service=WMS&request=GetMap&` +
                `srs=EPSG:4326&bbox=${bbox}&` +
                `width=2048&height=2048&` +
                `time=${dateStr}&` +
                `layers=VIIRS_SNPP_CorrectedReflectance_TrueColor&` +
                `format=image/jpeg&` +
                `transparent=false`
    return url
  }
  async getThermalAnomalies(date: Date = new Date()) {
    const dateStr = this.formatDate(date)
    try {
      const response = await fetch(
        `${this.baseURL}/wmts/epsg4326/best/` +
        `VIIRS_NOAA20_Thermal_Anomalies_375m_All/default/` +
        `${dateStr}/500m/4/3/4.mvt`
      )
      if (!response.ok) return null
      const buffer = await response.arrayBuffer()
      return buffer
    } catch (error) {
      console.warn('GIBS thermal anomalies not available:', error)
      return null
    }
  }
  private formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  clearCache() {
    this.cache.clear()
  }
}
export const gibsService = new GIBSService()
