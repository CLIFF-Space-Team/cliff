'use client';

import { Play, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { cn } from '@/lib/utils';

/**
 * Floating "Demo Turu Başlat" butonu.
 *
 * Sayfanın sol-alt köşesinde sabit (sağda AudioMuteToggle var). Demo aktifken
 * (`?demo=1`) gizlenir; admin sayfasında da gizlenir (operasyon ekranı).
 */
export function StartDemoButton() {
  return (
    <Suspense fallback={null}>
      <StartDemoButtonInner />
    </Suspense>
  );
}

function StartDemoButtonInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Demo zaten aktif veya admin sayfasında ise gösterme
  if (searchParams.get('demo') === '1') return null;
  if (pathname.startsWith('/admin')) return null;

  return (
    <Link
      href="/?demo=1"
      aria-label="Otomatik tanıtım turunu başlat"
      title="Sayfayı tek tuşla otomatik gezin (sesli anlatım + işaretlemeler)"
      className={cn(
        'fixed bottom-3 left-3 z-30 flex h-9 items-center gap-2 rounded-full',
        'border border-threat-high/40 bg-threat-high/10 px-3.5',
        'text-[12px] font-semibold text-threat-high',
        'shadow-lg backdrop-blur transition-all',
        'hover:bg-threat-high/20 hover:scale-105 hover:shadow-xl',
        'sm:bottom-4 sm:left-4 sm:h-10 sm:px-4 sm:text-[13px]',
      )}
    >
      <Play className="size-3.5 fill-current sm:size-4" />
      <span>Otomatik Tur</span>
      <Sparkles className="hidden size-3 sm:inline" />
    </Link>
  );
}

/**
 * Hero için büyük, dikkat çekici varyant — landing page'in CTA satırının
 * yanında veya altında kullanılır.
 */
export function StartDemoHeroButton({ className }: { className?: string }) {
  return (
    <Link
      href="/?demo=1"
      className={cn(
        'group relative flex w-full items-center justify-center gap-2 rounded-md border-2 border-threat-high/60 bg-threat-high/15 px-5 py-3 text-sm font-semibold text-text-primary shadow-lg transition-all',
        'hover:bg-threat-high/25 hover:scale-[1.02] hover:shadow-2xl',
        'sm:w-auto sm:min-w-52 sm:py-3.5',
        className,
      )}
    >
      <Play className="size-4 fill-threat-high text-threat-high" />
      <span className="text-text-primary">▶ Otomatik Tanıtım Turu</span>
      <span className="ml-1 hidden font-mono-tnum text-[10px] font-normal uppercase tracking-wider text-text-tertiary sm:inline">
        ~5 dk · sesli
      </span>
      {/* Pulse halo */}
      <span
        className="absolute inset-0 -z-10 animate-pulse-gentle rounded-md"
        style={{ boxShadow: '0 0 0 4px hsl(25 95% 53% / 0.18)' }}
        aria-hidden
      />
    </Link>
  );
}
