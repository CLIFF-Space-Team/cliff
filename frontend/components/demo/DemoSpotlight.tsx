'use client';

import { useEffect, useState } from 'react';

import { subscribeDemoAction } from '@/lib/demo-event-bus';
import { cn } from '@/lib/utils';

interface SpotlightTarget {
  rect: DOMRect;
  label: string | null;
  zoom: number;
  cursor: { x: number; y: number } | null;
}

/**
 * Demo Tour görsel "göstergesi": dış-karartma + hedef etrafında parlak çerçeve
 * + opsiyonel etiket + sahte fare imleci. Hedef seçici DOM tabanlıdır;
 * element bulunamazsa spotlight çizilmez.
 *
 * Layout'a global olarak inject edilir; yalnızca spotlight aktifken render
 * eder, normal sayfada görünmez.
 */
export function DemoSpotlight() {
  const [target, setTarget] = useState<SpotlightTarget | null>(null);

  useEffect(() => {
    let lastSelector: string | null = null;
    let raf = 0;

    const updateRect = () => {
      if (!lastSelector) return;
      const el = document.querySelector(lastSelector);
      if (el instanceof HTMLElement) {
        const rect = el.getBoundingClientRect();
        setTarget((prev) =>
          prev ? { ...prev, rect, cursor: prev.cursor } : prev,
        );
      }
      raf = requestAnimationFrame(updateRect);
    };

    const unsub = subscribeDemoAction((action) => {
      if (action.type === 'spotlight') {
        const el = document.querySelector(action.selector);
        if (!(el instanceof HTMLElement)) return;
        // Smooth scroll-into-view — element ekran dışındaysa görünür yap
        try {
          const rect = el.getBoundingClientRect();
          const inView =
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth;
          if (!inView) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } catch {
          // ignore
        }
        const rect = el.getBoundingClientRect();
        lastSelector = action.selector;
        setTarget({
          rect,
          label: action.label ?? null,
          zoom: action.zoom ?? 1,
          cursor: null,
        });
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(updateRect);
      } else if (action.type === 'spotlight-clear') {
        lastSelector = null;
        cancelAnimationFrame(raf);
        setTarget(null);
      } else if (action.type === 'point-and-click') {
        const el = document.querySelector(action.selector);
        if (!(el instanceof HTMLElement)) return;
        const rect = el.getBoundingClientRect();
        const center = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
        setTarget({
          rect,
          label: null,
          zoom: 1,
          cursor: center,
        });
        if (action.clickAfterMs) {
          window.setTimeout(() => {
            el.click?.();
            setTarget(null);
            lastSelector = null;
          }, action.clickAfterMs);
        }
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      unsub();
    };
  }, []);

  if (!target) return null;

  const padding = 12;
  const r = target.rect;
  const left = r.left - padding;
  const top = r.top - padding;
  const width = r.width + padding * 2;
  const height = r.height + padding * 2;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {/* SVG mask ile dış-karartma + iç delik */}
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={left}
              y={top}
              width={width}
              height={height}
              rx={Math.min(20, width / 8)}
              ry={Math.min(20, height / 8)}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.55)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Vurgu çerçevesi */}
      <div
        className={cn(
          'absolute rounded-2xl border-2 border-threat-high transition-all duration-500',
          'animate-pulse-gentle',
        )}
        style={{
          left,
          top,
          width,
          height,
          boxShadow:
            '0 0 0 4px rgba(234,88,12,0.2), 0 0 24px rgba(234,88,12,0.55)',
          transform: `scale(${target.zoom})`,
          transformOrigin: 'center',
        }}
      />

      {/* Etiket */}
      {target.label && (
        <div
          className="absolute -translate-x-1/2 transform rounded-full border border-threat-high/50 bg-surface-1/95 px-3 py-1.5 text-[12px] font-medium text-text-primary backdrop-blur"
          style={{
            left: r.left + r.width / 2,
            top: Math.max(20, r.top - 40),
          }}
        >
          {target.label}
        </div>
      )}

      {/* Sahte fare imleci */}
      {target.cursor && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out"
          style={{ left: target.cursor.x, top: target.cursor.y }}
        >
          <div className="relative">
            <div className="absolute inset-0 size-8 animate-ping rounded-full bg-threat-high/40" />
            <div className="relative size-4 rounded-full border-2 border-white bg-threat-high shadow-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
