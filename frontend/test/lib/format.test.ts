import { describe, expect, it } from 'vitest';

import {
  formatDistanceKm,
  formatDiameter,
  formatScore,
  formatVelocity,
} from '@/lib/format';

describe('formatDistanceKm', () => {
  it('shows AU for far distances', () => {
    expect(formatDistanceKm(15_000_000)).toMatch(/AU/);
  });
  it('shows lunar distance for mid range', () => {
    expect(formatDistanceKm(500_000)).toMatch(/LD/);
  });
  it('shows km for close range', () => {
    expect(formatDistanceKm(12_345)).toMatch(/km/);
  });
  it('returns dash for null/undefined', () => {
    expect(formatDistanceKm(null)).toBe('—');
    expect(formatDistanceKm(undefined)).toBe('—');
  });
});

describe('formatDiameter', () => {
  it('uses meters under 1km', () => {
    expect(formatDiameter(0.37)).toBe('370.0 m');
  });
  it('uses kilometers above 1km', () => {
    expect(formatDiameter(2.5)).toBe('2.50 km');
  });
});

describe('formatVelocity / formatScore', () => {
  it('formats velocity', () => {
    expect(formatVelocity(12.6)).toBe('12.60 km/s');
  });
  it('formats score', () => {
    expect(formatScore(0.872)).toBe('0.87');
  });
});
