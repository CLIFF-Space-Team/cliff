/**
 * Shared types for the Earth Live 3D scene. Each external feed gets
 * normalized into a `LiveEvent` so the renderer doesn't have to branch on
 * source-specific shapes.
 */

export type EventKind = 'quake' | 'fireball' | 'eonet';
export type EventSeverity = 'critical' | 'high' | 'moderate' | 'info';

export interface LiveEvent {
  id: string;
  kind: EventKind;
  severity?: EventSeverity;
  lat: number;
  lng: number;
  /** Visible scale on the globe (scene units). Defaults to ~0.045. */
  scale?: number;
  /** Marker label — shown in the side panel only, not in 3D. */
  title: string;
  /** Short subtitle, e.g. magnitude / energy. */
  subtitle?: string;
  /** Free-form long-form description (educational copy). */
  description?: string;
  /** ISO timestamp of when the event happened. */
  timestamp?: string | null;
  /** External link (USGS event page / NASA EONET / arXiv ref…). */
  externalUrl?: string;
  /** Raw underlying object — kept verbatim for the detail panel. */
  raw?: Record<string, unknown>;
}
