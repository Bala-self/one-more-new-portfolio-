/*
 * main.js — module entry for every page.
 *
 * Each module is a progressive enhancement and guards its own selectors, so
 * the case-study page can share this file. One failing module never stops
 * the others.
 */
import { initMotion } from "./motion.js";
import { initShell } from "./shell.js";
import { initSky } from "./sky.js";
import { initCursorTrail } from "./cursor-trail.js";
import { initParallax } from "./parallax.js";
import { initHeroParallax } from "./hero-parallax.js";
import { initToolkit } from "./toolkit.js";
import { initGallery } from "./gallery.js";
import { initContact, initMailModal } from "./contact.js";
import { initOpening, replayOpening } from "./opening.js";

const modules = [
  ["motion", initMotion],
  ["shell", initShell],
  ["sky", initSky],
  ["cursor", initCursorTrail],
  ["parallax", initParallax],
  ["hero-parallax", initHeroParallax],
  ["toolkit", initToolkit],
  ["gallery", initGallery],
  ["mail-modal", initMailModal],
  ["contact", initContact],
  ["opening", initOpening],
];

function boot() {
  for (const [name, init] of modules) {
    try {
      init();
    } catch (error) {
      console.error(`[portfolio] ${name} failed to start`, error);
    }
  }

  document.querySelectorAll("[data-replay-opening]").forEach((button) =>
    button.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "auto" });
      try {
        replayOpening();
      } catch (error) {
        console.error("[portfolio] replay failed", error);
      }
    }),
  );

  document.documentElement.classList.add("is-ready");
  console.info("[portfolio] build", document.querySelector('meta[name="build"]')?.content);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
