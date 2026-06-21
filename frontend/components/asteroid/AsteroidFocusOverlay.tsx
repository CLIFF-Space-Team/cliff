'use client';

import { ExternalLink, Globe2, Loader2, Maximize2, Orbit, RefreshCw, Sparkles, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { AiExplanation } from '@/components/asteroid/AiExplanation';
import { PdfExportButton } from '@/components/asteroid/PdfExportButton';
import { RiskSparkline } from '@/components/asteroid/RiskSparkline';
import { Button, Skeleton, StatusPill, Surface } from '@/components/ui';
import {
  useCachedExplanation,
  useGenerateExplanation,
} from '@/hooks/useCachedExplanation';
import { useHybridAnalysis, useNeoRiskDetail } from '@/hooks/useNeoDetail';
import { ApiError } from '@/lib/api-client';
import {
  formatDiameter,
  formatDistanceKm,
  formatScore,
  formatTimestamp,
  formatVelocity,
} from '@/lib/format';
import { useLanguage } from '@/providers/LanguageProvider';

interface AsteroidFocusOverlayProps {
  neoId: string;
  onClose: () => void;
  onOpenFullDetail: () => void;
  /**
   * When `embedded`, the overlay renders inline inside its parent (the right
   * panel) instead of floating over the 3D canvas. This keeps the asteroid
   * itself unobstructed and avoids stacking overlay UI on top of overlay UI.
   */
  embedded?: boolean;
}

/**
 * NEO focus panel. Default mode floats over the canvas; `embedded` mode
 * renders inline so the host panel can own the layout.
 */
export function AsteroidFocusOverlay({
  neoId,
  onClose,
  onOpenFullDetail,
  embedded = false,
}: AsteroidFocusOverlayProps) {
  const detail = useNeoRiskDetail(neoId);
  const analysis = useHybridAnalysis(neoId, 30);
  const cachedExplanation = useCachedExplanation(neoId);
  const generateExplanation = useGenerateExplanation();
  const { t, locale } = useLanguage();
  const router = useRouter();

  // Single source of truth: prefer the freshly-generated mutation result
  // (so the user sees the new copy immediately after pressing Açıkla),
  // otherwise fall back to whatever's in the shared Redis cache.
  const liveExplanation = generateExplanation.data ?? cachedExplanation.data;
  const explanationText = liveExplanation?.text ?? null;
  const citations = liveExplanation?.citations ?? [];
  const searched = !!liveExplanation?.searched;
  const isCached = !!liveExplanation && liveExplanation.cached;
  const explanationGenerating = generateExplanation.isPending;
  const explanationError =
    generateExplanation.error instanceof ApiError
      ? generateExplanation.error
      : null;

  const wrapperClass = embedded
    ? 'flex h-full min-h-0 w-full'
    : 'pointer-events-none absolute inset-x-2 bottom-2 flex max-h-[70%] justify-end sm:inset-x-auto sm:inset-y-3 sm:right-3 sm:bottom-auto sm:max-h-none sm:w-[320px] sm:max-w-full md:w-[360px]';

  const surfaceClass = embedded
    ? 'flex h-full w-full flex-col'
    : 'pointer-events-auto flex w-full animate-slide-in-right flex-col';

  return (
    <div className={wrapperClass}>
      <Surface elevation={2} glass={!embedded} className={surfaceClass}>
        <header className="flex items-start justify-between border-b border-white/[0.06] px-4 py-3">
          <div className="min-w-0">
            <p className="font-mono-tnum text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
              focus · {neoId}
            </p>
            <h3 className="mt-0.5 truncate text-base font-semibold text-text-primary">
              {detail.data?.name ?? '—'}
            </h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </header>

        <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {detail.isLoading && <Skeleton className="h-20" />}
          {detail.data && (
            <>
              <div className="flex items-center gap-2">
                <StatusPill severity={detail.data.risk_class}>{detail.data.risk_class}</StatusPill>
                <span className="font-mono-tnum text-xs text-text-secondary">
                  hybrid · {formatScore(detail.data.hybrid_score)}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
                <Stat label="Çap" value={formatDiameter(detail.data.diameter_max_km)} />
                <Stat label="Min mesafe" value={formatDistanceKm(detail.data.miss_distance_km)} />
                <Stat label="Hız" value={formatVelocity(detail.data.relative_velocity_kms)} />
                <Stat label="Yaklaşma" value={formatTimestamp(detail.data.next_approach_at)} />
                <Stat label="ML güven" value={`${(detail.data.ml_confidence * 100).toFixed(0)}%`} />
                <Stat label="PHA" value={detail.data.is_potentially_hazardous ? 'Evet' : 'Hayır'} />
              </dl>
            </>
          )}

          {analysis.data?.monte_carlo && (
            <div className="rounded-md border border-white/[0.06] bg-surface-1 p-2.5">
              <div className="mb-1.5 text-[10px] uppercase tracking-wider text-text-tertiary">
                Monte Carlo · {analysis.data.monte_carlo.samples.toLocaleString()} örneklem
              </div>
              <div className="grid grid-cols-3 gap-1 font-mono-tnum text-[11px]">
                <MCStat label="p1" value={formatDistanceKm(analysis.data.monte_carlo.p1_km)} />
                <MCStat label="p50" value={formatDistanceKm(analysis.data.monte_carlo.p50_km)} />
                <MCStat label="p99" value={formatDistanceKm(analysis.data.monte_carlo.p99_km)} />
              </div>
            </div>
          )}

          {explanationGenerating && !explanationText && (
            <div className="rounded-md border border-white/[0.06] bg-surface-1 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                <Sparkles className="size-3 animate-pulse" />
                ai açıklama üretiliyor…
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-[92%]" />
                <Skeleton className="h-3 w-[78%]" />
              </div>
            </div>
          )}

          {explanationText && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em]">
                {searched ? (
                  <span className="flex items-center gap-1.5 text-threat-low">
                    <Globe2 className="size-3" />
                    güncel kaynaklarla doğrulandı
                  </span>
                ) : (
                  <span className="text-text-tertiary">ai açıklama</span>
                )}
                {isCached && (
                  <span className="text-text-tertiary">paylaşımlı önbellek</span>
                )}
              </div>
              <AiExplanation text={explanationText} />
              {citations.length > 0 && (
                <div className="rounded-md border border-white/[0.06] bg-surface-1 p-2.5">
                  <div className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
                    Kaynaklar · {citations.length}
                  </div>
                  <ul className="space-y-1">
                    {citations.map((c, i) => (
                      <li key={`${c.url}-${i}`}>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-1.5 text-[11px] text-text-secondary hover:text-text-primary"
                        >
                          <ExternalLink className="mt-0.5 size-3 shrink-0 text-text-tertiary" />
                          <span className="truncate">{c.title || c.url}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <RiskSparkline neoId={neoId} />
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-white/[0.06] px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              generateExplanation.mutate({ neoId, language: locale });
            }}
            disabled={explanationGenerating}
            className="flex-1"
            title={
              isCached
                ? 'Paylaşımlı önbellekteki açıklamayı yeniden üret (Grok yeni cevap döner)'
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
          <PdfExportButton
            neoId={neoId}
            record={detail.data}
            analysis={analysis.data}
            language={locale}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/yorunge/${encodeURIComponent(neoId)}`)}
            aria-label="Yörüngesi Gör"
            title="Gerçek yörünge sineması"
          >
            <Orbit className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onOpenFullDetail} aria-label="Tam detay">
            <Maximize2 className="size-3.5" />
          </Button>
        </footer>
        {explanationError && (
          <div className="border-t border-white/[0.06] px-4 py-2 text-[11px] text-threat-critical">
            {explanationError.status === 429
              ? 'AI istek limiti aştın — biraz bekle.'
              : explanationError.code === 'AI_NOT_CONFIGURED'
                ? 'AI servisi yapılandırılmadı (AI_API_KEY eksik).'
                : 'AI servisine erişilemiyor. Tekrar dener misin?'}
          </div>
        )}
      </Surface>
    </div>
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

function MCStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-surface-2/60 p-1 text-center">
      <div className="text-[9px] uppercase tracking-wider text-text-tertiary">{label}</div>
      <div className="text-text-primary">{value}</div>
    </div>
  );
}
