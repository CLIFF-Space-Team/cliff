export interface APIResponse<T> {
  data: T
  message?: string
  status: 'success' | 'error'
  timestamp: string
  execution_time?: number
}

export interface ThreatSummary {
  total_threats: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  active_monitoring_count: number
  new_threats_24h: number
  overall_risk_score: number
  last_updated: string
  data_sources: string[]
}

export interface ThreatType {
  type: string
  count: number
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  last_updated: string
}

export interface ThreatData {
  id: string
  object_name: string
  object_designation?: string
  threat_type: string
  threat_level: 'critical' | 'high' | 'medium' | 'low'
  description: string
  impact_assessment?: string
  estimated_diameter_min?: number
  estimated_diameter_max?: number
  velocity_km_per_hour?: number
  velocity_km_per_second?: number
  miss_distance_km?: number
  miss_distance_au?: number
  is_potentially_hazardous: boolean
  close_approach_date?: string
  orbiting_body?: string
  impact_probability?: number
  magnitude?: number
  orbit_class?: string
  discovery_date?: string
  last_observation?: string
  data_source: string
  instruments?: string[]
  created_at: string
  updated_at: string
  is_active: boolean
  affected_systems?: string[]
  kp_index?: number
  dst_index?: number
}

export interface AsteroidData {
  id: string
  neo_reference_id: string
  name: string
  designation: string
  nasa_jpl_url: string
  absolute_magnitude_h: number
  estimated_diameter: {
    kilometers: {
      estimated_diameter_min: number
      estimated_diameter_max: number
    }
    meters: {
      estimated_diameter_min: number
      estimated_diameter_max: number
    }
  }
  is_potentially_hazardous_asteroid: boolean
  close_approach_data: CloseApproachData[]
  orbital_data?: OrbitalData
  is_sentry_object: boolean
  links: {
    self: string
  }
}

export interface CloseApproachData {
  close_approach_date: string
  close_approach_date_full: string
  epoch_date_close_approach: number
  relative_velocity: {
    kilometers_per_second: string
    kilometers_per_hour: string
    miles_per_hour: string
  }
  miss_distance: {
    astronomical: string
    lunar: string
    kilometers: string
    miles: string
  }
  orbiting_body: string
}

export interface OrbitalData {
  orbit_id: string
  orbit_determination_date: string
  first_observation_date: string
  last_observation_date: string
  data_arc_in_days: number
  observations_used: number
  orbit_uncertainty: string
  minimum_orbit_intersection: string
  jupiter_tisserand_invariant: string
  epoch_osculation: string
  eccentricity: string
  semi_major_axis: string
  inclination: string
  ascending_node_longitude: string
  orbital_period: string
  perihelion_distance: string
  perihelion_argument: string
  aphelion_distance: string
  perihelion_time: string
  mean_anomaly: string
  mean_motion: string
  equinox: string
  orbit_class: {
    orbit_class_type: string
    orbit_class_description: string
    orbit_class_range: string
  }
}

export interface SpaceWeatherEvent {
  id: string
  event_type: 'solar_flare' | 'cme' | 'geomagnetic_storm' | 'radiation_storm' | 'radio_blackout'
  severity: 'minor' | 'moderate' | 'strong' | 'severe' | 'extreme'
  start_time: string
  peak_time?: string
  end_time?: string
  duration?: number
  magnitude?: number
  location?: string
  description: string
  impact_description?: string
  affected_systems: string[]
  kp_index?: number
  dst_index?: number
  source: string
  instruments: string[]
  active: boolean
  links?: {
    details?: string
    forecast?: string
  }
}

export interface SolarActivity {
  sunspot_number: number
  solar_flux: number
  xray_class?: string
  proton_flux?: number
  electron_flux?: number
  planetary_k_index: number
  dst_index: number
  geomagnetic_field: 'quiet' | 'unsettled' | 'active' | 'storm'
  last_updated: string
  forecast?: {
    next_24h: string
    next_48h: string
    next_72h: string
  }
}

export interface EarthEvent {
  id: string
  event_id: string
  title: string
  description: string
  event_categories: string[]
  event_date: string
  event_location?: {
    latitude: number
    longitude: number
    location_description?: string
  }
  magnitude?: number
  severity: 'low' | 'moderate' | 'high' | 'severe'
  sources: string[]
  geometries?: Array<{
    type: string
    coordinates: number[] | number[][]
  }>
  closed?: boolean
  link?: string
}

export interface VoiceCommand {
  id: string
  text: string
  timestamp: Date
  response?: string
  confidence?: number
  processing_time?: number
  audio_url?: string
  language?: string
}

export interface VoiceResponse {
  command_id: string
  processed_at: string
  text_response: string
  audio_response?: {
    audio_data?: string
    audio_url?: string
    duration?: number
    language?: string
  }
  command_type: string
  confidence_score: number
  execution_time_ms: number
  data_sources: string[]
  related_threats?: string[]
}

export interface VoiceSettings {
  language: string
  voice: string
  speed: number
  pitch: number
  volume: number
  autoListen: boolean
  continuousListening: boolean
  noiseReduction: boolean
  echoCancellation: boolean
  sensitivity: number
}

