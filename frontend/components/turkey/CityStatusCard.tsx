'use client';

import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Flame,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Skeleton, Surface } from '@/components/ui';
import { useEarthquakesTr } from '@/hooks/useEarthquakesTr';
import { useWildfires } from '@/hooks/useWildfires';
import { subscribeDemoAction } from '@/lib/demo-event-bus';
import {
  REGION_LABELS,
  TURKISH_CITIES,
  type TurkishCity,
} from '@/lib/cities-tr';
import { cn } from '@/lib/utils';

const DEFAULT_PLATE = 16; // Bursa — orta nüfuslu, sismik açıdan ilginç bölge

interface SectionTone {
  icon: typeof Activity;
  text: string;
  className: string;
}

/**
 * "Şehrini Seç → Bugün Burada Ne Olmuş" kartı.
 *
 * Vali / MEM müdürü için: "biz neden bu projeyle ilgilenelim" sorusuna
 * öz, yerel bağlamla cevap verir. Tek kart üzerinde:
 *   - Yer hareketleri (AFAD, ≤200 km)
 *   - Aktif yangınlar (NASA FIRMS, ≤100 km)
 *   - Uzaydan tehdit (en yakın geçiş yapacak NEO)
 */
export function CityStatusCard({ className }: { className?: string }) {
  const [plate, setPlate] = useState<number>(DEFAULT_PLATE);
  const city = useMemo(
    () => TURKISH_CITIES.find((c) => c.plate === plate) ?? TURKISH_CITIES[0]!,
    [plate],
  );

  // Demo Tour: dışardan plate cycle isteklerine cevap ver
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    const unsub = subscribeDemoAction((action) => {
      if (action.type === 'turkey:cycle-cities') {
        let i = 0;
        if (cancelled) return;
        if (interval) clearInterval(interval);
        if (action.cities.length > 0) {
          const firstCity = action.cities[0];
          if (firstCity !== undefined) setPlate(firstCity);
        }
        interval = setInterval(() => {
          i = (i + 1) % action.cities.length;
          const target = action.cities[i];
          if (target !== undefined) setPlate(target);
        }, action.intervalMs);
      } else if (action.type === 'turkey:cycle-stop') {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      }
    });
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      unsub();
    };
  }, []);

  const quakes = useEarthquakesTr(2.5, 24);
  const fires = useWildfires('TUR', 1);

  const nearbyQuakes = useMemo(
    () =>
      (quakes.data?.items ?? [])
        .filter((q) => q.lat != null && q.lon != null)
        .map((q) => ({
          q,
          distance: haversineKm(city.lat, city.lng, q.lat as number, q.lon as number),
        }))
        .filter((row) => row.distance <= 200)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5),
    [quakes.data, city],
  );

  const nearbyFires = useMemo(
    () =>
      (fires.data?.items ?? [])
        .map((f) => ({
          f,
          distance: haversineKm(city.lat, city.lng, f.lat, f.lon),
        }))
        .filter((row) => row.distance <= 100)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3),
    [fires.data, city],
  );

  const overallTone = computeOverallTone(nearbyQuakes.length, nearbyFires.length);

  return (
    <Surface
      elevation={2}
      rounded="lg"
      className={cn('flex flex-col gap-3 p-4 sm:p-5', className)}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
            Şehir Durum Kartı · Bugün
          </p>
          <h2 className="mt-1 text-lg font-semibold text-text-primary">
            {city.name}
            <span className="ml-2 font-mono-tnum text-xs font-normal text-text-tertiary">
              {String(city.plate).padStart(2, '0')} · {REGION_LABELS[city.region]}
            </span>
          </h2>
          <p className={cn('mt-2 flex items-center gap-1.5 text-xs', overallTone.className)}>
            <overallTone.icon className="size-3.5" />
            {overallTone.text}
          </p>
        </div>
        <CitySelect plate={plate} onChange={setPlate} />
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Yer hareketleri */}
        <Section
          icon={Activity}
          title="Yer Hareketleri"
          subtitle={`AFAD · son 24 saat · ≤ 200 km`}
        >
          {quakes.isLoading && <Skeleton className="h-12" />}
          {!quakes.isLoading && nearbyQuakes.length === 0 && (
            <EmptyLine>Yakın çevrede kayıt yok.</EmptyLine>
          )}
          {nearbyQuakes.map(({ q, distance }) => (
            <Row
              key={q.id}
              left={`M${(q.magnitude ?? 0).toFixed(1)} · ${q.place ?? '—'}`}
              right={`${distance.toFixed(0)} km`}
              tone={(q.magnitude ?? 0) >= 4 ? 'warn' : 'muted'}
            />
          ))}
        </Section>

        {/* Aktif yangınlar */}
        <Section
          icon={Flame}
          title="Aktif Yangınlar"
          subtitle="NASA FIRMS · son 24 saat · ≤ 100 km"
        >
          {fires.isLoading && <Skeleton className="h-12" />}
          {!fires.isLoading && nearbyFires.length === 0 && (
            <EmptyLine>Yakın çevrede aktif yangın yok.</EmptyLine>
          )}
          {nearbyFires.map(({ f, distance }) => (
            <Row
              key={`${f.lat}-${f.lon}-${f.acq_at}`}
              left={`${f.lat.toFixed(2)}°, ${f.lon.toFixed(2)}°`}
              right={`${distance.toFixed(0)} km`}
              tone="warn"
            />
          ))}
        </Section>
      </div>
    </Surface>
  );
}

