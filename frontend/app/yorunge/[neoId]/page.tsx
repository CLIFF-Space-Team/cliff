'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Orbit, Pause, Play } from 'lucide-react';
import { useState } from 'react';

import { OrbitInfoPanel } from '@/components/orbit/OrbitInfoPanel';
import { Button, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

// Not: Next.js 14'te `params` düz nesnedir (Promise değil) — `use()` kullanma.

const OrbitVisualization3D = dynamic(
  () => import('@/components/orbit/OrbitVisualization3D').then((m) => m.OrbitVisualization3D),
  { ssr: false, loading: () => <Skeleton className="absolute inset-0" /> },
);

const SPEEDS = [0.5, 1, 2, 4] as const;

/**
 * Gerçek Yörünge Sineması — `/yorunge/[neoId]`.
 *
 * Tam-ekran sinematik 3B sahne: cismin gerçek Kepler yörüngesi Güneş etrafında,
 * Dünya'ya yaklaşması (zamanla canlanır, en yakın geçişte slow-mo), Monte Carlo
 * belirsizlik bulutu ve görünürlük/parlaklık çizelgesi. Veri tamamen gerçek
 * (NASA Horizons/JPL Sentry/Monte Carlo) — şu ana dek hiç gösterilmiyordu.
 */
export default function YorungePage({ params }: { params: { neoId: string } }) {
  const decoded = decodeURIComponent(params.neoId);

  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [date, setDate] = useState<Date | null>(null);
  const [caption, setCaption] = useState('');

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <OrbitVisualization3D
        neoId={decoded}
        playing={playing}
        speed={speed}
        onInfo={(info) => {
          setDate(info.date);
          setCaption(info.caption);
        }}
      />

      {/* Üst sol — geri + başlık */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2 sm:left-5 sm:top-5">
        <Button asChild variant="ghost" size="icon" aria-label="Geri">
          <Link href="/dashboard" className="bg-surface-1/70 backdrop-blur">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface-1/70 px-2.5 py-1.5 backdrop-blur">
          <Orbit className="size-4 text-text-secondary" />
          <span className="text-[12px] font-semibold text-text-primary">Yörünge Sineması</span>
        </div>
      </div>

      {/* Sağ — bilgi paneli (HUD) */}
      <div className="absolute right-3 top-3 z-10 max-h-[calc(100dvh-7rem)] sm:right-5 sm:top-5">
        <OrbitInfoPanel neoId={decoded} />
      </div>

      {/* Alt — perde başlığı + oynat/hız + tarih */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 bg-gradient-to-t from-black/85 to-transparent px-4 pb-5 pt-14 sm:pb-7">
        {caption && (
          <div className="mb-0.5 max-w-2xl rounded-lg border border-white/10 bg-surface-1/80 px-4 py-2 text-center backdrop-blur">
            <p className="text-[13px] font-semibold leading-snug text-text-primary sm:text-[15px]">
              {caption}
            </p>
          </div>
        )}
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/10 bg-surface-1/80 px-2 py-1.5 backdrop-blur">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Duraklat' : 'Oynat'}
            className="flex size-8 items-center justify-center rounded-lg bg-white/95 text-black transition-colors hover:bg-white"
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.08] bg-surface-2 p-0.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                aria-pressed={speed === s}
                className={cn(
                  'rounded-md px-2 py-0.5 font-mono-tnum text-[11px] transition-colors',
                  speed === s
                    ? 'bg-surface-3 text-text-primary'
                    : 'text-text-tertiary hover:text-text-primary',
                )}
              >
                {s}×
              </button>
            ))}
          </div>
          <div className="px-2 font-mono-tnum text-[11px] text-text-secondary">
            {date
              ? date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
              : '—'}
          </div>
        </div>
        <p className="pointer-events-none font-mono-tnum text-[10px] uppercase tracking-[0.25em] text-text-tertiary">
          sürükle döndür · tekerlek yakınlaş · gerçek NASA yörünge verisi
        </p>
      </div>
    </div>
  );
}
