/*
 * site.js — home page behaviour (r8).
 *
 * Modules, top to bottom:
 *   opening        the shooting-star sky + Bit the guide (js/opening.js)
 *   particleField  fixed right-half point cloud, projected in 2D from 3D,
 *                  morphing sphere → helix → grid → torus with scroll
 *   header         scrolled state, More ▾ mega-menu, mobile menu, active link
 *   hero           typewriter + fade/scale of the visual over the first 300px,
 *                  pointer parallax (js/hero-parallax.js) and 3D tilt + glare
 *   bitReactions   extra personality for Bit, the guide from js/opening.js
 *   reveal         IntersectionObserver for [data-reveal]
 *   projects       sticky detail panel that follows the card in view
 *   timeline       progress line scaleY scrubbed to scroll
 *   certificates   horizontal scrub when the row is wider than its container
 *   cursor         7-arrow trail (js/cursor.js, from the owner's snippet)
 *   contact + gallery come from the existing modules
 *
 * The same module runs on /work/billpro/ — every init guards on its markup.
 *
 * Everything that animates pauses when the tab is hidden and is skipped when
 * the visitor prefers reduced motion. No dependencies.
 */
import { initContact, initMailModal } from "./contact.js";
import { initGallery } from "./gallery.js";
import { initOpening } from "./opening.js";
import { initHeroParallax } from "./hero-parallax.js";
import { initCursor } from "./cursor.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (t) => t * t * (3 - 2 * t);

/* --------------------------------------------------- particle field */
function initParticleField() {
  const canvas = document.querySelector("[data-field]");
  if (!canvas || reduceMotion) return;
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const mobile = innerWidth < 768;
  const COUNT = mobile ? 1200 : 4000;

  // Four target shapes, generated once.
  const shapes = { sphere: [], helix: [], grid: [], torus: [] };
  const golden = Math.PI * (3 - Math.sqrt(5));
  const side = Math.ceil(Math.cbrt(COUNT));
  for (let i = 0; i < COUNT; i++) {
    const t = i / COUNT;
    // Fibonacci sphere, r 3.2
    const y = 1 - (i / (COUNT - 1)) * 2;
    const rr = Math.sqrt(1 - y * y);
    const th = golden * i;
    shapes.sphere.push([Math.cos(th) * rr * 3.2, y * 3.2, Math.sin(th) * rr * 3.2]);
    // Helix, r 2.5, height 8, 16π turns
    const ha = t * Math.PI * 16;
    shapes.helix.push([Math.cos(ha) * 2.5, (t - 0.5) * 8, Math.sin(ha) * 2.5]);
    // Grid, 6 units wide
    const gx = i % side;
    const gy = Math.floor(i / side) % side;
    const gz = Math.floor(i / (side * side));
    const sp = 6 / side;
    shapes.grid.push([(gx - side / 2) * sp, (gy - side / 2) * sp, (gz - side / 2) * sp]);
    // Torus, R 2.8, r 1.1
    const u = t * Math.PI * 2 * 37;
    const v = th;
    const R = 2.8;
    const r = 1.1;
    shapes.torus.push([(R + r * Math.cos(v)) * Math.cos(u), r * Math.sin(v), (R + r * Math.cos(v)) * Math.sin(u)]);
  }
  const order = [shapes.sphere, shapes.helix, shapes.grid, shapes.torus];
  const phase = new Float32Array(COUNT).map(() => Math.random() * Math.PI * 2);

  let w = 0;
  let h = 0;
  const size = () => {
    const r = canvas.getBoundingClientRect();
    w = canvas.width = Math.max(1, r.width * dpr);
    h = canvas.height = Math.max(1, r.height * dpr);
  };
  size();
  addEventListener("resize", size, { passive: true });

  let progress = 0;
  let target = 0;
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    target = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
  };
  onScroll();
  addEventListener("scroll", onScroll, { passive: true });

  const fov = 55;
  const camZ = 8;
  const focal = 1 / Math.tan((fov * Math.PI) / 360);
  const color = "43, 29, 23";

  let raf = 0;
  let running = true;
  const draw = (now) => {
    if (!running) return;
    const t = now / 1000;
    progress = lerp(progress, target, 0.08);

    // Which pair of shapes are we between?
    const seg = progress * (order.length - 1);
    const i0 = Math.min(order.length - 2, Math.floor(seg));
    const mix = smoothstep(seg - i0);
    const A = order[i0];
    const B = order[i0 + 1];

    const rotY = t * 0.04;
    const rotX = progress * (Math.PI / 4);
    const cy = Math.cos(rotY);
    const sy = Math.sin(rotY);
    const cx = Math.cos(rotX);
    const sx = Math.sin(rotX);

    ctx.clearRect(0, 0, w, h);
    const half = Math.min(w, h) / 2;
    const ox = w / 2;
    const oy = h / 2;
    const base = 0.022 * half * 0.5;

    for (let i = 0; i < COUNT; i++) {
      const a = A[i];
      const b = B[i];
      const jit = Math.sin(t * 1.2 + phase[i]) * 0.03;
      let x = lerp(a[0], b[0], mix) + jit;
      let y = lerp(a[1], b[1], mix) + jit;
      let z = lerp(a[2], b[2], mix);
      // rotate Y
      let x1 = x * cy + z * sy;
      let z1 = -x * sy + z * cy;
      // rotate X
      let y1 = y * cx - z1 * sx;
      let z2 = y * sx + z1 * cx;
      const depth = camZ - z2;
      if (depth <= 0.5) continue;
      const s = focal / depth;
      const px = ox + x1 * s * half;
      const py = oy - y1 * s * half;
      const alpha = clamp(0.72 * (1.3 - depth / (camZ + 4)), 0.12, 0.72);
      const rad = Math.max(0.6, base * s);
      ctx.fillStyle = `rgba(${color}, ${alpha})`;
      ctx.fillRect(px - rad / 2, py - rad / 2, rad, rad);
    }
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(raf);
    } else if (!running) {
      running = true;
      raf = requestAnimationFrame(draw);
    }
  });
}

