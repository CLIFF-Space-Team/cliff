/**
 * Shared types for the per-category disaster simulators.
 *
 * Every simulator gets the resolved `EarthEvent` plus the matching
 * category metadata. Scenes pull whatever they need (primary metric,
 * geometry, severity) from there. Keeps every scene swappable behind
 * one `<SimulationModal />`.
 */

import type { EarthCategoryMeta, EarthEvent } from '@/lib/earth-types';

export interface SimulationSceneProps {
  event: EarthEvent;
  category: EarthCategoryMeta;
  /** Animations only run while this is true. Bound to the modal's play
   *  toggle so the user can pause without unmounting the scene. */
  playing: boolean;
  /** Bumped each time the user clicks "restart" so a scene can reset
   *  without re-creating its WebGL context. */
  playKey: number;
}

/** Severity-band label + plain-language description, generic across
 *  categories — drives the right-hand sidebar's first card. Each scene
 *  ships its own scale (Mercalli for quakes, Cat-1..5 for storms,
 *  Beaufort/VEI for storms/volcanoes, …). */
export interface SeverityBand {
  band: string;
  range: string;
  tr: string;
}

/** What the category-specific sidebar promises the user. The modal
 *  composes a generic structure (HUD, history list, AI text, scene-key
 *  bullets) but pulls these pieces per-category. */
export interface SimulationCopy {
  /** Verdict line beside the metric — e.g. "FELAKET", "ŞİDDETLİ". */
  verdictLabel: string;
  /** threat color tone for the verdict pill. */
  verdictTone: 'critical' | 'high' | 'moderate' | 'low' | 'info';
  /** Sahnedeki Görseller Ne Anlama Geliyor? — short bullet list. */
  legend: string[];
  /** Auto-resolved closest historical reference. */
  historicalReference?: { year: number; place: string; metric: string };
  /** Severity band lookup for the current event's primary metric. */
  band?: SeverityBand;
  /** Brief AI prompt template. Modal handles the actual fetch. */
  aiPrompt: string;
}
