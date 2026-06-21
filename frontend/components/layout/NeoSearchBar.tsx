'use client';

import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useRiskSnapshot } from '@/hooks/useRiskSnapshot';
import { Input, StatusPill } from '@/components/ui';
import { useDashboardStore } from '@/stores/dashboard';
import { cn } from '@/lib/utils';
import { formatDistanceKm } from '@/lib/format';

export function NeoSearchBar() {
  const { data } = useRiskSnapshot(50);
  const setSelected = useDashboardStore((s) => s.setSelectedNeoId);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    if (!data?.items || !query.trim()) return [];
    const q = query.toLowerCase().trim();
    return data.items
      .filter((item) =>
        item.neo_id.includes(q) ||
        item.name.toLowerCase().includes(q) ||
        (item.designation ?? '').toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [data, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      } else if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const pick = (neoId: string) => {
    setSelected(neoId);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="NEO ara — id, isim, designation"
        className="h-8 pl-8 pr-12 text-xs"
      />
      {!query ? (
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-white/10 bg-surface-2 px-1.5 py-0.5 font-mono-tnum text-[9px] text-text-tertiary">
          ⌘K
        </kbd>
      ) : (
        <button
          type="button"
          onClick={() => {
            setQuery('');
            setOpen(false);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
        >
          <X className="size-3.5" />
        </button>
      )}

      {open && query.trim() && (
        <div
          className={cn(
            'absolute left-0 right-0 top-full z-40 mt-1 max-h-80 overflow-y-auto rounded-md border border-white/10 bg-surface-2 shadow-panel scrollbar-thin',
          )}
        >
          {matches.length === 0 ? (
            <div className="p-3 text-center text-xs text-text-tertiary">Sonuç yok</div>
          ) : (
            <ul role="listbox" className="divide-y divide-white/[0.04]">
              {matches.map((item) => (
                <li key={item.neo_id}>
                  <button
                    type="button"
                    onClick={() => pick(item.neo_id)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-3"
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
          )}
        </div>
      )}
    </div>
  );
}
