/**
 * hero-parallax.js — pointer parallax + gentle float for the hero visual.
 *
 * Each `[data-depth]` layer inside `.hero-visual` drifts against the pointer
 * by its depth (px at the viewport edge) and, if it has `data-float`, bobs
 * on a sine wave. Values are eased towards the target every frame so the
 * motion feels weighty rather than twitchy.
 *
 * Guards: only on fine-pointer devices ≥ 900px wide, only while the hero is
 * on screen and the tab visible, never under reduced motion; the loop is
 * cancelled (and transforms cleared) the moment any of those stop holding.
 * While active it sets `html.hero-parallax` so CSS can hand its float
 * keyframes over to this module instead of running both.
 */
import { motionAllowed } from "./motion.js";

const EASE = 0.06;

export function initHeroParallax() {
  const visual = document.querySelector(".hero-visual");
  const hero = visual?.closest(".hero");
  if (!visual || !hero) return;

  const layers = [...visual.querySelectorAll("[data-depth]")].map((node) => ({
    node,
    depth: Number(node.dataset.depth) || 0,
    floatY: Number(node.dataset.float) || 0,
    speed: Number(node.dataset.floatSpeed) || 0.8,
    phase: Number(node.dataset.floatPhase) || 0,
  }));
  if (!layers.length) return;

  const root = document.documentElement;
  const fine = matchMedia("(hover: hover) and (pointer: fine) and (min-width: 900px)");
  const target = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };
  let raf = 0;
  let onScreen = false;
  let listening = false;
  const start = performance.now();

  const onMove = (event) => {
    target.x = (event.clientX / window.innerWidth - 0.5) * 2;
    target.y = (event.clientY / window.innerHeight - 0.5) * 2;
  };
  const onLeave = () => {
    target.x = 0;
    target.y = 0;
  };

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    current.x += (target.x - current.x) * EASE;
    current.y += (target.y - current.y) * EASE;
    const t = (now - start) / 1000;
    for (const layer of layers) {
      const fy = layer.floatY ? Math.sin(t * layer.speed + layer.phase) * layer.floatY : 0;
      const x = -current.x * layer.depth;
      const y = -current.y * layer.depth * 0.7 + fy;
      layer.node.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
    }
  };

  const run = () => {
    if (raf) return;
    root.classList.add("hero-parallax");
    raf = requestAnimationFrame(frame);
  };

  const halt = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    root.classList.remove("hero-parallax");
    layers.forEach((layer) => (layer.node.style.translate = ""));
    current.x = current.y = target.x = target.y = 0;
  };

  const listen = (on) => {
    if (on === listening) return;
    listening = on;
    if (on) {
      window.addEventListener("pointermove", onMove, { passive: true });
      root.addEventListener("mouseleave", onLeave);
    } else {
      window.removeEventListener("pointermove", onMove);
      root.removeEventListener("mouseleave", onLeave);
    }
  };

  const sync = () => {
    const active = onScreen && fine.matches && motionAllowed() && !document.hidden;
    listen(active);
    if (active) run();
    else halt();
  };

  new IntersectionObserver(
    (entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting);
      sync();
    },
    { rootMargin: "10% 0px" },
  ).observe(hero);

  fine.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);
  document.addEventListener("portfolio:motionchange", sync);
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", sync);
}
