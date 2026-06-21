import { describe, expect, it } from 'vitest';

import { calculateImpact, type ImpactInput } from '@/lib/impact-physics';

const APOPHIS: ImpactInput = {
  diameterM: 370,
  velocityKms: 12.6,
  angleDeg: 45,
  composition: 'stony',
  targetType: 'crystalline',
};

describe('calculateImpact', () => {
  it('produces sane numbers for an Apophis-like impactor', () => {
    const result = calculateImpact(APOPHIS);

    expect(result.energy_megatons).toBeGreaterThan(500);
    expect(result.energy_megatons).toBeLessThan(2_000);
    expect(result.crater_diameter_km).toBeGreaterThan(2);
    expect(result.seismic_magnitude).toBeGreaterThan(5);
    expect(result.thermal_radius_km).toBeGreaterThan(10);
    expect(result.damage_zones.length).toBeGreaterThan(0);
    expect(['critical', 'high', 'moderate', 'low']).toContain(result.verdict.severity);
  });

  it('scales monotonically with diameter', () => {
    const small = calculateImpact({ ...APOPHIS, diameterM: 50, velocityKms: 18 });
    const large = calculateImpact({ ...APOPHIS, diameterM: 1000, velocityKms: 18 });
    expect(large.energy_megatons).toBeGreaterThan(small.energy_megatons);
    expect(large.thermal_radius_km).toBeGreaterThan(small.thermal_radius_km);
  });

  it('treats small + weak impactors as airbursts', () => {
    const tunguska = calculateImpact({
      diameterM: 60,
      velocityKms: 27,
      angleDeg: 30,
      composition: 'stony',
      targetType: 'crystalline',
    });
    expect(tunguska.mode).toBe('airburst');
    expect(tunguska.airburst_altitude_km).toBeGreaterThan(0);
  });

  it('reports Hiroshima-equivalents and a verdict', () => {
    const r = calculateImpact(APOPHIS);
    expect(r.hiroshima_equivalents).toBeGreaterThan(0);
    expect(typeof r.verdict.headline).toBe('string');
    expect(typeof r.verdict.detail).toBe('string');
  });
});
