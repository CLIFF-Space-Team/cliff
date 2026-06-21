'use client';

import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Box,
  ChevronDown,
  Crosshair,
  Map,
  MapPin,
  Orbit,
  Share2,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  Suspense,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import { ChatPanel } from '@/components/ai/ChatPanel';
import { CityPicker } from '@/components/impact/CityPicker';
import { ImpactMapView } from '@/components/impact/ImpactMapView';
import { CinematicFx } from '@/components/impact/CinematicFx';
import { ImpactorPicker } from '@/components/impact/ImpactorPicker';
import { ImpactParameterForm } from '@/components/impact/ImpactParameterForm';
import { ImpactResults } from '@/components/impact/ImpactResults';
import { ImpactTimeline } from '@/components/impact/ImpactTimeline';
import { ImpactWizard } from '@/components/impact/ImpactWizard';
import { NarrationOverlay } from '@/components/impact/NarrationOverlay';
import { PresetPicker } from '@/components/impact/PresetPicker';
import {
  TurkishCityPicker,
  turkishCityToCityInfo,
} from '@/components/impact/TurkishCityPicker';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { Button, Skeleton } from '@/components/ui';
import { useImpactPresets } from '@/hooks/useImpactPresets';
import { CITIES, type CityInfo } from '@/lib/cities';
import { TURKISH_CITIES } from '@/lib/cities-tr';
import { subscribeDemoAction } from '@/lib/demo-event-bus';
import { estimateCasualties } from '@/lib/impact-casualties';
import { findImpactor, type QuickImpactor } from '@/lib/impact-impactors';
import { COMPOSITIONS, calculateImpact, type ImpactInput } from '@/lib/impact-physics';
import {
  DEFAULT_PRESET_ID,
  FALLBACK_INPUT,
  LOCAL_TR_PRESETS,
  TR_PRESET_TARGETS,
  findPreset,
  type ImpactPreset,
} from '@/lib/impact-presets';
import { cn } from '@/lib/utils';

const ImpactVisualization3D = dynamic(
  () =>
    import('@/components/impact/ImpactVisualization3D').then(
      (m) => m.ImpactVisualization3D,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="absolute inset-0" />,
  },
);

type ViewMode = 'three' | 'map';
type PickerMode = 'global' | 'turkey';

function readUrlState(params: URLSearchParams): {
  presetId: string | null;
  cityId: string | null;
  view: ViewMode | null;
} {
  return {
    presetId: params.get('preset'),
    cityId: params.get('city'),
    view: (params.get('view') as ViewMode) || null,
  };
}

function findCityById(id: string): CityInfo | null {
  const m = /^tr-(\d+)$/.exec(id);
  if (m) {
    const t = TURKISH_CITIES.find((c) => c.plate === Number(m[1]));
    return t ? turkishCityToCityInfo(t) : null;
  }
  return CITIES.find((c) => c.id === id) ?? null;
}

export default function ImpactPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[100dvh] w-full" />}>
      <ImpactPageContent />
    </Suspense>
  );
}

function ImpactPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const presetsQuery = useImpactPresets();
  const allPresets = useMemo<ImpactPreset[]>(
    () => [...(presetsQuery.data?.items ?? []), ...LOCAL_TR_PRESETS],
    [presetsQuery.data],
  );

  const [input, setInput] = useState<ImpactInput>(FALLBACK_INPUT);
  const [presetId, setPresetId] = useState<string | null>(DEFAULT_PRESET_ID);
  const [hasUserOverridden, setHasUserOverridden] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [city, setCity] = useState<CityInfo | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('three');
  const [pickerMode, setPickerMode] = useState<PickerMode>('global');

  // Hızlı sandbox cisim seçimi (tarihsel preset'ten ayrı).
  const [impactorId, setImpactorId] = useState<string | null>(null);

  // Toolbar açılır menü durumları
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [paramsOpen, setParamsOpen] = useState(false);
  const [impactorOpen, setImpactorOpen] = useState(false);

  // Klavye kısayolu (Boşluk) için güncel progress'i ref'te tut —
  // stale closure olmadan "sondaysa yeniden ateşle" kararı verilir.
  const progressRef = useRef(progress);
  progressRef.current = progress;

  // 1. URL → state (mount only)
  useEffect(() => {
    const url = readUrlState(searchParams);
    if (url.presetId) {
      setPresetId(url.presetId);
      setHasUserOverridden(true);
    }
    if (url.cityId) {
      const c = findCityById(url.cityId);
      if (c) {
        setCity(c);
        if (url.cityId.startsWith('tr-')) setPickerMode('turkey');
      }
    }
    if (url.view === 'map' || url.view === 'three') {
      setViewMode(url.view);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Preset listesi yüklenince input'u kur.
  useEffect(() => {
    if (allPresets.length === 0) return;
    if (presetId) {
      const p = findPreset(allPresets, presetId);
      if (p) {
        setInput(p.input);
        const trTarget = TR_PRESET_TARGETS[p.id];
        if (trTarget && !city) {
          const closest = [...TURKISH_CITIES].sort((a, b) => {
            const da = (a.lat - trTarget.lat) ** 2 + (a.lng - trTarget.lng) ** 2;
            const db = (b.lat - trTarget.lat) ** 2 + (b.lng - trTarget.lng) ** 2;
            return da - db;
          })[0];
          if (closest) {
            setCity(turkishCityToCityInfo(closest));
            setPickerMode('turkey');
          }
        }
      }
    } else if (!hasUserOverridden) {
      const def = findPreset(allPresets, DEFAULT_PRESET_ID);
      if (def) setInput(def.input);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPresets, presetId]);

  // Demo Tour: dış istekle viewMode değiştir
  useEffect(() => {
    return subscribeDemoAction((action) => {
      if (action.type === 'impact:set-view') {
        setViewMode(action.view);
      }
    });
  }, []);

  // 3. State → URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (presetId) params.set('preset', presetId);
    if (city?.id) params.set('city', city.id);
    if (viewMode !== 'three') params.set('view', viewMode);
    const qs = params.toString();
    router.replace(qs ? `/impact?${qs}` : '/impact', { scroll: false });
  }, [presetId, city?.id, viewMode, router]);

  const result = useMemo(() => calculateImpact(input), [input]);
  const casualties = useMemo(
    () => (city ? estimateCasualties(result, city) : null),
    [result, city],
  );

  const currentPreset = useMemo(
    () => (presetId ? findPreset(allPresets, presetId) : null),
    [allPresets, presetId],
  );

  const currentImpactor = useMemo(() => findImpactor(impactorId), [impactorId]);

  const handlePreset = (preset: ImpactPreset) => {
    setInput(preset.input);
    setPresetId(preset.id);
    setImpactorId(null);
    setProgress(0);
    setPlaying(true);
    setHasUserOverridden(true);
    setScenarioOpen(false);

    const trTarget = TR_PRESET_TARGETS[preset.id];
    if (trTarget) {
      const closest = [...TURKISH_CITIES].sort((a, b) => {
        const da = (a.lat - trTarget.lat) ** 2 + (a.lng - trTarget.lng) ** 2;
        const db = (b.lat - trTarget.lat) ** 2 + (b.lng - trTarget.lng) ** 2;
        return da - db;
      })[0];
      if (closest) {
        setCity(turkishCityToCityInfo(closest));
        setPickerMode('turkey');
        setViewMode('map');
      }
    }
  };

  const handleManualChange = (next: ImpactInput) => {
    setInput(next);
    setPresetId(null);
    setImpactorId(null);
    setHasUserOverridden(true);
  };

  // Hızlı sandbox cisim seç → input'u kur, 3D'ye geç ve hemen ateşle.
  const handleImpactor = (q: QuickImpactor) => {
    setInput(q.input);
    setImpactorId(q.id);
    setPresetId(null);
    setHasUserOverridden(true);
    setViewMode('three');
    setImpactorOpen(false);
    setProgress(0);
    setPlaying(true);
  };

  const pickCity = (c: CityInfo | null) => {
    setCity(c);
    if (c) setTargetOpen(false);
  };

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Bağlantı kopyalandı', {
        description: 'Bu senaryoyu görmek için arkadaşlarınla paylaş.',
      });
    } catch {
      toast.error('Bağlantı kopyalanamadı');
    }
  }, []);

  // Tek-tuş bombalama: baştan ateşle.
  const fire = useCallback(() => {
    setProgress(0);
    setPlaying(true);
  }, []);

  // Rastgele hedef: dünya ya da Türkiye'den bir şehir seçip hemen ateşle.
  const randomTarget = useCallback(() => {
    const useTr = Math.random() < 0.45 && TURKISH_CITIES.length > 0;
    let picked: CityInfo | null = null;
    if (useTr) {
      const t = TURKISH_CITIES[Math.floor(Math.random() * TURKISH_CITIES.length)];
      if (t) {
        picked = turkishCityToCityInfo(t);
        setPickerMode('turkey');
      }
    }
    if (!picked) {
      const c = CITIES[Math.floor(Math.random() * CITIES.length)];
      if (c) {
        picked = c;
        setPickerMode('global');
      }
    }
    if (picked) {
      setCity(picked);
      toast.success(`🎯 Hedef: ${picked.name}`, { description: picked.country });
    }
    setProgress(0);
    setPlaying(true);
  }, []);

  // Klavye kısayolları: R = (yeniden) ateşle, Boşluk = oynat/duraklat.
  // Bir input/textarea odaktayken devre dışı.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return;
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        fire();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (progressRef.current >= 1) fire();
        else setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fire]);

  const hasFired = progress > 0;

  return (
    <div className="flex h-[100dvh] flex-col bg-surface-0 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-surface-0/85 px-4 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Geri">
            <Link href="/dashboard">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold text-text-primary">
              Çarpma Simülatörü
            </h1>
            <p className="truncate font-mono-tnum text-[11px] text-text-tertiary">
              {input.diameterM >= 1000
                ? `${(input.diameterM / 1000).toFixed(2)} km`
                : `${input.diameterM} m`}{' '}
              · {input.velocityKms.toFixed(1)} km/s · {input.angleDeg}°
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleShare}
            aria-label="Senaryoyu paylaş"
            title="Bu senaryonun bağlantısını kopyala"
          >
            <Share2 className="size-4" />
          </Button>
        </div>
      </header>

      {/* Senaryo toolbar — kompakt, yatay. Hiçbir şey alt alta yığılmaz. */}
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-white/[0.06] bg-surface-1/40 px-4 py-2.5 sm:px-6">
        <Popover.Root open={scenarioOpen} onOpenChange={setScenarioOpen}>
          <Popover.Trigger asChild>
            <ToolbarButton icon={Crosshair} label="Senaryo" value={currentPreset?.name ?? 'Özel'} active={scenarioOpen} />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={8}
              className="z-50 max-h-[72vh] w-[min(94vw,560px)] overflow-y-auto rounded-xl border border-white/10 bg-surface-2 shadow-panel scrollbar-thin data-[state=open]:animate-fade-in"
            >
              <PresetPicker selectedId={presetId} onPick={handlePreset} />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <Popover.Root open={impactorOpen} onOpenChange={setImpactorOpen}>
          <Popover.Trigger asChild>
            <ToolbarButton
              icon={Orbit}
              label="Cisim"
              value={
                currentImpactor
                  ? `${currentImpactor.emoji} ${currentImpactor.name}`
                  : COMPOSITIONS[input.composition].label
              }
              active={impactorOpen}
            />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={8}
              className="z-50 max-h-[72vh] w-[min(94vw,460px)] overflow-y-auto rounded-xl border border-white/10 bg-surface-2 shadow-panel scrollbar-thin data-[state=open]:animate-fade-in"
            >
              <ImpactorPicker selectedId={impactorId} onPick={handleImpactor} />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <Popover.Root open={targetOpen} onOpenChange={setTargetOpen}>
          <Popover.Trigger asChild>
            <ToolbarButton icon={MapPin} label="Hedef" value={city ? city.name : 'Seç'} active={targetOpen} />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={8}
              className="z-50 max-h-[72vh] w-[min(94vw,360px)] overflow-y-auto rounded-xl border border-white/10 bg-surface-2 p-3 shadow-panel scrollbar-thin data-[state=open]:animate-fade-in"
            >
              <PickerModeToggle value={pickerMode} onChange={setPickerMode} />
              <div className="mt-3">
                {pickerMode === 'global' ? (
                  <CityPicker selectedId={city?.id ?? null} onSelect={pickCity} />
                ) : (
                  <TurkishCityPicker selectedId={city?.id ?? null} onSelect={pickCity} />
                )}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <button
          type="button"
          onClick={() => setParamsOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-white/[0.08] bg-surface-2 px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:border-white/[0.16] hover:text-text-primary"
        >
          <SlidersHorizontal className="size-3.5" />
          Özelleştir
        </button>

        <span className="ml-auto hidden shrink-0 font-mono-tnum text-[11px] text-text-tertiary md:inline">
          {input.composition}
        </span>
      </div>

      {/* Gövde — viz baskın hero + tek sonuç paneli */}
      <div className="grid min-h-0 flex-1 gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-12">
        <section className="order-1 flex min-h-[46vh] flex-col gap-3 sm:min-h-[440px] lg:col-span-8 lg:min-h-0">
          <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/[0.07] bg-black">
            {/* Tek-tuş bombalama — Solar Smash tarzı serbest oyun */}
            <div className="absolute left-3 top-3 z-10 flex items-center gap-2 sm:left-4 sm:top-4">
              <button
                type="button"
                onClick={fire}
                title="Çarpışmayı baştan başlat (R)"
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/95 px-4 py-2.5 text-[13px] font-bold tracking-wide text-black shadow-[0_4px_24px_rgba(0,0,0,0.5)] transition-all hover:bg-white hover:shadow-[0_6px_32px_rgba(255,255,255,0.22)] active:scale-95"
              >
                <span className="text-base leading-none">{hasFired ? '↻' : '💥'}</span>
                {hasFired ? 'Tekrar' : 'ÇARPIŞTIR'}
              </button>
              <button
                type="button"
                onClick={randomTarget}
                title="Rastgele bir şehri hedef al ve çarptır"
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-surface-2/85 px-3 py-2.5 text-[12px] font-medium text-text-secondary backdrop-blur transition-colors hover:border-white/20 hover:text-text-primary active:scale-95"
              >
                <span className="text-sm leading-none">🎲</span>
                <span className="hidden sm:inline">Rastgele</span>
              </button>
              <kbd className="hidden rounded border border-white/10 bg-black/40 px-1.5 py-1 font-mono-tnum text-[10px] text-text-tertiary lg:inline">
                R
              </kbd>
            </div>
            {/* Sinematik ekran-uzayı katmanı — çarpma flaşı + sıcak parıltı. */}
            <CinematicFx progress={progress} />
            {viewMode === 'three' ? (
              <>
                <ImpactVisualization3D
                  result={result}
                  diameterM={input.diameterM}
                  composition={input.composition}
                  progress={progress}
                  presetId={presetId}
                  targetLat={city?.lat}
                  targetLng={city?.lng}
                  cityTargeted={!!city}
                  playing={playing}
                />
                {city && (
                  <div className="pointer-events-none absolute right-4 top-4 rounded-lg border border-white/10 bg-surface-0/75 px-3 py-1.5 backdrop-blur-sm">
                    <div className="font-mono-tnum text-[10px] uppercase tracking-wider text-text-tertiary">
                      hedef
                    </div>
                    <div className="text-[12px] font-medium text-text-primary">
                      {city.name}, {city.country}
                    </div>
                  </div>
                )}
                <NarrationOverlay presetId={presetId} progress={progress} />
              </>
            ) : (
              <ImpactMapView
                result={result}
                targetLat={city?.lat ?? 39.0}
                targetLng={city?.lng ?? 35.0}
                cityName={city ? `${city.name}, ${city.country}` : null}
                className="h-full !aspect-auto"
              />
            )}
          </div>
          <ImpactTimeline
            progress={progress}
            playing={playing}
            onProgressChange={setProgress}
            onPlayingChange={setPlaying}
          />
        </section>

        <aside className="order-2 min-h-[60vh] lg:col-span-4 lg:min-h-0">
          <ImpactResults result={result} city={city} casualties={casualties} />
        </aside>
      </div>

      {/* Özelleştir — slayt panel */}
      <Dialog.Root open={paramsOpen} onOpenChange={setParamsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-[state=open]:animate-fade-in" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-surface-1 pb-[env(safe-area-inset-bottom)] shadow-panel scrollbar-thin data-[state=open]:animate-slide-in-up sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[min(92vw,380px)] sm:rounded-none sm:border-l sm:border-t-0 sm:data-[state=open]:animate-slide-in-right">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <Dialog.Title className="text-sm font-semibold text-text-primary">
                Asteroidi özelleştir
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Kapat">
                  <X className="size-4" />
                </Button>
              </Dialog.Close>
            </div>
            <div className="p-4">
              <ImpactParameterForm value={input} onChange={handleManualChange} />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ChatPanel />
      <MobileBottomNav />
      <ImpactWizard />
    </div>
  );
}

