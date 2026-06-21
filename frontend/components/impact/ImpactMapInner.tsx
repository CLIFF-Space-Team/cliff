'use client';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';

import { TURKISH_CITIES, type TurkishCity } from '@/lib/cities-tr';
import type { DamageRadius, ImpactResult } from '@/lib/impact-physics';
import { cn } from '@/lib/utils';

interface ImpactMapInnerProps {
  result: ImpactResult;
  targetLat: number;
  targetLng: number;
  cityName?: string | null;
  className?: string;
}

const SEVERITY_FILL: Record<DamageRadius['severity'], string> = {
  critical: '#dc2626', // red-600
  high: '#ea580c', // orange-600
  moderate: '#eab308', // yellow-500
  low: '#737373', // neutral-500
};

const SEVERITY_FILL_OPACITY: Record<DamageRadius['severity'], number> = {
  critical: 0.45,
  high: 0.22,
  moderate: 0.13,
  low: 0.06,
};

function makeCraterIcon(): L.DivIcon {
  return L.divIcon({
    className: 'impact-target',
    html: `
      <span style="
        display: block;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, #fb923c, #7c2d12);
        border: 2px solid #000;
        box-shadow: 0 0 0 2px #fb923c, 0 0 16px rgba(251,146,60,0.85);
      "></span>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function makeAffectedCityIcon(severity: 'critical' | 'high' | 'moderate' | 'low'): L.DivIcon {
  const color = SEVERITY_FILL[severity];
  return L.divIcon({
    className: 'affected-city',
    html: `
      <span style="
        display: block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: ${color};
        border: 1px solid #000;
        box-shadow: 0 0 0 1px ${color};
      "></span>
    `,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

/** Etki yarıçapı içinde kalan en yakın N şehri çıkar — uyarı için. */
function findAffectedCities(
  lat: number,
  lng: number,
  outerRadiusKm: number,
  zones: DamageRadius[],
): Array<{ city: TurkishCity; distanceKm: number; severity: DamageRadius['severity'] }> {
  return TURKISH_CITIES.map((city) => {
    const distanceKm = haversineKm(lat, lng, city.lat, city.lng);
    let severity: DamageRadius['severity'] | null = null;
    // İçindeki en yıkıcı zone'u bul (en küçük yarıçaplı = en sert)
    const sortedAsc = [...zones].sort((a, b) => a.radius_km - b.radius_km);
    for (const z of sortedAsc) {
      if (distanceKm <= z.radius_km) {
        severity = z.severity;
        break;
      }
    }
    if (severity == null) return null;
    return { city, distanceKm, severity };
  })
    .filter(
      (x): x is { city: TurkishCity; distanceKm: number; severity: DamageRadius['severity'] } =>
        x != null && x.distanceKm <= outerRadiusKm,
    )
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 12);
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

/** Halkaları kapsayacak şekilde haritayı oto-zoomlayan yardımcı. */
function FitToImpact({
  lat,
  lng,
  outerRadiusKm,
}: {
  lat: number;
  lng: number;
  outerRadiusKm: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (outerRadiusKm <= 0) return;
    // 1 derece enlem ≈ 111 km, boylam cos(lat) ile ölçeklenir
    const dLat = outerRadiusKm / 111;
    const dLng = outerRadiusKm / (111 * Math.cos((lat * Math.PI) / 180));
    map.fitBounds(
      [
        [lat - dLat, lng - dLng],
        [lat + dLat, lng + dLng],
      ],
      { padding: [24, 24], animate: true },
    );
  }, [map, lat, lng, outerRadiusKm]);
  return null;
}

/**
 * Çoklu şokdalgası ripple — 3 eşzamanlı dalga (faz farklı), daha "yaşayan" his.
 * Her dalga en dış halkaya 4.5sn'de varır, fade-out ile döngü.
 */
function ShockwaveRipple({
  lat,
  lng,
  outerRadiusKm,
}: {
  lat: number;
  lng: number;
  outerRadiusKm: number;
}) {
  const [phases, setPhases] = useState<[number, number, number]>([0, 0.33, 0.66]);

  useEffect(() => {
    if (outerRadiusKm <= 0) return;
    let raf = 0;
    const start = performance.now();
    const cycleMs = 4500;
    const tick = (now: number) => {
      const base = ((now - start) % cycleMs) / cycleMs;
      setPhases([base, (base + 0.33) % 1, (base + 0.66) % 1]);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [outerRadiusKm]);

  if (outerRadiusKm <= 0) return null;
  return (
    <>
      {phases.map((phase, idx) => {
        const radiusKm = outerRadiusKm * phase;
        const fade = 1 - phase;
        return (
          <Circle
            key={idx}
            center={[lat, lng]}
            radius={radiusKm * 1000}
            pathOptions={{
              color: '#fb923c',
              weight: 1 + phase * 2,
              fillColor: '#fb923c',
              fillOpacity: 0.12 * fade,
              opacity: fade * 0.85,
            }}
          />
        );
      })}
    </>
  );
}

/**
 * Krater merkezinden uçuşan ember/spark parçacıkları — Leaflet container'ına
 * absolute canvas overlay. Performans dostu: requestAnimationFrame ile çizim,
 * harita pan/zoom değiştiğinde center pixel yeniden hesaplanır.
 */
function ParticleOverlay({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      hue: number;
    }>
  >([]);

  useEffect(() => {
    const container = map.getContainer();
    const canvas = document.createElement('canvas');
    canvas.style.cssText =
      'position:absolute;inset:0;pointer-events:none;z-index:401;';
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    const resizeObs = new ResizeObserver(resize);
    resizeObs.observe(container);

    let raf = 0;
    let lastSpawn = 0;

    const tick = (now: number) => {
      // Spawn — saniyede ~40 parçacık (~70% ember + ~30% smoke)
      if (now - lastSpawn > 25) {
        const center = map.latLngToContainerPoint([lat, lng]);
        const isSmoke = Math.random() < 0.3;
        const angle = Math.random() * Math.PI * 2;
        const speed = isSmoke
          ? 0.15 + Math.random() * 0.4
          : 0.3 + Math.random() * 1.5;
        particlesRef.current.push({
          x: center.x,
          y: center.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (isSmoke ? 0.5 : 0.2),
          life: 0,
          maxLife: isSmoke
            ? 3500 + Math.random() * 2000
            : 1500 + Math.random() * 1500,
          size: isSmoke ? 4 + Math.random() * 4 : 1.5 + Math.random() * 2.5,
          hue: isSmoke ? 0 : 18 + Math.random() * 24, // 0=smoke, 18-42=ember
        });
        lastSpawn = now;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Cap parçacık sayısı
      if (particlesRef.current.length > 200) {
        particlesRef.current.splice(0, particlesRef.current.length - 200);
      }

      const dt = 16;
      const surviving = [];
      for (const p of particlesRef.current) {
        p.life += dt;
        if (p.life >= p.maxLife) continue;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy *= 0.985;
        // Ember = yer çekimi düşer; smoke = yukarı yükselir
        p.vy += p.hue === 0 ? -0.012 : 0.005;

        const alpha = 1 - p.life / p.maxLife;
        const isSmoke = p.hue === 0;
        ctx.beginPath();
        if (isSmoke) {
          // Soft gri smoke — yarıçap yaşla büyür
          const radius = p.size * (1 + (1 - alpha) * 1.5);
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(0, 0%, 30%, ${alpha * 0.4})`;
          ctx.shadowBlur = 0;
        } else {
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 95%, 60%, ${alpha * 0.85})`;
          ctx.shadowBlur = 8 * alpha;
          ctx.shadowColor = `hsla(${p.hue}, 95%, 50%, ${alpha})`;
        }
        ctx.fill();
        surviving.push(p);
      }
      ctx.shadowBlur = 0;
      particlesRef.current = surviving;

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      resizeObs.disconnect();
      canvas.remove();
    };
  }, [map, lat, lng]);

  return null;
}

export function ImpactMapInner({
  result,
  targetLat,
  targetLng,
  cityName,
  className,
}: ImpactMapInnerProps) {
  const targetIcon = useRef<L.DivIcon | null>(null);
  const cityIcons = useRef<Record<DamageRadius['severity'], L.DivIcon> | null>(
    null,
  );
  const [showFlash, setShowFlash] = useState(true);

  useEffect(() => {
    targetIcon.current = makeCraterIcon();
    cityIcons.current = {
      critical: makeAffectedCityIcon('critical'),
      high: makeAffectedCityIcon('high'),
      moderate: makeAffectedCityIcon('moderate'),
      low: makeAffectedCityIcon('low'),
    };
  }, []);

  // Açılış flash — component mount'ta bir kez parlar, sonra fade
  useEffect(() => {
    setShowFlash(true);
    const t = window.setTimeout(() => setShowFlash(false), 850);
    return () => window.clearTimeout(t);
  }, [targetLat, targetLng]);

  // En geniş halka (sorted desc → first)
  const outerRadiusKm = useMemo(() => {
    if (result.damage_zones.length === 0) return 0;
    return result.damage_zones[0]!.radius_km;
  }, [result.damage_zones]);

  const affected = useMemo(
    () =>
      findAffectedCities(
        targetLat,
        targetLng,
        outerRadiusKm,
        result.damage_zones,
      ),
    [targetLat, targetLng, outerRadiusKm, result.damage_zones],
  );

  // Render order: en geniş halka önce, en küçük en sonda — z-order'da
  // küçük (kritik) halkalar üstte. Leaflet sıraya göre çizer.
  const zonesOuterFirst = useMemo(
    () => [...result.damage_zones].sort((a, b) => b.radius_km - a.radius_km),
    [result.damage_zones],
  );

  return (
    <div
      className={cn(
        'relative aspect-[4/3] min-h-[55vh] w-full overflow-hidden rounded-lg border border-white/[0.06] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[60vh]',
        className,
      )}
    >
      {/* Açılış flash — krater patlama anı */}
      {showFlash && (
        <div
          className="pointer-events-none absolute inset-0 z-[500] animate-fade-out"
          style={{
            background:
              'radial-gradient(circle at center, rgba(255,200,80,0.85) 0%, rgba(255,140,40,0.4) 25%, transparent 70%)',
          }}
          aria-hidden
        />
      )}

      {/* Krater glow pulse — sürekli */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-[401] -translate-x-1/2 -translate-y-1/2 animate-pulse-gentle"
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(251,146,60,0.35) 0%, rgba(251,146,60,0.08) 50%, transparent 80%)',
          filter: 'blur(4px)',
        }}
        aria-hidden
      />

      <MapContainer
        center={[targetLat, targetLng]}
        zoom={6}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', background: 'hsl(0 0% 4%)' }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={18}
        />

        <FitToImpact
          lat={targetLat}
          lng={targetLng}
          outerRadiusKm={outerRadiusKm}
        />

        {/* Periyodik şokdalgası ripple — büyükten küçüğe halkaların altında */}
        <ShockwaveRipple
          lat={targetLat}
          lng={targetLng}
          outerRadiusKm={outerRadiusKm}
        />

        {/* Krater merkezinden uçuşan ember parçacıkları */}
        <ParticleOverlay lat={targetLat} lng={targetLng} />

        {/* Damage halkaları (büyükten küçüğe) */}
        {zonesOuterFirst.map((zone) => (
          <Circle
            key={zone.label}
            center={[targetLat, targetLng]}
            radius={zone.radius_km * 1000}
            pathOptions={{
              color: SEVERITY_FILL[zone.severity],
              weight: 1.5,
              fillColor: SEVERITY_FILL[zone.severity],
              fillOpacity: SEVERITY_FILL_OPACITY[zone.severity],
            }}
          >
            <Popup>
              <div style={{ minWidth: '180px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'hsl(0 0% 98%)',
                  }}
                >
                  {zone.label}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'hsl(0 0% 64%)',
                    margin: '4px 0',
                  }}
                >
                  {zone.description}
                </div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: SEVERITY_FILL[zone.severity],
                  }}
                >
                  Yarıçap {zone.radius_km.toFixed(1)} km
                </div>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Etkilenen Türkiye şehirleri */}
        {cityIcons.current &&
          affected.map(({ city, distanceKm, severity }) => (
            <Marker
              key={`affected-${city.plate}`}
              position={[city.lat, city.lng]}
              icon={cityIcons.current![severity]}
            >
              <Popup>
                <div style={{ minWidth: '180px' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'hsl(0 0% 98%)',
                    }}
                  >
                    {city.name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: 'hsl(0 0% 64%)',
                      marginTop: '4px',
                    }}
                  >
                    Çarpma noktasından {distanceKm.toFixed(0)} km · nüfus{' '}
                    {(city.population / 1_000_000).toFixed(2)}M
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: SEVERITY_FILL[severity],
                      marginTop: '4px',
                      fontWeight: 600,
                    }}
                  >
                    {severityLabel(severity)} bölgesi içinde
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Çarpma noktası */}
        {targetIcon.current && (
          <Marker
            position={[targetLat, targetLng]}
            icon={targetIcon.current}
            zIndexOffset={1000}
          >
            <Popup>
              <div style={{ minWidth: '180px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#fb923c',
                  }}
                >
                  Çarpma Noktası
                </div>
                {cityName && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'hsl(0 0% 80%)',
                      marginTop: '4px',
                    }}
                  >
                    {cityName}
                  </div>
                )}
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: 'hsl(0 0% 64%)',
                    marginTop: '4px',
                  }}
                >
                  {targetLat.toFixed(3)}°, {targetLng.toFixed(3)}°
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#fb923c',
                    marginTop: '4px',
                  }}
                >
                  {result.energy_megatons.toLocaleString('tr-TR', {
                    maximumFractionDigits: 2,
                  })}{' '}
                  Mt enerji
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-2 left-2 z-[400] rounded-md border border-white/[0.1] bg-surface-1/90 px-2.5 py-1.5 backdrop-blur">
        <div className="font-mono-tnum text-[9px] uppercase tracking-wider text-text-tertiary">
          Hasar Bölgeleri
        </div>
        <div className="mt-1 flex flex-col gap-0.5 text-[10px] text-text-secondary">
          {result.damage_zones.slice(0, 4).map((z) => (
            <span key={z.label} className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ background: SEVERITY_FILL[z.severity] }}
              />
              <span className="truncate">
                {z.label} · {z.radius_km.toFixed(1)} km
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Etkilenen şehir sayısı badge'i */}
      {affected.length > 0 && (
        <div className="pointer-events-none absolute right-2 top-2 z-[400] rounded-md border border-threat-high/40 bg-surface-1/90 px-2.5 py-1.5 backdrop-blur">
          <div className="font-mono-tnum text-[9px] uppercase tracking-wider text-text-tertiary">
            Etki Alanı
          </div>
          <div className="mt-0.5 text-[12px] font-semibold text-threat-high">
            {affected.length} il/şehir
          </div>
        </div>
      )}
    </div>
  );
}

function severityLabel(s: DamageRadius['severity']): string {
  return (
    {
      critical: 'Kritik',
      high: 'Yüksek',
      moderate: 'Orta',
      low: 'Düşük',
    } as const
  )[s];
}
