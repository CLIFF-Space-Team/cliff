'use client';

import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { EarthCategoryMeta } from '@/lib/earth-types';

import { EventCategoryIcon } from './EventCategoryIcon';

interface CategoryFilterChipsProps {
  categories: EarthCategoryMeta[];
  selected: string[];
  counts?: Record<string, number>;
  onToggle: (code: string) => void;
  onClear: () => void;
}

/**
 * Horizontal-scrolling chip rail. Each chip shows the category icon,
 * accent border (so 3D ↔ chip ↔ map all match), label, and the open-count
 * from `/earth/summary`. Empty selection means "all categories".
 */
export function CategoryFilterChips({
  categories,
  selected,
  counts,
  onToggle,
  onClear,
}: CategoryFilterChipsProps) {
  const hasSelection = selected.length > 0;
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-thin">
      <button
        type="button"
        onClick={onClear}
        className={cn(
          'shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors',
          !hasSelection
            ? 'border-white/30 bg-white/[0.08] text-text-primary'
            : 'border-white/[0.08] text-text-tertiary hover:bg-white/[0.04] hover:text-text-primary',
        )}
      >
        Hepsi
      </button>
      {categories.map((cat) => {
        const isSelected = selected.includes(cat.code);
        const count = counts?.[cat.code];
        return (
          <button
            key={cat.code}
            type="button"
            onClick={() => onToggle(cat.code)}
            className={cn(
              'group flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
              isSelected
                ? 'bg-white/[0.06] text-text-primary'
                : 'border-white/[0.08] text-text-tertiary hover:bg-white/[0.04] hover:text-text-primary',
            )}
            style={{
              borderColor: isSelected ? cat.accent_hex : undefined,
              boxShadow: isSelected ? `0 0 0 1px ${cat.accent_hex}40 inset` : undefined,
            }}
            title={cat.description_tr}
          >
            <EventCategoryIcon
              icon={cat.icon}
              size={12}
              className={isSelected ? 'text-text-primary' : 'text-text-tertiary group-hover:text-text-primary'}
            />
            <span className="whitespace-nowrap">{cat.label_tr}</span>
            {count !== undefined && count > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-px text-[9px] font-mono-tnum tabular-nums',
                  isSelected ? 'bg-white/15 text-text-primary' : 'bg-white/[0.06] text-text-tertiary',
                )}
              >
                {count}
              </span>
            )}
            {isSelected && <Check className="size-3" />}
          </button>
        );
      })}
    </div>
  );
}
