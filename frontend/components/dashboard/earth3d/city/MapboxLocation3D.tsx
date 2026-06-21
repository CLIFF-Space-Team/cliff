'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';

interface MapboxLocation3DProps {
  lat: number;
  lng: number;
  /** Magnitude — drives the epicenter pulse size + colour. */
  magnitude: number;
  /** Initial zoom level. Higher = closer (Mapbox uses 0..22). */
  zoom?: number;
  /** Camera pitch in degrees (0 = top-down, 60 = strongly tilted). */
  pitch?: number;
  /** Auto-rotate speed (degrees/sec). Set 0 to disable. */
  rotateSpeed?: number;
}

/**
 * Mapbox GL JS 3D scene focused on the earthquake epicenter.
 *
 * - Satellite-streets basemap (real imagery + labels)
 * - 3D building extrusion layer (OSM building heights → real silhouettes)
 * - Pulsing epicenter marker with shockwave rings (CSS-driven)
 * - Slow auto-rotate so the user can sense the city massing
 *
 * Token plumbing: the public Mapbox token comes from
 * `NEXT_PUBLIC_MAPBOX_TOKEN` at build time. Mapbox tokens are intended to
 * ship to the client (they're URL-restrict-able), so this is the right env
 * surface — same pattern as their official examples.
 */
export function MapboxLocation3D({
  lat,
  lng,
  magnitude,
  zoom = 14,
  pitch = 55,
  rotateSpeed = 3,
}: MapboxLocation3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Initialize the map exactly once per (lat, lng) — re-creating from scratch
  // avoids stale layer state between event switches.
  useEffect(() => {
    if (!containerRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      // Surface a plain DOM fallback — keeps the modal usable even when the
      // token is missing in dev.
      containerRef.current.innerHTML =
        '<div style="display:flex;height:100%;align-items:center;justify-content:center;color:#9ca3af;font-size:12px;text-align:center;padding:16px">' +
        'Mapbox token tanımlı değil.<br/>' +
        '<code style="font-family:monospace;font-size:11px;color:#fbbf24">NEXT_PUBLIC_MAPBOX_TOKEN</code> ortam değişkenini ayarla.' +
        '</div>';
      return;
    }
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [lng, lat],
      zoom,
      pitch,
      bearing: 0,
      antialias: true,
      attributionControl: false,
      cooperativeGestures: false,
      // Use the default flat Mercator projection — `globe` mode produces a
      // black canvas on some Chromium builds when the WebGL context is
      // already busy with the Three.js dashboard scene behind the modal.
      projection: { name: 'mercator' },
    });
    mapRef.current = map;

    map.on('error', (e) => {
      // eslint-disable-next-line no-console
      console.warn('[mapbox]', e?.error?.message ?? e);
    });
    map.on('load', () => {
      setStatus('ready');
      // Force a resize after the modal animation settles — Mapbox sometimes
      // measures 0px on its first paint inside flex containers.
      window.setTimeout(() => map.resize(), 50);
      window.setTimeout(() => map.resize(), 250);
      window.setTimeout(() => map.resize(), 800);
    });
    // Catch tile-load failures (404 / blocked / signed-out) so the user gets
    // a real error UI instead of a silent black canvas.
    map.on('error', (e) => {
      const msg = (e?.error as Error | undefined)?.message ?? '';
      // Mapbox throws a benign "Not authorized" warning during initial style
      // bootstrap on slow networks; we only surface persistent failures.
      if (msg.toLowerCase().includes('unauthorized') || msg.includes('401') || msg.includes('403')) {
        setStatus('error');
      }
    });

    map.on('style.load', () => {
      // Add the 3D building extrusion layer. Mapbox's `composite` source
      // includes per-building heights for most major cities.
      const layers = map.getStyle().layers || [];
      let labelLayerId: string | undefined;
      for (const l of layers) {
        if (l.type === 'symbol' && (l.layout as Record<string, unknown> | undefined)?.['text-field']) {
          labelLayerId = l.id;
          break;
        }
      }
      // Only add once. Hot-reload-safe.
      if (!map.getLayer('cliff-3d-buildings')) {
        map.addLayer(
          {
            id: 'cliff-3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 13,
            paint: {
              'fill-extrusion-color': '#a8a097',
              'fill-extrusion-height': [
                'interpolate', ['linear'], ['zoom'],
                14, 0,
                15.05, ['get', 'height'],
              ],
              'fill-extrusion-base': [
                'interpolate', ['linear'], ['zoom'],
                14, 0,
                15.05, ['get', 'min_height'],
              ],
              'fill-extrusion-opacity': 0.85,
            },
          },
          labelLayerId,
        );
      }
    });

    // Epicenter marker — custom HTML with CSS pulse (cheap, no extra layer).
    const el = document.createElement('div');
    el.className = 'cliff-quake-pulse';
    const core = document.createElement('div');
    core.className = 'core';
    el.appendChild(core);
    const intensity = Math.max(0.3, Math.min(1.4, (magnitude - 3) / 4));
    el.style.setProperty('--pulse-color',
      magnitude >= 7 ? '#ef4444' :
      magnitude >= 6 ? '#f97316' :
      magnitude >= 5 ? '#eab308' :
                       '#fb923c',
    );
    el.style.setProperty('--pulse-scale', String(intensity));
    markerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([lng, lat])
      .addTo(map);

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, magnitude, zoom, pitch]);

  // Slow rotate the camera around the epicenter for a cinematic feel.
  useEffect(() => {
    if (rotateSpeed <= 0) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const map = mapRef.current;
      if (map) {
        const dt = (now - last) / 1000;
        last = now;
        const next = (map.getBearing() + rotateSpeed * dt) % 360;
        map.setBearing(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rotateSpeed]);

  return (
    <>
      {/* Wrapper has an explicit minimum height *and* `inset:0` fallback —
       *  Mapbox needs a real measured size at mount time or it bails out
       *  with a blank canvas (no error fired). */}
      <div className="absolute inset-0 bg-black" style={{ minHeight: 320 }}>
        <div
          ref={containerRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
        {status === 'loading' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 text-[12px] uppercase tracking-[0.18em] text-text-tertiary">
            harita yükleniyor…
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-[12px] text-threat-critical">
            Mapbox tile servisi 401/403 döndü. Token URL kısıtlamasını kontrol et:<br />
            https://notcome.app/* + http://localhost:3000/*
          </div>
        )}
      </div>
      <style jsx global>{`
        .cliff-quake-pulse {
          width: 28px;
          height: 28px;
          position: relative;
        }
        .cliff-quake-pulse::before,
        .cliff-quake-pulse::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid var(--pulse-color, #f97316);
          animation: cliff-quake-pulse-anim 2.2s ease-out infinite;
          transform: scale(var(--pulse-scale, 1));
        }
        .cliff-quake-pulse::after {
          animation-delay: 1.1s;
        }
        .cliff-quake-pulse > .core {
          position: absolute;
          inset: 35%;
          border-radius: 50%;
          background: var(--pulse-color, #f97316);
          box-shadow: 0 0 12px var(--pulse-color, #f97316);
        }
        @keyframes cliff-quake-pulse-anim {
          0% { transform: scale(0.4); opacity: 1; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        /* Mapbox attribution — match dark theme */
        .mapboxgl-ctrl-attrib {
          background: rgba(0, 0, 0, 0.5) !important;
          font-size: 9px !important;
        }
        .mapboxgl-ctrl-attrib a { color: #9ca3af !important; }
      `}</style>
    </>
  );
}
