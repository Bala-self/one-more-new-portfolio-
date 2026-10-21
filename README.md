# Balakrishnan M. — Space

> Deep-space edition, built on top of the Ivory / Forest redesign.
> Ivory / Forest is retained in `IVORY-FOREST.md` for history; this page describes what ships now.

A separate, complete visual redesign of the preserved blue portfolio. Native HTML, CSS and JavaScript; no framework and no bundler. The only third-party request is GSAP ScrollTrigger, fetched after the page goes idle, with pinned integrity hashes, and entirely optional — the built-in scroll layer covers it offline.

## Preview locally

```sh
python3 -m http.server 3001 --bind 0.0.0.0
```

Open `http://localhost:3001/`. The main site is one page. The BillPro case study is at `/work/billpro/`, and the original downloadable CV remains unchanged. Serve from the web root; asset URLs are root-relative. No installation is needed to run the site.

## What this edition adds

- **No navbar.** The page opens straight into the content: no masthead, no menu
  button, no brand mark at the top or the bottom. The seven-stop rail is the
  only in-page navigation and it appears on wide screens only; the skip link is
  the first tab stop.

- A black-only field (`#05070d`) with two fixed aurora hues, film grain and a vignette.
- A canvas starfield with drifting stars and occasional meteors.
- A shooting-star cursor trail for fine pointers; the native cursor is never hidden.
- GSAP ScrollTrigger for scroll-linked parallax and one hero dissolve, with a
  vanilla rAF fallback that covers the same effects when GSAP is unavailable.
- Word-mask heading reveals, magnetic controls and pointer halos on desktop.
- A seven-stop section rail with a comet that tracks reading progress (wide
  screens), and a hairline progress bar on small ones.
- A live Chennai clock in the hero.
- Copy rewritten to clear the AI pattern: concrete nouns instead of slogans, no
  invented metrics, no repeated template sentences.

`css/space.css` is the final design layer; it overrides colour and atmosphere
only, so every structural rule from the previous edition still applies. See
`SPACE.md` for the palette, the motion system, the sources and the limits.

## Retained functionality

The greeting → robot → portal opening still plays on refresh, with Skip, Escape, replay and reduced-motion bypass. Fresh non-home anchors bypass it. There is no percentage preloader.

All four real projects, 28 skill icons and four orbit rings, three sequential Experience steps, the four-stop education/internship road, both real certificates, lightboxes, keyboard navigation, native scrolling, contextual desktop cursor, optional offline guide, and the sky/motion controls remain. About directly precedes Contact. The removed device showcase has not returned.

The two local pause controls (**Pause orbits**, **Pause journey**) were removed in the focus pass. Nothing lost a guard by it: the rings and the road still stop when they are offscreen, on a hidden tab, under `prefers-reduced-motion`, or when the footer **Motion** switch is off, and the rings still hold while a skill is hovered or focused.

Contact prepares or copies an email draft; it never sends automatically. Public factual content remains readable without JavaScript. No invented employment, credentials, impact metrics or testimonials have been added. Immediate availability and the paid Shanthi IT internship from August 2026 remain as confirmed by the owner.

## Preservation

The original blue project is separate from this edition and has not been modified. The earlier duplicate backup, release archives and reference material were removed from the workspace at the owner's request, so the preservation figures in older documents describe files that no longer exist; the original project itself remains intact and unchanged.

## Automated checks

Install Playwright and axe-core only if you want to run browser tests:

```sh
npm install --no-save --package-lock=false playwright @axe-core/playwright
npx playwright install chromium
# On a minimal Linux host, browser system dependencies may also be required.
for suite in regression signature life-road solar-system edge-checks opening-refresh palette atelier space; do
  node "tests/$suite.cjs" || exit 1
done
```

Run these from the project root with the server on port 3001. The optional original-file comparison in `atelier.cjs` uses `ORIGINAL_PROJECT` and `PRESERVATION_MANIFEST`; it skips that one check when the preserved source is absent. `tests/history/` contains an obsolete pre-redesign test, not a current suite. `tests/screens-space.cjs` writes review screenshots to `tests/artifacts/`. Fresh results are described in `QA.md`; the space edition's own record is `SPACE.md`.

## Deployment and limits

Use a static host at the domain root. Keep the supplied Netlify configuration if deploying there; configure real canonical/share URLs for your final domain using the existing deployment script and documentation. No private credentials or backend are needed by the portfolio itself.

Lighthouse 95+, LCP <2s, CLS 0 and a 15 KB JavaScript budget remain targets, not verified achievements. Current size measurements and browser-test limits are in `QA.md`. External project authentication, email delivery, Safari/Firefox, physical devices and assistive-technology sessions were not certified in this pass.

# one-more-new-portfolio-
