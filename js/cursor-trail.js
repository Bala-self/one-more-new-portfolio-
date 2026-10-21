/*
 * SHOOTING-STAR CURSOR — inspired by the "Shooting Star" canvas cursor idea
 * (particles born from pointer movement, each drawing a tapered tail).
 * Written from scratch: no code, geometry or constants were taken from the
 * reference pen, and the ordinary pointer is never replaced or hidden.
 *
 * Guards: fine pointer only, motion allowed only, stops when the tab is
 * hidden, when the pointer leaves the window, and the moment no particles
 * are left alive — an idle page costs zero frames.
 */
import { motionAllowed } from "./motion.js";

const MAX_PARTICLES = 90;
const SPAWN_DISTANCE = 11; // px of travel between particles

export function initCursorTrail() {
  const canvas = document.querySelector(".space-cursor");
  if (!canvas || !canvas.getContext) return;
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let last = 0;
  let particles = [];
  let pointer = { x: -100, y: -100 };
  let ring = { x: -100, y: -100 };
  let hasPointer = false;
  let enabled = false;
  let ringAlpha = 0; // 0 → halo hidden; the page costs nothing while idle

  const allowed = () =>
    enabled && motionAllowed() && !reduce.matches && fine.matches && !document.hidden;

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(x, y, vx, vy) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    const warm = Math.random() < 0.22;
    particles.push({
      x,
      y,
      vx,
      vy,
      tail: 16 + Math.random() * 26,
      life: 1,
      decay: 0.018 + Math.random() * 0.016,
      width: 1 + Math.random() * 1.1,
      warm,
    });
  }

  function draw() {
    raf = 0;
    ctx.clearRect(0, 0, w, h);
    if (!allowed()) {
      particles = [];
      return;
    }

    // A quiet halo that trails the pointer, never a replacement cursor.
    // It fades in while the trail is alive and fades away once everything
    // settles, so an idle page stops scheduling frames entirely.
    ring.x += (pointer.x - ring.x) * 0.16;
    ring.y += (pointer.y - ring.y) * 0.16;
    ringAlpha = particles.length
      ? Math.min(1, ringAlpha + 0.25)
      : Math.max(0, ringAlpha - 0.09);
    if (hasPointer && ringAlpha > 0.02) {
      ctx.strokeStyle = `rgba(14, 138, 118, ${(0.4 * ringAlpha).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, 9, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = "lighter";
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + 0.012; // a little gravity, so tails curve
      p.life -= p.decay;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      const n = Math.hypot(p.vx, p.vy) || 1;
      const tailX = p.x - (p.vx / n) * p.tail;
      const tailY = p.y - (p.vy / n) * p.tail;
      const gradient = ctx.createLinearGradient(p.x, p.y, tailX, tailY);
      const head = p.warm
        ? `rgba(180, 101, 26, ${0.8 * p.life})`
        : `rgba(14, 138, 118, ${0.8 * p.life})`;
      const mid = p.warm
        ? `rgba(180, 101, 26, ${0.3 * p.life})`
        : `rgba(14, 138, 118, ${0.35 * p.life})`;
      gradient.addColorStop(0, head);
      gradient.addColorStop(0.4, mid);
      gradient.addColorStop(1, "rgba(14, 138, 118, 0)");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = p.width * p.life + 0.3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
      ctx.fillStyle = `rgba(11, 18, 32, ${0.45 * p.life})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 0.9 * p.life + 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";

    const settling =
      ringAlpha > 0.02 && Math.hypot(pointer.x - ring.x, pointer.y - ring.y) > 0.3;
    if (particles.length || settling || ringAlpha > 0.02) {
      raf = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, w, h); // nothing left to show: leave an empty canvas
      raf = 0;
    }
  }

  function wake() {
    if (!raf && allowed()) raf = requestAnimationFrame(draw);
  }

  function onMove(event) {
    if (!allowed()) return;
    const x = event.clientX;
    const y = event.clientY;
    hasPointer = true;
    if (last) {
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const travelled = Math.hypot(dx, dy);
      if (travelled >= SPAWN_DISTANCE) {
        const steps = Math.min(4, Math.floor(travelled / SPAWN_DISTANCE));
        for (let i = 0; i < steps; i += 1) {
          const t = (i + 1) / steps;
          spawn(
            pointer.x + dx * t,
            pointer.y + dy * t,
            dx * 0.16 + (Math.random() - 0.5) * 0.5,
            dy * 0.16 + (Math.random() - 0.5) * 0.5,
          );
        }
        wake();
      }
    }
    pointer.x = x;
    pointer.y = y;
    last = performance.now();
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    particles = [];
    ringAlpha = 0;
    ctx.clearRect(0, 0, w, h);
    document.documentElement.classList.remove("space-cursor-ready");
  }

  function evaluate() {
    const on = motionAllowed() && !reduce.matches && fine.matches;
    enabled = on;
    document.documentElement.classList.toggle("space-cursor-ready", on);
    if (!on) stop();
  }

  size();
  evaluate();

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", (event) => {
    if (!allowed()) return;
    for (let i = 0; i < 10; i += 1) {
      const angle = (Math.PI * 2 * i) / 10;
      spawn(
        event.clientX,
        event.clientY,
        Math.cos(angle) * 2.4,
        Math.sin(angle) * 2.4,
      );
    }
    wake();
  });
  document.documentElement.addEventListener("pointerleave", () => {
    hasPointer = false;
    wake(); // let the halo fade out instead of freezing on screen
  });
  window.addEventListener("blur", () => {
    hasPointer = false;
    wake();
  });
  window.addEventListener("resize", () => {
    clearTimeout(window.__cursorResize);
    window.__cursorResize = setTimeout(size, 160);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else wake();
  });
  document.addEventListener("portfolio:motionchange", evaluate);
  reduce.addEventListener("change", evaluate);
  fine.addEventListener("change", evaluate);
}
