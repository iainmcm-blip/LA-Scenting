# LA Scenting Homepage Motion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the LA Scenting homepage on Astro with four signature motion effects (WebGL scent haze, scroll-scrubbed storytelling, image warp, seamless page transitions), with graceful mobile/reduced-motion fallbacks, while migrating the other pages to Astro shells.

**Architecture:** Astro static site under `website/`. Motion lives in hydrated islands: Lenis (smooth scroll) + GSAP/ScrollTrigger (choreography) + OGL (one shared WebGL canvas for shaders). A single capability module decides which tier (full / mobile / reduced) runs, and every component reads it. Other pages become content-only Astro shells so navigation and view transitions work without yet carrying motion.

**Tech Stack:** Astro 5, GSAP 3.13 (ScrollTrigger + SplitText, free), Lenis, OGL, Astro View Transitions (`ClientRouter`), Vercel static deploy.

**Working dir for all commands:** `/Users/iain/Desktop/LA Scenting`

---

## File Structure

```
website/
  astro.config.mjs            # Astro config (static output)
  package.json
  public/
    images/                   # moved from website/images
    video/                    # moved from website/video
  src/
    styles/global.css         # ported from website/style.css
    lib/
      capability.ts           # tier detection — single source of truth
      scroll.ts               # Lenis + GSAP/ScrollTrigger init
      gl/haze.ts              # OGL procedural haze program
      gl/warp.ts              # OGL displacement program
    components/
      Nav.astro
      HeroHaze.astro
      PillarScroll.astro
      ProcessTrack.astro
      WarpImage.astro
    layouts/
      Base.astro              # <head>, fonts, ClientRouter, global css
    pages/
      index.astro             # flagship homepage
      about-us.astro          # shell
      philosophy.astro        # shell
      services.astro          # shell
      journal.astro           # shell
  tests/
    capability.test.ts
```

Legacy `website/*.html`, `website/app.js`, `website/style.css` are removed only after their content is ported (Task 12).

---

### Task 0: Initialize git and capture baseline

**Files:**
- Create: `.gitignore` (append), repo init

- [ ] **Step 1: Initialize git**

Run:
```bash
cd "/Users/iain/Desktop/LA Scenting" && git init && git add -A && git commit -m "chore: baseline before Astro motion rebuild"
```
Expected: a commit is created listing existing files.

- [ ] **Step 2: Add Node ignores**

Append to `.gitignore`:
```
node_modules/
website/dist/
website/.astro/
.DS_Store
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore && git commit -m "chore: ignore node and astro build artifacts"
```

---

### Task 1: Scaffold Astro alongside the existing site

**Files:**
- Create: `website/package.json`, `website/astro.config.mjs`, `website/tsconfig.json`

- [ ] **Step 1: Create the package manifest**

Create `website/package.json`:
```json
{
  "name": "la-scenting",
  "type": "module",
  "version": "1.0.0",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "gsap": "^3.13.0",
    "lenis": "^1.1.0",
    "ogl": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create Astro config (static output)**

Create `website/astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  build: { format: 'file' }, // emit about-us.html etc. to match current URLs
});
```

- [ ] **Step 3: Create tsconfig**

Create `website/tsconfig.json`:
```json
{ "extends": "astro/tsconfigs/strict" }
```

- [ ] **Step 4: Install dependencies**

Run:
```bash
cd "/Users/iain/Desktop/LA Scenting/website" && npm install
```
Expected: `node_modules/` created, no errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/iain/Desktop/LA Scenting" && git add website/package.json website/package-lock.json website/astro.config.mjs website/tsconfig.json && git commit -m "chore: scaffold astro project"
```

---

### Task 2: Capability tier module (TDD — pure logic)

This is the one piece with real unit-test value: it decides what runs where.

**Files:**
- Create: `website/src/lib/capability.ts`
- Test: `website/tests/capability.test.ts`
- Modify: `website/package.json` (add test script)

- [ ] **Step 1: Add the test script**

In `website/package.json` add to `"scripts"`: `"test": "vitest run"`.

- [ ] **Step 2: Write the failing test**

