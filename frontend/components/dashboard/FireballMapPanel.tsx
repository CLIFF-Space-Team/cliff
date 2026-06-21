'use client';

import { Flame, MapPin } from 'lucide-react';

import { Skeleton, SourceLabel, Surface } from '@/components/ui';
import { useFireballs, type FireballRow } from '@/hooks/useFireballs';
import { formatTimestamp } from '@/lib/format';

export function FireballMapPanel() {
  const { data, isLoading, isError } = useFireballs(120);

  // Build a top-N list by energy
  const top = (data ?? [])
    .filter((r) => Number.isFinite(r.energy) && r.energy > 0)
    .sort((a, b) => b.energy - a.energy)
    .slice(0, 12);

  return (
    <Surface elevation={1} className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
            <Flame className="size-3.5 text-threat-high" />
            Atmosferik Patlamalar
          </h2>
          <p className="text-[11px] text-text-tertiary">JPL Fireball — geçmiş kayıtlar</p>
        </div>
        <span className="font-mono-tnum text-[10px] text-text-tertiary">{data?.length ?? 0}</span>
      </div>

      {/* World silhouette + dots */}
      <div className="relative aspect-[2/1] w-full border-b border-white/[0.06] bg-surface-2/30">
        <svg viewBox="-180 -90 360 180" className="absolute inset-0 h-full w-full">
          {/* Simple equator + meridians grid */}
          <g stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" fill="none">
            <line x1="-180" y1="0" x2="180" y2="0" />
            <line x1="0" y1="-90" x2="0" y2="90" />
            <line x1="-90" y1="-90" x2="-90" y2="90" />
            <line x1="90" y1="-90" x2="90" y2="90" />
            <line x1="-180" y1="-45" x2="180" y2="-45" />
            <line x1="-180" y1="45" x2="180" y2="45" />
          </g>
          {data?.slice(0, 200).map((r, i) => (
            <FireballDot key={i} row={r} />
          ))}
        </svg>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {isError && (
          <div className="px-4 py-6 text-sm text-threat-critical">Fireball verisi alınamadı.</div>
        )}
        {isLoading && (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        )}
        {!isLoading && !isError && top.length > 0 && (
          <ul role="list" className="divide-y divide-white/[0.04]">
            {top.map((r) => (
              <li key={`${r.date}-${r.lat}-${r.lon}`} className="flex items-center justify-between gap-2 px-4 py-2">
                <div className="min-w-0">
                  <div className="font-mono-tnum text-[11px] text-text-primary">
                    {r.energy.toLocaleString('en-US', { maximumFractionDigits: 2 })} kt
                  </div>
                  <div className="flex items-center gap-1 font-mono-tnum text-[10px] text-text-tertiary">
                    <MapPin className="size-2.5" />
                    {r.lat.toFixed(2)}°, {r.lon.toFixed(2)}°
                  </div>
                </div>
                <span className="font-mono-tnum text-[10px] text-text-tertiary">
                  {formatTimestamp(r.date)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="border-t border-white/[0.06]">
        <SourceLabel
          source="JPL CNEOS Fireball"
          href="https://cneos.jpl.nasa.gov/fireballs/"
        />
      </div>
    </Surface>
  );
}

function FireballDot({ row }: { row: FireballRow }) {
  // Energy → radius (log scale, 0.5..3 svg units)
  const r = Math.max(0.4, Math.min(3, Math.log10(1 + row.energy) * 0.9));
  const tone =
    row.energy >= 100
      ? '#ef4444'
      : row.energy >= 10
        ? '#f97316'
        : row.energy >= 1
          ? '#eab308'
          : '#94a3b8';
  return (
    <circle
      cx={row.lon}
      cy={-row.lat}
      r={r}
      fill={tone}
      fillOpacity={0.55}
      stroke={tone}
      strokeOpacity={0.9}
      strokeWidth={0.2}
    />
  );
}
