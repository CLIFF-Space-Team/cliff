'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

import { AsteroidFocusOverlay } from '@/components/asteroid/AsteroidFocusOverlay';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { FeaturedNeoCard } from '@/components/dashboard/FeaturedNeoCard';
import { Skeleton } from '@/components/ui';
import { useLiteMode } from '@/hooks/useLiteMode';
import { useRiskSnapshot } from '@/hooks/useRiskSnapshot';
import { subscribeDemoAction } from '@/lib/demo-event-bus';
import { useDashboardStore } from '@/stores/dashboard';

const SolarSystemScene = dynamic(
  () => import('@/components/3d/SolarSystemScene').then((m) => m.SolarSystemScene),
  {
    ssr: false,
    loading: () => <Skeleton className="absolute inset-0" />,
  },
);

// Tam-detay drawer'ı yalnızca "Tam detay" tıklanınca açılır — ağır bağımlılık
// ağacını (Monte Carlo + timeline + AI) ilk yükten çıkarmak için lazy yükle.
const AsteroidDetailDrawer = dynamic(
  () =>
    import('@/components/asteroid/AsteroidDetailDrawer').then(
      (m) => m.AsteroidDetailDrawer,
    ),
  { ssr: false },
);

export default function DashboardPage() {
  const storedQuality = useDashboardStore((s) => s.sceneQuality);
  const liteMode = useLiteMode();
  const quality = liteMode ? 'low' : storedQuality;
  const selectedNeoId = useDashboardStore((s) => s.selectedNeoId);
  const setSelected = useDashboardStore((s) => s.setSelectedNeoId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data } = useRiskSnapshot(200);

  // Demo Tour: en yüksek tehditli NEO'ya odakla
  useEffect(() => {
    return subscribeDemoAction((action) => {
      if (action.type === 'dashboard:focus-top-threat') {
        const top = data?.items?.[0];
        if (top) setSelected(top.neo_id);
      }
    });
  }, [data, setSelected]);

  // Seçim değişince/temizlenince drawer'ı kapat.
  useEffect(() => {
    setDrawerOpen(false);
  }, [selectedNeoId]);

  const placements = useMemo(() => {
    if (!data?.items) return [];
    const VISUAL_LIMIT = 100;
    const items = data.items.slice(0, VISUAL_LIMIT);
    return items.map((item, index) => {
      const seed = hashString(item.neo_id);
      const ringIndex = index % 4;
      const ringRadius = 14 + ringIndex * 5 + ((seed % 80) - 40) * 0.06;

      const phi = Math.acos(1 - (2 * (index + 0.5)) / items.length);
      const theta = Math.PI * (1 + Math.sqrt(5)) * index + (seed % 100) / 100;

      const x = Math.sin(phi) * Math.cos(theta) * ringRadius;
      const y = Math.cos(phi) * ringRadius * 0.55;
      const z = Math.sin(phi) * Math.sin(theta) * ringRadius;

      const dKm = item.diameter_max_km ?? 0.01;
      const sizeTerm = Math.log10(1 + dKm * 90) * 0.55;
      const visualScale = Math.min(
        1.7,
        0.2 + sizeTerm + (item.is_potentially_hazardous ? 0.12 : 0),
      );

      return {
        neoId: item.neo_id,
        name: item.name,
        hazardous: item.is_potentially_hazardous,
        position: [x, y, z] as [number, number, number],
        scale: visualScale,
      };
    });
  }, [data]);

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-12">
      {/* 3D sahne — geniş, sakin hero. Tek odak noktası. */}
      <section className="relative order-1 min-h-[40vh] overflow-hidden rounded-2xl border border-white/[0.07] bg-surface-0 sm:min-h-[clamp(360px,50vh,680px)] lg:col-span-8 lg:min-h-0">
        <SolarSystemScene
          asteroids={placements}
          quality={quality}
          selectedNeoId={selectedNeoId}
          onSelectAsteroid={setSelected}
        />
        {/* Minimal durum etiketi — kutu yok, sadece sakin bir satır. */}
        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-threat-low shadow-[0_0_8px_hsl(var(--threat-low))]" />
          <span className="font-mono-tnum text-[11px] uppercase tracking-[0.18em] text-text-tertiary [text-shadow:0_1px_4px_rgba(0,0,0,0.8)]">
            {placements.length} NEO izleniyor{selectedNeoId ? ' · odak' : ''}
          </span>
        </div>
      </section>

      {/* Sağ sütun — odaklı: öne çıkan tehdit + tek sekmeli panel. */}
      <aside className="order-2 flex min-h-0 flex-col gap-3 sm:gap-4 lg:col-span-4">
        {selectedNeoId ? (
          <div className="min-h-[60vh] flex-1 lg:min-h-0">
            <DashboardSidebar
              focusOverride={
                <AsteroidFocusOverlay
                  neoId={selectedNeoId}
                  onClose={() => setSelected(null)}
                  onOpenFullDetail={() => setDrawerOpen(true)}
                  embedded
                />
              }
              onDismissFocus={() => setSelected(null)}
            />
          </div>
        ) : (
          <>
            <FeaturedNeoCard />
            <div className="min-h-[55vh] flex-1 lg:min-h-0">
              <DashboardSidebar onDismissFocus={() => setSelected(null)} />
            </div>
          </>
        )}
      </aside>

      <AsteroidDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        neoId={selectedNeoId}
      />
    </div>
  );
}

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