Create `website/tests/capability.test.ts`:
```ts
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
```

- [ ] **Step 3: Run the test, verify it fails**

Run:
```bash
cd "/Users/iain/Desktop/LA Scenting/website" && npm test
```
Expected: FAIL — `resolveTier` not found / module missing.

- [ ] **Step 4: Implement the module**

Create `website/src/lib/capability.ts`:
```ts
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
```

- [ ] **Step 5: Run the test, verify it passes**

Run:
```bash
cd "/Users/iain/Desktop/LA Scenting/website" && npm test
```
Expected: PASS — 3 tests green.

- [ ] **Step 6: Commit**

```bash
cd "/Users/iain/Desktop/LA Scenting" && git add website/src/lib/capability.ts website/tests/capability.test.ts website/package.json && git commit -m "feat: capability tier detection with tests"
```

---

### Task 3: Move assets into Astro's public/

**Files:**
- Move: `website/images/` → `website/public/images/`
- Move: `website/video/` → `website/public/video/`

- [ ] **Step 1: Move asset folders**

Run:
```bash
cd "/Users/iain/Desktop/LA Scenting/website" && mkdir -p public && git mv images public/images && git mv video public/video
```
Expected: folders now under `public/`. URLs stay `/images/...` and `/video/...`.

- [ ] **Step 2: Commit**

```bash
cd "/Users/iain/Desktop/LA Scenting" && git commit -m "chore: move images and video into astro public/"
```

---

### Task 4: Base layout — fonts, global CSS, view-transition router

**Files:**
- Create: `website/src/layouts/Base.astro`
- Create: `website/src/styles/global.css` (ported from `website/style.css`)

- [ ] **Step 1: Port the stylesheet**

Run:
```bash
cd "/Users/iain/Desktop/LA Scenting/website" && mkdir -p src/styles && cp style.css src/styles/global.css
```
(Leaves the original in place until Task 12 cleanup.)

- [ ] **Step 2: Create the base layout**

Create `website/src/layouts/Base.astro`:
```astro
---
import { ClientRouter } from 'astro:transitions';
import '../styles/global.css';
interface Props { title: string; description?: string; }
const { title, description = 'LA Scenting designs immersive scent identities for extraordinary spaces.' } = Astro.props;
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
  <ClientRouter />
</head>
<body>
  <slot />
</body>
</html>
```

> Note: if `astro:transitions` exports `ViewTransitions` instead of `ClientRouter` on the installed version, use that name. Astro 5 = `ClientRouter`.

- [ ] **Step 3: Verify the dev server boots**

Run:
```bash
cd "/Users/iain/Desktop/LA Scenting/website" && npm run dev
```
Expected: server starts at `http://localhost:4321` without errors. Stop it with Ctrl-C after confirming.

- [ ] **Step 4: Commit**

```bash
cd "/Users/iain/Desktop/LA Scenting" && git add website/src/layouts/Base.astro website/src/styles/global.css && git commit -m "feat: base layout with fonts and view transitions"
```

---

### Task 5: Nav component + page shells (migrate the other 5 pages)

Each non-home page becomes a shell: its existing inner markup, wrapped in `Base.astro`, with the nav extracted to a component.

**Files:**
- Create: `website/src/components/Nav.astro`
- Create: `website/src/pages/about-us.astro`, `philosophy.astro`, `services.astro`, `journal.astro`

- [ ] **Step 1: Extract the nav**

Create `website/src/components/Nav.astro` by copying the `<nav class="main-nav">…</nav>` and mobile-nav overlay markup from `website/index.html` (lines ~17–45). Keep classes identical so `global.css` styles apply unchanged.

- [ ] **Step 2: Build the philosophy shell**

Create `website/src/pages/philosophy.astro`:
```astro
---
import Base from '../layouts/Base.astro';
import Nav from '../components/Nav.astro';
---
<Base title="Philosophy — LA Scenting">
  <Nav />
  <!-- PASTE the inner <main>…</main> content from website/philosophy.html here, unchanged -->
</Base>
```
Repeat the same pattern for `about-us.astro`, `services.astro`, `journal.astro`, pasting each file's body content (everything between `<body>`'s nav and the closing script).

