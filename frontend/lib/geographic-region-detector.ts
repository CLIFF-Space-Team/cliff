import { GeographicRegion, RegionBounds, RegionStats, GEOGRAPHIC_REGIONS } from './geographic-regions'

export interface EarthEvent {
  id: string
  title: string
  category: string
  severity: 'low' | 'medium' | 'high'
  date: string
  location: {
    lat: number
    lon: number
  }
  description?: string
  created_date?: string
  categories?: Array<{ id: number; title: string }>
  geometry?: Array<{ coordinates: [number, number] }>
}

export class GeographicRegionDetector {
  private regions: RegionBounds[] = GEOGRAPHIC_REGIONS

  detectRegion(lat: number, lon: number): GeographicRegion {
    for (const region of this.regions) {
      if (this.isCoordinateInRegion(lat, lon, region.bounds)) {
        return region.region
      }
    }
    
    return this.getFallbackRegion(lat, lon)
  }

  getRegionInfo(region: GeographicRegion): RegionBounds | null {
    return this.regions.find(r => r.region === region) || null
  }

  private isCoordinateInRegion(
    lat: number, 
    lon: number, 
    bounds: RegionBounds['bounds']
  ): boolean {
    if (bounds.west <= bounds.east) {
      return lat <= bounds.north && 
             lat >= bounds.south && 
             lon <= bounds.east && 
             lon >= bounds.west
    } else {
      return lat <= bounds.north && 
             lat >= bounds.south && 
             (lon >= bounds.west || lon <= bounds.east)
    }
  }

  private getFallbackRegion(lat: number, lon: number): GeographicRegion {
    if (lat >= 35 && lat <= 71 && lon >= -25 && lon <= 40) {
      return GeographicRegion.EUROPE
    }
    if (lat >= -10 && lat <= 75 && lon >= 40 && lon <= 180) {
      return GeographicRegion.ASIA
    }
    if (lat >= 15 && lat <= 75 && ((lon >= -175 && lon <= -50) || lon >= 175)) {
      return GeographicRegion.NORTH_AMERICA
    }
    if (lat >= -55 && lat <= 15 && lon >= -85 && lon <= -30) {
      return GeographicRegion.SOUTH_AMERICA
    }
    if (lat >= -35 && lat <= 37 && lon >= -20 && lon <= 52) {
      return GeographicRegion.AFRICA
    }
    if (lat >= -50 && lat <= 30 && lon >= 110 && lon <= 180) {
      return GeographicRegion.OCEANIA
    }
    if (lat >= 12 && lat <= 42 && lon >= 25 && lon <= 65) {
      return GeographicRegion.MIDDLE_EAST
    }
    
    return GeographicRegion.ASIA
  }

  groupEventsByRegion(events: EarthEvent[]): Map<GeographicRegion, EarthEvent[]> {
    const regionGroups = new Map<GeographicRegion, EarthEvent[]>()
    
    for (const event of events) {
      let lat: number, lon: number
      
      if (event.location) {
        lat = event.location.lat
        lon = event.location.lon
      } else if (event.geometry && event.geometry.length > 0) {
        const coords = event.geometry[event.geometry.length - 1].coordinates
        lon = coords[0]
        lat = coords[1]
      } else {
        continue
      }
      
      const region = this.detectRegion(lat, lon)
      
      if (!regionGroups.has(region)) {
        regionGroups.set(region, [])
      }
      regionGroups.get(region)!.push(event)
    }
    
    return regionGroups
  }

  getRegionStats(events: EarthEvent[]): RegionStats[] {
    const regionGroups = this.groupEventsByRegion(events)
    const stats: RegionStats[] = []
    
    for (const regionData of this.regions) {
      const regionEvents = regionGroups.get(regionData.region) || []
      
      const severityBreakdown = {
        high: 0,
        medium: 0,
        low: 0
      }
      
      const categories: { [key: string]: number } = {}
      
      for (const event of regionEvents) {
        severityBreakdown[event.severity]++
        
        const categoryName = this.getCategoryName(event)
        categories[categoryName] = (categories[categoryName] || 0) + 1
      }
      
      stats.push({
        region: regionData.region,
        name: regionData.name,
        eventCount: regionEvents.length,
        severityBreakdown,
        categories,
        color: regionData.color
      })
    }
    
    return stats.filter(stat => stat.eventCount > 0)
  }

  private getCategoryName(event: EarthEvent): string {
    if (event.categories && event.categories.length > 0) {
      return event.categories[0].title || 'Unknown'
    }
    return event.category || 'Unknown'
  }

  getRegionCenter(region: GeographicRegion): { lat: number; lon: number } {
    const regionInfo = this.getRegionInfo(region)
    if (!regionInfo) return { lat: 0, lon: 0 }
    
    const { bounds } = regionInfo
    const lat = (bounds.north + bounds.south) / 2
    let lon: number
    
    if (bounds.west <= bounds.east) {
      lon = (bounds.west + bounds.east) / 2
    } else {
      lon = ((bounds.west + bounds.east + 360) / 2) % 360
      if (lon > 180) lon -= 360
    }
    
    return { lat, lon }
  }

  isEventInRegion(event: EarthEvent, region: GeographicRegion): boolean {
    let lat: number, lon: number
    
    if (event.location) {
      lat = event.location.lat
      lon = event.location.lon
    } else if (event.geometry && event.geometry.length > 0) {
      const coords = event.geometry[event.geometry.length - 1].coordinates
      lon = coords[0]
      lat = coords[1]
    } else {
      return false
    }
    
    return this.detectRegion(lat, lon) === region
  }

  filterEventsByRegions(events: EarthEvent[], visibleRegions: Set<GeographicRegion>): EarthEvent[] {
    return events.filter(event => {
      const eventRegion = this.detectRegion(
        event.location?.lat || event.geometry?.[0]?.coordinates[1] || 0,
        event.location?.lon || event.geometry?.[0]?.coordinates[0] || 0
      )
      return visibleRegions.has(eventRegion)
    })
  }
}

export const regionDetector = new GeographicRegionDetector()