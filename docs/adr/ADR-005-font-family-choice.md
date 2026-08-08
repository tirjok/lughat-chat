# ADR-005: Font Family Choice

**Status:** Accepted
**Date:** 2026-08-09
**Context:** `docs/proto/lesson-details.html` (lines 8–16), `frontend/uno.config.ts` (lines 13–15), `frontend/app/assets/css/main.css` (lines 10–98)

---

## Context

LughatChat's visual identity is built around a specific font pairing. The proto (design prototype) specifies **Inter** (Latin UI) + **Amiri** (Arabic text), loaded via Google Fonts CDN. The production application instead uses **Plus Jakarta Sans** (Latin) + **Noto Sans Arabic** + **Cairo** (Arabic fallback), all self-hosted as `.woff2` files served from `public/fonts/`.

The proto's fonts are loaded via CDN links:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/amiri@latest/index.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/inter@latest/index.css">
```

The production fonts are 12 `.woff2` files (5 weights of Plus Jakarta Sans, 4 weights of Noto Sans Arabic, 3 weights of Cairo) totaling ~2.4 MB, served from the Nuxt `public/` directory with `font-display: swap`.

This ADR documents the decision to **keep the production font pairing** rather than switch to the proto's fonts.

---

## Decision

**Keep the production font pairing: Plus Jakarta Sans (Latin) + Noto Sans Arabic (Arabic body) + Cairo (Arabic fallback).**

No changes to `uno.config.ts` or `main.css` are required. This decision is documented to explain the deviation from the proto's explicit preference.

---

## Rationale

### 1. Offline reliability (primary)
All 12 font files are self-hosted in `public/fonts/`. The application works fully offline — no CDN dependency, no network request for fonts, no flash of unstyled text. Switching to CDN-loaded fonts (Google Fonts or jsDelivr) introduces a network dependency that can fail in restricted networks, air-gapped environments, or regions with CDN blocking.

### 2. Consistent rendering
Self-hosted fonts guarantee identical rendering across all environments — production, staging, development, and CI. CDN-served fonts can vary by region, CDN cache state, or Google Fonts' dynamic serving (which may substitute fallback fonts based on user locale).

### 3. Performance
The 12 pre-compiled `.woff2` files total ~2.4 MB. With `font-display: swap`, the browser shows system fallback fonts for ~50ms while custom fonts load — identical behavior whether self-hosted or CDN-loaded. There is no meaningful performance advantage to switching.

### 4. Visual difference is acceptable
- **Plus Jakarta Sans vs Inter:** Both are geometric sans-serifs from the same design family lineage. The visual difference is subtle — mostly minor stroke contrast and character proportions. Users will not perceive a quality degradation.
- **Noto Sans Arabic vs Amiri:** This is the larger gap. Noto Sans Arabic is a sans-serif (matching the Latin font's style), while Amiri is a Naskh-style serif (more traditional Arabic typography). The shift is noticeable but not undesirable — Amiri is a well-regarded Arabic typeface. However, the existing Noto Sans Arabic + Cairo pairing is functional and accessible.

### 5. Cost of switching
Switching requires:
- Removing 12 `.woff2` files from `public/fonts/`
- Adding CDN `<link>` tags to the HTML head
- Updating `uno.config.ts` (`Inter` + `Amiri`)
- Updating `main.css` `@font-face` declarations (or removing them entirely)
- Testing Arabic text rendering with a serif typeface across all pages
- Accepting a persistent CDN dependency

The cost outweighs the benefit, especially since the visual difference between the pairings is acceptable.

---

## Consequences

### What becomes easier
- **Offline-first operation:** The app works without any network connection for fonts.
- **Consistent cross-environment rendering:** No CDN cache variability.
- **No font-loading FOIT/FOUT management:** `font-display: swap` handles this; self-hosting makes it even more predictable.
- **No third-party dependencies:** Fonts are version-controlled with the application.

### What becomes harder
- **Deviation from proto's visual intent:** The design prototype specified Inter + Amiri. The production UI looks slightly different (minor Latin font differences, Arabic text is sans-serif rather than Naskh-serif). This is documented and acceptable.
- **Arabic typography style:** Noto Sans Arabic is a modern sans-serif, not a traditional Naskh script like Amiri. For users accustomed to classical Arabic book typography, this may feel less "authentic." However, sans-serif Arabic fonts are increasingly common in digital interfaces and are fully readable.

### Trade-off summary

| Aspect | Production (Jakarta + Noto) | Proto (Inter + Amiri) |
|--------|---------------------------|----------------------|
| Offline support | Full | None (CDN required) |
| Latin style | Geometric sans-serif | Geometric sans-serif |
| Arabic style | Modern sans-serif | Naskh serif |
| Bundle size | ~2.4 MB (self-hosted) | ~1.8 MB (CDN cached) |
| FOIT/FOUT | `font-display: swap` | `font-display: swap` |
| Regional blocking | None possible | Possible in some regions |

---

## Implementation Notes

- The `font-sans` UnoCSS class resolves to `'Plus Jakarta Sans'` (configured in `uno.config.ts` line 14).
- The `font-arabic` UnoCSS class resolves to `'Noto Sans Arabic', 'Cairo', 'sans-serif'` (configured in `uno.config.ts` line 15).
- Arabic text elements use the `font-arabic` class across all pages: `DesktopPanels.vue`, `MobileSplitScreen.vue`, `LessonHero.vue`.
- All 12 `.woff2` files are served from `public/fonts/` with `font-display: swap`.
- A comment in `uno.config.ts` references the proto's font choice and explains the deviation (see ADR-005).
