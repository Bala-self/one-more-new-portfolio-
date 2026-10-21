/*
 * SKY — the starfield behind the whole page.
 *
 * Honest by construction:
 *   - reduced motion or motion off  → stars are drawn once and never animate
 *   - tab hidden                    → no frames at all
 *   - no canvas support             → nothing runs, the CSS aurora remains
 * One rAF loop, one canvas, device pixel ratio capped at 2.
 */
import { motionAllowed } from "./motion.js";

export function initSky() {
  const canvas = document.querySelector(".sky-stars");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let stars = [];
  let meteors = [];
  let raf = 0;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let nextMeteor = 0;
  let resizeTimer = 0;

  const alive = () => motionAllowed() && !reduce.matches;

  function build() {
    const count = Math.round(Math.min(240, Math.max(70, (w * h) / 9500)));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.05 + 0.25,
      a: Math.random() * 0.5 + 0.28,
      s: Math.random() * 0.9 + 0.3,
      p: Math.random() * Math.PI * 2,
      warm: Math.random() < 0.08,
    }));
  }

  function size() {
    const previousWidth = w;
    const previousHeight = h;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Mobile browsers resize the viewport by ~60-120px when the URL bar
    // hides. Rebuilding the field for that made the sky flicker; stars are
    // only re-seeded when the width changes or the height jumps a lot.
    const heightJump = Math.abs(h - previousHeight);
    if (!stars.length || w !== previousWidth || heightJump > 160) build();
  }

  function spawnMeteor() {
    meteors.push({
      x: Math.random() * w * 0.9,
      y: -30 - Math.random() * h * 0.2,
      vx: 3.2 + Math.random() * 2.4,
      vy: 2.1 + Math.random() * 1.5,
      len: 90 + Math.random() * 90,
      life: 1,
    });
  }

  function drawMeteors() {
    for (let i = meteors.length - 1; i >= 0; i -= 1) {
      const m = meteors[i];
      m.x += m.vx;
      m.y += m.vy;
      m.life -= 0.012;
      if (m.life <= 0 || m.y > h + 60) {
        meteors.splice(i, 1);
        continue;
      }
      const nx = m.vx;
      const ny = m.vy;
      const n = Math.hypot(nx, ny) || 1;
      const tailX = m.x - (nx / n) * m.len;
      const tailY = m.y - (ny / n) * m.len;
      const gradient = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      gradient.addColorStop(0, `rgba(180, 101, 26, ${0.7 * m.life})`);
      gradient.addColorStop(0.35, `rgba(14, 138, 118, ${0.35 * m.life})`);
      gradient.addColorStop(1, "rgba(14, 138, 118, 0)");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
      ctx.fillStyle = `rgba(180, 101, 26, ${0.8 * m.life})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame(time) {
    raf = 0;
    ctx.clearRect(0, 0, w, h);
    const drift = (window.scrollY * 0.03) % h;
    for (const star of stars) {
      const twinkle = Math.sin((time / 1000) * star.s + star.p) * 0.26;
      const alpha = Math.max(0.04, star.a + twinkle);
      let y = star.y - drift;
      if (y < -2) y += h;
      ctx.fillStyle = star.warm
        ? `rgba(180, 101, 26, ${alpha * 0.6})`
        : `rgba(31, 52, 110, ${alpha * 0.55})`;
      ctx.beginPath();
      ctx.arc(star.x, y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (time > nextMeteor) {
      if (meteors.length < 3) spawnMeteor();
      nextMeteor = time + 4200 + Math.random() * 7000;
    }
    drawMeteors();
    if (alive() && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function paint() {
    // Static frame: no drift, no twinkle, no meteors.
    ctx.clearRect(0, 0, w, h);
    for (const star of stars) {
      ctx.fillStyle = star.warm
        ? `rgba(180, 101, 26, ${(star.a + 0.1) * 0.6})`
        : `rgba(31, 52, 110, ${(star.a + 0.1) * 0.55})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function start() {
    stop();
    if (alive() && !document.hidden) raf = requestAnimationFrame(frame);
    else paint();
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function reset() {
    meteors = [];
    nextMeteor = 0;
    start();
  }

  size();
  start();

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      size();
      if (!alive()) paint();
    }, 160);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });
  document.addEventListener("portfolio:motionchange", reset);
  reduce.addEventListener("change", reset);
  document.addEventListener("portfolio:openingdone", reset);

  window.__spaceSky = { stop, start };
}
