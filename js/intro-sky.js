/**
 * intro-sky.js — shooting-star background for the opening screen.
 *
 * Builds the `.night` layer with twenty `.shooting_star` elements. The
 * motion itself is pure CSS (see "Intro sky" in opening.css); this module
 * only does what Sass's `random()` loop did in the reference: give each
 * star its own start position and delay, via custom properties.
 *
 *   const sky = createIntroSky(container);  // appends .night
 *   sky.stop();                              // removes it
 *
 * opening.js only creates it when motion is allowed, so prefers-reduced-motion
 * never sees it; the layer is removed the moment the intro ends.
 */

const STAR_COUNT = 20;

export function createIntroSky(container) {
  const night = document.createElement("div");
  night.className = "night";
  night.setAttribute("aria-hidden", "true");

  for (let i = 0; i < STAR_COUNT; i += 1) {
    const star = document.createElement("span");
    star.className = "shooting_star";
    // Reference used 50% ± 200px / 50% − (0…300px); spread a little wider
    // here so large screens are covered too. Delay 0–9999 ms as in the
    // reference.
    star.style.setProperty("--top", `${Math.round(Math.random() * 90 - 45)}vmin`);
    star.style.setProperty("--left", `${Math.round(Math.random() * 60 - 10)}vmin`);
    star.style.setProperty("--delay", `${Math.round(Math.random() * 9999)}ms`);
    night.append(star);
  }

  container.prepend(night);

  return {
    stop() {
      night.remove();
    },
  };
}
