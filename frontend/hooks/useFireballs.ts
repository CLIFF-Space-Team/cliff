'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

export interface FireballRow {
  date: string;
  energy: number; // kt TNT
  impactE: number;
  lat: number;
  lon: number;
  altitude: number | null;
  velocity: number | null;
}

interface FireballRaw {
  signature?: { source: string; version: string };
  count: string;
  fields: string[];
  data: string[][];
}

export function useFireballs(limit = 200, minEnergyKt?: number, daysBack?: number) {
  return useQuery({
    queryKey: ['fireball', limit, minEnergyKt ?? 0, daysBack ?? 0],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (minEnergyKt != null) params.set('min_energy_kt', String(minEnergyKt));
      if (daysBack != null) params.set('days_back', String(daysBack));
      const raw = await api.get<FireballRaw>(`/api/v1/nasa/fireball?${params}`);
      return parseRows(raw);
    },
    staleTime: 30 * 60 * 1000,
  });
}

function parseRows(raw: FireballRaw): FireballRow[] {
  const fields = raw.fields ?? [];
  const idx = (name: string) => fields.indexOf(name);
  const iDate = idx('date');
  const iEnergy = idx('energy');
  const iImpact = idx('impact-e');
  const iLat = idx('lat');
  const iLatDir = idx('lat-dir');
  const iLon = idx('lon');
  const iLonDir = idx('lon-dir');
  const iAlt = idx('alt');
  const iVel = idx('vel');

  const out: FireballRow[] = [];
  for (const row of raw.data ?? []) {
    const lat = parseSigned(row[iLat], row[iLatDir], 'S');
    const lon = parseSigned(row[iLon], row[iLonDir], 'W');
    if (lat == null || lon == null) continue;
    out.push({
      date: row[iDate] ?? '',
      energy: parseFloat(row[iEnergy] ?? '0') || 0,
      impactE: parseFloat(row[iImpact] ?? '0') || 0,
      lat,
      lon,
      altitude: row[iAlt] ? parseFloat(row[iAlt]!) : null,
      velocity: row[iVel] ? parseFloat(row[iVel]!) : null,
    });
  }
  return out;
}

function parseSigned(value: string | undefined, dir: string | undefined, neg: string): number | null {
  if (!value) return null;
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return null;
  return dir === neg ? -n : n;
}
