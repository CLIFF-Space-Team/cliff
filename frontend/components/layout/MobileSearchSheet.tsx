'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button, StatusPill } from '@/components/ui';
import { useRiskSnapshot } from '@/hooks/useRiskSnapshot';
import { useDashboardStore } from '@/stores/dashboard';
import { formatDistanceKm } from '@/lib/format';

export function MobileSearchSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const { data } = useRiskSnapshot(50);
  const setSelected = useDashboardStore((s) => s.setSelectedNeoId);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 80);
      return () => window.clearTimeout(id);
    }
    setQuery('');
  }, [open]);

  const matches = useMemo(() => {
    if (!data?.items || !query.trim()) return [];
    const q = query.toLowerCase().trim();
    return data.items
      .filter(
        (item) =>
          item.neo_id.includes(q) ||
          item.name.toLowerCase().includes(q) ||
          (item.designation ?? '').toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [data, query]);

  const recent = useMemo(() => data?.items.slice(0, 6) ?? [], [data]);

  const pick = (neoId: string) => {
    setSelected(neoId);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed inset-x-0 top-0 z-50 flex max-h-[100dvh] flex-col bg-surface-1 shadow-panel data-[state=open]:animate-slide-in-up focus:outline-none">
          <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] px-3 py-2.5 pt-[max(env(safe-area-inset-top),0.625rem)]">
            <Search className="size-4 shrink-0 text-text-tertiary" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="NEO ara — id, isim, designation"
              className="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
            />
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Kapat">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {query.trim() ? (
              matches.length === 0 ? (
                <div className="p-6 text-center text-xs text-text-tertiary">Sonuç yok</div>
              ) : (
                <ul role="listbox" className="divide-y divide-white/[0.04]">
                  {matches.map((item) => (
                    <li key={item.neo_id}>
                      <button
                        type="button"
                        onClick={() => pick(item.neo_id)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-text-primary">{item.name}</div>
                          <div className="font-mono-tnum text-[10px] text-text-tertiary">
                            {item.neo_id} · {formatDistanceKm(item.miss_distance_km)}
                          </div>
                        </div>
                        <StatusPill severity={item.risk_class} size="sm">
                          {item.risk_class}
                        </StatusPill>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <div className="space-y-2 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                  yüksek riskli neo
                </p>
                <ul role="list" className="-mx-4 divide-y divide-white/[0.04]">
                  {recent.map((item) => (
                    <li key={item.neo_id}>
                      <button
                        type="button"
                        onClick={() => pick(item.neo_id)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors active:bg-surface-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-text-primary">{item.name}</div>
                          <div className="font-mono-tnum text-[10px] text-text-tertiary">
                            {item.neo_id} · {formatDistanceKm(item.miss_distance_km)}
                          </div>
                        </div>
                        <StatusPill severity={item.risk_class} size="sm">
                          {item.risk_class}
                        </StatusPill>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
