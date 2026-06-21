'use client';

import { Skeleton, SourceLabel, StatusPill, Surface } from '@/components/ui';
import { formatRelative } from '@/lib/format';
import { useThreatAlerts } from '@/hooks/useThreatAlerts';
import { useWebSocket } from '@/providers/WebSocketProvider';

export function AlertFeed() {
  const { data, isLoading, isError } = useThreatAlerts(25);
  const { alerts: liveAlerts } = useWebSocket();

  // Merge live WS alerts at the top of the persisted recent feed.
  const merged = (() => {
    const seen = new Set<string>();
    const out = [] as NonNullable<typeof data>;
    for (const a of liveAlerts) {
      if (!seen.has(a.alert_id)) {
        seen.add(a.alert_id);
        out.push(a);
      }
    }
    for (const a of data ?? []) {
      if (!seen.has(a.alert_id)) {
        seen.add(a.alert_id);
        out.push(a);
      }
    }
    return out;
  })();

  return (
    <Surface elevation={1} className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">Tehdit Uyarıları</h2>
        <span className="font-mono-tnum text-[10px] text-text-tertiary">
          {merged.length} kayıt
        </span>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {isError && (
          <div className="px-4 py-6 text-sm text-threat-critical">Uyarılar yüklenemedi.</div>
        )}
        {isLoading && (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        )}
        {!isLoading && !isError && (
          <ul role="list" className="divide-y divide-white/[0.04]">
            {merged.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-text-tertiary">
                Aktif uyarı yok. Sistem nominal.
              </li>
            )}
            {merged.map((alert) => (
              <li key={alert.alert_id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <StatusPill severity={alert.severity} size="sm">
                        {alert.severity}
                      </StatusPill>
                      <span className="truncate text-sm font-medium text-text-primary">
                        {alert.title}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12px] text-text-secondary">
                      {alert.description}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono-tnum text-[10px] text-text-tertiary">
                    {formatRelative(alert.issued_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="border-t border-white/[0.06]">
        <SourceLabel
          source="CLIFF risk pipeline (canlı WebSocket)"
          updatedAt={merged[0]?.issued_at ?? null}
        />
      </div>
    </Surface>
  );
}
