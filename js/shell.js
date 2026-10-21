/*
 * shell.js — page chrome that is shared by every section:
 *   - sticky header state (adds a background once the page is scrolled)
 *   - current-section highlighting for header nav, menu panel and rail
 *   - the tablet/mobile menu panel (focus trap, Escape, outside click)
 *   - scroll progress bar (CSS custom property, one rAF per scroll)
 *   - the Chennai clock in the hero
 */

export function initShell() {
  initHeader();
  initMenu();
  initProgressAndSections();
  initClock();
}

/* ---- Header ------------------------------------------------------------ */

function initHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
  update();
}

/* ---- Menu panel --------------------------------------------------------- */

function initMenu() {
  const button = document.querySelector(".menu-button");
  const panel = document.getElementById("menu-panel");
  if (!button || !panel) return;
  const closeButton = panel.querySelector(".menu-close");
  const focusables = () =>
    [...panel.querySelectorAll("a[href], button:not([disabled])")].filter(
      (el) => el.getClientRects().length,
    );
  let open = false;

  function setOpen(next, { restoreFocus = true } = {}) {
    if (next === open) return;
    open = next;
    panel.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", String(!open));
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", open);
    if (open) {
      (closeButton || focusables()[0])?.focus({ preventScroll: true });
    } else if (restoreFocus) {
      button.focus({ preventScroll: true });
    }
  }

  button.addEventListener("click", () => setOpen(!open));
  closeButton?.addEventListener("click", () => setOpen(false));

  // Section links close the panel and let the browser perform the jump.
  panel.querySelectorAll("a[href^='#']").forEach((link) =>
    link.addEventListener("click", () => setOpen(false, { restoreFocus: false })),
  );

  document.addEventListener("keydown", (event) => {
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Leaving the small-screen range closes the panel so it cannot linger.
  const wide = matchMedia("(min-width: 900px)");
  wide.addEventListener("change", () => {
    if (wide.matches) setOpen(false, { restoreFocus: false });
  });
}

/* ---- Progress bar + current section ----------------------------------- */

function initProgressAndSections() {
  const root = document.documentElement;
  const links = [...document.querySelectorAll("[data-nav]")];
  const sections = [...document.querySelectorAll("main section[id]")];
  if (!sections.length) return;

  // Progress: one write per frame.
  let ticking = false;
  const paint = () => {
    ticking = false;
    const max = root.scrollHeight - window.innerHeight;
    const value = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    root.style.setProperty("--scroll-progress", value.toFixed(4));
  };
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(paint);
    },
    { passive: true },
  );
  window.addEventListener("resize", paint);
  paint();

  // Current section: the section whose top is closest above the viewport's
  // upper third wins. Driven by an IntersectionObserver so idle scrolling
  // costs nothing.
  let current = "";
  const setCurrent = (id) => {
    if (id === current) return;
    current = id;
    links.forEach((link) => {
      const match = link.getAttribute("href") === `#${id}`;
      if (match) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  };

  if (!("IntersectionObserver" in window)) return;
  const visible = new Map();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top);
        else visible.delete(entry.target.id);
      });
      if (!visible.size) return;
      // Prefer the visible section whose top is nearest to the header line.
      let best = null;
      let bestDistance = Infinity;
      for (const section of sections) {
        if (!visible.has(section.id)) continue;
        const distance = Math.abs(section.getBoundingClientRect().top - 120);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = section.id;
        }
      }
      if (best) setCurrent(best);
    },
    { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.1, 0.5] },
  );
  sections.forEach((section) => observer.observe(section));
}

/* ---- Clock -------------------------------------------------------------- */

function initClock() {
  const clock = document.querySelector("[data-clock]");
  if (!clock) return;
  let formatter;
  try {
    formatter = new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return;
  }
  let timer = 0;
  const tick = () => {
    clock.textContent = `Chennai · ${formatter.format(new Date())} IST`;
    const now = new Date();
    const wait = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50;
    timer = window.setTimeout(tick, wait);
  };
  tick();
  document.addEventListener("visibilitychange", () => {
    clearTimeout(timer);
    if (!document.hidden) tick();
  });
}
