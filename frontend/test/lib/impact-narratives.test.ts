import { describe, expect, it } from 'vitest';

import { DEFAULT_NARRATIVE, getNarrative } from '@/lib/impact-narratives';

describe('getNarrative', () => {
  it('returns the themed narrative for a bare historical id', () => {
    expect(getNarrative('chelyabinsk').effects).toContain('glass_shatter');
    expect(getNarrative('tunguska').effects).toContain('forest');
  });

  it('resolves clean TR preset ids via alias to the matching historical narrative', () => {
    expect(getNarrative('tr-chelyabinsk-ankara').effects).toContain('glass_shatter');
    expect(getNarrative('tr-tunguska-istanbul').effects).toContain('forest');
  });

  it('uses dedicated entries for TR scenarios that differ from the source event', () => {
    // Hoba = small iron impactor → no atmospheric/forest effect, but real captions.
    expect(getNarrative('tr-hoba-adana').effects).toEqual([]);
    expect(getNarrative('tr-hoba-adana').captions.length).toBeGreaterThan(0);
    // Apophis-İzmir = water/tsunami scenario → dust/steam plume.
    expect(getNarrative('tr-apophis-izmir').effects).toContain('mega_dust');
    expect(getNarrative('tr-apophis-izmir').captions.length).toBeGreaterThan(0);
  });

  it('falls back to DEFAULT_NARRATIVE for null and unknown ids', () => {
    expect(getNarrative(null)).toBe(DEFAULT_NARRATIVE);
    expect(getNarrative('does-not-exist')).toBe(DEFAULT_NARRATIVE);
  });
});
