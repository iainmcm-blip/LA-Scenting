import { describe, it, expect } from 'vitest';
import { resolveTier } from '../src/lib/capability';

describe('resolveTier', () => {
  it('returns "reduced" when reduced motion is preferred, regardless of device', () => {
    expect(resolveTier({ reducedMotion: true, coarsePointer: false, width: 1440 })).toBe('reduced');
    expect(resolveTier({ reducedMotion: true, coarsePointer: true, width: 390 })).toBe('reduced');
  });

  it('returns "mobile" for coarse pointer or narrow viewport when motion is allowed', () => {
    expect(resolveTier({ reducedMotion: false, coarsePointer: true, width: 1440 })).toBe('mobile');
    expect(resolveTier({ reducedMotion: false, coarsePointer: false, width: 600 })).toBe('mobile');
  });

  it('returns "full" for wide fine-pointer devices when motion is allowed', () => {
    expect(resolveTier({ reducedMotion: false, coarsePointer: false, width: 1440 })).toBe('full');
  });
});
