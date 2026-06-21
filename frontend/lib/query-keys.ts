/**
 * Single source of truth for React Query keys.
 *
 * Convention: every key is a `readonly` tuple. Group functions by domain so
 * cache invalidation is precise (`queryClient.invalidateQueries({ queryKey: queryKeys.threats.all })`).
 */

export const queryKeys = {
  health: () => ['health'] as const,

  threats: {
    all: ['threats'] as const,
    riskSnapshot: (limit?: number) => ['threats', 'risk-snapshot', limit ?? 50] as const,
    // Prefix (no limit) so WS cache merges hit every mounted limit variant
    // (20, 200, …) instead of only the default-50 key.
    riskSnapshotAll: ['threats', 'risk-snapshot'] as const,
    riskDetail: (neoId: string) => ['threats', 'risk-detail', neoId] as const,
    alerts: (limit?: number) => ['threats', 'alerts', limit ?? 50] as const,
    // Prefix so a `threat_alert` invalidation matches the limit-25 feed
    // consumer too (a fully-specified key cannot partial-match).
    alertsAll: ['threats', 'alerts'] as const,
  },

  nasa: {
    eonet: (days?: number, status?: string) =>
      ['nasa', 'eonet', days ?? 30, status ?? 'open'] as const,
  },

  horizons: {
    hybridAnalysis: (neoId: string, days: number) =>
      ['horizons', 'hybrid-analysis', neoId, days] as const,
    ephemeris: (neoId: string, days: number) =>
      ['horizons', 'ephemeris', neoId, days] as const,
  },

  ai: {
    models: ['ai', 'models'] as const,
  },

  missions: {
    list: () => ['missions', 'list'] as const,
  },

  earth: {
    // Unified pipeline (server-side filtered + WS pushed).
    events: (filtersKey?: string) => ['earth', 'events', filtersKey ?? 'default'] as const,
    eventsAll: ['earth', 'events'] as const,
    eventDetail: (id: string) => ['earth', 'event', id] as const,
    categories: () => ['earth', 'categories'] as const,
    summary: () => ['earth', 'summary'] as const,
    alertsRecent: (limit: number) => ['earth', 'alerts-recent', limit] as const,
    // Legacy single-source feeds kept for downstream consumers that still call them.
    earthquakesTr: (min: number) => ['earth', 'earthquakes-tr', min] as const,
    wildfires: (country: string, days: number) =>
      ['earth', 'wildfires', country, days] as const,
    volcanoes: () => ['earth', 'volcanoes'] as const,
  },

  impact: {
    presets: () => ['impact', 'presets'] as const,
  },

  admin: {
    whoami: () => ['admin', 'whoami'] as const,
    overview: () => ['admin', 'analytics', 'overview'] as const,
    recent: (limit: number) => ['admin', 'analytics', 'recent', limit] as const,
  },
} as const;