function computeOverallTone(quakeCount: number, fireCount: number): SectionTone {
  if (quakeCount >= 3 || fireCount >= 2) {
    return {
      icon: AlertCircle,
      text: 'Bugün dikkat: çevrede birden fazla aktif olay var.',
      className: 'text-threat-high',
    };
  }
  if (quakeCount + fireCount > 0) {
    return {
      icon: Activity,
      text: 'Bugün hareketli: çevrede izlenen olaylar var.',
      className: 'text-threat-moderate',
    };
  }
  return {
    icon: CheckCircle2,
    text: 'Bugün sakin: çevrede dikkat çeken olay yok.',
    className: 'text-threat-low',
  };
}

interface SectionProps {
  icon: typeof Activity;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function Section({ icon: Icon, title, subtitle, children }: SectionProps) {
  return (
    <div className="rounded-md border border-white/[0.06] bg-surface-1 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="size-3.5 shrink-0 text-text-secondary" />
        <h3 className="text-xs font-semibold text-text-primary">{title}</h3>
      </div>
      <p className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
        {subtitle}
      </p>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  );
}

function Row({
  left,
  right,
  tone,
}: {
  left: string;
  right: string;
  tone: 'muted' | 'warn';
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-[12px]">
      <span
        className={cn(
          'truncate',
          tone === 'warn' ? 'text-threat-moderate' : 'text-text-primary',
        )}
        title={left}
      >
        {left}
      </span>
      <span className="font-mono-tnum text-[11px] text-text-tertiary">{right}</span>
    </div>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono-tnum text-[11px] text-text-tertiary">{children}</p>
  );
}

interface CitySelectProps {
  plate: number;
  onChange: (plate: number) => void;
}

function CitySelect({ plate, onChange }: CitySelectProps) {
  // Native select — iOS/Android native picker, daha iyi mobile UX
  return (
    <label className="flex flex-col items-end gap-1">
      <span className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
        İl seç
      </span>
      <select
        value={plate}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          'rounded-md border border-white/[0.1] bg-surface-1 px-2 py-1 text-xs text-text-primary',
          'focus:border-white/30 focus:outline-none',
        )}
        aria-label="İl seç"
      >
        {TURKISH_CITIES.map((c: TurkishCity) => (
          <option key={c.plate} value={c.plate}>
            {String(c.plate).padStart(2, '0')} · {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