- [ ] **Step 3: Verify shells render**

Run `npm run dev`, then visit each route (`/philosophy`, `/about-us`, `/services`, `/journal`). Confirm content and styling match the old pages. Stop the server.

- [ ] **Step 4: Commit**

```bash
cd "/Users/iain/Desktop/LA Scenting" && git add website/src/components/Nav.astro website/src/pages/*.astro && git commit -m "feat: migrate secondary pages to astro shells"
```

---

### Task 6: Scroll foundation — Lenis + GSAP/ScrollTrigger

**Files:**
- Create: `website/src/lib/scroll.ts`

- [ ] **Step 1: Implement the scroll initializer**

Create `website/src/lib/scroll.ts`:
```ts
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { detectTier } from './capability';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

/** Initialise smooth scroll + ScrollTrigger sync. No-op under reduced motion. */
export function initScroll(): { tier: ReturnType<typeof detectTier> } {
  const tier = detectTier();
  if (tier === 'reduced') return { tier };

  lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis!.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return { tier };
}

export function getLenis() { return lenis; }
export { gsap, ScrollTrigger };
```

- [ ] **Step 2: Wire it into the homepage and verify smooth scroll**

Temporarily create `website/src/pages/index.astro` with the homepage body from `index.html` wrapped in `Base` + `Nav`, plus:
```astro
<script>
  import { initScroll } from '../lib/scroll';
  initScroll();
</script>
```
Run `npm run dev`, open `/`, confirm scrolling is smoothed (and that reduced-motion via OS setting disables it). Stop the server.

- [ ] **Step 3: Commit**

```bash
cd "/Users/iain/Desktop/LA Scenting" && git add website/src/lib/scroll.ts website/src/pages/index.astro && git commit -m "feat: lenis + scrolltrigger scroll foundation"
```

---

### Task 7: HeroHaze component (procedural shader + fallbacks)

**Files:**
- Create: `website/src/lib/gl/haze.ts`
- Create: `website/src/components/HeroHaze.astro`
- Modify: `website/src/pages/index.astro` (use the component)

- [ ] **Step 1: Implement the OGL haze program**

Create `website/src/lib/gl/haze.ts`:
```ts
import { Renderer, Triangle, Program, Mesh, Vec2 } from 'ogl';

const vertex = `attribute vec2 uv; attribute vec2 position;
varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,0.0,1.0); }`;

const fragment = `precision highp float;
varying vec2 vUv; uniform float uTime; uniform vec2 uMouse; uniform vec3 uTint;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; } return v; }
void main(){
  vec2 p=vUv*2.0;
  float drift=fbm(p+vec2(uTime*0.03,uTime*0.015));
  float m=distance(vUv,uMouse);
  drift+=0.08*smoothstep(0.4,0.0,m);
  vec3 col=mix(vec3(0.05,0.04,0.03),uTint,drift);
  gl_FragColor=vec4(col,0.9);
}`;

export function mountHaze(canvas: HTMLCanvasElement) {
  const renderer = new Renderer({ canvas, alpha: true, dpr: Math.min(window.devicePixelRatio, 2) });
  const gl = renderer.gl;
  const geometry = new Triangle(gl);
  const mouse = new Vec2(0.5, 0.5);
  const program = new Program(gl, {
    vertex, fragment,
    uniforms: {
      uTime: { value: 0 }, uMouse: { value: mouse },
      uTint: { value: [0.78, 0.70, 0.58] }, // sand
    },
  });
  const mesh = new Mesh(gl, { geometry, program });

  function resize() { renderer.setSize(canvas.clientWidth, canvas.clientHeight); }
  function onMove(e: PointerEvent) {
    mouse.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
  }
  let raf = 0;
  function loop(t: number) {
    program.uniforms.uTime.value = t * 0.001;
    renderer.render({ scene: mesh });
    raf = requestAnimationFrame(loop);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onMove);
  resize();
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onMove);
  };
}
```

