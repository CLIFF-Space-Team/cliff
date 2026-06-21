'use client';

import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

import type { ImpactResult } from '@/lib/impact-physics';

interface SceneAnnotationsProps {
  impactPoint: [number, number, number];
  result: ImpactResult;
  /** 0..1 timeline cursor — annotations fade in/out by phase. */
  progress: number;
}

const EARTH_SCALE = 3.2;
const EARTH_RADIUS_KM = 6371;

interface Annotation {
  id: string;
  /** Position in world space. */
  pos: [number, number, number];
  /** Top label (one short word). */
  title: string;
  /** Bottom value (numeric reading). */
  value: string;
  /** Tone color. */
  tone: 'critical' | 'high' | 'moderate' | 'low' | 'info';
  /** When to show (progress range). */
  visibleFrom: number;
  visibleTo?: number;
}

const TONE_STYLES: Record<Annotation['tone'], string> = {
  critical: 'border-threat-critical/50 text-threat-critical',
  high: 'border-threat-high/50 text-threat-high',
  moderate: 'border-threat-moderate/50 text-threat-moderate',
  low: 'border-threat-low/50 text-threat-low',
  info: 'border-white/20 text-text-primary',
};

/**
 * Floating educational labels attached to scene elements.
 *
 * Uses drei's <Html> to project DOM text at world-space positions. Each label
 * fades in during the relevant phase, helping the viewer parse what they're
 * seeing (which ring is which, crater size, fireball temperature, etc.).
 */
export function SceneAnnotations({ impactPoint, result, progress }: SceneAnnotationsProps) {
  // Tangent frame at the impact point so we can offset labels along the surface.
  const tangentFrame = useMemo(() => {
    const normal = new THREE.Vector3(...impactPoint).normalize();
    // Pick a stable "east" tangent
    const ref =
      Math.abs(normal.y) < 0.99
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(1, 0, 0);
    const tangent = new THREE.Vector3().crossVectors(normal, ref).normalize();
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
    return { normal, tangent, bitangent };
  }, [impactPoint]);

  const annotations = useMemo<Annotation[]>(() => {
    const out: Annotation[] = [];
    const ip = new THREE.Vector3(...impactPoint);

    // Label positioned at distance `r` along tangent (along the surface)
    // Lifted slightly along normal so it sits just above the surface.
    const surfaceLabel = (r: number, lift = 0.12): [number, number, number] => {
      const v = new THREE.Vector3()
        .copy(ip)
        .add(tangentFrame.tangent.clone().multiplyScalar(r))
        .add(tangentFrame.normal.clone().multiplyScalar(lift));
      return [v.x, v.y, v.z];
    };
    // Above the impact site at altitude `h`
    const skyLabel = (h: number): [number, number, number] => {
      const v = new THREE.Vector3().copy(ip).add(tangentFrame.normal.clone().multiplyScalar(h));
      return [v.x, v.y, v.z];
    };

    // 1. Asteroid label during approach. Her zaman üretilir; görünürlüğü
    //    aşağıdaki `visible` filtresi (visibleTo: 0.6) belirler — böylece bu
    //    useMemo `progress`'e bağlı kalmaz ve her timeline tick'inde yeniden
    //    kurulup ~12-18 Vector3 tahsis etmez.
    out.push({
      id: 'asteroid',
      pos: skyLabel(7),
      title: 'Asteroid',
      value: 'yaklaşıyor',
      tone: 'info',
      visibleFrom: 0,
      visibleTo: 0.6,
    });

    // 2. Airburst altitude (only for airburst events)
    if (result.mode === 'airburst' && result.airburst_altitude_km != null) {
      out.push({
        id: 'airburst',
        pos: skyLabel(0.6),
        title: 'Hava patlaması',
        value: `~${result.airburst_altitude_km.toFixed(0)} km irtifa`,
        tone: 'critical',
        visibleFrom: 0.62,
        visibleTo: 0.95,
      });
    }

    // 3. Fireball label
    out.push({
      id: 'fireball',
      pos: skyLabel(0.4),
      title: 'Ateş topu',
      value: `${formatMt(result.energy_megatons)} TNT`,
      tone: 'high',
      visibleFrom: 0.66,
      visibleTo: 0.85,
    });

    // 4. Crater label (after impact, ground impacts only)
    if (result.mode === 'crater' && result.crater_diameter_km > 0) {
      out.push({
        id: 'crater',
        pos: surfaceLabel(0, 0.07),
        title: 'Krater',
        value: `Ø ${formatKm(result.crater_diameter_km)}`,
        tone: 'critical',
        visibleFrom: 0.78,
      });
    }

    // 5. Damage zones — labels at outer edge of each ring
    const zones = result.damage_zones.slice(0, 3);
    zones.forEach((z, idx) => {
      const sceneR = sceneRadius(z.radius_km);
      out.push({
        id: `zone-${idx}`,
        pos: surfaceLabel(sceneR, 0.04 + idx * 0.02),
        title: z.label,
        value: formatKm(z.radius_km),
        tone:
          z.severity === 'critical'
            ? 'critical'
            : z.severity === 'high'
              ? 'high'
              : z.severity === 'moderate'
                ? 'moderate'
                : 'low',
        visibleFrom: 0.78 + idx * 0.02,
      });
    });

    return out;
  }, [impactPoint, result, tangentFrame]);

  const visible = annotations.filter((a) => {
    if (progress < a.visibleFrom) return false;
    if (a.visibleTo != null && progress > a.visibleTo) return false;
    return true;
  });

  return (
    <>
      {visible.map((a) => (
        <Html
          key={a.id}
          position={a.pos}
          center
          distanceFactor={9}
          occlude
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className={`whitespace-nowrap rounded-md border bg-black/70 px-2 py-1 text-center font-mono-tnum text-[10px] backdrop-blur-sm ${TONE_STYLES[a.tone]}`}
          >
            <div className="text-[8px] uppercase tracking-[0.2em] opacity-60">{a.title}</div>
            <div className="font-medium">{a.value}</div>
          </div>
        </Html>
      ))}
    </>
  );
}

function sceneRadius(km: number): number {
  return Math.min(EARTH_SCALE * 1.6, Math.max(0.04, (km / EARTH_RADIUS_KM) * EARTH_SCALE * 4));
}

function formatKm(km: number): string {
  if (!Number.isFinite(km) || km < 0.001) return '—';
  if (km < 1) return `${(km * 1000).toFixed(0)} m`;
  return `${km < 10 ? km.toFixed(2) : km.toFixed(0)} km`;
}

function formatMt(mt: number): string {
  if (!Number.isFinite(mt)) return '—';
  if (mt >= 1000) return `${(mt / 1000).toFixed(1)} Gt`;
  if (mt >= 10) return `${mt.toFixed(0)} Mt`;
  return `${mt.toFixed(2)} Mt`;
}
