'use client';

import dynamic from 'next/dynamic';
import {
  Activity,
  Building2,
  ExternalLink,
  Flame,
  Globe2,
  GraduationCap,
  Info,
  Map as MapIcon,
  Sparkles,
  Waves,
  X,
} from 'lucide-react';
import { useMemo } from 'react';

import { Button, Skeleton, Surface } from '@/components/ui';
import type { LiveEvent } from './types';

// Lazy-load Leaflet on the client only — its module pulls `window` at import.
const EventMap2D = dynamic(
  () => import('./city/EventMap2D').then((m) => m.EventMap2D),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[200px] w-full rounded" />,
  },
);

interface EventDetailPanelProps {
  event: LiveEvent | null;
  onClose: () => void;
  /** Open the in-depth city-scale earthquake simulation. Only meaningful for
   *  `kind === 'quake'`; ignored otherwise. */
  onOpenQuakeImmersive: () => void;
}

const KIND_LABEL: Record<LiveEvent['kind'], { tr: string; icon: typeof Activity }> = {
  quake: { tr: 'Deprem', icon: Waves },
  fireball: { tr: 'Atmosferik Çarpma (Fireball)', icon: Flame },
  eonet: { tr: 'Aktif Doğa Olayı', icon: Globe2 },
};

/**
 * Educational sidebar for the selected event. Mixes:
 *   - the raw observation (magnitude / energy / coordinates / time)
 *   - a "what does this actually mean?" explainer paragraph (Turkish, not a
 *     translation of an English copy — written for students/educators)
 *   - a context paragraph comparing this event to known references
 *   - a replay button that restarts the 3D simulation
 *
 * The explainer text is generated client-side from the event's properties
 * (no extra API call). For a model-generated answer the user can also pop
 * the floating chat panel.
 */