- [ ] **Step 2: Build the component with tiered fallback**

Create `website/src/components/HeroHaze.astro`:
```astro
---
// Hero with WebGL haze (full), video plate (mobile), static image (reduced).
---
<section class="hero">
  <canvas class="hero-haze" data-haze></canvas>
  <video class="hero-haze-video" data-haze-video src="/video/hero.mp4" muted loop playsinline preload="none" hidden></video>
  <img class="hero-haze-static" data-haze-static src="/images/smoke.jpg" alt="" hidden />
  <div class="hero-content"><slot /></div>
</section>

<script>
  import { detectTier } from '../lib/capability';
  const tier = detectTier();
  const canvas = document.querySelector<HTMLCanvasElement>('[data-haze]');
  const video = document.querySelector<HTMLVideoElement>('[data-haze-video]');
  const still = document.querySelector<HTMLImageElement>('[data-haze-static]');

  if (tier === 'full' && canvas) {
    const { mountHaze } = await import('../lib/gl/haze');
    mountHaze(canvas);
  } else if (tier === 'mobile' && video) {
    canvas?.remove(); video.hidden = false; video.play().catch(() => {});
  } else if (still) {
    canvas?.remove(); video?.remove(); still.hidden = false;
  }
</script>

<style>
  .hero { position: relative; min-height: 100vh; overflow: hidden; }
  .hero-haze, .hero-haze-video, .hero-haze-static {
    position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0;
  }
  .hero-content { position: relative; z-index: 1; }
</style>
```

- [ ] **Step 3: Use it in the homepage**

In `website/src/pages/index.astro`, replace the existing `.hero` block with `<HeroHaze>…hero heading/CTA…</HeroHaze>` (import the component in the frontmatter).

- [ ] **Step 4: Verify each tier in the browser**

Run `npm run dev`. On desktop confirm the haze drifts and reacts to the cursor. Throttle to a mobile viewport / enable OS reduced-motion and confirm the video and static fallbacks respectively. Stop the server.

- [ ] **Step 5: Commit**

```bash
cd "/Users/iain/Desktop/LA Scenting" && git add website/src/lib/gl/haze.ts website/src/components/HeroHaze.astro website/src/pages/index.astro && git commit -m "feat: hero webgl haze with video/static fallbacks"
```

---

### Task 8: PillarScroll — pinned three-pillar scrub

**Files:**
- Create: `website/src/components/PillarScroll.astro`
- Modify: `website/src/pages/index.astro`

- [ ] **Step 1: Build the component**

Create `website/src/components/PillarScroll.astro`. Content comes from the Philosophy page's three pillars (copy verbatim):
```astro
---
const pillars = [
  { num: 'I',   title: 'Invisible Luxury',     line: 'Scent is the most sophisticated form of interior design — defining a room without occupying a single inch of floor space.' },
  { num: 'II',  title: 'Emotionally Resonant', line: 'By engaging the olfactory system we bypass logic and speak directly to the soul — serenity, focus, prestige.' },
  { num: 'III', title: 'Sustainable Alchemy',  line: 'Rare, sustainable botanicals and low-impact diffusion: an atmosphere as pure as it is evocative.' },
];
---
<section class="pillars" data-pillars>
  <div class="pillars-track">
    {pillars.map((p) => (
      <article class="pillar">
        <span class="pillar-num">{p.num}</span>
        <h3 class="pillar-title">{p.title}</h3>
        <p class="pillar-line">{p.line}</p>
      </article>
    ))}
  </div>
</section>

<script>
  import { initScroll, gsap, ScrollTrigger } from '../lib/scroll';
  import { detectTier } from '../lib/capability';
  if (detectTier() !== 'reduced') {
    initScroll();
    const section = document.querySelector('[data-pillars]')!;
    const pillars = gsap.utils.toArray<HTMLElement>('.pillar');
    gsap.set(pillars, { autoAlpha: 0, y: 40 });
    ScrollTrigger.create({
      trigger: section, start: 'top top', end: '+=' + pillars.length * 100 + '%',
      pin: true, scrub: true,
      onUpdate: (self) => {
        const idx = Math.min(pillars.length - 1, Math.floor(self.progress * pillars.length));
        pillars.forEach((el, i) => gsap.to(el, { autoAlpha: i === idx ? 1 : 0, y: i === idx ? 0 : 40, overwrite: true, duration: 0.3 }));
      },
    });
  } else {
    document.querySelectorAll<HTMLElement>('.pillar').forEach((el) => { el.style.opacity = '1'; });
  }
</script>

<style>
  .pillars { min-height: 100vh; display: grid; place-items: center; }
  .pillars-track { position: relative; }
  .pillar { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; max-width: 38rem; }
</style>
```

