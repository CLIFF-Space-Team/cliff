/**
 * Earth-event domain types — mirror of `backend/app/domain/earth_event.py`.
 *
 * One `EarthEvent` represents any natural phenomenon visible on the Earth
 * dashboard regardless of source (NASA EONET, AFAD, USGS). Update
 * everything in lock-step with the backend Pydantic models.
 */

export type EarthEventSource = 'eonet' | 'afad' | 'usgs';
export type EarthEventStatus = 'open' | 'closed';
export type EarthEventSeverity = 'info' | 'low' | 'moderate' | 'high' | 'critical';

export const EARTH_SEVERITY_RANK: Record<EarthEventSeverity, number> = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

export interface EarthEventGeometry {
  date: string;
  type: 'Point' | 'Polygon';
  coordinates: number[] | number[][];
  magnitude_value: number | null;
  magnitude_unit: string | null;
}

export interface EarthEventSourceLink {
  id: string;
  url: string;
}

export interface EarthEventMetric {
  value: number;
  unit: string;
  label_tr: string;
}

export interface EarthEvent {
  id: string;
  source: EarthEventSource;
  category: string;
  title: string;
  description: string | null;
  geometries: EarthEventGeometry[];
  started_at: string;
  updated_at: string;
  closed_at: string | null;
  status: EarthEventStatus;
  severity: EarthEventSeverity;
  severity_score: number;
  primary_metric: EarthEventMetric | null;
  sources: EarthEventSourceLink[];
  raw_categories: string[];
  fetched_at: string;
  extras: Record<string, unknown>;
}

export interface EarthEventDelta {
  event_id: string;
  category: string;
  title: string;
  direction: 'new' | 'updated' | 'closed' | 'escalated' | 'deescalated';
  previous_severity: EarthEventSeverity | null;
  new_severity: EarthEventSeverity;
  previous_score: number | null;
  new_score: number;
  started_at: string;
  updated_at: string;
  point: number[] | null;
  computed_at: string;
}

export interface EarthEventAlert {
  alert_id: string;
  event_id: string;
  category: string;
  title: string;
  severity: EarthEventSeverity;
  point: number[] | null;
  started_at: string;
  description: string | null;
  sources: EarthEventSourceLink[];
  timestamp: string;
}

export interface EarthEventSummary {
  total_open: number;
  by_category: Record<string, number>;
  by_severity: Partial<Record<EarthEventSeverity, number>>;
  last_24h: number;
  last_7d: number;
  top_active: EarthEvent[];
  fetched_at: string;
}

export interface EarthCategoryMeta {
  code: string;
  label_tr: string;
  label_en: string;
  icon: string;
  accent_hex: string;
  description_tr: string;
  metric_key: string | null;
  metric_unit: string | null;
  metric_label_tr: string | null;
  severity_thresholds: number[];
  min_default_severity: EarthEventSeverity;
  eonet_codes: string[];
  sort_priority: number;
}

export interface EarthEventListResponse {
  items: EarthEvent[];
  total: number;
  page: { limit: number; offset: number };
  filters: {
    categories: string[];
    sources: string[];
    severity_min: EarthEventSeverity | null;
    status: 'open' | 'closed' | 'all';
    days: number | null;
    sort_by: 'recent' | 'severity';
  };
  fetched_at: string;
}

export interface EarthEventFilters {
  categories?: string[];
  sources?: EarthEventSource[];
  severity_min?: EarthEventSeverity;
  status?: 'open' | 'closed' | 'all';
  days?: number;
  sort_by?: 'recent' | 'severity';
  limit?: number;
  offset?: number;
}

export interface EarthCategoriesResponse {
  items: EarthCategoryMeta[];
  total: number;
  fetched_at: string;
}
