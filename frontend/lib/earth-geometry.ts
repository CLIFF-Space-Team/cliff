/**
 * Earth-event geometri yardımcıları.
 *
 * EONET olayları Point veya Polygon geometrisiyle gelir. Haritalar (3D globe,
 * 2D Leaflet) ve detay paneli tek bir temsilî [lng, lat] noktasına ihtiyaç
 * duyar. Eskiden her bileşen yalnızca Point okuyup Polygon-only olayları
 * (yangın/fırtına/sel sıklıkla poligon) sessizce düşürüyordu — bu yardımcı
 * Polygon için bbox merkezine düşerek o olayların da konumlanmasını sağlar.
 */

import type { EarthEvent, EarthEventGeometry } from './earth-types';

export type LngLat = [number, number];

function isFiniteLngLat(v: unknown): v is LngLat {
  return (
    Array.isArray(v) &&
    v.length >= 2 &&
    typeof v[0] === 'number' &&
    typeof v[1] === 'number' &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1])
  );
}

/** Keyfi derinlikte iç içe poligon koordinatlarını düz [lng,lat] listesine indirger. */
function collectVertices(coords: unknown, out: LngLat[]): void {
  if (!Array.isArray(coords)) return;
  if (isFiniteLngLat(coords)) {
    out.push([coords[0], coords[1]]);
    return;
  }
  for (const c of coords) collectVertices(c, out);
}

/** Bir Polygon geometrisi için temsilî nokta = vertex bbox merkezi. */
function polygonRepresentative(geom: EarthEventGeometry): LngLat | null {
  const verts: LngLat[] = [];
  collectVertices(geom.coordinates, verts);
  if (verts.length === 0) return null;

  // Bbox merkezi — kendiyle kesişen halkalara ve düzensiz EONET footprint'lerine
  // gerçek centroid'den daha dayanıklı, ucuz ve kararlı.
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of verts) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  const lng = (minLng + maxLng) / 2;
  const lat = (minLat + maxLat) / 2;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lng, lat];
}

/**
 * Bir earth-event için temsilî [lng, lat] noktası.
 *
 * Öncelik: en yeni geçerli Point → yoksa en yeni Polygon'un bbox merkezi.
 * Hiçbir geometri konumlanamıyorsa null.
 */
export function pickRepresentativePoint(event: EarthEvent): LngLat | null {
  // 1) En yeni geçerli Point.
  for (let i = event.geometries.length - 1; i >= 0; i--) {
    const g = event.geometries[i];
    if (g?.type === 'Point') {
      const c = g.coordinates;
      if (isFiniteLngLat(c)) return [c[0], c[1]];
    }
  }
  // 2) En yeni geçerli Polygon → bbox merkezi.
  for (let i = event.geometries.length - 1; i >= 0; i--) {
    const g = event.geometries[i];
    if (g?.type === 'Polygon') {
      const p = polygonRepresentative(g);
      if (p) return p;
    }
  }
  return null;
}