- [ ] **Step 2: Add it to the homepage** after the hero (import + place `<PillarScroll />`).

- [ ] **Step 3: Verify** with `npm run dev`: scrolling pins the section and steps through the three pillars; reduced-motion shows all three statically. Stop the server.

- [ ] **Step 4: Commit**

```bash
cd "/Users/iain/Desktop/LA Scenting" && git add website/src/components/PillarScroll.astro website/src/pages/index.astro && git commit -m "feat: pinned three-pillar scroll scrub"
```

---

### Task 9: ProcessTrack — horizontal pinned three-step

**Files:**
- Create: `website/src/components/ProcessTrack.astro`
- Modify: `website/src/pages/index.astro`

- [ ] **Step 1: Build the component** (copy from Philosophy "Process" steps):
```astro
---
const steps = [
  { n: '01', title: 'Spatial Audit',     body: 'Understanding architecture, flow, dwell times, and emotional intention of every zone.' },
  { n: '02', title: 'Brand Translation', body: "Decoding your brand's visual and tonal identity into olfactory language." },
  { n: '03', title: 'Scent Composition', body: 'Bespoke formulation by our master perfumers, refined through iterative spatial testing.' },
];
---
<section class="process" data-process>
  <div class="process-track">
    {steps.map((s) => (
      <article class="step"><span class="step-n">{s.n}</span><h3>{s.title}</h3><p>{s.body}</p></article>
    ))}
  </div>
</section>

<script>
  import { initScroll, gsap, ScrollTrigger } from '../lib/scroll';
  import { detectTier } from '../lib/capability';
  if (detectTier() !== 'reduced') {
    initScroll();
    const track = document.querySelector<HTMLElement>('.process-track')!;
    const scrollLen = () => track.scrollWidth - window.innerWidth;
    gsap.to(track, {
      x: () => -scrollLen(),
      ease: 'none',
      scrollTrigger: { trigger: '[data-process]', start: 'top top', end: () => '+=' + scrollLen(), pin: true, scrub: true, invalidateOnRefresh: true },
    });
  }
</script>

<style>
  .process { overflow: hidden; }
  .process-track { display: flex; gap: 6vw; padding: 0 8vw; min-height: 100vh; align-items: center; width: max-content; }
  .step { flex: 0 0 70vw; max-width: 30rem; }
  @media (max-width: 900px) { .process-track { flex-direction: column; width: auto; padding: 8vh 8vw; } .step { flex: none; } }
</style>
```

- [ ] **Step 2: Add to homepage** after PillarScroll.

- [ ] **Step 3: Verify**: desktop pins and scrolls the steps horizontally; mobile stacks them vertically. Stop the server.

- [ ] **Step 4: Commit**

```bash
cd "/Users/iain/Desktop/LA Scenting" && git add website/src/components/ProcessTrack.astro website/src/pages/index.astro && git commit -m "feat: horizontal pinned process track"
```

---

### Task 10: WarpImage — displacement shader on scroll/hover

**Files:**
- Create: `website/src/lib/gl/warp.ts`
- Create: `website/src/components/WarpImage.astro`
- Modify: `website/src/pages/index.astro`

- [ ] **Step 1: Implement the warp program**

