'use client';

import Link from 'next/link';
import { ArrowLeft, ExternalLink, Globe2 } from 'lucide-react';
import { Suspense } from 'react';

import { EarthScene } from '@/components/earth/EarthScene';
import { Button, Skeleton } from '@/components/ui';

/**
 * Full-width "Earth Live" page — was previously crammed into the dashboard
 * sidebar. With its own route the world map breathes, the KPI ribbon spreads
 * across four equal tiles, and the bottom split (quakes / space-weather /
 * EONET) gets actual reading-room.
 *
 * Sources are all live & official:
 *   - USGS Earthquake Hazards Program  (M2.5+/M4.5+ public feed)
 *   - NASA EONET                       (volcanoes / wildfires / storms)
 *   - JPL CNEOS Fireball               (atmospheric impact records)
 *   - NOAA SWPC                        (Kp / GOES X-ray / solar wind)
 */
export default function EarthLivePage() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-0">
      <header className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Mission Control'e dön">
            <Link href="/dashboard">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2">
              <Globe2 className="size-4 text-text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-text-primary">
                Dünya Canlı İzleme
              </h1>
              <p className="truncate font-mono-tnum text-[10px] text-text-tertiary sm:text-[11px]">
                USGS · NASA EONET · JPL CNEOS · NOAA SWPC
              </p>
            </div>
          </div>
        </div>
        <div className="hidden shrink-0 items-center gap-3 text-[10px] uppercase tracking-wider text-text-tertiary md:flex">
          <a
            href="https://earthquake.usgs.gov/earthquakes/map/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-text-primary"
          >
            USGS <ExternalLink className="size-3" />
          </a>
          <a
            href="https://eonet.gsfc.nasa.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-text-primary"
          >
            EONET <ExternalLink className="size-3" />
          </a>
          <a
            href="https://www.swpc.noaa.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-text-primary"
          >
            SWPC <ExternalLink className="size-3" />
          </a>
        </div>
      </header>

      <main className="min-h-0 flex-1 p-3 sm:p-5">
        <Suspense fallback={<Skeleton className="h-full w-full" />}>
          <EarthScene />
        </Suspense>
      </main>
    </div>
  );
}
