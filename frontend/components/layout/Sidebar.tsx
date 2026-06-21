'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Crosshair, Globe2, ShieldCheck, Telescope } from 'lucide-react';

import { useAdminWhoami } from '@/hooks/useAdminAnalytics';
import { useLanguage } from '@/providers/LanguageProvider';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', icon: Telescope, key: 'nav.dashboard' as const },
  { href: '/earth', icon: Globe2, key: 'nav.earth' as const },
  { href: '/impact', icon: Crosshair, key: 'nav.impact' as const },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  // Cheap probe — `/whoami` is unauthenticated and 60 s staleTime so this
  // doesn't add traffic. The admin link is hidden entirely for non-admin
  // visitors so the route stays invisible to the public.
  const whoami = useAdminWhoami();
  const showAdmin = whoami.data?.authenticated === true;

  return (
    <aside className="hidden h-full w-14 shrink-0 flex-col items-center gap-1 border-r border-white/[0.06] bg-surface-0 py-4 md:flex">
      <div className="mb-5 flex size-9 items-center justify-center rounded-lg bg-surface-2">
        <Activity className="size-4 text-text-primary" />
      </div>
      {items.map(({ href, icon: Icon, key }) => {
        // `startsWith` would mark /dashboard active when we're on
        // /dashboard/earth — use exact match for /dashboard, prefix for the
        // sub-routes.
        const active =
          href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            title={t(key)}
            className={cn(
              'flex size-9 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-1 hover:text-text-primary',
              active && 'bg-surface-2 text-text-primary',
            )}
          >
            <Icon className="size-4" />
          </Link>
        );
      })}
      {showAdmin && (
        <Link
          href="/admin"
          title="Yönetici"
          className={cn(
            'mt-auto flex size-9 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-1 hover:text-text-primary',
            pathname?.startsWith('/admin') && 'bg-amber-500/10 text-amber-300',
          )}
        >
          <ShieldCheck className="size-4" />
        </Link>
      )}
    </aside>
  );
}
