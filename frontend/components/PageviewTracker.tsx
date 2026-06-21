'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { API_BASE_URL } from '@/lib/api-client';

/**
 * Fires `POST /api/v1/admin/track/pageview` once per Next.js route change.
 * Mounted from the root layout so every page navigation is captured.
 *
 * Implementation notes:
 *  - Uses `navigator.sendBeacon` when available so the request survives
 *    even if the user navigates away mid-flight.
 *  - Falls back to `fetch(..., { keepalive: true })` for browsers without
 *    sendBeacon.
 *  - Skips the `/admin` route itself — operator self-reports would
 *    pollute the stats with their own admin polling.
 *  - De-dupes the same path arriving twice in rapid succession (React
 *    StrictMode in dev double-invokes effects).
 */
export function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPing = useRef<{ path: string; at: number } | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith('/admin')) return;

    // Combine path + relevant query so impact-page-with-city counts as
    // distinct. Strip noisy Next-internal params.
    const qs = new URLSearchParams(searchParams?.toString() ?? '');
    qs.delete('_rsc');
    const queryStr = qs.toString();
    const fullPath = queryStr ? `${pathname}?${queryStr}` : pathname;

    // De-dupe within 1.5 s
    const now = Date.now();
    if (
      lastPing.current &&
      lastPing.current.path === fullPath &&
      now - lastPing.current.at < 1500
    ) {
      return;
    }
    lastPing.current = { path: fullPath, at: now };

    const url = `${API_BASE_URL}/api/v1/admin/track/pageview`;
    const body = JSON.stringify({
      path: fullPath,
      referrer: typeof document !== 'undefined' ? document.referrer : null,
    });

    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        return;
      }
    } catch {
      // fall through to fetch
    }

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // Silent — tracking must never disturb the user.
    });
  }, [pathname, searchParams]);

  return null;
}
