

export type ThreatLevel = 'Düşük' | 'Orta' | 'Yüksek'
export type AlertLevel = 'Düşük' | 'Orta' | 'Yüksek'
export type Severity = 'Düşük' | 'Orta' | 'Yüksek'


export interface SimpleAsteroid {
  id: string
  name: string
  threat_level: ThreatLevel
  is_hazardous: boolean
  approach_date: string
  distance_km?: number
  diameter_km?: number
  velocity_kmh?: number
}

export interface AsteroidSummary {
  asteroids: SimpleAsteroid[]
  total_count: number
  hazardous_count: number
  threat_distribution: {
    high: number
    medium: number
    low: number
  }
  last_updated: string
}


export interface SimpleEarthEvent {
  id: string
  title: string
  category: string
  severity: Severity
  date: string
  location?: string
  description?: string
}

export interface EarthEventSummary {
  events: SimpleEarthEvent[]
  total_count: number
  severity_distribution: {
    high: number
    medium: number
    low: number
  }
  category_distribution: Record<string, number>
  last_updated: string
}


export interface SimpleSpaceWeather {
  id: string
  type: string
  intensity: Severity
  start_time: string
  impact?: string
  duration?: string
}

export interface SpaceWeatherSummary {
  events: SimpleSpaceWeather[]
  total_count: number
  intensity_distribution: {
    high: number
    medium: number
    low: number
  }
  recent_high_activity: number
  current_condition: string
  last_updated: string
}


export interface CurrentThreatStatus {
  threat_level: ThreatLevel
  color: string
  description: string
  active_threats: {
    asteroids: number
    earth_events: number
    space_weather: number
  }
  recommendations: string[]
  last_updated: string
  confidence: number
}

export interface ThreatSummary {
  overall_status: 'normal' | 'watch' | 'elevated'
  high_priority_threats: Array<{
    type: string
    title: string
    description?: string
    level: ThreatLevel
  }>
  medium_priority_threats: Array<{
    type: string
    title: string
    level: ThreatLevel
  }>
  statistics: {
    total_asteroids: number
    hazardous_asteroids: number
    active_earth_events: number
    space_weather_events: number
  }
  last_updated: string
}


export interface SimpleAlert {
  id: string
  level: AlertLevel
  title: string
  message: string
  type: 'asteroid' | 'earth_event' | 'space_weather'
  created_at: string
  expires_at?: string
}


export interface SystemStatus {
  timestamp: string
  status: 'OPERATIONAL' | 'DEGRADED' | 'ERROR'
  threat_level: ThreatLevel
  active_objects: number
  recommendations: string[]
}


export interface APIResponse<T> {
  data: T
  success: boolean
  message?: string
  timestamp: string
}

export interface APIError {
  error: string
  message: string
  code?: string
  timestamp: string
}


export interface APIConfig {
  baseURL: string
  timeout: number
  headers: Record<string, string>
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    has_next: boolean
    has_prev: boolean
  }
}


export interface AsteroidData {
  id: string
  name: string
  is_potentially_hazardous_asteroid: boolean
  estimated_diameter?: {
    kilometers?: {
      estimated_diameter_max?: number
    }
  }
  close_approach_data?: Array<{
    close_approach_date: string
    miss_distance?: {
      kilometers?: string
    }
    relative_velocity?: {
      kilometers_per_hour?: string
    }
  }>
}

export interface EarthEvent {
  id: string
  title: string
  categories: Array<{
    id: number
    title: string
  }>
  geometry: Array<{
    date: string
    coordinates: number[]
  }>
  description?: string
}

export interface SpaceObject {
  id: string
  name: string
  type: 'asteroid' | 'comet' | 'planet' | 'moon'
  threat_level?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
  diameter?: number
  distance?: number
}


export interface NasaNeoResponse {
  element_count: number
  near_earth_objects: Record<string, any[]>
}

export interface NasaEonetResponse {
  events: any[]
}

export interface NasaDonkiResponse extends Array<any> {}


export const convertThreatLevel = (oldLevel: string): ThreatLevel => {
  switch (oldLevel?.toUpperCase()) {
    case 'LOW':
    case 'INFO':
      return 'Düşük'
    case 'MODERATE':
    case 'MEDIUM':
    case 'WARNING':
      return 'Orta'
    case 'HIGH':
    case 'CRITICAL':
      return 'Yüksek'
    default:
      return 'Düşük'
  }
}

export const getThreatColor = (level: ThreatLevel): string => {
  switch (level) {
    case 'Düşük':
      return '#22c55e' 
    case 'Orta':
      return '#f59e0b' 
    case 'Yüksek':
      return '#ef4444' 
    default:
      return '#6b7280' 
  }
}

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'normal':
      return '#22c55e'
    case 'watch':
      return '#f59e0b'
    case 'elevated':
      return '#ef4444'
    default:
      return '#6b7280'
  }
}


export const EARTH_EVENT_CATEGORIES = {
  'Volcanoes': 'Yanardağ',
  'Wildfires': 'Orman Yangını',
  'Severe Storms': 'Şiddetli Fırtına',
  'Floods': 'Sel',
  'Earthquakes': 'Deprem',
  'Drought': 'Kuraklık',
  'Dust and Haze': 'Toz Fırtınası',
  'Landslides': 'Heyelan',
  'Temperature Extremes': 'Aşırı Sıcaklık',
  'Snow': 'Kar Fırtınası'
} as const

export const SPACE_WEATHER_TYPES = {
  'Solar Flare': 'Güneş Patlaması',
  'CME': 'Koronal Kütle Atımı',
  'Geomagnetic Storm': 'Jeomanyetik Fırtına'
} as const


export interface DateRange {
  start: string
  end: string
}

export interface Coordinates {
  lat: number
  lon: number
}

export interface Statistics {
  total: number
  by_category: Record<string, number>
  by_severity: Record<string, number>
}


export interface ThreatContextValue {
  currentThreat: CurrentThreatStatus | null
  asteroids: SimpleAsteroid[]
  earthEvents: SimpleEarthEvent[]
  spaceWeather: SimpleSpaceWeather[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export interface NotificationPreferences {
  enabled: boolean
  levels: ThreatLevel[]
  types: string[]
}


export interface WebSocketMessage {
  type: 'threat_update' | 'alert' | 'status_change'
  data: any
  timestamp: string
}


export const DEFAULT_THREAT_LEVEL: ThreatLevel = 'Düşük'
export const DEFAULT_ALERT_LEVEL: AlertLevel = 'Düşük'
export const DEFAULT_SEVERITY: Severity = 'Düşük'

export const THREAT_COLORS = {
  'Düşük': '#22c55e',
  'Orta': '#f59e0b', 
  'Yüksek': '#ef4444'
} as const