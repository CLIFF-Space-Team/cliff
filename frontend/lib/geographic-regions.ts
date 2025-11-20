export enum GeographicRegion {
  EUROPE = 'europe',
  ASIA = 'asia', 
  NORTH_AMERICA = 'north_america',
  SOUTH_AMERICA = 'south_america',
  AFRICA = 'africa',
  OCEANIA = 'oceania',
  MIDDLE_EAST = 'middle_east',
  ARCTIC = 'arctic',
  UNKNOWN = 'unknown'
}

export interface RegionBounds {
  region: GeographicRegion
  name: string
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
  countries?: string[]
  color: {
    primary: string
    secondary: string
    accent: string
  }
}

export const GEOGRAPHIC_REGIONS: RegionBounds[] = [
  {
    region: GeographicRegion.EUROPE,
    name: 'Avrupa',
    bounds: { north: 71, south: 35, east: 40, west: -25 },
    countries: ['TR', 'DE', 'FR', 'IT', 'ES', 'GB', 'PL', 'NL', 'BE', 'CH', 'AT', 'CZ', 'HU'],
    color: {
      primary: '#3B82F6',
      secondary: '#60A5FA',
      accent: '#1D4ED8'
    }
  },
  {
    region: GeographicRegion.ASIA,
    name: 'Asya',
    bounds: { north: 75, south: -10, east: 180, west: 40 },
    countries: ['CN', 'JP', 'IN', 'ID', 'TH', 'VN', 'PH', 'MY', 'SG', 'KR'],
    color: {
      primary: '#10B981',
      secondary: '#34D399',
      accent: '#047857'
    }
  },
  {
    region: GeographicRegion.NORTH_AMERICA,
    name: 'Kuzey Amerika',
    bounds: { north: 75, south: 15, east: -50, west: -175 },
    countries: ['US', 'CA', 'MX', 'GT', 'BZ', 'HN', 'SV', 'NI', 'CR', 'PA'],
    color: {
      primary: '#EF4444',
      secondary: '#F87171',
      accent: '#DC2626'
    }
  },
  {
    region: GeographicRegion.SOUTH_AMERICA,
    name: 'Güney Amerika', 
    bounds: { north: 15, south: -55, east: -30, west: -85 },
    countries: ['BR', 'AR', 'CL', 'PE', 'CO', 'VE', 'EC', 'UY', 'PY', 'BO', 'GY', 'SR'],
    color: {
      primary: '#F59E0B',
      secondary: '#FBBF24',
      accent: '#D97706'
    }
  },
  {
    region: GeographicRegion.AFRICA,
    name: 'Afrika',
    bounds: { north: 37, south: -35, east: 52, west: -20 },
    countries: ['NG', 'EG', 'ZA', 'KE', 'UG', 'TZ', 'ET', 'GH', 'MG', 'CM', 'CI'],
    color: {
      primary: '#8B5CF6',
      secondary: '#A78BFA',
      accent: '#7C3AED'
    }
  },
  {
    region: GeographicRegion.OCEANIA,
    name: 'Okyanusya',
    bounds: { north: 30, south: -50, east: 180, west: 110 },
    countries: ['AU', 'NZ', 'PG', 'FJ', 'SB', 'NC', 'VU'],
    color: {
      primary: '#06B6D4',
      secondary: '#22D3EE',
      accent: '#0891B2'
    }
  },
  {
    region: GeographicRegion.MIDDLE_EAST,
    name: 'Orta Doğu',
    bounds: { north: 42, south: 12, east: 65, west: 25 },
    countries: ['SA', 'IR', 'IQ', 'SY', 'JO', 'LB', 'IL', 'PS', 'YE', 'OM', 'AE', 'QA', 'KW', 'BH'],
    color: {
      primary: '#EC4899',
      secondary: '#F472B6',
      accent: '#DB2777'
    }
  },
  {
    region: GeographicRegion.ARCTIC,
    name: 'Arktik',
    bounds: { north: 90, south: 66.5, east: 180, west: -180 },
    countries: [],
    color: {
      primary: '#E0F2FE',
      secondary: '#BAE6FD',
      accent: '#7DD3FC'
    }
  }
]

