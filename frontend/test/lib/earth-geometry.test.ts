import { describe, expect, it } from 'vitest';

import { pickRepresentativePoint } from '@/lib/earth-geometry';
import type { EarthEvent, EarthEventGeometry } from '@/lib/earth-types';

function geom(
  type: 'Point' | 'Polygon',
  coordinates: number[] | number[][],
  date = '2026-01-01',
): EarthEventGeometry {
  return { date, type, coordinates, magnitude_value: null, magnitude_unit: null };
}

function makeEvent(geometries: EarthEventGeometry[]): EarthEvent {
  return { geometries } as unknown as EarthEvent;
}

describe('pickRepresentativePoint', () => {
  it('returns the coordinates of a Point geometry', () => {
    const p = pickRepresentativePoint(makeEvent([geom('Point', [28.97, 41.01])]));
    expect(p).toEqual([28.97, 41.01]);
  });

  it('prefers the newest valid Point (last in the array)', () => {
    const p = pickRepresentativePoint(
      makeEvent([
        geom('Point', [10, 10], '2026-01-01'),
        geom('Point', [20, 20], '2026-01-02'),
      ]),
    );
    expect(p).toEqual([20, 20]);
  });

  it('prefers a Point over a Polygon even if the Polygon is newer', () => {
    const ring: number[][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    const p = pickRepresentativePoint(
      makeEvent([
        geom('Point', [3, 4], '2026-01-01'),
        geom('Polygon', ring, '2026-01-02'),
      ]),
    );
    expect(p).toEqual([3, 4]);
  });

  it('falls back to a Polygon bbox center when no Point exists', () => {
    const ring: number[][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ];
    const p = pickRepresentativePoint(makeEvent([geom('Polygon', ring)]));
    expect(p).toEqual([5, 5]);
  });

  it('handles nested polygon coordinate arrays', () => {
    const nested = [
      [
        [-2, -2],
        [2, -2],
        [2, 2],
        [-2, 2],
      ],
    ] as unknown as number[][];
    const p = pickRepresentativePoint(makeEvent([geom('Polygon', nested)]));
    expect(p).toEqual([0, 0]);
  });

  it('skips non-finite coordinates', () => {
    const p = pickRepresentativePoint(makeEvent([geom('Point', [NaN, 5])]));
    expect(p).toBeNull();
  });

  it('returns null for an event with no geometries', () => {
    expect(pickRepresentativePoint(makeEvent([]))).toBeNull();
  });
});
