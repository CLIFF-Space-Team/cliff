export interface ThreatAlert {
  id: string
  title: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  message: string
  timestamp: string
  source: string
  risk_score: number
  auto_dismiss?: boolean
  dismiss_after?: number
  metadata?: {
    location?: { lat: number; lon: number }
    affected_regions?: string[]
    asteroid_id?: string
    event_id?: string
  }
}
export interface ThreatData {
  id: string
  name: string
  type: "asteroid" | "solar_flare" | "space_debris" | "earth_event"
  threat_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  risk_score: number
  distance?: number
  velocity?: number
  size?: number
  impact_probability?: number
  time_to_event?: string
  location?: { lat: number; lon: number }
  affected_regions?: string[]
  data_source?: string
  last_updated?: string
}
export interface VisualizationData {
  id: string
  type: "line" | "bar" | "area" | "radar" | "donut" | "scatter" | "heatmap"
  title: string
  subtitle?: string
  data: any[]
  config?: {
    colors?: string[]
    showLegend?: boolean
    showGrid?: boolean
    animated?: boolean
    interactive?: boolean
    responsive?: boolean
  }
}
export interface DashboardState {
  threats: ThreatData[]
  alerts: ThreatAlert[]
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  activeView: string
  filters: {
    severity: string[]
    type: string[]
    dateRange: { start: Date; end: Date }
  }
  preferences: {
    autoRefresh: boolean
    refreshInterval: number
    notifications: boolean
    sound: boolean
  }
}
export interface AIAnalysisResult {
  session_id: string
  timestamp: string
  threat_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  confidence_score: number
  threat_score: number
  insights: string[]
  recommendations: string[]
  model_count: number
  processing_time: number
  raw_data?: any
}
export interface AsteroidData {
  id: string
  name: string
  absolute_magnitude_h: number
  estimated_diameter: {
    kilometers: {
      estimated_diameter_min: number
      estimated_diameter_max: number
    }
  }
  is_potentially_hazardous_asteroid: boolean
  close_approach_data: Array<{
    close_approach_date: string
    close_approach_date_full: string
    relative_velocity: {
      kilometers_per_second: string
      kilometers_per_hour: string
    }
    miss_distance: {
      astronomical: string
      lunar: string
      kilometers: string
    }
    orbiting_body: string
  }>
  orbital_data?: any
}
export interface EarthEventData {
  id: string
  title: string
  description?: string
  link?: string
  categories: Array<{
    id: number
    title: string
  }>
  sources?: Array<{
    id: string
    url: string
  }>
  geometry: Array<{
    magnitudeValue?: number
    magnitudeUnit?: string
    date: string
    type: string
    coordinates: [number, number]
  }>
}
export interface SpaceWeatherData {
  messageType: string
  messageID: string
  messageURL?: string
  messageIssueTime: string
  messageBody?: string
  severity?: string
  phenomena?: string
  location?: string
}
export interface TimeSeriesData {
  date: string | Date
  value: number
  category?: string
  label?: string
}
export interface CategoryData {
  category: string
  value: number
  percentage?: number
  color?: string
}
export interface RadarDataPoint {
  axis: string
  value: number
  fullMark?: number
}
export interface NotificationItem {
  id: string
  type: "threat" | "system" | "analysis" | "alert" | "info"
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionable: boolean
  source?: string
  action?: {
    label: string
    handler: () => void
  }
  metadata?: Record<string, any>
}
export interface PerformanceMetrics {
  fps: number
  renderTime: number
  memoryUsage: number
  cpuUsage?: number
  networkLatency?: number
  dataProcessingTime?: number
  activeConnections: number
  queuedRequests: number
}
export interface SystemStatus {
  status: "healthy" | "degraded" | "critical" | "maintenance"
  uptime: number
  lastHealthCheck: Date
  components: {
    api: ComponentStatus
    websocket: ComponentStatus
    database: ComponentStatus
    ai_ensemble: ComponentStatus
    nasa_collector: ComponentStatus
    notifications: ComponentStatus
  }
  metrics: PerformanceMetrics
}
export interface ComponentStatus {
  name: string
  status: "operational" | "degraded" | "down" | "maintenance"
  responseTime?: number
  errorRate?: number
  lastChecked: Date
  message?: string
}
export interface FilterOptions {
  severity?: ("LOW" | "MEDIUM" | "HIGH" | "CRITICAL")[]
  type?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  distance?: {
    min: number
    max: number
    unit: "km" | "au" | "lunar"
  }
  size?: {
    min: number
    max: number
    unit: "m" | "km"
  }
  riskScore?: {
    min: number
    max: number
  }
}
export interface SortOptions {
  field: "date" | "severity" | "risk_score" | "distance" | "size" | "name"
  direction: "asc" | "desc"
}
export interface WSMessage {
  type: string
  data: any
  timestamp: string
  id?: string
  source?: string
}
export interface WSConnectionState {
  status: "connecting" | "connected" | "disconnected" | "error"
  reconnectAttempts: number
  lastError?: string
  lastConnected?: Date
}
