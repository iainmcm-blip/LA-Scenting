export type Tier = 'full' | 'mobile' | 'reduced';

export interface CapabilityInput {
  reducedMotion: boolean;
  coarsePointer: boolean;
  width: number;
}

const MOBILE_MAX_WIDTH = 900;

/** Pure decision function — easy to test, no browser APIs. */
export function resolveTier(input: CapabilityInput): Tier {
  if (input.reducedMotion) return 'reduced';
  if (input.coarsePointer || input.width < MOBILE_MAX_WIDTH) return 'mobile';
  return 'full';
}

/** Browser-side read of the current tier. Call only in the browser. */
export function detectTier(): Tier {
  return resolveTier({
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    width: window.innerWidth,
  });
}