export function EventDetailPanel({ event, onClose, onOpenQuakeImmersive }: EventDetailPanelProps) {
  const explainer = useMemo(() => (event ? buildExplainer(event) : null), [event]);
  const headline = useMemo(() => (event ? buildHeadline(event) : null), [event]);

  if (!event) {
    return (
      <Surface elevation={1} className="flex h-full min-h-0 flex-col items-center justify-center p-6 text-center">
        <Sparkles className="mb-2 size-5 text-text-tertiary" />
        <h3 className="text-sm font-semibold text-text-primary">Bir olay seç</h3>
        <p className="mt-1 max-w-xs text-[12px] text-text-secondary">
          3D küre üzerindeki noktalardan birine tıkla — eğitimsel açıklamasını ve
          3D simülasyonunu burada göreceksin.
        </p>
        <ul className="mt-4 space-y-1 text-[11px] text-text-tertiary">
          <li>🟠 Turuncu / kırmızı · USGS depremler</li>
          <li>🟡 Sarı · JPL atmosferik çarpmalar</li>
          <li>🟦 Cyan · NASA EONET aktif olaylar</li>
        </ul>
      </Surface>
    );
  }

  const meta = KIND_LABEL[event.kind];
  const KindIcon = meta.icon;

  return (
    <Surface elevation={1} className="flex h-full min-h-0 flex-col">
      <header className="flex items-start justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            <KindIcon className="size-3" />
            {meta.tr}
          </div>
          <h3 className="mt-1 truncate text-sm font-semibold text-text-primary">
            {event.title}
          </h3>
          {event.subtitle && (
            <div className="font-mono-tnum text-[11px] text-text-secondary">
              {event.subtitle}
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Kapat">
          <X className="size-4" />
        </Button>
      </header>

      <div className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {/* 2D mini-map: per-event-kind context (Mercalli rings for quakes,
         *  energy rings for fireballs, geometry trail for EONET). Single
         *  source of truth for "where on Earth is this?" — replaces the
         *  ambiguous 3D dot on the rotating globe. */}
        <div className="relative">
          <EventMap2D event={event} />
          <div className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded border border-white/10 bg-surface-1/85 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-tertiary backdrop-blur">
            <MapIcon className="size-2.5" />
            2D
          </div>
        </div>

        {/* Headline metric — the single number that defines this event. */}
        {headline && (
          <div className="rounded border border-white/[0.06] bg-surface-2/60 p-3">
            <div className="text-[9px] uppercase tracking-wider text-text-tertiary">
              {headline.label}
            </div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span
                className={`font-mono-tnum text-3xl font-bold ${headline.toneClass}`}
              >
                {headline.value}
              </span>
              <span className="text-[11px] text-text-secondary">{headline.unit}</span>
            </div>
            {headline.qualifier && (
              <div className="mt-1 text-[11px] text-text-secondary">{headline.qualifier}</div>
            )}
          </div>
        )}

        {/* Raw observation grid */}
        <div className="grid grid-cols-2 gap-2 rounded border border-white/[0.06] bg-surface-2/60 p-2">
          <Stat label="Enlem" value={`${event.lat.toFixed(2)}°`} />
          <Stat label="Boylam" value={`${event.lng.toFixed(2)}°`} />
          {event.timestamp && (
            <Stat
              label="Zaman (UTC)"
              value={event.timestamp.replace('T', ' ').slice(0, 16)}
              wide
            />
          )}
        </div>

        {/* Educational explainer */}
        {explainer && (
          <div className="space-y-2 rounded border border-white/[0.06] bg-surface-1 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
              <GraduationCap className="size-3" />
              NE OLDU?
            </div>
            <p className="text-[12px] leading-relaxed text-text-secondary">
              {explainer.what}
            </p>
            {explainer.context && (
              <>
                <div className="flex items-center gap-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                  <Info className="size-3" />
                  BAĞLAM
                </div>
                <p className="text-[12px] leading-relaxed text-text-secondary">
                  {explainer.context}
                </p>
              </>
            )}
          </div>
        )}

        {event.description && (
          <div className="rounded border border-white/[0.06] bg-surface-1 p-3 text-[12px] leading-relaxed text-text-secondary">
            {event.description}
          </div>
        )}
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-white/[0.06] px-3 py-2">
        {event.kind === 'quake' && (
          <Button variant="primary" size="sm" onClick={onOpenQuakeImmersive} className="flex-1">
            <Building2 className="size-3.5" />
            Şehir simülasyonunu aç
          </Button>
        )}
        {event.kind === 'fireball' && (
          <Button asChild variant="primary" size="sm" className="flex-1">
            <a
              href="https://cneos.jpl.nasa.gov/fireballs/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Flame className="size-3.5" />
              JPL Fireball arşivi
            </a>
          </Button>
        )}
        {event.kind === 'eonet' && event.externalUrl && (
          <Button asChild variant="primary" size="sm" className="flex-1">
            <a href={event.externalUrl} target="_blank" rel="noopener noreferrer">
              <Globe2 className="size-3.5" />
              EONET kaydını aç
            </a>
          </Button>
        )}
        {event.externalUrl && event.kind !== 'eonet' && (
          <Button asChild variant="ghost" size="sm">
            <a href={event.externalUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" />
              Kaynak
            </a>
          </Button>
        )}
      </footer>
    </Surface>
  );
}

interface Headline {
  label: string;
  value: string;
  unit: string;
  qualifier?: string;
  toneClass: string;
}

/** One number per event that tells you "how big a deal is this?" — magnitude
 *  for quakes, kt energy for fireballs, the category title for EONET. */
function buildHeadline(event: LiveEvent): Headline {
  if (event.kind === 'quake') {
    const mag = (event.raw?.['magnitude'] as number) ?? 0;
    const tone =
      mag >= 7
        ? 'text-threat-critical'
        : mag >= 6
          ? 'text-threat-high'
          : mag >= 5
            ? 'text-threat-moderate'
            : 'text-text-primary';
    return {
      label: 'Büyüklük',
      value: `M${mag.toFixed(1)}`,
      unit: 'Richter / moment',
      qualifier:
        mag >= 7
          ? 'Yıkıcı sınıf'
          : mag >= 6
            ? 'Kuvvetli'
            : mag >= 5
              ? 'Orta'
              : 'Hafif',
      toneClass: tone,
    };
  }
  if (event.kind === 'fireball') {
    const kt = (event.raw?.['energy'] as number) ?? 0;
    const tone =
      kt >= 100
        ? 'text-threat-critical'
        : kt >= 5
          ? 'text-threat-high'
          : 'text-text-primary';
    const hiroshima = kt / 15;
    return {
      label: 'Açığa çıkan enerji',
      value: kt.toFixed(2),
      unit: 'kt TNT eşdeğeri',
      qualifier:
        hiroshima >= 1
          ? `~${hiroshima.toFixed(1)}× Hiroşima`
          : `Hiroşima'nın 1/${Math.max(2, Math.round(1 / Math.max(0.0001, hiroshima)))}'i`,
      toneClass: tone,
    };
  }
  // EONET — pull the latest geometry magnitude (acres, knots, hPa…) so two
  // wildfires don't both render the generic "Kategori: Wildfires" tile.
  const cats = (event.raw?.['categories'] as Array<{ title?: string }> | undefined) ?? [];
  const cat = cats[0]?.title ?? 'Doğa olayı';
  const geometry =
    (event.raw?.['geometry'] as Array<{
      magnitudeValue?: number | null;
      magnitudeUnit?: string | null;
      date?: string;
    }> | undefined) ?? [];
  const lastWithMag = [...geometry]
    .reverse()
    .find((g) => typeof g.magnitudeValue === 'number');

  if (lastWithMag && typeof lastWithMag.magnitudeValue === 'number') {
    const v = lastWithMag.magnitudeValue;
    return {
      label: cat,
      value:
        v >= 10_000
          ? (v / 1000).toFixed(1) + 'k'
          : v >= 100
            ? Math.round(v).toString()
            : v.toFixed(2),
      unit: lastWithMag.magnitudeUnit ?? '',
      qualifier: 'NASA EONET · canlı',
      toneClass: 'text-cyan-300',
    };
  }
  return {
    label: 'Kategori',
    value: cat,
    unit: 'NASA EONET',
    toneClass: 'text-cyan-300',
  };
}

function Stat({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <div className="text-[9px] uppercase tracking-wider text-text-tertiary">{label}</div>
      <div className="font-mono-tnum text-[12px] text-text-primary">{value}</div>
    </div>
  );
}

interface Explainer {
  what: string;
  context?: string;
}

/**
 * Build a Turkish, plain-language explanation from event properties. No LLM
 * needed — these are deterministic facts the user wants to see immediately.
 */
function buildExplainer(event: LiveEvent): Explainer {
  if (event.kind === 'quake') {
    const mag = (event.raw?.['magnitude'] as number) ?? 0;
    const depth = event.raw?.['depth_km'] as number | null | undefined;
    const tsunami = !!event.raw?.['tsunami'];
    const place = (event.raw?.['place'] as string) ?? 'belirtilmemiş bölge';

    const what = [
      `${place} bölgesinde **M${mag.toFixed(1)}** büyüklüğünde bir deprem kaydedildi.`,
      depth != null
        ? `Hiposantr derinliği yaklaşık ${depth.toFixed(0)} km — ${
            depth < 70 ? 'sığ deprem' : depth < 300 ? 'orta derinlikte' : 'derin'
          } sınıfa girer.`
        : '',
      tsunami ? 'USGS bu olay için **tsunami uyarısı** yayınladı.' : '',
    ]
      .filter(Boolean)
      .join(' ');

    let context = '';
    if (mag >= 7) {
      context =
        'M7+ depremler **yıkıcı** sayılır — geniş alanda yapısal hasar, sismik dalga binlerce km yayılır. ' +
        '2011 Tōhoku (M9.0), 2010 Şili (M8.8), 1999 İzmit (M7.6) gibi tarihsel referansların aralığındadır.';
    } else if (mag >= 6) {
      context =
        'M6.0–6.9 aralığı **kuvvetli** deprem kabul edilir. Yapı standartları ve epicenter mesafesine göre bölgesel hasar verebilir. ' +
        'Yılda dünya genelinde ortalama 100-150 olay bu sınıfta gerçekleşir.';
    } else if (mag >= 5) {
      context =
        'M5.0–5.9 **orta** sınıf depremler nüfus merkezlerine yakınsa hissedilir, ' +
        'depreme dayanıklı binalarda hasar nadirdir. Yılda ~1.300 olay bu büyüklükte gerçekleşir.';
    } else {
      context =
        'M4-5 **hafif** deprem sınıfı — duvar saatleri sallanır, çatlaklar görülmez. ' +
        'Sismik altyapımız sayesinde bu büyüklükteki olayları bile yakalayabiliyoruz.';
    }

    return { what, context };
  }

  if (event.kind === 'fireball') {
    const energy = (event.raw?.['energy'] as number) ?? 0;
    const altitude = event.raw?.['altitude'] as number | null | undefined;
    const velocity = event.raw?.['velocity'] as number | null | undefined;
    const date = (event.raw?.['date'] as string) ?? 'bilinmeyen tarih';

    const what = [
      `${date} tarihinde atmosferin üst katmanlarında **${energy.toFixed(2)} kt eşdeğeri** enerji açığa çıkaran bir bolide (parlak meteor) kaydedildi.`,
      altitude != null ? `Patlama / parçalanma yüksekliği ~${altitude.toFixed(0)} km.` : '',
      velocity != null
        ? `Atmosfere giriş hızı ${velocity.toFixed(1)} km/s — kütlesinin neredeyse tamamı sürtünme ısısıyla ışıma olarak harcandı.`
        : '',
    ]
      .filter(Boolean)
      .join(' ');

    let context = '';
    if (energy >= 100) {
      context =
        'Bu, **Çelyabinsk-2013** (~440 kt) seviyesinde bir olaydır. Şehirler için cam-kırılması ve hafif yapısal hasar potansiyeli olabilir; ' +
        'sismik dedektörlerce bile algılanabilir.';
    } else if (energy >= 5) {
      context =
        '~5–100 kt aralığı, dünya genelinde **yılda birkaç kez** gözlenen tipik büyük bolide olaylarıdır. ' +
        'Çoğu okyanus üstünde ya da seyrek nüfuslu bölgelerde gerçekleştiği için kamuoyu çoğu zaman fark etmez.';
    } else {
      context =
        '5 kt altı bolide olayları **çok sık** — neredeyse her hafta dünyanın bir yerinde gözlenir. ' +
        'Hiroşima bombası (~15 kt) ile karşılaştırıldığında çok küçüktürler ve yer hasarı oluşturmazlar.';
    }

    return { what, context };
  }

  // EONET (volcanoes, wildfires, storms…)
  const categoryRaw = (event.raw?.['categories'] as Array<{ title?: string }> | undefined) ?? [];
  const cat = categoryRaw[0]?.title ?? 'doğa olayı';

  return {
    what:
      `NASA EONET sistemi, bu konumda devam eden **${cat}** olayını işaretledi. ` +
      'EONET (Earth Observatory Natural Event Tracker), uydu görüntülerinden otomatik olarak ' +
      'yangınları, volkan aktivitelerini, fırtınaları ve buzul olaylarını takip eder.',
    context:
      'EONET\'te kayıtlı bir olay genelde **birden çok jeometri noktasıyla** gelir — başlangıç ' +
      'konumundan zaman içinde nasıl yayıldığını gösterir. Tıkladığın nokta olayın en güncel ' +
      'gözlem konumudur.',
  };
}
