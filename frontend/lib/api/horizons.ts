const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  (globalThis as any)?.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000'

export type HybridAnalysis = {
  success: boolean
  source: string
  ephemeris: any
  uncertainty: any
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
    probabilities: Record<string, number>
    features: Record<string, number>
  }
  explanation: string
}

export async function fetchHybridAnalysis(targetId: string, days = 30): Promise<HybridAnalysis> {
  const url = `${API_BASE}/api/v1/horizons/asteroid/${encodeURIComponent(targetId)}/hybrid-analysis?days=${days}`
  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) {
    throw new Error(`Hybrid analysis failed: ${res.status}`)
  }
  return res.json()
}

export async function fetchFuturePositions(targetId: string, days = 30): Promise<any> {
  const url = `${API_BASE}/api/v1/horizons/asteroid/${encodeURIComponent(targetId)}/future-positions?days=${days}`
  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) {
    throw new Error(`Future positions failed: ${res.status}`)
  }
  return res.json()
}


