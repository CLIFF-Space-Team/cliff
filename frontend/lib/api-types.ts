/**
 * Mirror of backend Pydantic response models.
 *
 * Keep in sync with `backend/app/domain/{neo,risk,alert}.py`. When the backend
 * shape evolves, update these types and any consumer hook.
 */

export type RiskClass = 'minimal' | 'low' | 'moderate' | 'high' | 'critical';

export type RiskDirection = 'up' | 'down' | 'new' | 'same';

export interface MCSummary {
  samples: number;
  mean_km: number;
  std_km: number;
  p1_km: number;
  p50_km: number;
  p99_km: number;
  closest_p1_km: number;
}

export interface RiskRecord {
  neo_id: string;
  designation: string | null;
  name: string;
  risk_class: RiskClass;
  hybrid_score: number;
  ml_confidence: number;

  diameter_max_km: number | null;
  next_approach_at: string | null;
  miss_distance_km: number | null;
  relative_velocity_kms: number | null;
  is_potentially_hazardous: boolean;
  sentry_listed: boolean;

  monte_carlo: MCSummary | null;

  helio_position_au: [number, number, number] | null;
  geo_distance_au: number | null;

  computed_at: string;
  fetched_at: string;
}

export interface RiskDelta {
  neo_id: string;
  name: string;
  previous_class: RiskClass | null;
  new_class: RiskClass;
  previous_score: number | null;
  new_score: number;
  direction: RiskDirection;
  computed_at: string;
}

export interface RiskSnapshot {
  items: RiskRecord[];
  total: number;
  computed_at: string;
}

export interface ThreatAlert {
  alert_id: string;
  neo_id: string;
  name: string;
  severity: RiskClass;
  title: string;
  description: string;
  previous_class: RiskClass | null;
  miss_distance_km: number | null;
  next_approach_at: string | null;
  actions: string[];
  issued_at: string;
  expires_at: string | null;
}

export interface HybridAnalysis {
  neo_id: string;
  days_ahead: number;
  nominal_min_distance_km: number | null;
  nominal_velocity_kms: number | null;
  sigma_km: number;
  monte_carlo: MCSummary | null;
  ml_class: RiskClass;
  ml_confidence: number;
  hybrid_score: number;
  computed_at: string;
  rows_count: number;
  notes: string[];
}

/** Tek bir JPL Horizons gözlemci-modu efemeris satırı. */
export interface EphemerisRow {
  when: string;
  delta_au: number;
  deldot_kms: number;
  ra: string | null;
  dec: string | null;
  apmag: number | null;
}

export interface EphemerisResponse {
  /** Backend parse edilmiş satırları `_rows` altında verir (ham payload + bu). */
  _rows: EphemerisRow[];
}

export interface ImpactRequest {
  diameter_m: number;
  velocity_kms: number;
  angle_deg: number;
  density_kg_m3: number;
  target_density_kg_m3: number;
  target_lat?: number;
  target_lng?: number;
}

export interface ImpactResult {
  energy_megatons: number;
  crater_diameter_km: number;
  crater_depth_km: number;
  thermal_radius_km: number;
  seismic_magnitude: number;
  overpressure_radius_km: number;
  estimated_casualties: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  history: ChatMessage[];
  query: string;
  temperature?: number;
  stream?: boolean;
}

export interface ChatResponse {
  request_id: string;
  reply: string;
  model: string;
}

// Threat-explanation types moved into the shared-cache flow
// (`hooks/useCachedExplanation.ts` defines its own `CachedExplanation`).
// The legacy `/ai/threat-explanation` endpoint still exists on the backend
// for ad-hoc CLI use, but nothing in the UI consumes its raw shape any more.

export type MissionStatus =
  | 'cruise'
  | 'rendezvous'
  | 'extended'
  | 'completed'
  | 'returning'
  | 'lost';

export interface Mission {
  id: string;
  name: string;
  agency: string;
  naif_id: string;
  target: string;
  status: MissionStatus;
  launch_date: string;
  description_tr: string;
  description_en: string;
  earth_distance_km: number | null;
  sun_distance_au: number | null;
  velocity_kms: number | null;
  last_updated: string | null;
  telemetry_source: string;
  telemetry_available: boolean;
}

export interface MissionListResponse {
  items: Mission[];
  total: number;
  fetched_at: string;
  source: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'offline';
  version: string;
  environment: string;
  timestamp: string;
  components: {
    redis: 'healthy' | 'unhealthy';
    scheduler?: {
      enabled: boolean;
      cycle_count: number;
      last_cycle_at: string | null;
    };
  };
}
