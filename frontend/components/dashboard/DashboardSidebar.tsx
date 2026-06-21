'use client';

import {
  Activity,
  ArrowRightLeft,
  Bell,
  Globe2,
  MapPin,
  Rocket,
  ShieldAlert,
  Target,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { AlertFeed } from '@/components/threat/AlertFeed';
import { ComparePanel } from './ComparePanel';
import { EarthEventsPanel } from './EarthEventsPanel';
import { MissionTrackerPanel } from './MissionTrackerPanel';
import { NhatsPanel } from './NhatsPanel';
import { TurkeyPanel } from './TurkeyPanel';
import { RiskSnapshotPanel } from '@/components/threat/RiskSnapshotPanel';
import { cn } from '@/lib/utils';

interface TabDef {
  id: string;
  label: string;
  icon: LucideIcon;
  panel: React.FC;
}

interface GroupDef {
  id: string;
  label: string;
  icon: LucideIcon;
  tabs: TabDef[];
}

/**
 * Information architecture: 4 groups (Tehdit, Dünya, Misyon, Karşılaştır).
 * Groups with a single tab collapse the sub-tab strip. This keeps the
 * top-level navigation predictable while letting related panels stay
 * grouped semantically.
 */
const GROUPS: GroupDef[] = [
  {
    id: 'threat',
    label: 'Tehdit',
    icon: ShieldAlert,
    tabs: [
      { id: 'risk', label: 'Risk', icon: Activity, panel: RiskSnapshotPanel },
      { id: 'alerts', label: 'Uyarılar', icon: Bell, panel: AlertFeed },
      { id: 'nhats', label: 'NHATS Hedefleri', icon: Target, panel: NhatsPanel },
    ],
  },
  {
    id: 'turkey',
    label: 'Türkiye',
    icon: MapPin,
    tabs: [{ id: 'tr', label: 'Türkiye', icon: MapPin, panel: TurkeyPanel }],
  },
  {
    id: 'earth',
    label: 'Dünya',
    icon: Globe2,
    tabs: [{ id: 'hazards', label: 'Tehlikeler', icon: Globe2, panel: EarthEventsPanel }],
  },
  {
    id: 'mission',
    label: 'Misyon',
    icon: Rocket,
    tabs: [{ id: 'missions', label: 'Aktif', icon: Rocket, panel: MissionTrackerPanel }],
  },
  {
    id: 'compare',
    label: 'Karşılaştır',
    icon: ArrowRightLeft,
    tabs: [{ id: 'neo-vs', label: 'NEO', icon: ArrowRightLeft, panel: ComparePanel }],
  },
];

const FIRST = GROUPS[0]!;

interface DashboardSidebarProps {
  /**
   * When set, the panel area shows the focus content (passed via children).
   * The tab strip stays visible so the user can dismiss focus by picking
   * any tab, but the active tab visual state is dimmed to indicate the
   * panel is in "context" mode.
   */
  focusOverride?: React.ReactNode;
  onDismissFocus?: () => void;
}

export function DashboardSidebar({ focusOverride, onDismissFocus }: DashboardSidebarProps = {}) {
  const [groupId, setGroupId] = useState<string>(FIRST.id);
  const [tabId, setTabId] = useState<string>(FIRST.tabs[0]!.id);

  const group = useMemo(
    () => GROUPS.find((g) => g.id === groupId) ?? FIRST,
    [groupId],
  );
  const tab = useMemo(
    () => group.tabs.find((t) => t.id === tabId) ?? group.tabs[0]!,
    [group, tabId],
  );

  useEffect(() => {
    // When a group switches and the previously-active tab doesn't exist
    // in the new group, fall back to the group's first tab.
    if (!group.tabs.some((t) => t.id === tabId)) {
      setTabId(group.tabs[0]!.id);
    }
  }, [group, tabId]);

  const isFocus = !!focusOverride;
  const ActivePanel = tab.panel;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {/* Group rail — always visible. Selecting a group also dismisses focus mode. */}
      <nav
        role="tablist"
        aria-label="Panel grupları"
        className="grid shrink-0 grid-cols-5 gap-1 rounded-lg border border-white/[0.06] bg-surface-1 p-1"
      >
        {GROUPS.map((g) => {
          const Icon = g.icon;
          const active = !isFocus && g.id === groupId;
          return (
            <button
              key={g.id}
              role="tab"
              aria-selected={active}
              onClick={() => {
                if (isFocus) onDismissFocus?.();
                setGroupId(g.id);
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1.5 text-[9px] font-medium uppercase tracking-wider transition-colors sm:px-2 sm:text-[10px]',
                active
                  ? 'bg-surface-2 text-text-primary'
                  : 'text-text-tertiary hover:bg-surface-2/60 hover:text-text-secondary',
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              <span className="truncate">{g.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Sub-tab strip — only renders when a group has more than one tab. */}
      {!isFocus && group.tabs.length > 1 && (
        <div
          role="tablist"
          aria-label={`${group.label} alt sekmeleri`}
          className="flex shrink-0 gap-1 overflow-x-auto rounded-md border border-white/[0.06] bg-surface-1/60 p-1 scrollbar-thin"
        >
          {group.tabs.map((t) => {
            const Icon = t.icon;
            const active = t.id === tabId;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTabId(t.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-sm px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors',
                  active
                    ? 'bg-surface-2 text-text-primary'
                    : 'text-text-tertiary hover:bg-surface-2/60 hover:text-text-secondary',
                )}
              >
                <Icon className="size-3" aria-hidden />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Panel area — switches between active tab content and focus override. */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {focusOverride ? focusOverride : <ActivePanel />}
      </div>
    </div>
  );
}