Create `website/src/lib/gl/warp.ts`:
```ts
import { Renderer, Triangle, Program, Mesh, Texture } from 'ogl';

const vertex = `attribute vec2 uv; attribute vec2 position; varying vec2 vUv;
void main(){ vUv=uv; gl_Position=vec4(position,0.0,1.0); }`;
const fragment = `precision highp float; varying vec2 vUv;
uniform sampler2D tMap; uniform float uStrength; uniform float uHover;
void main(){
  vec2 uv=vUv;
  float amt=(uStrength*0.04)+(uHover*0.03);
  uv.x += sin(uv.y*10.0+uStrength*6.2831)*amt;
  uv.y += cos(uv.x*8.0)*amt*0.5;
  gl_FragColor=texture2D(tMap,uv);
}`;

export function mountWarp(canvas: HTMLCanvasElement, src: string) {
  const renderer = new Renderer({ canvas, alpha: true, dpr: Math.min(window.devicePixelRatio, 2) });
  const gl = renderer.gl;
  const texture = new Texture(gl);
  const img = new Image(); img.crossOrigin = 'anonymous'; img.src = src;
  img.onload = () => { texture.image = img; };
  const program = new Program(gl, { vertex, fragment, uniforms: {
    tMap: { value: texture }, uStrength: { value: 0 }, uHover: { value: 0 },
  }});
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

  function resize() { renderer.setSize(canvas.clientWidth, canvas.clientHeight); }
  resize(); window.addEventListener('resize', resize);

  let raf = 0, lastY = window.scrollY, vel = 0, hover = 0;
  canvas.addEventListener('pointerenter', () => { hover = 1; });
  canvas.addEventListener('pointerleave', () => { hover = 0; });
  function loop() {
    vel += ((Math.abs(window.scrollY - lastY) * 0.01) - vel) * 0.1; lastY = window.scrollY;
    program.uniforms.uStrength.value = Math.min(vel, 1);
    program.uniforms.uHover.value += (hover - program.uniforms.uHover.value) * 0.1;
    renderer.render({ scene: mesh });
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
}
```

- [ ] **Step 2: Build the component (with non-WebGL fallback)**