export const REGION_INFO: Record<GeographicRegion, { name: string; bounds: RegionBounds['bounds']; countries?: string[] }> = {
  [GeographicRegion.EUROPE]: {
    name: 'Avrupa',
    bounds: { north: 71, south: 35, east: 40, west: -25 },
    countries: ['TR', 'DE', 'FR', 'IT', 'ES', 'GB', 'PL', 'NL', 'BE', 'CH', 'AT', 'CZ', 'HU']
  },
  [GeographicRegion.ASIA]: {
    name: 'Asya',
    bounds: { north: 75, south: -10, east: 180, west: 40 },
    countries: ['CN', 'JP', 'IN', 'ID', 'TH', 'VN', 'PH', 'MY', 'SG', 'KR']
  },
  [GeographicRegion.NORTH_AMERICA]: {
    name: 'Kuzey Amerika',
    bounds: { north: 75, south: 15, east: -50, west: -175 },
    countries: ['US', 'CA', 'MX', 'GT', 'BZ', 'HN', 'SV', 'NI', 'CR', 'PA']
  },
  [GeographicRegion.SOUTH_AMERICA]: {
    name: 'Güney Amerika',
    bounds: { north: 15, south: -55, east: -30, west: -85 },
    countries: ['BR', 'AR', 'CL', 'PE', 'CO', 'VE', 'EC', 'UY', 'PY', 'BO', 'GY', 'SR']
  },
  [GeographicRegion.AFRICA]: {
    name: 'Afrika',
    bounds: { north: 37, south: -35, east: 52, west: -20 },
    countries: ['NG', 'EG', 'ZA', 'KE', 'UG', 'TZ', 'ET', 'GH', 'MG', 'CM', 'CI']
  },
  [GeographicRegion.OCEANIA]: {
    name: 'Okyanusya',
    bounds: { north: 30, south: -50, east: 180, west: 110 },
    countries: ['AU', 'NZ', 'PG', 'FJ', 'SB', 'NC', 'VU']
  },
  [GeographicRegion.MIDDLE_EAST]: {
    name: 'Orta Doğu',
    bounds: { north: 42, south: 12, east: 65, west: 25 },
    countries: ['SA', 'IR', 'IQ', 'SY', 'JO', 'LB', 'IL', 'PS', 'YE', 'OM', 'AE', 'QA', 'KW', 'BH']
  },
  [GeographicRegion.ARCTIC]: {
    name: 'Arktik',
    bounds: { north: 90, south: 66.5, east: 180, west: -180 },
    countries: []
  },
  [GeographicRegion.UNKNOWN]: {
    name: 'Bilinmeyen',
    bounds: { north: 0, south: 0, east: 0, west: 0 },
    countries: []
  }
}

export const REGION_COLORS: Record<GeographicRegion, { primary: string; secondary: string; accent: string }> = {
  [GeographicRegion.EUROPE]: {
    primary: '#3B82F6',
    secondary: '#60A5FA',
    accent: '#1D4ED8'
  },
  [GeographicRegion.ASIA]: {
    primary: '#10B981',
    secondary: '#34D399',
    accent: '#047857'
  },
  [GeographicRegion.NORTH_AMERICA]: {
    primary: '#EF4444',
    secondary: '#F87171',
    accent: '#DC2626'
  },
  [GeographicRegion.SOUTH_AMERICA]: {
    primary: '#F59E0B',
    secondary: '#FBBF24',
    accent: '#D97706'
  },
  [GeographicRegion.AFRICA]: {
    primary: '#8B5CF6',
    secondary: '#A78BFA',
    accent: '#7C3AED'
  },
  [GeographicRegion.OCEANIA]: {
    primary: '#06B6D4',
    secondary: '#22D3EE',
    accent: '#0891B2'
  },
  [GeographicRegion.MIDDLE_EAST]: {
    primary: '#EC4899',
    secondary: '#F472B6',
    accent: '#DB2777'
  },
  [GeographicRegion.ARCTIC]: {
    primary: '#E0F2FE',
    secondary: '#BAE6FD',
    accent: '#7DD3FC'
  },
  [GeographicRegion.UNKNOWN]: {
    primary: '#64748B',
    secondary: '#94A3B8',
    accent: '#475569'
  }
}

export interface RegionStats {
  region: GeographicRegion
  name: string
  eventCount: number
  severityBreakdown: {
    high: number
    medium: number
    low: number
  }
  categories: { [category: string]: number }
  color: RegionBounds['color']
}

export const getRegionInfo = (region: GeographicRegion): RegionBounds | null => {
  return GEOGRAPHIC_REGIONS.find(r => r.region === region) || null
}

export const getAllRegions = (): RegionBounds[] => {
  return GEOGRAPHIC_REGIONS
}

export const getRegionColor = (region: GeographicRegion, type: 'primary' | 'secondary' | 'accent' = 'primary'): string => {
  const regionInfo = getRegionInfo(region)
  return regionInfo?.color[type] || '#64748B'
}