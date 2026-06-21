'use client';

import { useFeaturedNeo } from '@/hooks/useFeaturedNeo';
import { useRiskSnapshot } from '@/hooks/useRiskSnapshot';
import { cn } from '@/lib/utils';

/**
 * Landing page için canlı 3 büyük istatistik. Backend offline'sa boş dönmez —
 * nostaljik dashes ('—') gösterir, hayalet UI çatısı.
 */
export function HeroStats({ className }: { className?: string }) {
  const snapshot = useRiskSnapshot(200);
  const featured = useFeaturedNeo();

  const totalNeos = snapshot.data?.total ?? null;
  const criticalCount =
    snapshot.data?.items.filter(
      (n) => n.risk_class === 'critical' || n.risk_class === 'high',
    ).length ?? null;
  const daysUntil = featured.data?.available
    ? featured.data.days_until_approach ?? null
    : null;

  return (
    <div
      className={cn(
        'grid w-full max-w-3xl grid-cols-3 gap-4 sm:gap-6',
        className,
      )}
    >
      <Stat
        value={totalNeos}
        label="İzlenen NEO"
        sub="aktif takip"
        loading={snapshot.isLoading}
      />
      <Stat
        value={criticalCount}
        label="Yüksek/Kritik"
        sub="izleme listesi"
        loading={snapshot.isLoading}
        emphasis={
          criticalCount != null && criticalCount > 0 ? 'warn' : 'normal'
        }
      />
      <Stat
        value={daysUntil}
        label="Sonraki Geçiş"
        sub={daysUntil != null ? 'gün sonra' : '—'}
        loading={featured.isLoading}
      />
    </div>
  );
}

interface StatProps {
  value: number | null;
  label: string;
  sub: string;
  loading: boolean;
  emphasis?: 'normal' | 'warn';
}

function Stat({ value, label, sub, loading, emphasis = 'normal' }: StatProps) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p
        className={cn(
          'font-mono-tnum text-3xl font-semibold tabular-nums sm:text-4xl md:text-5xl',
          loading
            ? 'animate-pulse text-text-tertiary'
            : value == null
              ? 'text-text-tertiary'
              : emphasis === 'warn'
                ? 'text-threat-high'
                : 'text-text-primary',
        )}
      >
        {loading ? '·' : value == null ? '—' : value.toLocaleString('tr-TR')}
      </p>
      <p className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-secondary">
        {label}
      </p>
      <p className="font-mono-tnum text-[9px] uppercase tracking-wider text-text-tertiary">
        {sub}
      </p>
    </div>
  );
}
