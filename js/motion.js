/*
 * motion.js — the one place that decides whether anything may move.
 *
 * Exposes:
 *   motionAllowed()        -> boolean (reduced-motion OR user toggle off => false)
 *   setMotionEnabled(bool) -> persists the user toggle, syncs controls, emits
 *                             "portfolio:motionchange"
 *   initMotion()           -> scroll reveals, word masks, hero entrance, and
 *                             the [data-motion-toggle] control
 *
 * Contract with motion.css: elements are only made transparent once
 * `html.motion-enabled` is set, and that happens here, right before the
 * IntersectionObserver that reveals them starts. If this module never runs
 * (old browser, script error), everything stays visible.
 */

const reduce = matchMedia("(prefers-reduced-motion: reduce)");
let paused = false;

try {
  paused = localStorage.getItem("bm-motion") === "off";
} catch {
  /* storage unavailable: motion stays on */
}

export const motionAllowed = () => !reduce.matches && !paused;

function syncControls() {
  const enabled = motionAllowed();
  document.documentElement.classList.toggle("motion-paused", !enabled);
  document.querySelectorAll("[data-motion-toggle]").forEach((button) => {
    const label = button.querySelector("span") || button;
    button.disabled = reduce.matches;
    button.setAttribute("aria-pressed", String(!enabled));
    if (reduce.matches) {
      label.textContent = "Reduced motion";
      button.setAttribute("aria-label", "Reduced motion — following your device setting");
    } else {
      label.textContent = enabled ? "Motion on" : "Motion off";
      button.setAttribute(
        "aria-label",
        enabled ? "Motion on — pause animations" : "Motion off — enable animations",
      );
    }
  });
}

export function setMotionEnabled(enabled) {
  paused = !enabled;
  try {
    localStorage.setItem("bm-motion", enabled ? "on" : "off");
  } catch {
    /* ignore */
  }
  syncControls();
  document.dispatchEvent(new CustomEvent("portfolio:motionchange"));
}

/* ---- Word masks --------------------------------------------------------
 * Splits the visible text of [data-split] headings into masked words while
 * keeping the accessible name intact (the heading gets an aria-label equal
 * to its original text, and the split copy is aria-hidden).
 */
function splitWords(heading) {
  if (heading.dataset.splitDone) return;
  const name = heading.textContent.replace(/\s+/g, " ").trim();
  const visual = document.createElement("span");
  visual.setAttribute("aria-hidden", "true");
  while (heading.firstChild) visual.append(heading.firstChild);
  heading.append(visual);
  heading.setAttribute("aria-label", name);
  heading.dataset.splitDone = "true";

  const walker = document.createTreeWalker(visual, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  let index = 0;
  nodes.forEach((node) => {
    const fragment = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((token) => {
      if (!token) return;
      if (!token.trim()) {
        fragment.append(document.createTextNode(token));
        return;
      }
      const mask = document.createElement("span");
      mask.className = "split-word";
      const inner = document.createElement("span");
      inner.textContent = token;
      inner.style.setProperty("--word-index", String(index++));
      mask.append(inner);
      fragment.append(mask);
    });
    node.replaceWith(fragment);
  });
}

/* ---- Reveals ----------------------------------------------------------- */

let observer;

function reveal(element) {
  element.classList.add("is-in");
}

export function initMotion() {
  syncControls();
  reduce.addEventListener("change", syncControls);

  document.querySelectorAll("[data-motion-toggle]").forEach((button) =>
    button.addEventListener("click", () => {
      if (reduce.matches) return;
      setMotionEnabled(!motionAllowed());
    }),
  );

  const splits = [...document.querySelectorAll("[data-split]")];
  const reveals = [...document.querySelectorAll("[data-reveal]")];
  const hero = document.querySelector(".hero");

  if (!("IntersectionObserver" in window)) return;

  splits.forEach(splitWords);

  // Only now may motion.css hide anything.
  document.documentElement.classList.add("motion-enabled");

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        reveal(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
  );

  const targets = [...new Set([...splits, ...reveals, hero].filter(Boolean))];
  targets.forEach((element) => observer.observe(element));

  // While the opening layer is up, the hero waits for it; otherwise it plays
  // on the next frame so the first paint is never blank.
  const playHero = () => {
    if (!hero) return;
    requestAnimationFrame(() => {
      reveal(hero);
      hero.querySelectorAll("[data-split]").forEach(reveal);
    });
  };
  if (document.documentElement.classList.contains("opening-pending")) {
    document.addEventListener("portfolio:openingdone", playHero, { once: true });
    // Fail-open: if the opening never reports back, play anyway.
    setTimeout(playHero, 4000);
  } else {
    playHero();
  }

  // Keyboard users never land on an invisible element.
  document.addEventListener("focusin", (event) => {
    const hidden = event.target.closest("[data-reveal]:not(.is-in), [data-split]:not(.is-in)");
    if (hidden) {
      observer.unobserve(hidden);
      reveal(hidden);
    }
  });

  // Turning motion off reveals everything immediately.
  document.addEventListener("portfolio:motionchange", () => {
    if (motionAllowed()) return;
    targets.forEach((element) => {
      observer.unobserve(element);
      reveal(element);
    });
  });
}