/* ----------------------------------------------------------- header */
function initHeader() {
  const header = document.querySelector("[data-header]");
  if (!header) return;
  const onScroll = () => header.classList.toggle("is-scrolled", scrollY > 20);
  onScroll();
  addEventListener("scroll", onScroll, { passive: true });

  // More ▾ mega-menu
  const moreBtn = header.querySelector("[data-more]");
  const panel = header.querySelector("[data-more-panel]");
  const setMore = (open) => {
    moreBtn.setAttribute("aria-expanded", String(open));
    panel.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", String(!open));
  };
  if (moreBtn && panel) {
    panel.hidden = false;
    panel.setAttribute("aria-hidden", "true");
    moreBtn.addEventListener("click", () => setMore(moreBtn.getAttribute("aria-expanded") !== "true"));
    document.addEventListener("click", (e) => {
      if (!header.contains(e.target)) setMore(false);
    });
    panel.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMore(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && moreBtn.getAttribute("aria-expanded") === "true") {
        setMore(false);
        moreBtn.focus();
      }
    });
  }

  // Mobile fullscreen menu
  const menu = document.querySelector("[data-mobile-menu]");
  const openBtn = document.querySelector("[data-menu-open]");
  const closeBtn = document.querySelector("[data-menu-close]");
  if (menu && openBtn) {
    menu.querySelectorAll("nav a").forEach((a, i) => a.style.setProperty("--i", i));
    const setMenu = (open) => {
      menu.classList.toggle("is-open", open);
      menu.setAttribute("aria-hidden", String(!open));
      openBtn.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("menu-open", open);
      if (open) closeBtn?.focus();
      else openBtn.focus();
    };
    openBtn.addEventListener("click", () => setMenu(true));
    closeBtn?.addEventListener("click", () => setMenu(false));
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("is-open")) setMenu(false);
    });
  }

  // Active link highlighting
  const links = [...header.querySelectorAll('.pill-nav > a[href^="#"]')];
  const targets = links.map((a) => document.querySelector(a.hash)).filter(Boolean);
  if ("IntersectionObserver" in window && targets.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          links.forEach((a) => a.classList.toggle("is-active", a.hash === "#" + en.target.id));
        });
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    targets.forEach((t) => io.observe(t));
  }
}

