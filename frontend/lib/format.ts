/**
 * Display formatters. All telemetry numbers are rendered with monospace
 * tabular-nums so columns align in the dashboard.
 */

const KM_PER_LD = 384_400;
const KM_PER_AU = 149_597_870.7;

export function formatDistanceKm(km: number | null | undefined): string {
  if (km === null || km === undefined || !Number.isFinite(km)) return '—';
  if (km >= KM_PER_AU * 0.05) return `${(km / KM_PER_AU).toFixed(3)} AU`;
  if (km >= KM_PER_LD) return `${(km / KM_PER_LD).toFixed(2)} LD`;
  return `${km.toLocaleString('en-US', { maximumFractionDigits: 0 })} km`;
}

export function formatVelocity(kms: number | null | undefined): string {
  if (kms === null || kms === undefined || !Number.isFinite(kms)) return '—';
  return `${kms.toFixed(2)} km/s`;
}

export function formatDiameter(km: number | null | undefined): string {
  if (km === null || km === undefined || !Number.isFinite(km)) return '—';
  if (km < 0.001) return `${(km * 1_000_000).toFixed(0)} mm`;
  if (km < 1) return `${(km * 1000).toFixed(1)} m`;
  return `${km.toFixed(2)} km`;
}

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined || !Number.isFinite(score)) return '—';
  return score.toFixed(2);
}

export function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';

  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const sec = Math.round(absMs / 1000);
  const min = Math.round(sec / 60);
  const hour = Math.round(min / 60);
  const day = Math.round(hour / 24);

  const past = diffMs < 0;
  if (sec < 60) return past ? `${sec}s önce` : `${sec}s sonra`;
  if (min < 60) return past ? `${min} dk önce` : `${min} dk sonra`;
  if (hour < 24) return past ? `${hour} saat önce` : `${hour} saat sonra`;
  if (day < 30) return past ? `${day} gün önce` : `${day} gün sonra`;
  return formatTimestamp(date.toISOString());
}
