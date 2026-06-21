'use client';

import { create } from 'zustand';

import type { RiskClass } from '@/lib/api-types';

interface ThreatFiltersState {
  minSeverity: RiskClass | null;
  hazardousOnly: boolean;
  search: string;
  setMinSeverity: (severity: RiskClass | null) => void;
  setHazardousOnly: (value: boolean) => void;
  setSearch: (search: string) => void;
  reset: () => void;
}

export const useThreatFiltersStore = create<ThreatFiltersState>((set) => ({
  minSeverity: null,
  hazardousOnly: false,
  search: '',
  setMinSeverity: (severity) => set({ minSeverity: severity }),
  setHazardousOnly: (value) => set({ hazardousOnly: value }),
  setSearch: (search) => set({ search }),
  reset: () => set({ minSeverity: null, hazardousOnly: false, search: '' }),
}));
