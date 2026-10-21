/*
 * cursor.js — the arrow-trail cursor.
 *
 * A port of the owner's canvas snippet (a chain of arrowheads where the first
 * follows the pointer and every other one follows the one before it, each
 * drawn smaller and rotated towards its target). Changes for this site:
 *   - 7 arrows instead of 15, dat.GUI control bar removed
 *   - gold with a fading alpha so it reads on the cream background and
 *     multiplies over photos instead of covering them
 *   - no idle orbit: the trail only appears after the first pointer move
 *     and parks off-screen when the pointer leaves the window
 *   - fine-pointer devices only, off under reduced motion, paused while the
 *     tab is hidden; the real cursor is never hidden or replaced
 */

const TOTAL = 7;
const FOLLOW = 0.18;
const SIZE = 18;
const COLOR = "185, 137, 74"; // --gold

export function initCursor() {
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  if (!fine.matches || reduce.matches) return;

  const canvas = document.createElement("canvas");
  canvas.className = "cursor-trail";
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = Math.min(devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;
  const resize = () => {
    width = innerWidth;
    height = innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener("resize", resize, { passive: true });

  let mouseX = -100;
  let mouseY = -100;
  let seen = false;
  let raf = 0;

  const particles = Array.from({ length: TOTAL }, (_, i) => ({ id: i + 1, x: -100, y: -100 }));

  const drawArrow = (p, angle, scale) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.moveTo((-SIZE / 2) * 1.732, -SIZE / 2);
    ctx.lineTo(0, 0);
    ctx.lineTo((-SIZE / 2) * 1.732, SIZE / 2);
    ctx.lineTo((-SIZE / 2) * 1.2, 0);
    ctx.closePath();
    ctx.fillStyle = `rgba(${COLOR}, ${0.9 * scale})`;
    ctx.fill();
    ctx.restore();
  };

  const frame = () => {
    ctx.clearRect(0, 0, width, height);
    let moving = false;
    for (let i = 0; i < TOTAL; i++) {
      const p = particles[i];
      const aim = i === 0 ? { x: mouseX, y: mouseY } : particles[i - 1];
      const dx = aim.x - p.x;
      const dy = aim.y - p.y;
      p.x += dx * FOLLOW;
      p.y += dy * FOLLOW;
      if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) moving = true;
      const angle = Math.atan2(dy, dx);
      const scale = Math.cos((Math.PI / 2) * (p.id / (TOTAL + 1)));
      // The lead arrow sits just behind the real pointer so it never hides it.
      if (i === 0 && Math.hypot(dx, dy) < 2) continue;
      drawArrow(p, angle, scale);
    }
    // Stop drawing once the chain has settled — an idle page costs no frames.
    raf = moving ? requestAnimationFrame(frame) : 0;
  };
  const run = () => {
    if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
  };

  addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!seen) {
        seen = true;
        particles.forEach((p) => {
          p.x = mouseX;
          p.y = mouseY;
        });
        canvas.classList.add("is-ready");
      }
      run();
    },
    { passive: true },
  );
  document.documentElement.addEventListener("mouseleave", () => {
    mouseX = -100;
    mouseY = -100;
    run();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else {
      run();
    }
  });
  fine.addEventListener("change", () => {
    if (!fine.matches) {
      cancelAnimationFrame(raf);
      raf = 0;
      canvas.remove();
    }
  });
}
