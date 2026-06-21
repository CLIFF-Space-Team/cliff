'use client';

import { TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Surface } from '@/components/ui';

import type { AdminTrendPoint } from '@/hooks/useAdminAnalytics';

interface AdminTrendChartProps {
  points: AdminTrendPoint[];
}

function shortDate(iso: string): string {
  // iso = YYYY-MM-DD → "06 May"
  const [, m, d] = iso.split('-');
  if (!m || !d) return iso;
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const idx = Number(m) - 1;
  return `${d} ${months[idx] ?? m}`;
}

export function AdminTrendChart({ points }: AdminTrendChartProps) {
  const data = points.map((p) => ({
    label: shortDate(p.date),
    Görüntüleme: p.views,
    Tekil: p.uniques,
  }));

  return (
    <Surface elevation={1} className="flex h-full min-h-[260px] flex-col p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
        <TrendingUp className="size-3" />
        Son 7 gün · trend
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 12, bottom: 4, left: -8 }}
          >
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              stroke="rgba(255,255,255,0.4)"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.4)"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: '#141414',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 6,
                fontSize: 11,
              }}
              labelStyle={{ color: '#9ca3af' }}
              itemStyle={{ color: '#e5e7eb' }}
              cursor={{ stroke: 'rgba(255,255,255,0.15)' }}
            />
            <Legend
              wrapperStyle={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="Görüntüleme"
              stroke="#22d3ee"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Tekil"
              stroke="#a78bfa"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Surface>
  );
}
