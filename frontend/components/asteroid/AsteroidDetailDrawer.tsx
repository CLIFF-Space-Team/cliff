'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, RefreshCw, Sparkles, X } from 'lucide-react';

import { GlossaryTerm } from '@/components/glossary/GlossaryTerm';
import { RiskTimelineSparkline } from '@/components/asteroid/RiskTimelineSparkline';
import { Button, Skeleton, StatusPill, Surface } from '@/components/ui';
import {
  formatDistanceKm,
  formatDiameter,
  formatScore,
  formatTimestamp,
  formatVelocity,
} from '@/lib/format';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  useCachedExplanation,
  useGenerateExplanation,
} from '@/hooks/useCachedExplanation';
import { useHybridAnalysis, useNeoRiskDetail } from '@/hooks/useNeoDetail';
import { useLanguage } from '@/providers/LanguageProvider';

interface AsteroidDetailDrawerProps {
  /** Drawer açık mı. */
  open: boolean;
  /** Radix open-state değişimi (kapatma dahil). */
  onOpenChange: (open: boolean) => void;
  /** Gösterilecek NEO. null ise drawer içeriği render edilmez. */
  neoId: string | null;
}

/**
 * NEO tam-detay drawer'ı (risk + 30g trend + Monte Carlo + AI açıklama).
 *
 * Açık/kapalı durumu CALLER tarafından kontrol edilir — `selectedNeoId`
 * store'undan türetmiyoruz, çünkü dashboard aynı seçimi sidebar'daki gömülü
 * `AsteroidFocusOverlay` için de kullanır; ortak türetim ikisini birden açardı.
 */
