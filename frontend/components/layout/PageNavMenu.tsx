'use client';

import * as Popover from '@radix-ui/react-popover';
import { Crosshair, Film, Home, Menu, Telescope, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { cn } from '@/lib/utils';

interface NavLink {
  href: string;
  label: string;
  icon: typeof Home;
  description: string;
}

const PAGES: ReadonlyArray<NavLink> = [
  { href: '/', label: 'Ana sayfa', icon: Home, description: 'Karşılama' },
  { href: '/dashboard', label: 'Mission Control', icon: Telescope, description: '3D solar system + Türkiye verisi' },
  { href: '/impact', label: 'Çarpma Simülatörü', icon: Crosshair, description: 'Şehir çarpma senaryoları' },
  { href: '/sinematik', label: 'Sinematik Tur', icon: Film, description: '30 sn kamera klibi' },
];

/**
 * Tüm sayfalardan tek tıkla diğer sayfalara geçilebilen sabit menü.
 *
 * Sağ üst köşede yuvarlak floating buton. Demo aktif veya admin sayfasında
 * gizlenir.
 */
export function PageNavMenu() {
  return (
    <Suspense fallback={null}>
      <PageNavMenuInner />
    </Suspense>
  );
}

function PageNavMenuInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (searchParams.get('demo') === '1') return null;
  if (pathname.startsWith('/admin')) return null;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Tüm sayfalar menüsü"
          className={cn(
            'fixed right-3 top-3 z-30 flex size-9 items-center justify-center rounded-full',
            'border border-white/[0.12] bg-surface-1/90 text-text-primary backdrop-blur',
            'transition-colors hover:border-white/[0.24] hover:bg-surface-2',
            'sm:right-4 sm:top-4 sm:size-10',
          )}
        >
          <Menu className="size-4 sm:size-5" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className={cn(
            'z-50 w-[min(92vw,360px)] rounded-lg border border-white/[0.12] bg-surface-2 p-2 shadow-panel',
            'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
          )}
        >
          <div className="mb-1 flex items-center justify-between px-2 py-1.5">
            <span className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
              Sayfalar
            </span>
            <Popover.Close asChild>
              <button
                type="button"
                aria-label="Kapat"
                className="rounded-md p-1 text-text-tertiary hover:text-text-primary"
              >
                <X className="size-3.5" />
              </button>
            </Popover.Close>
          </div>

          <ul className="space-y-0.5">
            {PAGES.map((p) => {
              const Icon = p.icon;
              const active =
                p.href === '/'
                  ? pathname === '/'
                  : pathname?.startsWith(p.href);
              return (
                <li key={p.href}>
                  <Popover.Close asChild>
                    <Link
                      href={p.href}
                      className={cn(
                        'flex items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors',
                        active
                          ? 'bg-surface-3 text-text-primary'
                          : 'text-text-secondary hover:bg-surface-3 hover:text-text-primary',
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md',
                          active ? 'bg-threat-high/20 text-threat-high' : 'bg-surface-1 text-text-secondary',
                        )}
                      >
                        <Icon className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium">{p.label}</div>
                        <div className="font-mono-tnum text-[10px] text-text-tertiary">
                          {p.description}
                        </div>
                      </div>
                    </Link>
                  </Popover.Close>
                </li>
              );
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
