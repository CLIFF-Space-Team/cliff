const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  (globalThis as any)?.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000'

export type EphemerisData = {
  datetime_utc: string
  ra_icrf: string | null
  dec_icrf: string | null
  apparent_mag: number | null
  surface_brightness: number | null
  delta_au: number | null
  deldot_kms: number | null
  s_o_t_deg: number | null
  s_t_o_deg: number | null
  constellation: string | null
}

export type EphemerisResponse = {
  success: boolean
  source: string
  model: string
  object: string
  start_date: string | null
  stop_date: string | null
  step_size: string
  count: number
  data: EphemerisData[]
  raw?: string
}

export type UncertaintyHint = {
  success: boolean
  object: string
  days: number
  avg_delta_au: number
  seed_fractional_uncertainty: number
}

export type HybridAnalysis = {
  success: boolean
  source: string
  object_id: string
  ephemeris: {
    data_points: number
    date_range: {
      start: string | null
      stop: string | null
    }
    sample: EphemerisData | null
  }
  uncertainty: UncertaintyHint
  monte_carlo: {
    samples: number
    mean_km: number
    std_km: number
    ci68_km: [number, number]
    ci95_km: [number, number]
    ci99_km: [number, number]
    worst_case_km: number
  }
  ml_risk: {
    label: string
    confidence: number
    probabilities: {
      critical: number
      high: number
      medium: number
      low: number
    }
    features: {
      distance_factor: number
      uncertainty_factor: number
    }
  }
  explanation: string
  error?: string
}

export async function fetchEphemeris(
  targetId: string,
  startDate?: string,
  stopDate?: string,
  step = '1 d'
): Promise<EphemerisResponse> {
  const params = new URLSearchParams({
    step,
    ...(startDate && { start: startDate }),
    ...(stopDate && { stop: stopDate })
  })
  const url = `${API_BASE}/api/v1/horizons/asteroid/${encodeURIComponent(targetId)}/ephemeris?${params}`
  
  try {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Ephemeris failed: ${res.status}`)
    }
    return res.json()
  } catch (error) {
    console.error('❌ Horizons Ephemeris error:', error)
    throw error
  }
}

export async function fetchFuturePositions(targetId: string, days = 30, step = '1 d'): Promise<EphemerisResponse> {
  const url = `${API_BASE}/api/v1/horizons/asteroid/${encodeURIComponent(targetId)}/future-positions?days=${days}&step=${step}`
  
  try {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Future positions failed: ${res.status}`)
    }
    const data = await res.json()
    console.log(`✅ Horizons future positions: ${data.count} data points for ${targetId}`)
    return data
  } catch (error) {
    console.error('❌ Horizons Future Positions error:', error)
    throw error
  }
}

export async function fetchUncertainty(targetId: string, days = 30): Promise<UncertaintyHint> {
  const url = `${API_BASE}/api/v1/horizons/asteroid/${encodeURIComponent(targetId)}/uncertainty?days=${days}`
  
  try {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Uncertainty failed: ${res.status}`)
    }
    return res.json()
  } catch (error) {
    console.error('❌ Horizons Uncertainty error:', error)
    throw error
  }
}

export async function fetchHybridAnalysis(targetId: string, days = 30): Promise<HybridAnalysis> {
  const url = `${API_BASE}/api/v1/horizons/asteroid/${encodeURIComponent(targetId)}/hybrid-analysis?days=${days}`
  
  try {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Hybrid analysis failed: ${res.status}`)
    }
    const data = await res.json()
    console.log(`✅ Horizons hybrid analysis: ${data.ml_risk?.label} risk for ${targetId}`)
    return data
  } catch (error) {
    console.error('❌ Horizons Hybrid Analysis error:', error)
    throw error
  }
}