export function AsteroidDetailDrawer({
  open,
  onOpenChange,
  neoId,
}: AsteroidDetailDrawerProps) {
  return (
    <Dialog.Root open={open && !!neoId} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm',
            'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
          )}
        />
        <Dialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex h-[88dvh] max-h-[88dvh] w-full flex-col rounded-t-2xl border-t border-white/10 bg-surface-1 shadow-panel pb-[env(safe-area-inset-bottom)] focus:outline-none data-[state=open]:animate-slide-in-up',
            'sm:inset-y-0 sm:bottom-auto sm:right-0 sm:left-auto sm:h-full sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none sm:border-l sm:border-t-0 sm:pb-0 sm:data-[state=open]:animate-slide-in-right',
          )}
        >
          {neoId && <DrawerBody neoId={neoId} onClose={() => onOpenChange(false)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DrawerBody({ neoId, onClose }: { neoId: string; onClose: () => void }) {
  const detail = useNeoRiskDetail(neoId);
  const analysis = useHybridAnalysis(neoId, 30);
  const cachedExplanation = useCachedExplanation(neoId);
  const generateExplanation = useGenerateExplanation();
  const { t, locale } = useLanguage();

  const liveExplanation = generateExplanation.data ?? cachedExplanation.data;
  const explanationText = liveExplanation?.text ?? null;
  const isCached = !!liveExplanation && liveExplanation.cached;
  const explanationGenerating = generateExplanation.isPending;
  const explanationError =
    generateExplanation.error instanceof ApiError
      ? generateExplanation.error
      : null;

  return (
    <>
      <div className="flex justify-center pt-2 sm:hidden">
        <span className="h-1 w-10 rounded-full bg-white/15" aria-hidden />
      </div>
      <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-5 sm:py-4">
        <div className="min-w-0">
          <Dialog.Title asChild>
            <h2 className="truncate text-base font-semibold text-text-primary">
              {detail.data?.name ?? neoId}
            </h2>
          </Dialog.Title>
          <p className="font-mono-tnum text-[11px] text-text-tertiary">id · {neoId}</p>
        </div>
        <Dialog.Close asChild>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </Dialog.Close>
      </header>

      <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
        {detail.isLoading && <Skeleton className="h-24" />}
        {detail.data && (
          <Surface elevation={2} className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <StatusPill severity={detail.data.risk_class}>{detail.data.risk_class}</StatusPill>
              <span className="font-mono-tnum text-xs text-text-secondary">
                hybrid · {formatScore(detail.data.hybrid_score)}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-y-2 text-xs">
              <Stat label="Çap (max)" value={formatDiameter(detail.data.diameter_max_km)} />
              <Stat label="Min mesafe" value={formatDistanceKm(detail.data.miss_distance_km)} />
              <Stat label="Hız" value={formatVelocity(detail.data.relative_velocity_kms)} />
              <Stat label="Yaklaşma" value={formatTimestamp(detail.data.next_approach_at)} />
              <Stat
                label="ML güven"
                value={`${(detail.data.ml_confidence * 100).toFixed(0)}%`}
              />
              <StatWithTooltip
                term="pha"
                label="PHA"
                value={detail.data.is_potentially_hazardous ? 'Evet' : 'Hayır'}
              />
            </dl>
          </Surface>
        )}

        {/* 30 günlük risk skoru trendi */}
        <Surface elevation={2} className="space-y-2 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Risk Trendi
          </h3>
          <RiskTimelineSparkline neoId={neoId} days={30} />
        </Surface>

        {analysis.isLoading && <Skeleton className="h-32" />}
        {analysis.data?.monte_carlo && (
          <Surface elevation={2} className="space-y-2 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              <GlossaryTerm of="monte_carlo">Monte Carlo</GlossaryTerm> Belirsizlik
            </h3>
            <div className="grid grid-cols-3 gap-2 font-mono-tnum text-xs">
              <MCStat label="p1" value={formatDistanceKm(analysis.data.monte_carlo.p1_km)} />
              <MCStat label="p50" value={formatDistanceKm(analysis.data.monte_carlo.p50_km)} />
              <MCStat label="p99" value={formatDistanceKm(analysis.data.monte_carlo.p99_km)} />
            </div>
            <p className="text-[11px] text-text-tertiary">
              {analysis.data.monte_carlo.samples.toLocaleString()} örneklem ·{' '}
              <GlossaryTerm of="sigma">σ</GlossaryTerm> ≈{' '}
              {Math.round(analysis.data.sigma_km).toLocaleString()} km
            </p>
          </Surface>
        )}

        <Surface elevation={2} className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              AI Açıklama
              {isCached && (
                <span className="ml-2 text-[10px] font-normal normal-case text-text-tertiary">
                  · paylaşımlı önbellek
                </span>
              )}
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                generateExplanation.mutate({ neoId, language: locale });
              }}
              disabled={explanationGenerating}
              title={
                isCached
                  ? 'Paylaşımlı önbellekteki açıklamayı yeniden üret'
                  : 'AI ile açıklama üret ve paylaşımlı önbelleğe kaydet'
              }
            >
              {explanationGenerating ? (
                <Loader2 className="size-3 animate-spin" />
              ) : isCached ? (
                <RefreshCw className="size-3" />
              ) : (
                <Sparkles className="size-3" />
              )}
              {isCached ? 'Yeniden üret' : t('cta.explain')}
            </Button>
          </div>
          {explanationText && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-text-primary">
              {explanationText}
            </p>
          )}
          {!explanationText && !explanationGenerating && !cachedExplanation.isLoading && (
            <p className="text-xs text-text-tertiary">
              &quot;{t('cta.explain')}&quot; tuşuyla bu NEO için ilk açıklamayı üret —
              tek seferlik bir Grok çağrısı, ardından her ziyaretçi aynı metni
              anında görür.
            </p>
          )}
          {explanationError && (
            <p className="text-xs text-threat-critical">
              {explanationError.status === 429
                ? 'AI istek limiti aştın — biraz bekle.'
                : explanationError.code === 'AI_NOT_CONFIGURED'
                  ? 'AI servisi yapılandırılmadı (AI_API_KEY eksik).'
                  : 'AI servisine erişilemiyor. Tekrar dener misin?'}
            </p>
          )}
        </Surface>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-text-tertiary">{label}</dt>
      <dd className="text-right font-mono-tnum text-text-primary">{value}</dd>
    </>
  );
}

function StatWithTooltip({
  term,
  label,
  value,
}: {
  term: string;
  label: string;
  value: string;
}) {
  return (
    <>
      <dt className="text-text-tertiary">
        <GlossaryTerm of={term}>{label}</GlossaryTerm>
      </dt>
      <dd className="text-right font-mono-tnum text-text-primary">{value}</dd>
    </>
  );
}

function MCStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/[0.06] bg-surface-1 p-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-text-tertiary">{label}</div>
      <div className="text-text-primary">{value}</div>
    </div>
  );
}