interface ToolbarButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: typeof Crosshair;
  label: string;
  value: string;
  active?: boolean;
}

// forwardRef ŞART: Radix Popover.Trigger asChild tetikleyiciyi ref ile
// konumlandırır; ref forward edilmezse popover açılmaz.
const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ icon: Icon, label, value, active, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] transition-colors',
        active
          ? 'border-white/20 bg-surface-3 text-text-primary'
          : 'border-white/[0.08] bg-surface-2 text-text-secondary hover:border-white/[0.16] hover:text-text-primary',
      )}
      {...props}
    >
      <Icon className="size-3.5 shrink-0 text-text-tertiary" />
      <span className="text-[10px] uppercase tracking-wider text-text-tertiary">{label}</span>
      <span className="max-w-[10rem] truncate font-medium text-text-primary">{value}</span>
      <ChevronDown className="size-3 shrink-0 text-text-tertiary" />
    </button>
  ),
);
ToolbarButton.displayName = 'ToolbarButton';

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.08] bg-surface-1 p-0.5">
      <ToggleButton active={value === 'three'} onClick={() => onChange('three')} ariaLabel="3D sahne görünümü">
        <Box className="size-3.5" />
        <span className="hidden sm:inline">3D</span>
      </ToggleButton>
      <ToggleButton active={value === 'map'} onClick={() => onChange('map')} ariaLabel="Harita görünümü">
        <Map className="size-3.5" />
        <span className="hidden sm:inline">Harita</span>
      </ToggleButton>
    </div>
  );
}

function PickerModeToggle({
  value,
  onChange,
}: {
  value: PickerMode;
  onChange: (v: PickerMode) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.08] bg-surface-1 p-0.5">
      <ToggleButton active={value === 'global'} onClick={() => onChange('global')} ariaLabel="Dünya şehirleri" full>
        🌍 Dünya
      </ToggleButton>
      <ToggleButton active={value === 'turkey'} onClick={() => onChange('turkey')} ariaLabel="Türkiye illeri" full>
        🇹🇷 Türkiye
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
  ariaLabel,
  full,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel: string;
  full?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] transition-colors',
        full && 'flex-1',
        active ? 'bg-surface-3 text-text-primary' : 'text-text-tertiary hover:text-text-primary',
      )}
    >
      {children}
    </button>
  );
}