/* ------------------------------------------------------------- hero */
function initHero() {
  const typed = document.querySelector("[data-typed]");
  const words = ["Full Stack Developer", "MERN Developer", "Backend Builder", "Problem Solver"];
  if (typed) {
    if (reduceMotion) {
      typed.textContent = words[0];
    } else {
      let wi = 0;
      let ci = 0;
      let deleting = false;
      const tick = () => {
        const word = words[wi];
        ci += deleting ? -1 : 1;
        typed.textContent = word.slice(0, ci);
        let delay = deleting ? 40 : 80;
        if (!deleting && ci === word.length) {
          delay = 1500;
          deleting = true;
        } else if (deleting && ci === 0) {
          deleting = false;
          wi = (wi + 1) % words.length;
          delay = 300;
        }
        setTimeout(tick, delay);
      };
      setTimeout(tick, 900);
    }
  }

  const visual = document.querySelector("[data-hero-visual]");
  if (!visual || reduceMotion) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const p = clamp(scrollY / 300, 0, 1);
    visual.style.opacity = String(1 - p);
    visual.style.transform = `scale(${lerp(1, 0.85, p)})`;
  };
  addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
}

/* ----------------------------------------------------------- reveal */
function initReveal() {
  const items = document.querySelectorAll("[data-reveal]");
  if (!items.length) return;
  if (reduceMotion || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-revealed"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("is-revealed");
          io.unobserve(en.target);
        }
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
  );
  items.forEach((el) => io.observe(el));
}

/* --------------------------------------------------------- projects */
function initProjects() {
  const wrap = document.querySelector("[data-projects]");
  const sticky = document.querySelector("[data-project-sticky]");
  if (!wrap || !sticky) return;
  const blocks = [...wrap.querySelectorAll("[data-project]")];
  const details = blocks.map((b) => b.querySelector(".project-detail"));
  let current = -1;

  const show = (i) => {
    if (i === current || !details[i]) return;
    current = i;
    const clone = details[i].cloneNode(true);
    clone.classList.remove("project-detail-inline");
    clone.removeAttribute("data-reveal");
    clone.style.setProperty("--accent", getComputedStyle(blocks[i]).getPropertyValue("--accent"));
    sticky.replaceChildren(clone);
  };
  show(0);

  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) show(Number(en.target.dataset.project));
      });
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
  );
  blocks.forEach((b) => io.observe(b));
}

/* ---------------------------------------------------------- timeline */
function initTimeline() {
  const tl = document.querySelector("[data-timeline]");
  const bar = document.querySelector("[data-timeline-progress]");
  if (!tl || !bar || reduceMotion) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const r = tl.getBoundingClientRect();
    const start = innerHeight * 0.8;
    const end = innerHeight * 0.2;
    const p = clamp((start - r.top) / (r.height + start - end), 0, 1);
    bar.style.transform = `scaleY(${p})`;
  };
  addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  addEventListener("resize", update, { passive: true });
  update();
}

/* ------------------------------------------------------ certificates */
function initCertificates() {
  const section = document.querySelector("[data-cert-section]");
  const flex = document.querySelector("[data-cert-flex]");
  if (!section || !flex || reduceMotion) return;

  // Only scrub horizontally when the row overflows its container. With two
  // certificates this stays static on anything wider than ~700px — the
  // row simply fits — and becomes a column on small screens.
  let overflow = 0;
  const measure = () => {
    const container = section.querySelector(".cert-container");
    overflow = Math.max(0, flex.scrollWidth - container.clientWidth);
    if (!overflow) flex.style.transform = "";
    section.style.height = overflow ? `${innerHeight + overflow}px` : "";
    section.classList.toggle("is-pinned", overflow > 0);
  };
  const update = () => {
    if (!overflow) return;
    const r = section.getBoundingClientRect();
    const p = clamp(-r.top / (r.height - innerHeight), 0, 1);
    flex.style.transform = `translateX(${-overflow * p}px)`;
  };
  measure();
  update();
  addEventListener("resize", () => {
    measure();
    update();
  }, { passive: true });
  addEventListener("scroll", update, { passive: true });
}

