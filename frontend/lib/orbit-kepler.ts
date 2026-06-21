/**
 * İstemci tarafı Kepler propagatörü — bir cismin yörünge elemanlarından
 * herhangi bir Jülyen Gün'deki (JD) heliosentrik ekliptik J2000 konumunu (AU)
 * hesaplar. Yörünge sineması bununla asteroidi VE Dünya'yı zamanla yörüngeleri
 * üzerinde hareket ettirir (backend Dünya konumu vermiyor; istemcide çözülür).
 *
 * Çerçeve/birim: heliosentrik ekliptik J2000, AU. Sahne dönüşümü
 * `eclipticToScene` ile `TrajectoryLine` konvansiyonuna (`[x, z, -y] * auScale`)
 * uyumludur — böylece propagatör konumu çizilen elips üstüne oturur.
 */

import type { OrbitElements } from '@/hooks/useOrbit';

const DEG = Math.PI / 180;
const TWO_PI = Math.PI * 2;

/** Dünya'nın J2000 ortalama elemanları (backend `propagator.py` PLANET_ELEMENTS.earth). */
export const EARTH_ELEMENTS: OrbitElements = {
  a_au: 1.00000261,
  e: 0.01671123,
  i_deg: 0.00001531,
  omega_deg: 0, // Ω (yükselen düğüm boylamı)
  arg_peri_deg: 102.93768193, // ω (günberi argümanı)
  M0_deg: 100.46457166,
  epoch_jd: 2451545.0,
  period_days: 365.256363,
};

/** Bir gün-tabanlı sürtünmesiz iki-cisim periyodu (gün). */
export function periodOf(el: OrbitElements): number {
  if (el.period_days && el.period_days > 0) return el.period_days;
  // Kepler 3. yasa: P[yıl] = a^1.5 → güne çevir.
  return 365.25 * Math.pow(Math.max(1e-6, el.a_au), 1.5);
}

export function dateToJd(date: Date): number {
  return date.getTime() / 86_400_000 + 2440587.5;
}

export function jdToDate(jd: number): Date {
  return new Date((jd - 2440587.5) * 86_400_000);
}

/** Kepler denklemi M = E − e·sinE → eksantrik anomali E (Newton-Raphson). */
function solveKepler(M: number, e: number): number {
  let m = M % TWO_PI;
  if (m < -Math.PI) m += TWO_PI;
  if (m > Math.PI) m -= TWO_PI;
  let E = e < 0.8 ? m : Math.PI;
  for (let i = 0; i < 16; i++) {
    const f = E - e * Math.sin(E) - m;
    const fp = 1 - e * Math.cos(E);
    const d = f / fp;
    E -= d;
    if (Math.abs(d) < 1e-9) break;
  }
  return E;
}

/** Heliosentrik ekliptik J2000 konum (AU) — JD anında. */
export function positionAt(el: OrbitElements, jd: number): [number, number, number] {
  const a = el.a_au;
  const e = el.e;
  const i = el.i_deg * DEG;
  const Om = el.omega_deg * DEG;
  const w = el.arg_peri_deg * DEG;

  const n = TWO_PI / periodOf(el); // rad/gün
  const M = el.M0_deg * DEG + n * (jd - el.epoch_jd);
  const E = solveKepler(M, e);

  // Perifokal düzlem koordinatları.
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E);

  // ω, i, Ω ile ekliptik çerçeveye döndür.
  const cosw = Math.cos(w);
  const sinw = Math.sin(w);
  const cosO = Math.cos(Om);
  const sinO = Math.sin(Om);
  const cosi = Math.cos(i);
  const sini = Math.sin(i);

  const x = (cosO * cosw - sinO * sinw * cosi) * xp + (-cosO * sinw - sinO * cosw * cosi) * yp;
  const y = (sinO * cosw + cosO * sinw * cosi) * xp + (-sinO * sinw + cosO * cosw * cosi) * yp;
  const z = sinw * sini * xp + cosw * sini * yp;
  return [x, y, z];
}

/** Ekliptik [x,y,z] (AU) → sahne koordinatı. TrajectoryLine ile aynı eksen takası. */
export function eclipticToScene(
  p: [number, number, number],
  origin: [number, number, number],
  auScale: number,
): [number, number, number] {
  return [origin[0] + p[0] * auScale, origin[1] + p[2] * auScale, origin[2] - p[1] * auScale];
}
