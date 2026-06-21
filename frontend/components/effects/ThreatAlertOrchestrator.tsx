'use client';

import { useThreatAlertEffect } from '@/hooks/useThreatAlertEffect';

/**
 * Side-effect-only component — `useThreatAlertEffect` hook'unu çağırır,
 * hiçbir DOM çıktısı yok. Layout'a global olarak eklenir; WebSocketProvider'a
 * abone olup `threat_alert` event'lerini flash + audio + toast'a dönüştürür.
 */
export function ThreatAlertOrchestrator() {
  useThreatAlertEffect();
  return null;
}