/* ------------------------------------------------------- hero tilt */
function initHeroTilt() {
  const visual = document.querySelector("[data-hero-visual]");
  const card = document.querySelector("[data-tilt]");
  const glare = card?.querySelector(".hero-glare");
  if (!visual || !card || reduceMotion) return;
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const MAX = 10;
  const move = (e) => {
    const r = card.getBoundingClientRect();
    const px = clamp((e.clientX - r.left) / r.width, 0, 1);
    const py = clamp((e.clientY - r.top) / r.height, 0, 1);
    card.style.setProperty("--ry", `${(px - 0.5) * MAX * 2}deg`);
    card.style.setProperty("--rx", `${(0.5 - py) * MAX * 2}deg`);
    glare?.style.setProperty("--gx", `${px * 100}%`);
    glare?.style.setProperty("--gy", `${py * 100}%`);
  };
  visual.addEventListener("pointerenter", () => visual.classList.add("is-tilting"));
  visual.addEventListener("pointermove", move);
  visual.addEventListener("pointerleave", () => {
    visual.classList.remove("is-tilting");
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
  });
}

/* ---------------------------------------------------- Bit reactions */
/* Extra personality for the guide from js/opening.js: section greetings,
   emotes on hover/copy/download, a sleepy state after inactivity and a
   small jump when you reach the end. Everything is DOM-only — it reads
   the pet that opening.js mounts and never touches its chat logic. */
