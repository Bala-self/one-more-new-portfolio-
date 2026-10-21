/*
 * parallax.js — the small amount of scroll-linked depth the page uses:
 *   - [data-speed] images drift slightly against the scroll (max ±28px),
 *   - the hero copy fades as it leaves the viewport.
 *
 * One rAF per scroll frame, geometry cached per resize, nothing runs for
 * reduced motion / motion-off / coarse pointers without hover. Replaces the
 * GSAP + ScrollTrigger CDN loader; everything it did is covered here.
 */
import { motionAllowed } from "./motion.js";

const MAX_SHIFT = 28;

export function initParallax() {
  const items = [...document.querySelectorAll("[data-speed]")];
  const hero = document.querySelector(".hero");
  const heroGrid = hero?.querySelector(".hero-grid");
  if (!items.length && !hero) return;

  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  let geometry = [];
  let ticking = false;
  let active = false;

  function measure() {
    const scrollY = window.scrollY;
    geometry = items.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        element,
        speed: Number(element.dataset.speed) || 0,
        center: rect.top + scrollY + rect.height / 2,
      };
    });
  }

  function clear() {
    items.forEach((element) => element.style.removeProperty("--parallax"));
    document.documentElement.style.removeProperty("--hero-fade");
  }

  function paint() {
    ticking = false;
    if (!active) return;
    const viewportCenter = window.scrollY + window.innerHeight / 2;
    for (const item of geometry) {
      const offset = (viewportCenter - item.center) * item.speed;
      const clamped = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, offset));
      item.element.style.setProperty("--parallax", `${clamped.toFixed(1)}px`);
    }
    if (hero && heroGrid) {
      const fadeStart = window.innerHeight * 0.25;
      const fadeEnd = window.innerHeight * 0.9;
      const t = Math.min(1, Math.max(0, (window.scrollY - fadeStart) / (fadeEnd - fadeStart)));
      document.documentElement.style.setProperty("--hero-fade", (1 - t * 0.6).toFixed(3));
    }
  }

  function request() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(paint);
  }

  function sync() {
    const next = motionAllowed() && fine.matches && !document.hidden;
    if (next === active) return;
    active = next;
    if (active) {
      measure();
      request();
    } else {
      clear();
    }
  }

  window.addEventListener("scroll", request, { passive: true });
  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      measure();
      request();
    }, 120);
  });
  document.addEventListener("visibilitychange", sync);
  document.addEventListener("portfolio:motionchange", sync);
  document.addEventListener("portfolio:openingdone", () => {
    measure();
    request();
  });
  fine.addEventListener("change", sync);
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", sync);
  // Images that load late change the geometry.
  items.forEach((element) => {
    if (element.tagName === "IMG" && !element.complete) {
      element.addEventListener("load", measure, { once: true });
    }
  });

  sync();
}
