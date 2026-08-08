# ISSUE-015: Implement Full Light/Dark Theme Rebrand (Global CSS)

**Spec Reference:** `docs/workflows/WORKFLOW-global-navbar-navigation.md` (Step 13 — Full Theme Rebrand), ADR-003 (Full Theme Rebrand — Background and Shadow Redesign)
**Dependencies:** ISSUE-007 (UnoCSS config updated with `primary` and `gold` palettes), ISSUE-014 (theme tokens migrated across all components)
**Scope:** Frontend global CSS (`frontend/app/assets/main.css`), Nuxt config (`frontend/nuxt.config.ts`)

---

## Problem

The theme rebrand's **global CSS layer** (Step 13 of the workflow spec) requires updating `main.css` and potentially `nuxt.config.ts` to implement a complete **light/dark dual theme**. The current `main.css` is dark-only, featuring:

- Dark fixed background with radial gradient orbs (orange/magenta)
- Film grain overlay (opacity 0.025)
- Dark-optimized scrollbars and textarea styling
- `studio-*` color references throughout

The spec requires a complete light-mode-first redesign with teal/gold accents:

1. Body background: `bg-stone-50` (light) / `bg-stone-900` (dark)
2. Remove dark gradient orbs, add light mode subtle teal orbs
3. Scrollbars: `#fafaf9` (light) / `#1c1917` (dark) track
4. Textarea caret: `#14b8a6` (primary-500) — not `#FF512F`
5. Placeholder color: `#78716c` (stone-500) — not `#404040`
6. Film grain: opacity reduced from 0.025 to 0.01 (light mode), `.dark:` override to keep 0.025

**No existing issue in `docs/issues/` covers this global CSS migration.** ISSUE-014 handles component-level token migration, but the global CSS layer (body backgrounds, scrollbars, film grain, caret, placeholders, dark mode overrides) is entirely uncovered.

The spec lists 4 specific failure paths — each one is a concrete, testable condition:

- `FAILURE(light_mode_missing)`: Light mode not implemented (only `.dark:` variants exist)
- `FAILURE(scrollbar_regression)`: Light mode scrollbar uses dark colors
- `FAILURE(film_grain_visible)`: Film grain too visible in light mode
- `FAILURE(caret_visible)`: Textarea caret `#FF512F` too bright on light background

---

## Acceptance Criteria

### AC-1: Body background implements light/dual theme
- Light mode: `bg-stone-50` (body background)
- Dark mode: `bg-stone-900` (body background)
- Both modes render correctly across all pages (`/`, `/dashboard`, `/dashboard/level/**`)

### AC-2: Gradient orbs updated for light mode
- Dark mode: existing gradient orbs preserved (`.dark:` variants)
- Light mode: subtle teal gradient orbs replace orange/magenta orbs
- Orb positioning, size, and opacity match the light-mode design

### AC-3: Scrollbar styling implements light/dual theme
- Light mode scrollbar track: `#fafaf9` (stone-50)
- Dark mode scrollbar track: `#1c1917` (stone-900)
- Light mode scrollbar thumb: adjusted teal tone
- Dark mode scrollbar thumb: adjusted stone tone
- Scrollbars render correctly in all scrollable containers (panels, modals, dropdowns)

### AC-4: Textarea caret uses primary-500
- Light mode textarea caret: `#14b8a6` (primary-500) — not `#FF512F`
- Dark mode textarea caret: preserved dark styling
- Caret is visible and accessible on both backgrounds

### AC-5: Placeholder color uses stone-500
- Light mode placeholder text: `#78716c` (stone-500) — not `#404040`
- Dark mode placeholder text: preserved dark styling
- Placeholder text is readable on both backgrounds

### AC-6: Film grain opacity is theme-aware
- Light mode film grain: opacity 0.01 (reduced from 0.025)
- Dark mode film grain: opacity 0.025 (preserved via `.dark:` override)
- Film grain is subtle in light mode, visible in dark mode
- Film grain does not interfere with text readability in either mode

### AC-7: All `.dark:` variants preserved
- Every light-mode rule has a corresponding dark-mode override
- No `.dark:` variant is lost during migration
- Dark mode renders identically to pre-migration (except for the token rebrand from ADR-003)

---

## Test Cases Covered

| Spec Test | How Verified |
|---|---|
| TC-04: Happy path — theme migration | Load any page in light mode, toggle dark mode — light mode renders correctly, dark mode preserved |
| TC-13: Failure — light mode missing | Light mode implemented (not only `.dark:` variants) — implement full light/dark dual theme |
| TC-13: Failure — scrollbar regression | Light mode scrollbar uses correct light colors — update `::-webkit-scrollbar-track` and thumb for light mode |
| TC-13: Failure — film grain visible | Film grain opacity 0.01 in light mode, 0.025 in dark mode (`.dark:` override) |
| TC-13: Failure — caret visible | Textarea caret `#14b8a6` (primary-500), not `#FF512F` on light background |

---

## ADR References

- **ADR-003** (Full Theme Rebrand): Defines the background and shadow redesign — light mode base, dark mode preservation, scrollbar styling, caret/placeholder colors
- **ADR-003** Consequences: "Dark mode must be preserved for all pages — The rebrand replaces a dark-first design with a light-first one. Every `.dark:` variant must be explicitly maintained."
- **ADR-003** Consequences: "Bundle size increases — Self-hosting Inter (4 weights) and Amiri (2 weights) adds approximately 200–400 KB of font files. This impacts initial load time, especially on slow connections. Mitigation requires `font-display: swap` and preloading critical font faces."

---

## Files

- `frontend/app/assets/main.css` (modified — full light/dark theme, scrollbars, film grain, caret, placeholders)
- `frontend/nuxt.config.ts` (possibly modified — font preload configuration if CDN option used)

Component test: `frontend/tests/ThemeRebrand.test.ts` (new — light/dark mode rendering, scrollbar verification, film grain opacity check, caret color verification)
