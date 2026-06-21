'use client';

import { useMemo } from 'react';

import { Surface } from '@/components/ui';
import { useEphemeris } from '@/hooks/useEphemeris';
import { useHybridAnalysis, useNeoRiskDetail } from '@/hooks/useNeoDetail';
import { useOrbit } from '@/hooks/useOrbit';
import type { RiskClass } from '@/lib/api-types';
import { cn } from '@/lib/utils';

import { OrbitBrightnessChart } from './OrbitBrightnessChart';

const LUNAR_DISTANCE_KM = 384_400;
const AU_KM = 149_597_870.7;

const RISK_LABEL: Record<RiskClass, string> = {
  critical: 'Kritik',
  high: 'Yüksek',
  moderate: 'Orta',
  low: 'Düşük',
  minimal: 'Asgari',
};
const RISK_CLASS: Record<RiskClass, string> = {
  critical: 'bg-threat-critical/15 text-threat-critical border-threat-critical/35',
  high: 'bg-threat-high/15 text-threat-high border-threat-high/35',
  moderate: 'bg-threat-moderate/15 text-threat-moderate border-threat-moderate/35',
  low: 'bg-threat-low/15 text-threat-low border-threat-low/35',
  minimal: 'bg-white/5 text-text-tertiary border-white/10',
};

function fmt(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}
function fmtKm(km: number | null | undefined): string {
  if (km == null) return '—';
  return `${fmt(km, 0)} km · ${fmt(km / LUNAR_DISTANCE_KM, 1)} AyU`;
}
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface OrbitInfoPanelProps {
  neoId: string;
}

/**
 * Yörünge sineması HUD'ı: cisim kimliği + risk, yörünge elemanları, en yakın
 * geçiş, Monte Carlo belirsizlik aralığı, ve görünürlük/parlaklık çizelgesi.
 * Tüm veri gerçek (Horizons/Sentry/MC) — şu ana dek hiç gösterilmiyordu.
 */
