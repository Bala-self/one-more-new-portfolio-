/*
 * toolkit.js — the "complete toolkit" chips. Each chip is a button that
 * discloses where the tool was used (click, keyboard, or mouse hover).
 * Replaces the old projects.js, whose video code targeted markup that does
 * not exist on the page.
 */
export function initToolkit() {
  const chips = [...document.querySelectorAll(".skill-chip")];
  if (!chips.length) return;

  const close = (chip) => {
    chip.querySelector("button").setAttribute("aria-expanded", "false");
    chip.querySelector(".skill-popover").hidden = true;
  };

  const open = (chip) => {
    chips.filter((other) => other !== chip).forEach(close);
    chip.querySelector("button").setAttribute("aria-expanded", "true");
    const pop = chip.querySelector(".skill-popover");
    pop.hidden = false;
    // Keep the popover inside the viewport.
    pop.style.left = "";
    pop.style.right = "";
    if (pop.getBoundingClientRect().right > window.innerWidth - 16) {
      pop.style.left = "auto";
      pop.style.right = "0";
    }
  };

  chips.forEach((chip) => {
    const button = chip.querySelector("button");
    const pop = chip.querySelector(".skill-popover");
    if (!button || !pop) return;
    button.addEventListener("click", () => open(chip));
    chip.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") open(chip);
    });
    chip.addEventListener("pointerleave", () => {
      if (!chip.contains(document.activeElement)) close(chip);
    });
    chip.addEventListener("focusout", (event) => {
      if (!chip.contains(event.relatedTarget)) close(chip);
    });
    chip.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        button.focus();
        close(chip);
      }
    });
    pop.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => close(chip)));
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".skill-chip")) chips.forEach(close);
  });
}
