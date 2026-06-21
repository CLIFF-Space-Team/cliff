'use client';

import { Rocket } from 'lucide-react';

import { Skeleton, SourceLabel, Surface } from '@/components/ui';
import { useMissions } from '@/hooks/useMissions';
import type { Mission, MissionStatus } from '@/lib/api-types';
import { formatDistanceKm, formatVelocity } from '@/lib/format';

const STATUS_LABEL: Record<MissionStatus, string> = {
  cruise: 'Yolda',
  rendezvous: 'Rendezvous',
  returning: 'Dönüş',
  completed: 'Tamamlandı',
  extended: 'Uzatıldı',
  lost: 'Bağlantı kayıp',
};

const STATUS_TONE: Record<MissionStatus, string> = {
  cruise: 'border-threat-moderate/40 bg-threat-moderate/10 text-threat-moderate',
  rendezvous: 'border-threat-low/40 bg-threat-low/10 text-threat-low',
  returning: 'border-threat-high/40 bg-threat-high/10 text-threat-high',
  completed: 'border-white/15 bg-surface-2 text-text-secondary',
  extended: 'border-threat-low/40 bg-threat-low/10 text-threat-low',
  lost: 'border-threat-critical/40 bg-threat-critical/10 text-threat-critical',
};

export function MissionTrackerPanel() {
  const { data, isLoading, isError } = useMissions();

  return (
    <Surface elevation={1} className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            <Rocket className="size-3.5" />
            Asteroid Misyonları
          </h2>
          <p className="text-[11px] text-text-tertiary">Aktif uzay araçları · canlı telemetri</p>
        </div>
        <span className="font-mono-tnum text-[10px] text-text-tertiary">
          {data?.total ?? 0}
        </span>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {isError && (
          <div className="px-4 py-6 text-sm text-threat-critical">
            Misyon verisi alınamadı.
          </div>
        )}
        {isLoading && !data && (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        )}
        {data && (
          <ul role="list" className="divide-y divide-white/[0.04]">
            {data.items.map((m) => (
              <MissionRow key={m.id} mission={m} />
            ))}
          </ul>
        )}
      </div>
      <div className="border-t border-white/[0.06]">
        <SourceLabel
          source="JPL Horizons (DE441)"
          updatedAt={data?.fetched_at ?? null}
          href="https://ssd.jpl.nasa.gov/horizons/"
        />
      </div>
    </Surface>
  );
}

function MissionRow({ mission }: { mission: Mission }) {
  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-text-primary">{mission.name}</span>
            <span className="font-mono-tnum text-[10px] text-text-tertiary">{mission.agency}</span>
          </div>
          <div className="mt-0.5 truncate text-[11px] text-text-secondary">→ {mission.target}</div>
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-text-tertiary">
            {mission.description_tr}
          </p>
          {mission.telemetry_available ? (
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono-tnum text-[10px] text-text-secondary">
              <span>
                <span className="text-text-tertiary">Δ Dünya:</span>{' '}
                {formatDistanceKm(mission.earth_distance_km)}
              </span>
              {mission.sun_distance_au != null && (
                <span>
                  <span className="text-text-tertiary">Δ Güneş:</span>{' '}
                  {mission.sun_distance_au.toFixed(2)} AU
                </span>
              )}
              <span>
                <span className="text-text-tertiary">vrad:</span>{' '}
                {formatVelocity(mission.velocity_kms)}
              </span>
            </div>
          ) : (
            <div className="mt-1.5 font-mono-tnum text-[10px] text-text-tertiary">
              Telemetri geçici olarak alınamıyor
            </div>
          )}
        </div>
        <span
          className={`rounded-md border px-2 py-0.5 text-[9px] uppercase tracking-wider ${STATUS_TONE[mission.status]}`}
        >
          {STATUS_LABEL[mission.status]}
        </span>
      </div>
    </li>
  );
}
