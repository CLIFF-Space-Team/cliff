'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Crosshair, Film, Home, Telescope } from 'lucide-react';

import { cn } from '@/lib/utils';

const items: Array<{
  href: string;
  icon: typeof Home;
  label: string;
}> = [
  { href: '/', icon: Home, label: 'Ana' },
  { href: '/dashboard', icon: Telescope, label: 'Mission' },
  { href: '/impact', icon: Crosshair, label: 'Çarpma' },
  { href: '/sinematik', icon: Film, label: 'Sinematik' },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobil navigasyon"
      className="fixed inset-x-0 bottom-0 z-30 flex h-14 shrink-0 items-stretch overflow-x-auto border-t border-white/[0.06] bg-surface-0/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {items.map(({ href, icon: Icon, label }) => {
        const active =
          href === '/' ? pathname === '/' : pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'relative flex min-w-[68px] shrink-0 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors',
              active
                ? 'text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary',
            )}
          >
            {active && (
              <span className="absolute top-0 h-0.5 w-10 rounded-full bg-text-primary" />
            )}
            <Icon className="size-5" />
            <span className="leading-none">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