Create `website/src/components/WarpImage.astro`:
```astro
---
interface Props { src: string; alt: string; }
const { src, alt } = Astro.props;
---
<figure class="warp" data-warp>
  <canvas data-warp-canvas></canvas>
  <img src={src} alt={alt} data-warp-img class="reveal" />
</figure>

<script>
  import { detectTier } from '../lib/capability';
  const fig = document.currentScript?.previousElementSibling as HTMLElement | null;
</script>
<script>
  import { detectTier } from '../lib/capability';
  document.querySelectorAll<HTMLElement>('[data-warp]').forEach(async (fig) => {
    const canvas = fig.querySelector<HTMLCanvasElement>('[data-warp-canvas]')!;
    const img = fig.querySelector<HTMLImageElement>('[data-warp-img]')!;
    if (detectTier() === 'full') {
      img.style.visibility = 'hidden';
      const { mountWarp } = await import('../lib/gl/warp');
      mountWarp(canvas, img.src);
    } else {
      canvas.remove(); img.classList.add('visible');
    }
  });
</script>

<style>
  .warp { position: relative; aspect-ratio: 4/5; overflow: hidden; }
  .warp canvas, .warp img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .reveal { opacity: 0; transition: opacity .8s ease; }
  .reveal.visible { opacity: 1; }
</style>
```
> Remove the first stray `<script>` block — keep only the second. (Listed here so the engineer doesn't add both.)

- [ ] **Step 3: Use it** in the homepage editorial section for `marble.jpg`, `staircase.jpg`, `vials.jpg`, `oil.jpg` via `<WarpImage src="/images/marble.jpg" alt="…" />`.

- [ ] **Step 4: Verify**: desktop images ripple on scroll and distort on hover; mobile shows clean fade-in reveals. Stop the server.

- [ ] **Step 5: Commit**

```bash
cd "/Users/iain/Desktop/LA Scenting" && git add website/src/lib/gl/warp.ts website/src/components/WarpImage.astro website/src/pages/index.astro && git commit -m "feat: scroll/hover image warp with fallback"
```

---

### Task 11: Seamless page transitions (persistent nav + haze)

**Files:**
- Modify: `website/src/components/Nav.astro` (persist across navigations)
- Modify: `website/src/layouts/Base.astro` (transition naming)

- [ ] **Step 1: Persist the nav**

In `Nav.astro`, add `transition:persist` to the root `<nav>` element so it does not re-animate between pages:
```astro
<nav class="main-nav" transition:persist>
```

- [ ] **Step 2: Name the hero transition**

In `HeroHaze.astro`, add `transition:name="hero"` to the `.hero` section so it morphs smoothly when present on both pages.

- [ ] **Step 3: Verify**

Run `npm run dev`. Navigate Home → Philosophy → Services. Confirm the nav stays put and content cross-fades (no white flash, no full reload). Stop the server.

- [ ] **Step 4: Commit**

```bash
cd "/Users/iain/Desktop/LA Scenting" && git add website/src/components/Nav.astro website/src/components/HeroHaze.astro && git commit -m "feat: seamless astro view transitions"
```

---

### Task 12: Remove legacy files + production build verification

**Files:**
- Delete: `website/index.html`, `about-us.html`, `philosophy.html`, `services.html`, `journal.html`, `app.js`, `style.css`

- [ ] **Step 1: Confirm parity first**

Visit every route under `npm run dev` and confirm each matches or improves on the old page. Only then proceed.

- [ ] **Step 2: Delete the legacy files**

Run:
```bash
cd "/Users/iain/Desktop/LA Scenting/website" && git rm index.html about-us.html philosophy.html services.html journal.html app.js style.css
```

- [ ] **Step 3: Production build**

Run:
```bash
cd "/Users/iain/Desktop/LA Scenting/website" && npm run build && npm run preview
```
Expected: build succeeds; preview serves the site at the printed URL with all effects working.

- [ ] **Step 4: Commit**

```bash
cd "/Users/iain/Desktop/LA Scenting" && git commit -m "chore: remove legacy static files after astro migration"
```

---

### Task 13: Performance, accessibility & deploy cutover

**Files:**
- Modify: `vercel.json` (output dir), `.vercelignore` as needed

- [ ] **Step 1: Point Vercel at the Astro build**

Update `vercel.json` so Vercel builds the Astro app and serves `website/dist`. Set:
```json
{ "buildCommand": "cd website && npm install && npm run build", "outputDirectory": "website/dist" }
```

- [ ] **Step 2: Lighthouse check**

Build, preview, and run Lighthouse (Chrome DevTools or `npx lighthouse <preview-url> --only-categories=performance,accessibility`). Expected: performance ≥ 90, accessibility ≥ 95. If performance is short, lazy-load below-fold WebGL canvases via IntersectionObserver before `mount*`.

- [ ] **Step 3: Reduced-motion + mobile pass**

With OS reduced-motion on, confirm: no Lenis smoothing, no WebGL, static `smoke.jpg` hero, pillars/steps shown statically. On a real mobile viewport, confirm video haze + simple reveals, no jank.

- [ ] **Step 4: Deploy**

Run:
```bash
cd "/Users/iain/Desktop/LA Scenting" && npx vercel --prod
```
Expected: deploy succeeds; live URL shows the new homepage. Verify the four effects on the deployed site.

- [ ] **Step 5: Commit**

```bash
cd "/Users/iain/Desktop/LA Scenting" && git add vercel.json .vercelignore && git commit -m "chore: vercel build config for astro"
```

---

## Self-Review notes

- **Spec coverage:** Haze (Task 7), scroll-storytelling pillars (Task 8) + process (Task 9), image warp (Task 10), page transitions (Task 11), capability tier (Task 2), mobile/reduced fallbacks (Tasks 7–10), Astro migration of other pages (Task 5), performance budget + Lighthouse (Task 13). All spec sections map to tasks.
- **Shared scroll init:** `initScroll()` is idempotent-by-intent but called from multiple components; during execution, hoist a single call into `index.astro` if double-init causes duplicate ScrollTriggers (note for executor).
- **View transition API name:** `ClientRouter` (Astro 5). Fall back to `ViewTransitions` only if the installed Astro version predates the rename.
