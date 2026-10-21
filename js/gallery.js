/*
 * gallery.js — the <dialog> image viewer for screenshots and certificates.
 * Links keep working as plain links when the dialog API is unavailable.
 */
export function initGallery() {
  const dialog = document.querySelector(".image-viewer");
  if (!dialog || typeof dialog.showModal !== "function") return;
  const image = dialog.querySelector("img");
  const caption = dialog.querySelector(".image-viewer-caption");
  let opener = null;

  document.querySelectorAll("[data-lightbox]").forEach((link) =>
    link.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const original =
        link.querySelector("img") ||
        link.closest(".work-shot, .credential, .case-figure")?.querySelector("img");
      opener = link;
      image.src = link.href;
      image.alt = original?.alt || "Project screenshot";
      if (caption) caption.textContent = image.alt;
      dialog.showModal();
      document.body.style.overflow = "hidden";
    }),
  );

  dialog.querySelector(".image-close")?.addEventListener("click", () => dialog.close());

  dialog.addEventListener("close", () => {
    document.body.style.overflow = "";
    image.removeAttribute("src");
    opener?.focus({ preventScroll: true });
    opener = null;
  });

  // Click on the backdrop (outside the dialog box) closes it.
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    ) {
      dialog.close();
    }
  });
}