export function OrbitInfoPanel({ neoId }: OrbitInfoPanelProps) {
  const orbit = useOrbit(neoId);
  const detail = useNeoRiskDetail(neoId);
  const analysis = useHybridAnalysis(neoId, 365);
  const ephem = useEphemeris(neoId, 90);

  const record = detail.data;
  const el = orbit.data?.elements;
  const mc = analysis.data?.monte_carlo ?? record?.monte_carlo ?? null;
  const rows = useMemo(() => ephem.data?._rows ?? [], [ephem.data]);

  const periodYears = useMemo(() => {
    if (!el) return null;
    if (el.period_days && el.period_days > 0) return el.period_days / 365.25;
    return Math.pow(Math.max(1e-6, el.a_au), 1.5);
  }, [el]);

  const brightest = useMemo(() => {
    let best: { mag: number; when: string } | null = null;
    for (const r of rows) {
      if (r.apmag != null && (best === null || r.apmag < best.mag)) best = { mag: r.apmag, when: r.when };
    }
    return best;
  }, [rows]);

  const closestEphem = useMemo(() => {
    let best: number | null = null;
    for (const r of rows) if (best === null || r.delta_au < best) best = r.delta_au;
    return best;
  }, [rows]);

  const riskClass = record?.risk_class ?? 'minimal';

  return (
    <Surface
      elevation={1}
      className="flex max-h-full w-[min(92vw,360px)] flex-col overflow-y-auto bg-surface-1/85 backdrop-blur-md scrollbar-thin"
    >
      {/* Başlık */}
      <div className="border-b border-white/[0.06] px-4 py-3">
        <p className="font-mono-tnum text-[10px] uppercase tracking-[0.25em] text-text-tertiary">
          yörünge · {record?.designation ?? neoId}
        </p>
        <h2 className="mt-0.5 text-base font-semibold text-text-primary">
          {record?.name ?? 'Yükleniyor…'}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
              RISK_CLASS[riskClass],
            )}
          >
            {RISK_LABEL[riskClass]}
          </span>
          {record && (
            <span className="font-mono-tnum text-[11px] text-text-secondary">
              risk {fmt(record.hybrid_score * 100, 0)}%
            </span>
          )}
          {record?.is_potentially_hazardous && (
            <span className="rounded-full border border-threat-high/35 bg-threat-high/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-threat-high">
              PHA
            </span>
          )}
          {record?.sentry_listed && (
            <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-secondary">
              Sentry
            </span>
          )}
        </div>
      </div>

      {/* Yörünge elemanları */}
      <Section title="Yörünge">
        <Grid>
          <Stat label="Yarı-büyük eksen" value={el ? `${fmt(el.a_au, 3)} AU` : '—'} />
          <Stat label="Dışmerkezlik (e)" value={el ? fmt(el.e, 3) : '—'} />
          <Stat label="Eğim (i)" value={el ? `${fmt(el.i_deg, 1)}°` : '—'} />
          <Stat label="Periyot" value={periodYears ? `${fmt(periodYears, 2)} yıl` : '—'} />
        </Grid>
      </Section>

      {/* En yakın geçiş */}
      <Section title="En Yakın Geçiş">
        <Grid>
          <Stat label="Tarih" value={fmtDate(record?.next_approach_at)} />
          <Stat label="Hız" value={record?.relative_velocity_kms ? `${fmt(record.relative_velocity_kms, 1)} km/s` : '—'} />
          <Stat label="Kaçırma mesafesi" value={fmtKm(record?.miss_distance_km)} wide accent="#ffb066" />
        </Grid>
      </Section>

      {/* Monte Carlo belirsizliği */}
      {mc && (
        <Section title="Belirsizlik (Monte Carlo)">
          <p className="mb-2 text-[11px] leading-snug text-text-tertiary">
            {fmt(mc.samples, 0)} örnekle en yakın geçişin olası aralığı:
          </p>
          <Grid>
            <Stat label="p1 (en kötü)" value={`${fmt(mc.p1_km / LUNAR_DISTANCE_KM, 2)} AyU`} accent="#ff5a4d" />
            <Stat label="p50 (medyan)" value={`${fmt(mc.p50_km / LUNAR_DISTANCE_KM, 2)} AyU`} />
            <Stat label="p99 (uzak)" value={`${fmt(mc.p99_km / LUNAR_DISTANCE_KM, 2)} AyU`} />
            <Stat label="Std sapma" value={fmtKm(mc.std_km)} />
          </Grid>
        </Section>
      )}

      {/* Görünürlük / parlaklık */}
      <Section title="Görünürlük (90 gün)">
        {rows.length > 1 ? (
          <>
            <OrbitBrightnessChart rows={rows} />
            <Grid className="mt-2">
              <Stat
                label="En parlak"
                value={brightest ? `m ${fmt(brightest.mag, 1)} · ${fmtDate(brightest.when)}` : '—'}
                wide
              />
              <Stat
                label="En yakın (geo)"
                value={closestEphem != null ? fmtKm(closestEphem * AU_KM) : '—'}
                wide
              />
            </Grid>
            <p className="mt-1.5 text-[10px] leading-snug text-text-tertiary">
              {'Düşük m = daha parlak. ~m6\'dan parlak çıplak gözle, ~m12\'ye kadar amatör teleskopla görülebilir.'}
            </p>
          </>
        ) : (
          <p className="text-[11px] text-text-tertiary">
            {ephem.isLoading ? 'Efemeris yükleniyor…' : 'Görünürlük verisi yok.'}
          </p>
        )}
      </Section>
    </Surface>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-white/[0.04] px-4 py-3 last:border-b-0">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Grid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-2', className)}>{children}</div>;
}

function Stat({
  label,
  value,
  wide,
  accent,
}: {
  label: string;
  value: string;
  wide?: boolean;
  accent?: string;
}) {
  return (
    <div className={cn('rounded-md bg-surface-2/60 px-2.5 py-1.5', wide && 'col-span-2')}>
      <div className="text-[9px] uppercase tracking-wider text-text-tertiary">{label}</div>
      <div
        className="mt-0.5 font-mono-tnum text-[12.5px] font-semibold text-text-primary"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