function initBitReactions() {
  const root = document.querySelector(".opening-experience");
  const pet = root?.querySelector(".pet");
  if (!root || !pet) return;

  let say = null;
  let sayTimer = 0;
  let lastLine = "";
  const speak = (text, ms = 3200) => {
    if (pet.hidden || root.dataset.phase !== "done") return;
    if (root.querySelector(".pet-chat:not([hidden])")) return;
    if (text === lastLine && say?.classList.contains("is-on")) return;
    lastLine = text;
    if (!say) {
      say = document.createElement("div");
      say.className = "pet-say";
      say.setAttribute("aria-hidden", "true");
      root.append(say);
    }
    say.textContent = text;
    requestAnimationFrame(() => say.classList.add("is-on"));
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => say.classList.remove("is-on"), ms);
  };
  const emote = (glyph) => {
    if (pet.hidden || reduceMotion) return;
    const el = document.createElement("span");
    el.className = "pet-emote";
    el.textContent = glyph;
    el.setAttribute("aria-hidden", "true");
    root.append(el);
    setTimeout(() => el.remove(), 1200);
  };
  const mood = (m, ms = 1400) => {
    pet.dataset.mood = m;
    setTimeout(() => {
      if (pet.dataset.mood === m) pet.dataset.mood = "idle";
    }, ms);
  };
  const jump = () => {
    if (reduceMotion) return;
    const el = pet.querySelector(".pet-jump");
    if (!el || !el.animate) return;
    el.animate(
      [{ transform: "translateY(0)" }, { transform: "translateY(-26px)", offset: 0.45 }, { transform: "translateY(0)" }],
      { duration: 520, easing: "cubic-bezier(.34,1.56,.64,1)" },
    );
  };
  const wiggle = () => {
    if (reduceMotion) return;
    const el = pet.querySelector(".pet-tilt");
    if (!el || !el.animate) return;
    el.animate(
      [{ rotate: "0deg" }, { rotate: "-8deg" }, { rotate: "8deg" }, { rotate: "-5deg" }, { rotate: "0deg" }],
      { duration: 600, easing: "ease-in-out" },
    );
  };

  // 1. Section greetings (once each)
  const lines = {
    about: ["That's him. Checked shirt and all.", "👋"],
    projects: ["BillPro is the big one — scroll slowly.", "✨"],
    skills: ["MERN by day. TypeScript on the desk.", "⚡"],
    journey: ["Robotics degree, then the web.", "🎓"],
    certifications: ["Both real. Tap to see the originals.", "🏅"],
    repos: ["Open source, open to review.", "💻"],
    contact: ["Say hi — he answers fast.", "💌"],
  };
  const seen = new Set();
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          const id = en.target.id;
          if (!en.isIntersecting || seen.has(id)) return;
          seen.add(id);
          const [text, glyph] = lines[id];
          speak(text);
          emote(glyph);
          mood("happy");
          if (id === "contact") jump();
        });
      },
      { rootMargin: "-30% 0px -50% 0px" },
    );
    Object.keys(lines).forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  // 2. Hover reactions on key links
  document.querySelectorAll(".socials a, .hire, .btn-solid, .send-button, .repo-card").forEach((el) => {
    el.addEventListener("pointerenter", () => mood("happy", 900), { passive: true });
  });
  document.querySelectorAll(".project-card").forEach((el) => {
    el.addEventListener("pointerenter", () => mood("surprised", 900), { passive: true });
  });

  // Each skill has a short, plain-language explanation. Mouse users hear it
  // on hover; keyboard and touch users get the same feedback on focus/tap.
  document.querySelectorAll(".skill-chip[data-skill-message]").forEach((chip) => {
    const message = chip.dataset.skillMessage;
    if (!message) return;
    const react = () => {
      speak(message);
      mood("happy", 1000);
    };
    chip.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") react();
    }, { passive: true });
    chip.addEventListener("focus", react);
    chip.addEventListener("pointerup", (event) => {
      if (event.pointerType !== "mouse") react();
    }, { passive: true });
  });

  // 3. Downloads, copies, form, lightbox
  document.querySelectorAll("a[download]").forEach((a) =>
    a.addEventListener("click", () => {
      emote("📄");
      speak("Nice — the CV is on its way.");
      jump();
    }),
  );
  document.querySelectorAll("[data-copy-email], [data-copy-message]").forEach((el) =>
    el.addEventListener("click", () => {
      emote("📋");
      mood("happy");
    }),
  );
  document.querySelector("#contact-form")?.addEventListener("submit", () => {
    emote("🚀");
    speak("Opening your mail app. Thank you!");
    jump();
  });
  document.querySelectorAll("[data-lightbox]").forEach((el) =>
    el.addEventListener("click", () => mood("surprised", 1600)),
  );
  document.querySelectorAll("[data-menu-open], [data-more]").forEach((el) =>
    el.addEventListener("click", () => wiggle()),
  );

  // 4. Scroll speed + top/bottom of page
  let lastY = scrollY;
  let lastT = performance.now();
  let bottomSaid = false;
  addEventListener(
    "scroll",
    () => {
      const now = performance.now();
      const v = Math.abs(scrollY - lastY) / Math.max(1, now - lastT);
      if (v > 3.5) mood("surprised", 700);
      lastY = scrollY;
      lastT = now;
      const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 40;
      if (atBottom && !bottomSaid) {
        bottomSaid = true;
        speak("That's everything. Click me if you have questions.");
        jump();
      }
      if (scrollY < 40) bottomSaid = false;
      wake();
    },
    { passive: true },
  );

  // 5. Sleepy after 45 s without input, wakes on any activity
  let zzz = null;
  let sleepTimer = 0;
  const sleep = () => {
    if (pet.hidden || root.dataset.phase !== "done") return;
    pet.classList.add("is-asleep");
    if (!zzz) {
      zzz = document.createElement("span");
      zzz.className = "pet-zzz";
      zzz.textContent = "z z z";
      zzz.setAttribute("aria-hidden", "true");
      root.append(zzz);
    }
  };
  const wake = () => {
    clearTimeout(sleepTimer);
    if (pet.classList.contains("is-asleep")) {
      pet.classList.remove("is-asleep");
      zzz?.remove();
      zzz = null;
      mood("surprised", 900);
      wiggle();
    }
    sleepTimer = setTimeout(sleep, 45000);
  };
  ["pointermove", "keydown", "pointerdown", "touchstart"].forEach((ev) =>
    document.addEventListener(ev, wake, { passive: true }),
  );
  wake();

  // 6. Random idle wiggles so it never feels frozen
  const idle = () => {
    if (!document.hidden && !pet.classList.contains("is-asleep") && pet.dataset.mood === "idle") {
      if (Math.random() < 0.5) wiggle();
      else emote(["💭", "✨", "🙂", "☕"][Math.floor(Math.random() * 4)]);
    }
    setTimeout(idle, 14000 + Math.random() * 12000);
  };
  setTimeout(idle, 18000);

  // 7. Double-click the pet for a trick
  pet.addEventListener("dblclick", () => {
    jump();
    emote("🎉");
    speak("Ta-da!");
  });
}

/* --------------------------------------------------------------- go */
initOpening();
initBitReactions();
initParticleField();
initHeader();
initHero();
initHeroParallax();
initHeroTilt();
initReveal();
initProjects();
initTimeline();
initCertificates();
initMailModal();
initContact();
initGallery();
initCursor();
