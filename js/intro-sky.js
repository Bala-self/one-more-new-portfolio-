/**
 * intro-sky.js — shooting-star background for the opening screen.
 *
 * Builds the `.night` layer with two `.shooting_star` elements. The
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

const STAR_COUNT = 2;

export function createIntroSky(container) {
  const night = document.createElement("div");
  night.className = "night";
  night.setAttribute("aria-hidden", "true");

  for (let i = 0; i < STAR_COUNT; i += 1) {
    const star = document.createElement("span");
    star.className = "shooting_star";
    // Keep the opening understated: both stars appear early enough to be seen
    // during the short intro instead of waiting through a long random delay.
    star.style.setProperty("--top", `${Math.round(Math.random() * 90 - 45)}vmin`);
    star.style.setProperty("--left", `${Math.round(Math.random() * 60 - 10)}vmin`);
    star.style.setProperty("--delay", `${i * 650 + Math.round(Math.random() * 180)}ms`);
    night.append(star);
  }

  container.prepend(night);

  return {
    stop() {
      night.remove();
    },
  };
}
