'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Skeleton } from '@/components/ui';
import { useRiskTimeline } from '@/hooks/useRiskTimeline';

interface Props {
  neoId: string | null;
  days?: number;
}

/**
 * Compact 30 günlük risk skoru sparkline. AsteroidDetailDrawer içinde
 * gösterilir — kullanıcıya "tehdit artıyor mu, azalıyor mu" hissi verir.
 */
export function RiskTimelineSparkline({ neoId, days = 30 }: Props) {
  const { data, isLoading, isError } = useRiskTimeline(neoId, days);

  const chartData = useMemo(() => {
    if (!data?.samples) return [];
    return data.samples
      .slice()
      .sort((a, b) => a.ts - b.ts)
      .map((s) => ({
        ts: s.ts * 1000,
        score: s.hybrid_score,
        risk: s.risk_class,
      }));
  }, [data]);

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (isError || chartData.length === 0) {
    return (
      <p className="font-mono-tnum text-[11px] text-text-tertiary">
        Henüz yeterli zaman serisi yok.
      </p>
    );
  }

  const latest = chartData[chartData.length - 1]!;
  const earliest = chartData[0]!;
  const trend = latest.score - earliest.score;
  const trendLabel =
    Math.abs(trend) < 0.005
      ? 'sabit'
      : trend > 0
        ? `+${(trend * 100).toFixed(1)}%`
        : `${(trend * 100).toFixed(1)}%`;
  const trendColor =
    Math.abs(trend) < 0.005
      ? 'text-text-tertiary'
      : trend > 0
        ? 'text-threat-high'
        : 'text-threat-low';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
        <span>{days} günlük trend</span>
        <span className={trendColor}>{trendLabel}</span>
      </div>
      <div className="h-20 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="ts" hide />
            <YAxis domain={[0, 1]} hide />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0]?.payload as { ts: number; score: number; risk: string };
                if (!p) return null;
                return (
                  <div className="rounded-md border border-white/[0.1] bg-surface-3 px-2 py-1 text-[11px] text-text-primary shadow-panel">
                    <div className="font-mono-tnum text-[10px] text-text-tertiary">
                      {new Date(p.ts).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </div>
                    <div className="font-mono-tnum">
                      {(p.score * 100).toFixed(1)}% · {p.risk}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="hsl(0 84% 60%)"
              strokeWidth={1.5}
              fill="url(#riskFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
