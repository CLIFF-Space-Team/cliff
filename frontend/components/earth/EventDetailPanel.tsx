'use client';

import { ExternalLink, Info, MapPin, Play, X } from 'lucide-react';

import { Button, Surface } from '@/components/ui';
import { pickRepresentativePoint as pickPoint } from '@/lib/earth-geometry';
import { cn } from '@/lib/utils';
import type { EarthCategoryMeta, EarthEvent } from '@/lib/earth-types';

import { EventCategoryIcon } from './EventCategoryIcon';
import { SeverityBadge } from './SeverityBadge';

interface EventDetailPanelProps {
  event: EarthEvent | null;
  category: EarthCategoryMeta | null;
  onClose: () => void;
  onClear: () => void;
  onOpenSimulation?: () => void;
}

/**
 * Side-panel content for the currently selected event.
 *
 * Layout:
 *   ┌─ header (icon · title · severity badge · close)
 *   ├─ key facts (primary metric + raw lat/lng/time)
 *   ├─ description (kategori-spesifik EONET açıklaması veya AFAD özet)
 *   ├─ kategori bilgisi (`description_tr`)
 *   └─ source links (InciWeb, AFAD, USGS, …)
 */
export function EventDetailPanel({
  event,
  category,
  onClose,
  onClear,
  onOpenSimulation,
}: EventDetailPanelProps) {
  if (!event || !category) {
    return <EmptyPanel />;
  }

  const point = pickPoint(event);
  const startedAt = formatLocal(event.started_at);
  const updatedAt = formatLocal(event.updated_at);

  return (
    <Surface elevation={1} className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex items-start justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5">
        <div className="flex min-w-0 items-start gap-2">
          <span
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md"
            style={{
              background: `${category.accent_hex}1d`,
              color: category.accent_hex,
            }}
          >
            <EventCategoryIcon icon={category.icon} size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
              {category.label_tr}
            </p>
            <h2 className="truncate text-[13px] font-semibold text-text-primary">
              {event.title}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <SeverityBadge severity={event.severity} />
              {event.status === 'closed' && (
                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-text-tertiary">
                  Kapandı
                </span>
              )}
              <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-text-tertiary">
                {sourceLabel(event.source)}
              </span>
            </div>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Kapat"
          onClick={onClose}
          className="size-7 shrink-0"
        >
          <X className="size-4" />
        </Button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {event.primary_metric && (
          <Surface elevation={2} border="subtle" className="px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
              {event.primary_metric.label_tr}
            </p>
            <p className="font-mono-tnum text-2xl font-semibold tabular-nums text-text-primary">
              {event.primary_metric.value.toLocaleString('tr-TR', {
                maximumFractionDigits: 2,
              })}{' '}
              <span className="text-base text-text-tertiary">{event.primary_metric.unit}</span>
            </p>
          </Surface>
        )}

        <dl className="grid grid-cols-2 gap-2 text-[11px]">
          {point && (
            <KeyFact
              icon={<MapPin className="size-3" />}
              label="Konum"
              value={`${point[1].toFixed(3)}°, ${point[0].toFixed(3)}°`}
              mono
            />
          )}
          <KeyFact label="Başladı" value={startedAt} mono />
          <KeyFact label="Güncellendi" value={updatedAt} mono />
          {event.closed_at && <KeyFact label="Kapandı" value={formatLocal(event.closed_at)} mono />}
        </dl>

        {event.description && (
          <p className="text-[12px] leading-relaxed text-text-secondary">
            {event.description}
          </p>
        )}

        <Surface elevation={2} border="subtle" className="space-y-1 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-tertiary">
            <Info className="size-3" />
            <span>Bu kategori nedir?</span>
          </div>
          <p className="text-[12px] leading-relaxed text-text-secondary">
            {category.description_tr}
          </p>
        </Surface>

        {event.sources.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
              Kaynaklar
            </p>
            <ul className="space-y-1">
              {event.sources.map((src) => (
                <li key={`${src.id}-${src.url}`}>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'group flex items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[12px] text-text-secondary transition-colors',
                      'hover:bg-white/[0.05] hover:text-text-primary',
                    )}
                  >
                    <span className="truncate">{src.id}</span>
                    <ExternalLink className="size-3 shrink-0 opacity-60 group-hover:opacity-100" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {onOpenSimulation && (
          <Button
            size="sm"
            onClick={onOpenSimulation}
            className="w-full gap-2"
            style={{
              background: category.accent_hex,
              color: '#0b0b0b',
            }}
          >
            <Play className="size-3.5" />
            Simülasyonu Aç
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onClear} className="w-full">
          Seçimi temizle
        </Button>
      </div>
    </Surface>
  );
}

interface KeyFactProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}

function KeyFact({ icon, label, value, mono }: KeyFactProps) {
  return (
    <div className="rounded-md border border-white/[0.06] bg-surface-2 px-2.5 py-1.5">
      <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-text-tertiary">
        {icon}
        <span>{label}</span>
      </dt>
      <dd className={cn('mt-0.5 truncate text-[12px] text-text-primary', mono && 'font-mono-tnum tabular-nums')}>
        {value}
      </dd>
    </div>
  );
}

function EmptyPanel() {
  return (
    <Surface elevation={1} className="flex h-full min-h-0 flex-col items-center justify-center gap-2 p-6 text-center">
      <Info className="size-6 text-text-tertiary" />
      <p className="text-[13px] font-medium text-text-primary">Bir olay seç</p>
      <p className="max-w-[260px] text-[11px] text-text-tertiary">
        Listeden ya da küre üstündeki bir noktadan herhangi bir olay seçtiğinde detaylar burada görünür.
      </p>
    </Surface>
  );
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'eonet':
      return 'NASA EONET';
    case 'afad':
      return 'AFAD';
    case 'usgs':
      return 'USGS';
    default:
      return source;
  }
}


function formatLocal(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
