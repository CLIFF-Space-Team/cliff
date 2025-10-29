import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type RiskFilter = 'critical' | 'high' | 'medium' | 'low' | 'none'

export interface ThreatFilters {
  q?: string
  risks: RiskFilter[]
  minDiameterKm?: number
  maxDiameterKm?: number
  maxLd?: number
  windowDays: 7 | 30 | 90
  sort: '-risk' | 'risk' | 'date' | '-date' | 'diameter' | '-diameter' | 'name' | '-name'
  page: number
  pageSize: number
}

interface ThreatFiltersStore {
  filters: ThreatFilters
  setFilters: (partial: Partial<ThreatFilters>) => void
  reset: () => void
}

const defaultFilters: ThreatFilters = {
  q: '',
  risks: [],
  minDiameterKm: undefined,
  maxDiameterKm: undefined,
  maxLd: undefined,
  windowDays: 30,
  sort: '-risk',
  page: 1,
  pageSize: 20,
}

export const useThreatFilters = create<ThreatFiltersStore>()(
  devtools(
    (set) => ({
      filters: { ...defaultFilters },
      setFilters: (partial) => set((state) => ({ filters: { ...state.filters, ...partial } }), false, 'setFilters'),
      reset: () => set({ filters: { ...defaultFilters } }, false, 'resetFilters'),
    }),
    { name: 'threat-filters' }
  )
)


