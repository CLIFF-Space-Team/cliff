'use client';

import { Sun, Wind, Zap } from 'lucide-react';

import { SourceLabel, Surface } from '@/components/ui';
import { useSpaceWeather } from '@/hooks/useSpaceWeather';

const KP_DOT_COLOR = (kp: number): string => {
  if (kp >= 7) return 'bg-threat-critical';
  if (kp >= 5) return 'bg-threat-high';
  if (kp >= 4) return 'bg-threat-moderate';
  return 'bg-threat-low';
};

const FLARE_DOT_COLOR = (cls: string | null | undefined): string => {
  if (!cls) return 'bg-text-tertiary';
  const letter = cls.charAt(0).toUpperCase();
  if (letter === 'X') return 'bg-threat-critical';
  if (letter === 'M') return 'bg-threat-high';
  if (letter === 'C') return 'bg-threat-moderate';
  return 'bg-threat-low';
};

/**
 * NOAA Space-Weather summary card — Kp index, GOES X-ray flare class, and
 * solar wind speed/Bz. Negative IMF Bz is highlighted because a sustained
 * southward field is what couples solar-wind energy into the magnetosphere
 * (i.e., the geomagnetic storm prerequisite).
 */
export function SpaceWeatherPanel() {
  const { data, isLoading, isError } = useSpaceWeather();

  if (isLoading) {
    return (
      <Surface elevation={1} className="p-3 animate-pulse">
        <div className="h-3 w-32 rounded bg-surface-2" />
        <div className="mt-3 h-16 w-full rounded bg-surface-2" />
      </Surface>
    );
  }

  if (isError || !data) {
    return (
      <Surface elevation={1} className="p-3">
        <div className="text-[11px] text-text-tertiary">
          Uzay havası verisi alınamadı (NOAA SWPC).
        </div>
      </Surface>
    );
  }

  const kp = data.kp;
  const xray = data.xray;
  const sw = data.solar_wind;
  const bzNegative = sw?.bz_nt != null && sw.bz_nt < -3;

  return (
    <Surface elevation={1} className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
          <Sun className="size-3" />
          UZAY HAVASI
        </div>
        <span className="font-mono-tnum text-[9px] uppercase tracking-wider text-text-tertiary">
          NOAA SWPC
        </span>
      </div>

      {/* Kp Index */}
      <div className="rounded border border-white/[0.06] bg-surface-2/60 p-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
            Kp · jeomanyetik
          </span>
          {kp.available && kp.label && (
            <span className="text-[10px] font-medium text-text-secondary">{kp.label}</span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          {kp.available && kp.kp != null ? (
            <>
              <span
                className={`size-2 rounded-full ${KP_DOT_COLOR(kp.kp)}`}
                aria-hidden
              />
              <span className="font-mono-tnum text-xl font-semibold text-text-primary">
                {kp.kp.toFixed(1)}
              </span>
            </>
          ) : (
            <span className="text-[11px] text-text-tertiary">veri yok</span>
          )}
        </div>
      </div>

      {/* X-ray flare */}
      <div className="rounded border border-white/[0.06] bg-surface-2/60 p-2">
        <div className="flex items-baseline justify-between">
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-text-tertiary">
            <Zap className="size-2.5" />
            GOES X-ışını sınıfı
          </span>
          {xray.available && xray.peak_24h && (
            <span className="font-mono-tnum text-[10px] text-text-secondary">
              24s zirve · {xray.peak_24h.class}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          {xray.available && xray.current_class ? (
            <>
              <span
                className={`size-2 rounded-full ${FLARE_DOT_COLOR(xray.current_class)}`}
                aria-hidden
              />
              <span className="font-mono-tnum text-xl font-semibold text-text-primary">
                {xray.current_class}
              </span>
            </>
          ) : (
            <span className="text-[11px] text-text-tertiary">A/B (sessiz)</span>
          )}
        </div>
      </div>

      {/* Solar wind */}
      <div className="rounded border border-white/[0.06] bg-surface-2/60 p-2">
        <div className="flex items-baseline justify-between">
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-text-tertiary">
            <Wind className="size-2.5" />
            Güneş rüzgârı (L1)
          </span>
          {bzNegative && (
            <span className="text-[9px] font-semibold uppercase tracking-wider text-threat-high">
              Bz güney · etkileşim olası
            </span>
          )}
        </div>
        {sw?.available ? (
          <dl className="mt-1 grid grid-cols-3 gap-1 font-mono-tnum text-[11px]">
            <div>
              <dt className="text-[9px] text-text-tertiary">hız</dt>
              <dd className="text-text-primary">
                {sw.speed_kms != null ? `${sw.speed_kms.toFixed(0)} km/s` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[9px] text-text-tertiary">yoğ.</dt>
              <dd className="text-text-primary">
                {sw.density_pcm3 != null ? `${sw.density_pcm3.toFixed(1)} p/cm³` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[9px] text-text-tertiary">Bz</dt>
              <dd className={bzNegative ? 'text-threat-high' : 'text-text-primary'}>
                {sw.bz_nt != null ? `${sw.bz_nt.toFixed(1)} nT` : '—'}
              </dd>
            </div>
          </dl>
        ) : (
          <div className="mt-1 text-[11px] text-text-tertiary">veri yok</div>
        )}
      </div>

      <SourceLabel
        source="NOAA SWPC (Kp · GOES X-ray · DSCOVR)"
        href="https://www.swpc.noaa.gov/"
        className="px-0 pt-1 pb-0"
      />
    </Surface>
  );
}
