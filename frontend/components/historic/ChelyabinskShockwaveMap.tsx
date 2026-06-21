'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui';

interface ChelyabinskShockwaveMapProps {
  /** Şu anki şokdalgası yarıçapı km — timeline'tan gelir. */
  shockwaveRadiusKm: number;
  /** Cam kırılması maksimum yarıçapı km. */
  glassBreakageRadiusKm: number;
  /** Faz — UI tonu için. */
  phase: string;
  className?: string;
}

const Inner = dynamic(
  () =>
    import('./ChelyabinskShockwaveMapInner').then((m) => ({
      default: m.ChelyabinskShockwaveMapInner,
    })),
  {
    ssr: false,
    loading: () => <Skeleton className="aspect-[4/3] w-full" />,
  },
);

export function ChelyabinskShockwaveMap(props: ChelyabinskShockwaveMapProps) {
  return <Inner {...props} />;
}
