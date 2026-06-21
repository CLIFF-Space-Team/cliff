'use client';

import { Activity, Languages, RefreshCcw, Search } from 'lucide-react';
import { useState } from 'react';

import { MobileSearchSheet } from '@/components/layout/MobileSearchSheet';
import { NeoSearchBar } from '@/components/layout/NeoSearchBar';
import { Button, StatusPill } from '@/components/ui';
import { useLanguage } from '@/providers/LanguageProvider';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { formatRelative } from '@/lib/format';

import { SystemStatusIndicator } from './SystemStatusIndicator';

interface DashboardHeaderProps {
  onRefresh?: () => void;
  lastSyncAt?: string | null;
}

export function DashboardHeader({ onRefresh, lastSyncAt }: DashboardHeaderProps) {
  const { locale, setLocale, t } = useLanguage();
  const { lastEvent } = useWebSocket();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const lastCycleAt =
    lastEvent?.type === 'system_status' ? lastEvent.last_cycle_at : lastSyncAt ?? null;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-surface-0/85 px-4 backdrop-blur sm:gap-3 sm:px-6">
        <div className="flex shrink-0 items-center gap-2">
          <Activity className="size-5 text-text-primary" aria-hidden />
          <span className="text-sm font-semibold tracking-tight text-text-primary">
            {t('app.name')}
          </span>
          <StatusPill severity="minimal" size="sm" className="ml-2 hidden md:inline-flex">
            mission control
          </StatusPill>
        </div>

        <div className="hidden min-w-0 flex-1 justify-center md:flex">
          <NeoSearchBar />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileSearchOpen(true)}
            aria-label="NEO ara"
          >
            <Search className="size-4" />
          </Button>
          <div className="hidden sm:inline-flex">
            <SystemStatusIndicator />
          </div>
          <span className="hidden font-mono-tnum text-[11px] text-text-tertiary lg:inline">
            son senkron · {formatRelative(lastCycleAt)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            aria-label={t('cta.refresh')}
          >
            <RefreshCcw className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocale(locale === 'tr' ? 'en' : 'tr')}
            aria-label="Language"
          >
            <Languages className="size-4" />
          </Button>
        </div>
      </header>
      <MobileSearchSheet open={mobileSearchOpen} onOpenChange={setMobileSearchOpen} />
    </>
  );
}
