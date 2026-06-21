'use client';

import { Globe2, Map } from 'lucide-react';

import { AdminKpiTiles } from '@/components/admin/AdminKpiTiles';
import { AdminRecentTable } from '@/components/admin/AdminRecentTable';
import { AdminTopList } from '@/components/admin/AdminTopList';
import { AdminTrendChart } from '@/components/admin/AdminTrendChart';
import { TokenEntry } from '@/components/admin/TokenEntry';
import { Skeleton, Surface } from '@/components/ui';
import {
  useAdminLiveCount,
  useAdminOverview,
  useAdminRecentVisits,
  useAdminWhoami,
} from '@/hooks/useAdminAnalytics';

const COUNTRY_NAMES: Record<string, string> = {
  TR: 'Türkiye',
  US: 'Amerika',
  DE: 'Almanya',
  GB: 'Birleşik Krallık',
  FR: 'Fransa',
  NL: 'Hollanda',
  RU: 'Rusya',
  CN: 'Çin',
  JP: 'Japonya',
  IN: 'Hindistan',
  CA: 'Kanada',
  AU: 'Avustralya',
  BR: 'Brezilya',
  ES: 'İspanya',
  IT: 'İtalya',
};

export default function AdminPage() {
  const whoami = useAdminWhoami();
  const isAdmin = whoami.data?.authenticated === true;
  const overview = useAdminOverview(isAdmin);
  const recent = useAdminRecentVisits(80, isAdmin);
  const liveCount = useAdminLiveCount(overview.data?.live_count);

  // Pre-auth states
  if (whoami.isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!isAdmin) {
    return <TokenEntry visitorIp={whoami.data?.ip} />;
  }

  const data = overview.data;

  return (
    <div className="space-y-3 p-3 sm:p-4">
      <header className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-base font-semibold text-text-primary">
            Yönetici · Analitik
          </h1>
          <p className="font-mono-tnum text-[11px] text-text-tertiary">
            {whoami.data?.method === 'ip'
              ? `IP whitelist · ${whoami.data.ip}`
              : `bearer token · ${whoami.data?.ip ?? ''}`}
            {whoami.data?.country ? ` · ${whoami.data.country}` : ''}
          </p>
        </div>
        <div className="text-right text-[10px] uppercase tracking-wider text-text-tertiary">
          {overview.isFetching ? 'güncelleniyor…' : '30s otomatik tazeleme'}
        </div>
      </header>

      {/* KPI ribbon */}
      <AdminKpiTiles
        todayViews={data?.today.views ?? 0}
        todayUniques={data?.today.uniques ?? 0}
        liveNow={liveCount}
        totalViews90d={data?.totals_90d?.views ?? 0}
      />

      {/* Trend + top lists */}
      <div className="grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <AdminTrendChart points={data?.last_7d ?? []} />
        </div>
        <div className="space-y-3 lg:col-span-4">
          <AdminTopList
            title="En çok görüntülenen sayfalar"
            icon={Map}
            tone="cyan"
            rows={(data?.top_pages ?? []).map((p) => ({
              label: p.path,
              value: p.views,
            }))}
          />
          <AdminTopList
            title="Ülkeler"
            icon={Globe2}
            tone="violet"
            rows={(data?.top_countries ?? []).map((c) => ({
              label: c.country,
              value: c.count,
              caption: COUNTRY_NAMES[c.country],
            }))}
          />
        </div>
      </div>

      {/* Recent feed */}
      <AdminRecentTable
        rows={recent.data ?? []}
        loading={recent.isLoading || recent.isFetching}
      />

      {/* Source legend */}
      <Surface elevation={0} className="px-3 py-2 text-[10px] text-text-tertiary">
        Kaynak: paylaşımlı analitik · IP&apos;ler 7 gün, agregasyonlar 90 gün
        saklanır. UA SHA-256 hash&apos;lenir; üçüncü taraf tracker yok.
      </Surface>
    </div>
  );
}
