'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui';
import type { ImpactResult } from '@/lib/impact-physics';

interface ImpactMapViewProps {
  result: ImpactResult;
  targetLat: number;
  targetLng: number;
  cityName?: string | null;
  className?: string;
}

/**
 * Leaflet harita üzerinde çarpma etki haritası — krater + termal + şok halkaları.
 *
 * SSR-uyumsuz olduğu için iç bileşen dinamik yüklenir.
 */
const ImpactMapInner = dynamic(
  () =>
    import('./ImpactMapInner').then((m) => ({ default: m.ImpactMapInner })),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="aspect-[4/3] min-h-[55vh] w-full sm:aspect-[16/10] lg:aspect-auto lg:min-h-[60vh]" />
    ),
  },
);

export function ImpactMapView(props: ImpactMapViewProps) {
  return <ImpactMapInner {...props} />;
}