export interface ThreatAnalysis {
  threat_id: string
  analysis_type: 'risk_assessment' | 'impact_prediction' | 'trajectory_analysis'
  confidence_score: number
  risk_factors: Array<{
    factor: string
    weight: number
    description: string
  }>
  recommendations: string[]
  impact_scenarios: Array<{
    scenario: string
    probability: number
    severity: 'low' | 'moderate' | 'high' | 'catastrophic'
    description: string
  }>
  monitoring_suggestions: string[]
  data_quality_score: number
  last_analysis: string
  next_analysis?: string
}

export interface AIInsight {
  id: string
  type: 'pattern_detection' | 'anomaly_alert' | 'prediction' | 'correlation'
  title: string
  description: string
  confidence: number
  data_points: Array<{
    source: string
    value: any
    timestamp: string
  }>
  tags: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
  expires_at?: string
}

export interface SystemStatus {
  service_name: string
  status: 'healthy' | 'degraded' | 'down' | 'maintenance'
  uptime: number
  last_check: string
  response_time_ms: number
  error_rate: number
  version: string
  dependencies: Array<{
    name: string
    status: 'healthy' | 'degraded' | 'down'
    response_time_ms?: number
  }>
  metrics?: {
    cpu_usage?: number
    memory_usage?: number
    disk_usage?: number
    network_io?: {
      bytes_in: number
      bytes_out: number
    }
  }
}

export interface SystemAlert {
  id: string
  type: 'system' | 'security' | 'performance' | 'data'
  severity: 'info' | 'warning' | 'error' | 'critical'
  title: string
  message: string
  source: string
  timestamp: string
  acknowledged: boolean
  resolved: boolean
  tags: string[]
  metadata?: Record<string, any>
}

export interface WebSocketMessage {
  type: string
  data: any
  timestamp: string
  source?: string
  client_id?: string
}

export interface WebSocketConnectionState {
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting'
  lastMessage: WebSocketMessage | null
  messageHistory: WebSocketMessage[]
  connectionHealth: {
    uptime: number
    reconnectCount: number
    lastReconnect: Date | null
    averageLatency: number
    messageCount: number
  }
}

export interface SpaceObject {
  id: string
  name: string
  type: 'asteroid' | 'comet' | 'planet' | 'satellite' | 'debris'
  position: {
    x: number
    y: number
    z: number
  }
  velocity: {
    x: number
    y: number
    z: number
  }
  size: number
  color: string
  opacity?: number
  texture?: string
  trail?: Array<{
    x: number
    y: number
    z: number
    timestamp: number
  }>
  metadata?: Record<string, any>
}

export interface VisualizationSettings {
  showTrails: boolean
  showOrbits: boolean
  showLabels: boolean
  timeScale: number
  cameraMode: 'free' | 'follow' | 'orbit' | 'earth'
  quality: 'low' | 'medium' | 'high' | 'ultra'
  effects: {
    bloom: boolean
    particles: boolean
    atmosphere: boolean
    stars: boolean
  }
}

export interface DashboardLayout {
  id: string
  name: string
  components: Array<{
    id: string
    type: string
    position: {
      x: number
      y: number
      w: number
      h: number
    }
    props?: Record<string, any>
  }>
  settings: {
    autoRefresh: boolean
    refreshInterval: number
    theme: string
  }
  created_at: string
  updated_at: string
}

export interface MetricData {
  label: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'stable'
  change?: number
  color?: string
  icon?: string
}

export interface SearchQuery {
  term: string
  filters: {
    type?: string[]
    severity?: string[]
    timeRange?: {
      start: string
      end: string
    }
    sources?: string[]
  }
  sort: {
    field: string
    order: 'asc' | 'desc'
  }
  pagination: {
    page: number
    limit: number
  }
}

export interface SearchResult<T> {
  items: T[]
  total: number
  page: number
  pages: number
  hasMore: boolean
}

export interface NotificationData {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: string
  read: boolean
  actions?: Array<{
    label: string
    action: string
    style?: 'primary' | 'secondary' | 'danger'
  }>
  metadata?: Record<string, any>
  expiresAt?: string
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  notifications: {
    email: boolean
    push: boolean
    sound: boolean
    types: string[]
  }
  dashboard: {
    defaultLayout: string
    autoRefresh: boolean
    refreshInterval: number
  }
  voice: VoiceSettings
  accessibility: {
    highContrast: boolean
    largeText: boolean
    reduceMotion: boolean
    screenReader: boolean
  }
}

export interface APIError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: string
  request_id?: string
  suggestions?: string[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
  value?: any
}

export type ThreatLevel = 'critical' | 'high' | 'medium' | 'low'
export type SystemHealth = 'healthy' | 'degraded' | 'down' | 'maintenance'
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting'
export type EventSeverity = 'minor' | 'moderate' | 'strong' | 'severe' | 'extreme'
export type AlertType = 'system' | 'threat' | 'cosmic_event' | 'data_update'

export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface LoadingState {
  isLoading: boolean
  error?: string | null
  lastUpdated?: Date
}

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  showPrevNext?: boolean
  maxVisiblePages?: number
}

export interface TimeSeriesData {
  timestamp: string
  value: number
  label?: string
  metadata?: Record<string, any>
}

export interface ChartData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string | string[]
    borderWidth?: number
    fill?: boolean
  }>
}

export * from './api'
export * from './components'