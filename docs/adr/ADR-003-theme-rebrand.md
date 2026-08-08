# ADR-003: Full Theme Rebrand — Color System and Typography

**Status:** Accepted
**Date:** 2026-08-03
**Context:** `docs/requirements/navigation-dashboard.md` (D6, R-5, R-12)

---

## Context

LughatChat currently uses a **dark-first design** with a distinctive orange-to-magenta gradient identity:

- **Color tokens:** `studio-*` (dark backgrounds: `#121212`, `#1A1A1A`, `#333333`), `sunrise-orange` (`#FF512F`), `sunrise-magenta` (`#DD2476`)
- **Fonts:** Plus Jakarta Sans (Latin UI, 300–700), Cairo (Arabic fallback, 400/600)
- **Background:** Dark fixed background with radial gradient orbs + film grain overlay
- **Shadows:** Dark-optimized (`rgba(0,0,0,0.25)` ambient)

The product is evolving into a multi-page Language Learning Platform. The prototype (`docs/proto/lesson-details.html`) establishes a **light-mode-first** visual direction with teal/gold accents, Inter (Latin), and Amiri (Arabic). This is not a palette tweak — it is a complete re-identity that touches every visual layer: UnoCSS config, global CSS, 10+ components, and the Nuxt configuration.

The decision point is whether to **migrate the entire visual identity** (colors, fonts, backgrounds, shadows) to the new light-mode-first design, or to keep the existing dark-first identity and only add minimal light-mode support for the new pages.

## Decision

The application adopts a **complete theme rebrand** consisting of three interlocking changes:

### 1. Color Palette Replacement

**Remove:** `studio-*` (9 tokens), `sunrise-orange`, `sunrise-magenta`
**Add:** `primary` (teal scale, 50–900), `gold` (accent scale, 400–600)

| Old Token | New Token | Example Migration |
|-----------|-----------|-------------------|
| `bg-studio-900` (`#121212`) | `bg-white` (light) / `bg-stone-900` (dark) | Background surfaces |
| `text-sunrise-orange` (`#FF512F`) | `text-primary-500` / `text-primary-600` | CTAs, active states |
| `text-sunrise-magenta` (`#DD2476`) | `text-gold-500` / `text-primary-400` | Badges, accents |
| `#FF512F → #DD2476` gradient | `#14b8a6 → #0f766e` gradient | Waveform, hero backgrounds |

All references to removed tokens across 10+ components (`AudioPlayerPanel.vue`, `WaveformCanvas.vue`, `SpeedSlider.vue`, `GenerateButton.vue`, `VoiceSelector.vue`, `ModelStatusIndicator.vue`, `MobileStatusIndicator.vue`, `ToastNotification.vue`, `FocusHaloCanvas.vue`, `index.vue`) are migrated in a single pass.

### 2. Font Replacement

| Old | New | Rationale |
|-----|-----|-----------|
| Plus Jakarta Sans (300–700) | Inter (via UnoCSS `font-sans`) | Standard, well-supported, better Arabic pairing |
| Cairo (400, 600) | Amiri (via UnoCSS `font-arabic`) | Classical Arabic typeface, better for learning content |
| Noto Sans Arabic (400–700) | Kept as fallback | Graceful degradation |

Fonts are self-hosted (Option B): downloaded woff2 files placed in `frontend/app/assets/fonts/` (or `public/fonts/`) with `@font-face` declarations in `main.css`. This preserves 100% offline capability, consistent with current practice.

### 3. Background and Shadow Redesign

- **Background:** Light mode base (`bg-stone-50` / `bg-stone-900` dark) with subtle teal gradient orbs (replacing orange/magenta orbs). Film grain opacity reduced from 0.025 to 0.01 for light mode.
- **Shadows:** Softer, lower-contrast values for light mode (`rgba(0,0,0,0.08)` ambient, `rgba(0,0,0,0.06)` soft, `rgba(0,0,0,0.12)` elevated).
- **Scrollbars:** Track `#fafaf9` (light) / `#1c1917` (dark); thumb colors adjusted.
- **Caret:** `#14b8a6` (primary-500, replacing `#FF512F`).
- **Placeholder:** `#78716c` (stone-500, replacing `#404040`).

### Configuration Changes

- `uno.config.ts`: Replace `studio`/`sunrise` color definitions with `primary`/`gold`; update `fontFamily` mapping.
- `main.css`: Update `@font-face` declarations, background rules, scrollbar styling, caret/placeholder colors, dark mode overrides.
- `nuxt.config.ts`: Add Inter + Amiri font links (CDN option) or update self-hosted font paths.

## Consequences

### What becomes easier

- **Light-mode readability** — The new palette (teal on stone-50) provides higher contrast for extended reading sessions, which is essential for a language learning platform where users spend significant time reading Arabic text with harakat.
- **Brand alignment** — The teal/gold palette evokes trust and warmth (appropriate for education), replacing the aggressive orange/magenta gradients that felt like a music studio identity.
- **Font pairing quality** — Inter + Amiri is a proven combination for bilingual Latin/Arabic interfaces. Amiri's classical calligraphic style is more appropriate for learning content than Cairo's modern geometric style.
- **Design consistency** — A single light-mode-first theme eliminates the mental model split of "dark studio, light lessons" and provides a unified experience across all pages.

### What becomes harder

- **10+ component files must be audited and updated** — Every component referencing `studio-*`, `sunrise-orange`, or `sunrise-magenta` tokens must be individually reviewed. A single missed reference (e.g., an inline style or CSS variable) will produce a visual inconsistency that is hard to debug because the token name no longer exists in the codebase.
- **Dark mode must be preserved for all pages** — The rebrand replaces a dark-first design with a light-first one. Every `.dark:` variant must be explicitly maintained. This is error-prone: a component that works in light mode may break in dark mode if the dark-specific overrides are not carried over during migration.
- **Existing user muscle memory is broken** — Long-time users who have internalized the dark theme's color associations (orange = action, magenta = accent) will experience a cognitive shift. The gradient identity was distinctive; the new teal/gold is more conventional. This is a brand risk.
- **Bundle size increases** — Self-hosting Inter (4 weights: 400, 500, 600, 700) and Amiri (2 weights: 400, 700) adds approximately 200–400 KB of font files. This impacts initial load time, especially on slow connections. Mitigation requires `font-display: swap` and preloading critical font faces.
- **Gradient assets must be regenerated** — WaveformCanvas's gradient, FocusHaloCanvas's radial gradient, and any icon/splash assets using the old orange/magenta gradients must be re-rendered or re-styled. This is not just a CSS change — it may affect exported audio thumbnails, shared images, or saved states.
- **Visual regression testing surface doubles** — The existing visual tests target a dark theme. Every page now has two visual states (light/dark) to verify. The test suite must either expand to cover both themes or accept that dark-mode regressions will go undetected.
