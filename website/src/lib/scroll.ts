import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { detectTier, type Tier } from './capability';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
let lifecycleBound = false;

/**
 * Initialise smooth scroll + ScrollTrigger sync. Safe to call multiple times.
 * No-op under the 'reduced' tier. Returns the resolved tier.
 */
export function initScroll(): { tier: Tier } {
  const tier = detectTier();
  if (tier === 'reduced') return { tier };

  if (!lenis) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis!.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // Kill stale ScrollTriggers before the DOM is swapped on client navigation,
  // and refresh measurements after a new page is shown. Bind once.
  if (!lifecycleBound) {
    document.addEventListener('astro:before-swap', () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    });
    document.addEventListener('astro:page-load', () => {
      lenis?.scrollTo(0, { immediate: true });
      ScrollTrigger.refresh();
    });
    lifecycleBound = true;
  }

  return { tier };
}

export function getLenis() { return lenis; }
export { gsap, ScrollTrigger };
