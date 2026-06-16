# LA Scenting Homepage — "Emotional Architecture in Motion"

**Date:** 2026-06-16
**Status:** Approved (design) — pending implementation plan
**Scope:** Flagship homepage rebuild on Astro with four signature motion effects. Other pages migrated to Astro shells only.

---

## 1. Goal

Rebuild the LA Scenting homepage as a world-class, scroll-driven experience that rivals top studio (Awwwards-tier) work, while keeping a fast, maintainable, scalable foundation. The homepage is the **flagship**: it establishes the motion language and component system, which a later project rolls out to the remaining pages.

Success criteria:
- Four signature effects present and coherent on desktop: WebGL scent haze, scroll-scrubbed storytelling, image warp on scroll/hover, seamless page transitions.
- Graceful mobile reduction; `prefers-reduced-motion` fully honored.
- Lighthouse performance ≥ 90; no scroll jank (60fps desktop; no WebGL jank on mobile).
- Reusable, isolated motion system (components + libs) ready to templatize across other pages.

## 2. Decisions (from brainstorming)

1. **Sequencing:** Flagship homepage first. Other 5 pages become Astro shells with current styling; motion rollout is a separate later project.
2. **Design fidelity:** Evolve the current homepage — keep what works, redesign sections where motion demands different structure.
3. **Scroll-story content:** Derived from existing approved copy (Philosophy / Services / About), no net-new narrative.
4. **Mobile strategy:** Full desktop fidelity; gracefully reduced mobile (scroll-story + transitions kept; live WebGL haze → video plate; image-warp shaders → simple reveals). Reduced-motion always honored.
5. **Haze:** Hybrid — procedural WebGL shader on desktop, `video/hero.mp4` plate as mobile fallback, static `smoke.jpg` under reduced-motion.
6. **Engine:** Astro + GSAP/ScrollTrigger + Lenis + OGL (vanilla islands). No React/R3F — chosen for minimal JS weight and maximum Lighthouse performance.

## 3. Stack

- **Astro** under `website/`. Current `.html` files become `.astro` pages/components; `style.css` migrates near-intact (tokens preserved). Vercel adapter — same deploy pipeline.
- **Lenis** — smooth/normalized scroll.
- **GSAP 3 + ScrollTrigger** (free, incl. SplitText) — all scroll choreography.
- **OGL** (~3kb) — single shared WebGL canvas for haze + image-warp shaders.
- **Astro View Transitions** — page-to-page morph transitions.
- Gating: `prefers-reduced-motion` + mobile/low-power capability tier.

## 4. The four effects (mapped to real content)

### 4.1 WebGL scent haze (hybrid)
- Fixed full-viewport `<canvas>` behind the hero.
- Procedural fbm-noise shader, tinted to brand palette (sand), drifting slowly; subtly parts around cursor.
- **Mobile:** `video/hero.mp4` with CSS blur/overlay.
- **Reduced-motion:** static `smoke.jpg`.

### 4.2 Scroll-scrubbed storytelling
- Pinned section carrying the real narrative spine from the Philosophy page.
- **Three-pillar sequence:** Invisible Luxury → Emotionally Resonant → Sustainable Alchemy. Each pillar's Roman numeral + line reveals on scrub (SplitText); haze hue shifts per pillar.
- Flows into the **three-step process:** Spatial Audit → Brand Translation → Scent Composition, as a horizontal scroll-pinned track.

### 4.3 Image warp on scroll/hover
- Editorial shots (`marble`, `staircase`, `vials`, `oil`, plus space photos) get a displacement-shader ripple driven by scroll velocity, and a liquid distortion on hover.
- **Desktop only.** Mobile → clean parallax reveals (port existing IntersectionObserver approach).

### 4.4 Seamless page transitions
- Astro View Transitions. Nav and a persistent haze layer survive navigation while content cross-fades/morphs — Home → Philosophy feels like one continuous space.

## 5. Architecture (isolation by purpose)

- `lib/capability.ts` — detects reduced-motion + mobile/low-power; returns a single capability **tier** that all components read. One source of truth for "what runs where."
- `lib/scroll.ts` — Lenis init + GSAP/ScrollTrigger wiring, in one place.
- `lib/gl/haze.ts` — self-contained OGL program; `mount(el)` / `destroy()`.
- `lib/gl/warp.ts` — self-contained OGL displacement program; `mount(el)` / `destroy()`.
- `components/HeroHaze.astro` — hero + haze canvas (reads tier; picks shader/video/static).
- `components/PillarScroll.astro` — pinned three-pillar scrub section.
- `components/ProcessTrack.astro` — horizontal pinned three-step process.
- `components/WarpImage.astro` — wraps an image; mounts warp shader on desktop, falls back to reveal.

Each unit: clear single purpose, well-defined `mount/destroy` or props interface, independently understandable and testable.

## 6. Performance & quality budget

- **One shared WebGL context** for all GL effects — never one context per image.
- Lazy-mount GL/scroll effects via IntersectionObserver; destroy on exit where appropriate.
- Targets: 60fps desktop, no WebGL jank on mid-tier mobile, Lighthouse performance ≥ 90.
- All motion behind capability tier + reduced-motion guard.

## 7. Scope boundary

- **In scope:** Homepage rebuilt with all four effects; Astro project scaffolding; the 5 other pages migrated to Astro shells (navigation + view transitions work) but retaining current styling.
- **Out of scope (separate later project):** Applying the motion system to the other 5 pages; any copy rewrites; new photography/video beyond the existing `hero.mp4` plate and a possible Higgsfield-generated haze plate.

## 8. Assets available

- Images: `hero`, `smoke`, `marble`, `staircase`, `vials`, `oil`, `diffuser`, `incense`, `lavender`, `boutique`, `dining`, `living`, `suite`, `changi`.
- Video: `video/hero.mp4` (mobile haze fallback).
- Higgsfield MCP available to generate an additional smoke/haze plate if needed.

## 9. Open considerations (resolve during planning)

- Exact Astro migration order so the live Vercel deploy is never broken (likely: scaffold Astro alongside, port pages, cut over).
- Whether `style.css` is kept global or split per-component during migration.
- Font loading strategy under Astro (currently Google Fonts `<link>`).
