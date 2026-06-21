'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui';

/**
 * Türkiye gözlem evleri haritası — Leaflet + OpenStreetMap.
 *
 * Leaflet ssr-uyumsuz (window objesi kullanır), bu yüzden inner component
 * dinamik import + ssr:false ile yüklenir. Wrapper sadece skeleton fallback
 * sağlar.
 */

const ObservatoryMapInner = dynamic(
  () =>
    import('./ObservatoryMapInner').then((m) => ({
      default: m.ObservatoryMapInner,
    })),
  {
    ssr: false,
    loading: () => <Skeleton className="aspect-[4/3] w-full" />,
  },
);

export function ObservatoryMap({ className }: { className?: string }) {
  return <ObservatoryMapInner className={className} />;
}
