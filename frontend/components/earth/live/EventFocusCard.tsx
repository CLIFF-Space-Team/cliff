'use client';

import { ExternalLink, MapPin, Play, X } from 'lucide-react';

import { Button } from '@/components/ui';
import { pickRepresentativePoint } from '@/lib/earth-geometry';
import type { EarthCategoryMeta, EarthEvent } from '@/lib/earth-types';

import { EventCategoryIcon } from '../EventCategoryIcon';
import { SeverityBadge } from '../SeverityBadge';

interface EventFocusCardProps {
  event: EarthEvent;
  category: EarthCategoryMeta | null;
  onClose: () => void;
  onOpenSimulation?: () => void;
}

const SOURCE_LABEL: Record<string, string> = {
  eonet: 'NASA EONET',
  afad: 'AFAD',
  usgs: 'USGS',
};

/**
 * Compact focus card that overlays the globe for the selected event — the
 * essentials at a glance (category, severity, headline metric, location) plus a
 * one-tap path into the full category simulation. Full detail stays in the
 * reusable panel; this keeps the globe view uncluttered.
 */
export function EventFocusCard({
  event,
  category,
  onClose,
  onOpenSimulation,
}: EventFocusCardProps) {
  const point = pickRepresentativePoint(event);
  const accent = category?.accent_hex ?? '#ffffff';

  return (
    <div className="pointer-events-auto w-[min(92vw,340px)] overflow-hidden rounded-xl border border-white/10 bg-surface-1/90 shadow-panel backdrop-blur-md">
      <div className="flex items-start gap-2.5 px-3.5 pt-3">
        <span
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent}1f`, color: accent }}
        >
          <EventCategoryIcon icon={category?.icon ?? 'alert-circle'} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[13.5px] font-semibold leading-tight text-text-primary">
              {event.title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-text-tertiary transition-colors hover:text-text-primary"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <SeverityBadge severity={event.severity} />
            <span className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
              {SOURCE_LABEL[event.source] ?? event.source}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-white/[0.05] px-3.5 py-3">
        {event.primary_metric && (
          <Stat
            label={event.primary_metric.label_tr}
            value={`${event.primary_metric.value.toLocaleString('tr-TR', {
              maximumFractionDigits: 1,
            })} ${event.primary_metric.unit}`}
            accent={accent}
          />
        )}
        {point && (
          <Stat
            label="Konum"
            value={`${point[1].toFixed(1)}°, ${point[0].toFixed(1)}°`}
            icon
          />
        )}
      </div>

      <div className="flex items-center gap-2 px-3.5 pb-3.5 pt-1">
        {onOpenSimulation && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onOpenSimulation}
            className="flex-1"
          >
            <Play className="size-3.5" />
            Simülasyonu Aç
          </Button>
        )}
        {event.sources[0] && (
          <a
            href={event.sources[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-surface-2 px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            Kaynak
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent?: string;
  icon?: boolean;
}) {
  return (
    <div className="bg-surface-1 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-text-tertiary">
        {icon && <MapPin className="size-3" />}
        {label}
      </div>
      <div
        className="mt-0.5 font-mono-tnum text-[13px] font-semibold"
        style={{ color: accent ?? 'hsl(var(--text-primary))' }}
      >
        {value}
      </div>
    </div>
  );
}
