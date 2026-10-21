/*
 * contact.js — mail-picker modal, mailto composer, copy helpers and the
 * shared toast.  Nothing is sent from the page; the form only builds a draft.
 */
import { motionAllowed } from "./motion.js";

const EMAIL = "balakrishnan.code@email.com";

/* =========================================================================
   Mail-picker modal
   ========================================================================= */

export function initMailModal() {
  const modal   = /** @type {HTMLDialogElement|null} */ (document.querySelector("#mail-modal"));
  if (!modal) return;

  const closeBtn  = modal.querySelector("#mail-modal-close");
  const copyBtn   = modal.querySelector("#mail-copy-btn");
  const copyLabel = copyBtn?.querySelector("[data-copy-label]");
  const gmailLink   = /** @type {HTMLAnchorElement|null} */ (modal.querySelector("#mail-gmail"));
  const outlookLink = /** @type {HTMLAnchorElement|null} */ (modal.querySelector("#mail-outlook"));
  const defaultLink = /** @type {HTMLAnchorElement|null} */ (modal.querySelector("#mail-default"));

  let copyTimer = 0;

  /* ---- Build mailto URLs ------------------------------------------------- */
  function buildUrls({ subject = "Let's work together", body = "Hi Balakrishnan,\n\n" } = {}) {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody    = encodeURIComponent(body);
    const bare           = `mailto:${EMAIL}?subject=${encodedSubject}&body=${encodedBody}`;

    const gmail   = `https://mail.google.com/mail/?view=cm&fs=1&to=${EMAIL}&su=${encodedSubject}&body=${encodedBody}`;
    const outlook = `https://outlook.live.com/mail/0/deeplink/compose?to=${EMAIL}&subject=${encodedSubject}&body=${encodedBody}`;

    return { bare, gmail, outlook };
  }

  /* ---- Open modal -------------------------------------------------------- */
  function openModal(opts = {}) {
    if (!modal) return;
    const { bare, gmail, outlook } = buildUrls(opts);
    if (gmailLink)   gmailLink.href   = gmail;
    if (outlookLink) outlookLink.href = outlook;
    if (defaultLink) defaultLink.href = bare;

    // Reset copy button
    if (copyLabel) copyLabel.textContent = "Copy";
    copyBtn?.classList.remove("copied");

    modal.showModal();

    // Animate options in staggered
    if (motionAllowed()) {
      modal.querySelectorAll(".mail-option").forEach((el, i) => {
        const elem = /** @type {HTMLElement} */ (el);
        elem.style.transition = "";
        elem.style.opacity = "0";
        elem.style.transform = "translateX(-10px)";
        setTimeout(() => {
          elem.style.transition = "opacity 240ms ease, transform 240ms cubic-bezier(.16,1,.3,1)";
          elem.style.opacity = "1";
          elem.style.transform = "translateX(0)";
          setTimeout(() => {
            elem.style.transition = "";
          }, 280);
        }, 60 + i * 60);
      });
    }
  }

  // Let the contact form reuse the same URL setup and entrance motion.
  document.addEventListener("portfolio:open-mail", (event) => {
    openModal(event.detail || {});
  });

  /* ---- Close modal ------------------------------------------------------- */
  function closeModal() {
    modal.close();
  }

  /* ---- Triggers: any [data-open-mail] button ----------------------------- */
  document.addEventListener("click", (e) => {
    const trigger = /** @type {HTMLElement|null} */ (e.target)?.closest("[data-open-mail]");
    if (trigger) openModal();
  });

  /* ---- Close button ------------------------------------------------------ */
  closeBtn?.addEventListener("click", closeModal);

  /* ---- Backdrop click ---------------------------------------------------- */
  modal.addEventListener("click", (e) => {
    const rect = modal.getBoundingClientRect();
    const outside =
      e.clientX < rect.left  || e.clientX > rect.right ||
      e.clientY < rect.top   || e.clientY > rect.bottom;
    if (outside) closeModal();
  });

  /* ---- Copy email -------------------------------------------------------- */
  copyBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
    } catch {
      // Fallback: select text
      const span = modal.querySelector("#mail-address-display");
      if (span) {
        const sel   = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(span);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
    if (copyLabel) copyLabel.textContent = "Copied!";
    copyBtn.classList.add("copied");
    clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      if (copyLabel) copyLabel.textContent = "Copy";
      copyBtn.classList.remove("copied");
    }, 2000);
  });

  return { openModal };
}

/* =========================================================================
   Contact form + toast
   ========================================================================= */

export function initContact() {
  const toast = document.querySelector(".toast");
  let toastTimer = 0;

  function notify(message) {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 3200);
  }

  /* ---- Composer --------------------------------------------------------- */
  const form   = document.querySelector("#contact-form");
  const status = document.querySelector("#form-status");
  if (!form) return;

  function content() {
    const data    = new FormData(form);
    const name    = String(data.get("name")    || "").trim();
    const company = String(data.get("company") || "").trim();
    const email   = String(data.get("email")   || "").trim();
    const message = String(data.get("message") || "").trim();
    return {
      subject: `MERN opportunity${company ? " — " + company : ""}`,
      body: `Hi Balakrishnan,\n\n${message}\n\n${name}${company ? "\n" + company : ""}\n${email}`,
    };
  }

  // Open mail modal on submit instead of direct mailto
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const { subject, body } = content();

    // Open the picker, pre-filled with the composed draft
    const modal = document.querySelector("#mail-modal");
    if (modal) {
      document.dispatchEvent(
        new CustomEvent("portfolio:open-mail", {
          detail: { subject, body },
        }),
      );
    } else {
      // Fallback: direct mailto
      const mailto = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const link   = document.createElement("a");
      link.href    = mailto;
      link.click();
    }

    if (status) {
      status.textContent =
        "Choose your mail app in the picker. Nothing has been sent by this website.";
    }

    document.dispatchEvent(
      new CustomEvent("portfolio:email-draft", {
        detail: { subject, body },
      }),
    );
  });

  form.querySelector("[data-copy-message]")?.addEventListener("click", async () => {
    if (!form.reportValidity()) return;
    const { subject, body } = content();
    const text = `Subject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      if (status) status.textContent = `Message copied. Paste it into an email to ${EMAIL}.`;
      notify("Message copied.");
    } catch {
      if (!status) return;
      status.replaceChildren();
      const note      = document.createElement("span");
      note.textContent = "Clipboard access is unavailable. Select and copy your message below:";
      const pre        = document.createElement("pre");
      pre.textContent  = text;
      pre.tabIndex     = 0;
      pre.style.whiteSpace = "pre-wrap";
      pre.style.marginTop  = "8px";
      status.append(note, pre);
    }
  });

  /* ---- Outbound analytics hook ------------------------------------------ */
  document.addEventListener("click", (event) => {
    const a = event.target.closest("a");
    if (!a || !a.href) return;
    let type = null;
    if (a.hasAttribute("download"))         type = "download";
    else if (a.href.startsWith("mailto:"))  type = "email";
    else if (a.href.includes("mail.google")) type = "email-gmail";
    else if (a.href.includes("outlook.live")) type = "email-outlook";
    else if (a.href.includes("wa.me/"))     type = "whatsapp";
    else if (a.host && a.host !== location.host) type = "outbound";
    if (type) {
      document.dispatchEvent(
        new CustomEvent("portfolio:outbound", {
          detail: { type, label: a.textContent.trim(), href: a.href },
        }),
      );
    }
  });
}
