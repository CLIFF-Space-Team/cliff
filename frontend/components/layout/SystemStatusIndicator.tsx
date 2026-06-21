'use client';

import { Loader2, Wifi, WifiOff } from 'lucide-react';

import { useWebSocket } from '@/providers/WebSocketProvider';
import { useLanguage } from '@/providers/LanguageProvider';
import { cn } from '@/lib/utils';

const STATE_STYLES: Record<string, string> = {
  open: 'text-threat-low',
  reconnecting: 'text-threat-high',
  connecting: 'text-text-secondary',
  offline: 'text-threat-critical',
  idle: 'text-text-tertiary',
};

export function SystemStatusIndicator() {
  const { state } = useWebSocket();
  const { t } = useLanguage();

  const Icon = state === 'open' ? Wifi : state === 'offline' ? WifiOff : Loader2;
  const label =
    state === 'open' ? t('status.connected') :
    state === 'offline' ? t('status.offline') :
    t('status.reconnecting');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-surface-1 px-2 py-1 text-[11px] font-medium uppercase tracking-wider',
        STATE_STYLES[state],
      )}
    >
      <Icon className={cn('size-3.5', state !== 'open' && 'animate-spin')} aria-hidden />
      {label}
    </span>
  );
}
