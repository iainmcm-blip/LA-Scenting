/* ═══════════════════════════════════════════════════════════
   LA SCENTING — Motion & Interaction Layer
   Scroll reveals · parallax · nav condense · progress · hero entrance
   All rAF-driven; fully disabled under prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var listenersAttached = false;
  var bar = null;
  var ticking = false;
  var vh = window.innerHeight;
  var nav, heroBg, heroContent, pageHero, pageHeroBg, mediaBoxes;

  var mm = window.matchMedia;
  var reduce = mm && mm("(prefers-reduced-motion: reduce)").matches;
  // Skip heavy parallax on touch / small screens: better perf and avoids
  // iOS dynamic-toolbar viewport jitter. Reveals + progress + nav still run.
  var noParallax = reduce ||
    (mm && (mm("(max-width: 768px)").matches || mm("(pointer: coarse)").matches));

  /* ── 4. Frame update ───────────────────────────────────── */
  function update() {
    ticking = false;
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    var docH = document.documentElement.scrollHeight - vh;

    if (bar) bar.style.transform = "scaleX(" + (docH > 0 ? Math.min(y / docH, 1) : 0) + ")";
    if (nav) nav.classList.toggle("scrolled", y > 40);

    if (noParallax) return;

    if (heroBg && y < vh * 1.1) {
      var p = y / vh;
      heroBg.style.transform =
        "translate3d(0," + (y * 0.4) + "px,0) scale(" + (1.04 + p * 0.1) + ")";
      if (heroContent) {
        heroContent.style.transform = "translate3d(0," + (y * 0.22) + "px,0)";
        heroContent.style.opacity = String(Math.max(1 - p * 1.3, 0));
      }
    }

    if (pageHero && pageHeroBg) {
      var pr = pageHero.getBoundingClientRect();
      if (pr.bottom > 0 && pr.top < vh) {
        pageHeroBg.style.transform =
          "translate3d(0," + (-pr.top * 0.12) + "px,0) scale(1.18)";
      }
    }

    if (mediaBoxes) {
      for (var i = 0; i < mediaBoxes.length; i++) {
        var box = mediaBoxes[i];
        var img = box.querySelector("img");
        if (!img) continue;
        var r = box.getBoundingClientRect();
        if (r.bottom < -40 || r.top > vh + 40) continue;
        var center = r.top + r.height / 2;
        var ratio = (center - vh / 2) / (vh / 2 + r.height / 2);
        if (ratio > 1) ratio = 1; else if (ratio < -1) ratio = -1;
        img.style.transform =
          "translate3d(0," + (ratio * r.height * 0.05) + "px,0) scale(1.12)";
      }
    }
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  function init() {
    /* ── 1. Scroll reveals ─────────────────────────────────── */
    var reveals = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            obs.unobserve(e.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
      reveals.forEach(function (el) { obs.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add("visible"); });
    }

    /* ── 2. Scroll progress bar ────────────────────────────── */
    bar = document.querySelector(".scroll-progress");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "scroll-progress";
      document.body.appendChild(bar);
    }

    /* ── 3. Collect parallax targets ───────────────────────── */
    nav = document.querySelector(".main-nav");
    heroBg = document.querySelector(".hero .hero-bg");
    heroContent = document.querySelector(".hero .hero-content");
    pageHero = document.querySelector(".page-hero");
    pageHeroBg = document.querySelector(".page-hero-bg");
    mediaBoxes = [];

    if (!noParallax) {
      document.querySelectorAll(".cs-img").forEach(function (b) {
        b.classList.add("parallax-box");
        mediaBoxes.push(b);
      });
    }

    /* ── Global window listeners — attach only once ─────────── */
    if (!listenersAttached) {
      vh = window.innerHeight;
      window.addEventListener("resize", function () { vh = window.innerHeight; });
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("load", update);
      listenersAttached = true;
    }

    update();

    /* ── 5. Mobile nav: scroll-lock + a11y ─────────────────── */
    var ham = document.querySelector(".nav-hamburger");
    var overlay = document.getElementById("mobileNav");
    if (ham && overlay) {
      ham.setAttribute("aria-expanded", "false");
      ham.setAttribute("aria-controls", "mobileNav");
      var lock = function () {
        document.body.style.overflow = "hidden";
        ham.setAttribute("aria-expanded", "true");
      };
      var unlock = function () {
        document.body.style.overflow = "";
        ham.setAttribute("aria-expanded", "false");
      };
      ham.addEventListener("click", lock);
      overlay.addEventListener("click", function (e) {
        if (e.target.closest("a, .mobile-nav-close")) unlock();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && overlay.classList.contains("open")) {
          overlay.classList.remove("open");
          unlock();
        }
      });
    }

    /* ── 6. Hero entrance ──────────────────────────────────── */
    document.documentElement.classList.add("is-loaded");
  }

  /* ── Bootstrap: initial load + Astro view transitions ─── */
  if (document.readyState !== "loading") { init(); } else { document.addEventListener("DOMContentLoaded", init); }
  document.addEventListener("astro:page-load", init);
})();
