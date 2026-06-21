'use client';

import { TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

import { Skeleton } from '@/components/ui';
import { useRiskTimeline } from '@/hooks/useRiskTimeline';
import type { RiskClass } from '@/lib/api-types';

interface RiskSparklineProps {
  neoId: string;
}

const CLASS_COLOR: Record<RiskClass, string> = {
  critical: '#ef4444',
  high: '#f97316',
  moderate: '#eab308',
  low: '#22c55e',
  minimal: '#94a3b8',
};

/**
 * Compact SVG sparkline of hybrid_score over time. Uses a straight polyline
 * with severity-tinted dots at each sample. Self-scales Y to the visible
 * data range with a gentle floor of 0.0..1.0.
 */
export function RiskSparkline({ neoId }: RiskSparklineProps) {
  const { data, isLoading, isError } = useRiskTimeline(neoId, 30);

  const view = useMemo(() => {
    const samples = data?.samples ?? [];
    if (samples.length < 2) return null;
    const W = 280;
    const H = 60;
    const PAD_X = 4;
    const PAD_Y = 6;
    const tMin = samples[0]!.ts;
    const tMax = samples[samples.length - 1]!.ts;
    const tSpan = Math.max(1, tMax - tMin);

    const yVals = samples.map((s) => s.hybrid_score);
    const yMax = Math.max(0.05, Math.max(...yVals) * 1.1);
    const yMin = 0;

    const x = (t: number) => PAD_X + ((t - tMin) / tSpan) * (W - 2 * PAD_X);
    const y = (v: number) => H - PAD_Y - ((v - yMin) / (yMax - yMin)) * (H - 2 * PAD_Y);

    const linePath = samples
      .map((s, i) => `${i === 0 ? 'M' : 'L'} ${x(s.ts).toFixed(1)} ${y(s.hybrid_score).toFixed(1)}`)
      .join(' ');
    const fillPath = `${linePath} L ${x(tMax).toFixed(1)} ${H - PAD_Y} L ${x(tMin).toFixed(1)} ${H - PAD_Y} Z`;

    return { W, H, samples, x, y, linePath, fillPath, yMax };
  }, [data?.samples]);

  const samples = data?.samples ?? [];

  return (
    <div className="rounded-md border border-white/[0.06] bg-surface-1 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
          <TrendingUp className="size-3" />
          risk skoru · 30 gün
        </div>
        <div className="font-mono-tnum text-[10px] text-text-tertiary">
          {samples.length} sample
        </div>
      </div>
      {isLoading && <Skeleton className="h-[60px] w-full" />}
      {isError && (
        <div className="text-[11px] text-threat-critical">Timeline alınamadı.</div>
      )}
      {!isLoading && !isError && samples.length < 2 && (
        <div className="py-3 text-center text-[11px] text-text-tertiary">
          Henüz yeterli sample yok. Scheduler birkaç döngü daha tamamladığında dolacak.
        </div>
      )}
      {view && (
        <svg
          viewBox={`0 0 ${view.W} ${view.H}`}
          className="w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`spark-${neoId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#ffffff" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <path d={view.fillPath} fill={`url(#spark-${neoId})`} />
          <path
            d={view.linePath}
            fill="none"
            stroke="#ffffff"
            strokeOpacity={0.65}
            strokeWidth={1}
          />
          {samples.map((s, i) => (
            <circle
              key={i}
              cx={view.x(s.ts)}
              cy={view.y(s.hybrid_score)}
              r={1.6}
              fill={CLASS_COLOR[s.risk_class]}
            />
          ))}
        </svg>
      )}
    </div>
  );
}
