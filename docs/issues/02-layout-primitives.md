# Issue: Standardize Layout Primitives Across All Pages

**PRD Reference:** VISUAL_UNIFY.md — Solution #3, User Stories #3, #4, #5, #16, #17, #19

**Type:** Foundation / Cross-Cutting

**Estimated Effort:** 2-3 hours

---

## Problem

Three different layout conventions exist across the codebase:

| Primitive | Home (`/`) | Dashboard (`/dashboard`) | Proto (target) |
|---|---|---|---|
| Container | none (full-width panels) | `max-w-6xl` (1056px) | `max-w-7xl` (1280px) |
| Card radius | `rounded-lg` | `rounded-lg` (via `card` shortcut) | `rounded-xl` |
| Card bg | `bg-stone-800` / `bg-stone-900` | `card` shortcut: `bg-white dark:bg-gray-800` | `bg-white border-stone-200` |
| Hero heading | `text-2xl` (control deck) | `text-2xl md:text-3xl` | `text-3xl md:text-4xl` |
| Body bg | `bg-stone-900` | `bg-stone-50` | `bg-stone-50` |

The `card` UnoCSS shortcut (`rounded-lg border p-4 shadow-sm bg-white dark:bg-gray-800`) is used on the dashboard but doesn't match the proto. The home page uses a dark studio theme with no card concept.

---

## Acceptance Criteria

1. **Container width:** All dashboard pages (`dashboard.vue`, `[level]/index.vue`, `[level]/[lesson].vue`) use `max-w-7xl` (not `max-w-6xl`).
2. **Card shortcut:** Updated to `rounded-xl bg-white border border-stone-200 shadow-sm`. The `dark:bg-gray-800` variant is removed (or replaced with a proto-consistent dark card style if needed).
3. **Hero headings:** Dashboard pages use `text-3xl md:text-4xl` for page titles (currently `text-2xl md:text-3xl`).
4. **App shell background:** `app.vue` sets `bg-stone-50` on the root container (currently no background class).
5. **Shadow system:** CSS custom properties (`--shadow-soft`, `--shadow-elevated`) from `main.css` are applied to cards and floating elements where appropriate.
6. **Home page unaffected:** The TTS home page (`index.vue`, `DesktopPanels.vue`, `MobileSplitScreen.vue`) retains its dark studio theme — only dashboard pages are updated.
7. `./run-tests.sh` passes.

---

## Files Changed

- `frontend/uno.config.ts` (card shortcut update)
- `frontend/app/app.vue` (add `bg-stone-50`)
- `frontend/app/pages/dashboard.vue` (container width, heading size)
- `frontend/app/pages/dashboard/level/[level]/index.vue` (container width, heading size)
- `frontend/app/pages/dashboard/level/[level]/[lesson].vue` (container width, heading size, card usage)

---

## Dependencies

Blocks: Issues #3 (tabs), #4 (hero banner), #5 (status indicator), #6 (navbar), #7 (breadcrumbs), #8 (fonts).

---

## Tests
## Proto Reference

From `docs/proto/lesson-details.html`:

- **Body:** `bg-stone-50 min-h-screen` (line 174)
- **Container:** `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` (lines 178, 211, 222, 260, 285, 315)
- **Hero heading:** `text-3xl md:text-4xl font-bold text-white` (line 238)
- **Card:** `bg-white rounded-xl shadow-sm border border-stone-200` (lines 223, 261)
- **Tabs:** `bg-stone-100 rounded-xl p-1.5 flex flex-wrap gap-1` (line 286)
- **Progress bar:** `h-1 bg-stone-100` (line 205)
- **Navbar:** `bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm` (line 177)

---


- **Layout consistency test:** Verify all dashboard pages render with `max-w-7xl` containers.
- **Card shortcut test:** Verify the `card` class resolves to `rounded-xl bg-white border border-stone-200 shadow-sm`.
- **App shell test:** Verify `app.vue` root div has `bg-stone-50`.
