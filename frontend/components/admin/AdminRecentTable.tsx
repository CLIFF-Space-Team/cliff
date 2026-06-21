'use client';

import { ListEnd } from 'lucide-react';

import { Surface } from '@/components/ui';

import type { AdminRecentVisit } from '@/hooks/useAdminAnalytics';

interface AdminRecentTableProps {
  rows: AdminRecentVisit[];
  loading?: boolean;
}

function relativeTime(unixSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - unixSeconds);
  if (diff < 60) return `${diff}s önce`;
  if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}sa önce`;
  return `${Math.floor(diff / 86400)}g önce`;
}

function statusTone(status: number): string {
  if (status >= 500) return 'text-threat-critical';
  if (status >= 400) return 'text-threat-high';
  if (status >= 300) return 'text-threat-moderate';
  return 'text-emerald-300';
}

export function AdminRecentTable({ rows, loading = false }: AdminRecentTableProps) {
  return (
    <Surface elevation={1} className="flex min-h-[280px] flex-col p-0">
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
        <ListEnd className="size-3" />
        Son ziyaretler · {rows.length}
        {loading && <span className="ml-auto text-text-tertiary">yükleniyor…</span>}
      </div>
      <div className="scrollbar-thin max-h-[420px] overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[480px] table-fixed">
          <thead className="sticky top-0 bg-surface-1 text-[9px] uppercase tracking-wider text-text-tertiary">
            <tr>
              <th className="w-[18%] px-3 py-1.5 text-left font-semibold">Zaman</th>
              <th className="w-[28%] px-3 py-1.5 text-left font-semibold">Yol</th>
              <th className="w-[22%] px-3 py-1.5 text-left font-semibold">IP</th>
              <th className="w-[12%] px-3 py-1.5 text-left font-semibold">Ülke</th>
              <th className="w-[10%] px-3 py-1.5 text-left font-semibold">Durum</th>
              <th className="w-[10%] px-3 py-1.5 text-left font-semibold">UA</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-text-tertiary">
                  Henüz ziyaret yok.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={`${row.ts}-${row.ip}-${i}`}
                  className="border-t border-white/[0.04] hover:bg-white/[0.02]"
                >
                  <td className="px-3 py-1.5 font-mono-tnum text-text-secondary">
                    {relativeTime(row.ts)}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="truncate text-text-primary" title={row.path}>
                      {row.path}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 font-mono-tnum text-text-secondary">
                    <span className="block truncate" title={row.ip}>
                      {row.ip}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 font-mono-tnum uppercase text-text-secondary">
                    {row.country || '—'}
                  </td>
                  <td className={`px-3 py-1.5 font-mono-tnum ${statusTone(row.status)}`}>
                    {row.status}
                  </td>
                  <td className="px-3 py-1.5 font-mono-tnum text-text-tertiary">
                    {row.ua_hash || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}
