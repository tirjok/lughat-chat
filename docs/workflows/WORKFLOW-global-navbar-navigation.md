# WORKFLOW: Shared Layout with Global Navbar Navigation

**Version**: 0.1
**Date**: 2026-08-03
**Author**: Workflow Architect
**Status**: Draft
**Implements**: ADR-001 (Shared Layout with Global Navbar) + Requirements R-1 through R-13

---

## Overview

This workflow defines the complete user and system journey for introducing a shared global navigation bar across the LughatChat platform. The workflow covers app shell restructuring, TTS Studio layout adaptation, theme migration, font swap, SEO title inheritance, new page creation (Dashboard shell, Lesson page shell), the GlobalNavbar component, mobile navbar collapse, and orphan file cleanup on navigation. It touches 9+ existing components, 2 composables (usePanelToggle, useHealthPoll), the app shell (app.vue), the TTS Studio page (index.vue), the UnoCSS config, and global CSS.

**ADR-001 constraints enforced:**
- C1: `app.vue` wraps `<NuxtPage />` inside layout with `<GlobalNavbar />`
- C2: Top bar = 56px (`h-14`), progress bar = 4px (`h-1`), total 60px
- C3: Mobile breakpoint = 768px (`< 768px` collapses)
- C4: Mobile navbar may grow to `h-16` (64px) for WCAG 44px touch targets
- C5: TTS Studio panels shrink to `calc(100vh - 60px)` (desktop)
- C6: Every page must adapt layout (body `overflow: visible`, flex column wrapper)
- C7: Navbar must be aware of every page's state (active link, progress bar)
- C8: Browser back/forward navigation must update navbar active state
- C9: Testing surface expands (new component tests, integration tests, updated visual tests)

---

## Actors

| Actor | Role in this workflow |
|---|---|
| User (Customer) | Navigates between pages, interacts with navbar, triggers synthesis |
| Nuxt Router | Manages SPA navigation, route changes, history |
| GlobalNavbar (component) | Renders navigation, active state, progress bar, mobile collapse |
| app.vue (shell) | Wraps all pages with navbar, manages base SEO |
| TTS Studio (index.vue) | Adapts layout to account for navbar height |
| Dashboard (page) | New page, uses navbar |
| Lesson Page (page) | New page, uses navbar, shows per-lesson progress |
| UnoCSS (config) | Theme tokens, fonts, breakpoints |
| Browser | Renders, respects `prefers-reduced-motion`, handles SPA navigation |

---

## Prerequisites

- [ ] Existing TTS Studio at `/` functions correctly (synthesis, playback, voice selection)
- [ ] Backend health endpoint `/health` responds (loading → ready | error)
- [ ] `./run-tests.sh` passes in current state (baseline)
- [ ] All existing tests pass (zero modifications allowed per AGENTS.md)
- [ ] Docker Compose stack is running (backend + frontend)

---

## Workflow Tree

### STEP 1: App Shell Restructuring (app.vue)

**Actor**: Frontend (app.vue)
**Action**: Replace bare `<NuxtPage />` with layout wrapper containing `<GlobalNavbar />` and `<NuxtPage />`. Update SEO to emit root-level `useSeoMeta({ title: 'LughatChat' })`.

**Input**: Current `app.vue` (24 lines, bare wrapper)
**Output on SUCCESS**: `app.vue` with layout structure, base SEO — GO TO STEP 2
**Output on FAILURE**:
  - `FAILURE(compile_error)`: Vue SFC syntax error, UnoCSS token not found, or GlobalNavbar import fails -> abort, revert app.vue to previous state
  - `FAILURE(nuxt_error)`: Nuxt router fails to resolve `<NuxtPage />` — check Nuxt version compatibility -> abort, no cleanup needed (nothing persisted)
  - `FAILURE(ssr_mismatch)`: SSR renders different HTML than CSR (hydration mismatch) -> abort, fix SSR/CSR parity

**Observable states during this step**:
  - Customer sees: nothing (this is a shell change, no visual effect until GlobalNavbar exists)
  - Operator sees: `app.vue` diff showing layout wrapper
  - Database: no change
  - Logs: Nuxt dev server re-compiles

---

### STEP 2: GlobalNavbar Component Creation

**Actor**: Frontend (app/components/GlobalNavbar.vue)
**Action**: Create `GlobalNavbar.vue` with:
  - Top bar (56px): Logo + "LughatChat" (links to `/`), nav links (Home, Dashboard, Lessons), action buttons (Ask Instructor, Settings), user avatar placeholder
  - Progress bar (4px): Full-width, `bg-stone-100 dark:bg-stone-700` track, `bg-gradient-to-r from-primary-500 to-primary-600` fill (dynamic width)
  - Active link detection via `useRoute()` / `useNuxtApp()`
  - Mobile collapse (< 768px): compact bar with logo + nav icons + dropdown for action buttons

**Input**: Route information from Nuxt router, page state from parent
**Output on SUCCESS**: `GlobalNavbar.vue` component — GO TO STEP 3
**Output on FAILURE**:
  - `FAILURE(component_not_found)`: UnoCSS token `primary-500` / `gold-500` not defined -> abort (must be defined in uno.config.ts first)
  - `FAILURE(route_error)`: `useRoute()` unavailable in SSR context -> use `useNuxtApp()` as fallback
  - `FAILURE(mobile_breakpoint)`: `< 768px` collapse renders broken touch targets (< 44px) -> WCAG violation, abort

**Observable states during this step**:
  - Customer sees: global navbar at top of every page
  - Operator sees: `GlobalNavbar.vue` in `app/components/`
  - Database: no change
  - Logs: Nuxt dev server re-compiles

---

### STEP 3: TTS Studio Layout Adaptation (index.vue)

**Actor**: Frontend (app/pages/index.vue)
**Action**: Adapt TTS Studio panels from `100vh` to `calc(100vh - 60px)` (desktop) or `calc(100vh - 64px - env(safe-area-inset-top) - env(safe-area-inset-bottom))` (mobile). Change body `overflow: hidden` to `overflow: visible`. Add flex column wrapper.

**Input**: Current `index.vue` (751 lines, 100vh dark theme)
**Output on SUCCESS**: Panels respect navbar height — GO TO STEP 4
**Output on FAILURE**:
  - `FAILURE(overflow_regression)`: Changing body `overflow: hidden` to `visible` causes content to render behind/under navbar -> fix: wrap content in `max-h-[calc(100vh-60px)] overflow-auto`
  - `FAILURE(mobile_squeeze)`: On mobile, `calc(100vh - 64px - safe-area)` leaves < 200px for waveform -> abort, reduce navbar height or hide progress bar on mobile
  - `FAILURE(panel_height_mismatch)`: Desktop and mobile panel heights don't sum to available space -> abort, recalculate ratios

**Observable states during this step**:
  - Customer sees: TTS Studio panels 60px shorter, content fully visible below navbar
  - Operator sees: `index.vue` diff showing height changes
  - Database: no change
  - Logs: Nuxt dev server re-compiles

---

### STEP 4: Theme Token Migration (9+ Components)

**Actor**: Frontend (multiple components)
**Action**: Replace removed tokens across all components:
  - `studio-900` → `stone-900` (dark) / `white` (light)
  - `studio-800` → `stone-800` (dark) / `white` (light)
  - `studio-700` → `stone-700` (dark) / `stone-200` (light)
  - `sunrise-orange` (`#FF512F`) → `primary-500` (`#14b8a6`)
  - `sunrise-magenta` (`#DD2476`) → `gold-500` (`#f59e0b`)
  - Gradient `#FF512F → #DD2476` → `#14b8a6 → #0f766e` (teal)
  - Gradient `#0d9488 → #115e59` (dark teal)

**Components affected**: AudioPlayerPanel, WaveformCanvas, SpeedSlider, GenerateButton, VoiceSelector, ModelStatusIndicator, MobileStatusIndicator, ToastNotification, FocusHaloCanvas, index.vue (TTS Studio)

**Input**: Current component files with `studio-*` / `sunrise-*` references
**Output on SUCCESS**: Zero `studio-*` or `sunrise-*` references remain — GO TO STEP 5
**Output on FAILURE**:
  - `FAILURE(incomplete_migration)`: One or more components still reference removed tokens -> abort, run `grep -rn "studio-\|sunrise-" frontend/app/` to audit
  - `FAILURE(color_contrast)`: New colors fail WCAG AA contrast ratio (4.5:1 for text) -> abort, adjust token values
  - `FAILURE(gradient_mismatch)`: Multi-stop gradient doesn't render in UnoCSS -> use CSS custom property or inline style

**Observable states during this step**:
  - Customer sees: light mode with teal/gold palette, dark mode preserved
  - Operator sees: grep audit result (zero matches expected)
  - Database: no change
  - Logs: Nuxt dev server re-compiles

---

### STEP 5: Font Swap (Inter + Amiri)

**Actor**: Frontend (nuxt.config.ts, uno.config.ts, main.css)
**Action**: Replace `Plus Jakarta Sans` → `Inter` (Latin UI), `Noto Sans Arabic` → `Amiri` (Arabic). Implement via self-hosted woff2 files in `frontend/app/assets/fonts/` (Option B, matches current offline capability). Update `uno.config.ts` fontFamily and `main.css` @font-face declarations.

**Input**: Current font-face declarations (Plus Jakarta Sans 300-700, Noto Sans Arabic 400-700, Cairo 400/600)
**Output on SUCCESS**: Inter (400, 500, 600, 700) + Amiri (400, 700) loaded, `font-sans` = Inter, `font-arabic` = Amiri — GO TO STEP 6
**Output on FAILURE**:
  - `FAILURE(font_not_found)`: woff2 files missing from assets/fonts/ -> abort, download and place files
  - `FAILURE(font_fallback_chain)`: Amiri not available for certain Arabic characters -> add Cairo as tertiary fallback
  - `FAILURE(bundle_size)`: Font files exceed 500KB total -> abort, subset fonts (400, 500, 600, 700 only)
  - `FAILURE(ssr_font_flash)`: Server renders with fallback font, client swaps to Inter (FOIT/FOUT) -> use `font-display: swap`

**Observable states during this step**:
  - Customer sees: Inter for UI labels, Amiri for Arabic text
  - Operator sees: font files in `assets/fonts/`, @font-face in main.css
  - Database: no change
  - Logs: Browser network tab shows font fetch (self-hosted, no CDN)

---

### STEP 6: SEO Title Inheritance

**Actor**: Frontend (app.vue + per-page components)
**Action**: Root `app.vue` sets `useSeoMeta({ title: 'LughatChat' })`. Per-page pages set `useSeoMeta({ title: 'TTS Studio' })` → renders as `LughatChat - TTS Studio`. Dashboard sets `title: 'Dashboard'` → `LughatChat - Dashboard`. Lesson pages set `title: '{lesson title}'` → `LughatChat - {lesson title}`.

**Input**: Current `app.vue` with `useSeoMeta({ title: 'Lughat Chat - Premium Audio Studio' })`
**Output on SUCCESS**: Per-page titles render correctly across all pages — GO TO STEP 7
**Output on FAILURE**:
  - `FAILURE(title_concatenation)`: Nuxt 4 doesn't merge root + page titles with ` - ` separator -> verify Nuxt 4 behavior, adjust to manual concatenation in root
  - `FAILURE(ssr_title_mismatch)`: SSR renders different title than CSR (hydration mismatch) -> ensure SSR/CSR parity
  - `FAILURE(legacy_title)`: Old title "Lughat Chat - Premium Audio Studio" persists -> must be fully replaced (R-13: existing functionality preservation)

**Observable states during this step**:
  - Customer sees: "LughatChat - TTS Studio" in browser tab
  - Operator sees: `<title>` tag in rendered HTML
  - Database: no change
  - Logs: N/A (SEO meta)

---

### STEP 7: Dashboard Page Shell

**Actor**: Frontend (app/pages/dashboard.vue)
**Action**: Create `/dashboard` page shell with:
  - Header: "Your Learning Journey"
  - Course/level cards grid (A1, A2, B1, B2...)
  - Progress indicators per course (deferred: show placeholders)
  - "Continue Learning" CTA (deferred: links to `/dashboard` with no-op)
  - Uses `GlobalNavbar` (inherited from app.vue)

**Input**: Nuxt file-based routing (no existing dashboard.vue)
**Output on SUCCESS**: `/dashboard` accessible, renders navbar + placeholder content — GO TO STEP 8
**Output on FAILURE**:
  - `FAILURE(route_conflict)`: `/dashboard` conflicts with existing route -> verify no `/dashboard` route exists (confirmed: no dashboard pages)
  - `FAILURE(navigation_broken)`: `/dashboard` renders but navbar doesn't highlight "Dashboard" as active -> fix GlobalNavbar route detection
  - `FAILURE(layout_regression)`: Dashboard page doesn't adapt to navbar height -> ensure same flex column wrapper as TTS Studio

**Observable states during this step**:
  - Customer sees: Dashboard page with placeholder content, navbar active on "Dashboard"
  - Operator sees: `dashboard.vue` in `app/pages/`
  - Database: no change (shell only, no data)
  - Logs: Nuxt dev server adds route

---

### STEP 8: Lesson Page Shell

**Actor**: Frontend (app/pages/dashboard/level/[level]/[lesson].vue)
**Action**: Create dynamic route `/dashboard/level/{level}/{lesson}` shell with:
  - Breadcrumbs: Dashboard → Level {level} → Lesson {id}
  - Hero section: lesson title (English + Arabic), level badge, status
  - Section tabs: Dialogue, Vocabulary, Pronouns, Expressions, Grammar, Activities
  - Main content area (deferred: placeholder)
  - Sticky audio bar (deferred: placeholder from StickyAudioBar)
  - Uses `GlobalNavbar` (inherited from app.vue), shows per-lesson progress

**Input**: Nuxt dynamic routing (`[level]/[lesson].vue`)
**Output on SUCCESS**: `/dashboard/level/a1/1` accessible, renders navbar + progress bar + placeholder — GO TO STEP 9
**Output on FAILURE**:
  - `FAILURE(dynamic_route)`: Nuxt doesn't resolve `[level]/[lesson].vue` -> verify folder structure matches Nuxt 4 conventions
  - `FAILURE(progress_bar_null)`: Progress bar shows 0% on non-lesson pages — handle gracefully (no fill, track visible)
  - `FAILURE(crumb_breadcrumb)`: Breadcrumb renders incorrectly for dynamic params -> sanitize URL params, handle malformed URLs

**Observable states during this step**:
  - Customer sees: Lesson page shell with breadcrumbs, progress bar, placeholder content
  - Operator sees: `[level]/[lesson].vue` in `app/pages/dashboard/level/`
  - Database: no change (shell only)
  - Logs: Nuxt dev server adds dynamic route

---

### STEP 9: Mobile Navbar Collapse

**Actor**: Frontend (GlobalNavbar.vue)
**Action**: Below 768px, navbar collapses to compact bar:
  - Logo + 2-3 key nav icons (Home, Dashboard, Lessons)
  - Action buttons (Ask Instructor, Settings) in dropdown/overflow menu
  - Progress bar: hidden on mobile, or shown as small dot indicator
  - Height may increase to `h-16` (64px) for WCAG 44px touch targets
  - Touch targets ≥ 44px (WCAG 2.5.1)

**Input**: Window resize event, current viewport width
**Output on SUCCESS**: Mobile navbar renders correctly with ≥ 44px touch targets — GO TO STEP 10
**Output on FAILURE**:
  - `FAILURE(touch_target)`: Any interactive element < 44px -> abort, increase padding/size
  - `FAILURE(overflow_collapse)`: Dropdown menu doesn't close on outside click -> fix event listener
  - `FAILURE(progress_bar_mobile)`: Progress bar visible on mobile but navbar height already 64px -> hide progress bar on mobile, or reduce navbar to 56px and add safe-area padding
  - `FAILURE(ssr_mobile)`: SSR renders desktop navbar, client swaps to mobile (hydration mismatch) -> use `useMediaQuery` or `useBreakpoints` for SSR-safe detection

**Observable states during this step**:
  - Customer sees: compact mobile navbar with icons, dropdown for actions
  - Operator sees: GlobalNavbar.vue mobile branch
  - Database: no change
  - Logs: Browser resize events

---

### STEP 10: Orphan File Cleanup on Navigation

**Actor**: Frontend (index.vue — TTS Studio)
**Action**: Intercept page navigation away from `/` during active synthesis:
  1. Check `isGenerating.value` or `audioModule.isStreaming`
  2. If synthesis active, show confirmation dialog: "A synthesis is in progress. Clean up the generated files when you leave?"
  3. Options: "Clean & Leave" / "Stay"
  4. If "Clean & Leave": abort the fetch, call `audioModule.dispose()`, trigger `/api/cleanup` for orphan files
  5. If "Stay": remain on page, synthesis continues

**Input**: User navigates away from `/` (Nuxt `<NuxtLink>` to `/dashboard` or browser navigation)
**Output on SUCCESS**: Orphan files cleaned up, user navigates to destination — GO TO STEP 11
**Output on FAILURE**:
  - `FAILURE(navigation_intercept_blocked)`: Browser blocks `beforeunload` dialog for programmatic navigation -> use Nuxt `onBeforeRouteLeave` instead of `window.beforeunload`
  - `FAILURE(abort_timeout)`: Abort fetch takes > 5s -> mark as network error, cleanup still runs via `/api/cleanup`
  - `FAILURE(cleanup_fail)`: `/api/cleanup` returns 500 -> toast error to user, orphan files remain (known issue, see RF-1 in REGISTRY.md)
  - `FAILURE(dialog_race)`: User clicks "Clean & Leave" rapidly -> debounce dialog, prevent multiple cleanup calls

**Observable states during this step**:
  - Customer sees: confirmation dialog when navigating away from active synthesis
  - Operator sees: orphan files cleaned up in `backend/downloads/`
  - Database: no change (files on disk)
  - Logs: `[frontend] navigation abort synthesis_id=abc123`, `[backend] cleanup orphan files`

---

### STEP 11: Backend Health Integration (GlobalNavbar)

**Actor**: GlobalNavbar component
**Action**: Progress bar in GlobalNavbar reflects backend model status (from `useHealthPoll`):
  - When model is `loading`: progress bar shows indeterminate animation
  - When model is `ready`: progress bar shows 0% (no lesson context)
  - When model is `error`: progress bar shows error state (red fill)

  Per-lesson pages show actual progress: `fill-width = (completed_steps / total_steps) * 100%`

**Input**: Backend `/health` response, lesson progress data (deferred)
**Output on SUCCESS**: Progress bar reflects model status on all pages — GO TO STEP 12
**Output on FAILURE**:
  - `FAILURE(health_poll_conflict)`: Multiple `useHealthPoll()` instances (one in index.vue, one in GlobalNavbar) create conflicting intervals -> share state via composable singleton or provide `baseUrl` option
  - `FAILURE(progress_null)`: Progress bar renders with no fill data on `/` and `/dashboard` -> show track only, no fill
  - `FAILURE(loading_race)`: Progress bar shows loading then ready in < 2s (health poll interval) -> smooth transition, no flicker

**Observable states during this step**:
  - Customer sees: progress bar below navbar, reflecting model status
  - Operator sees: GlobalNavbar.vue health integration
  - Database: no change
  - Logs: Health poll intervals (2s)

---

### STEP 12: Browser Navigation (Back/Forward)

**Actor**: Nuxt Router + GlobalNavbar
**Action**: On browser back/forward, GlobalNavbar updates active link:
  1. Listen to `popstate` event (Nuxt router emits route change)
  2. Update active link class based on `useRoute().path`
  3. Update progress bar if on lesson page (progress data from URL params)

**Input**: User presses browser back/forward button
**Output on SUCCESS**: Active link highlights correct page, progress bar updates — GO TO STEP 13
**Output on FAILURE**:
  - `FAILURE(active_link_stale)`: Active link doesn't update on back/forward -> ensure `useRoute()` reactive, not static `to` prop
  - `FAILURE(progress_stale)`: Progress bar doesn't update when navigating back to lesson page -> re-fetch progress data on route change
  - `FAILURE(history_state)`: SPA navigation doesn't push to browser history -> ensure `<NuxtLink>` uses `push` (not `replace`)

**Observable states during this step**:
  - Customer sees: correct active link after back/forward
  - Operator sees: route path in GlobalNavbar matches `location.pathname`
  - Database: no change
  - Logs: `[frontend] route change to /dashboard`

---

### STEP 13: Full Theme Rebrand (Global CSS)

**Actor**: Frontend (main.css, nuxt.config.ts)
**Action**: Update global CSS for light mode:
  1. Body background: `bg-stone-50` (light) / `bg-stone-900` (dark)
  2. Remove dark gradient orbs, add light mode subtle teal orbs
  3. Scrollbars: `#fafaf9` (light) / `#1c1917` (dark) track
  4. Textarea caret: `#14b8a6` (primary-500) — not `#FF512F`
  5. Placeholder color: `#78716c` (stone-500) — not `#404040`
  6. Film grain: opacity reduced from 0.025 to 0.01 (light mode)
  7. Dark mode: preserve existing `.dark:` variants

**Input**: Current `main.css` (dark-only, `studio-*` colors, orange/magenta accents)
**Output on SUCCESS**: Light mode renders correctly, dark mode preserved — GO TO STEP 14
**Output on FAILURE**:
  - `FAILURE(light_mode_missing)`: Light mode not implemented (only `.dark:` variants exist) -> implement full light/dark dual theme
  - `FAILURE(scrollbar_regression)`: Light mode scrollbar uses dark colors -> update `::-webkit-scrollbar-track` and thumb for light mode
  - `FAILURE(film_grain_visible)`: Film grain too visible in light mode -> reduce opacity to 0.01, add `.dark:` override to keep 0.025
  - `FAILURE(caret_visible)`: Textarea caret `#FF512F` too bright on light background -> use `primary-500` (`#14b8a6`)

**Observable states during this step**:
  - Customer sees: light mode with teal/gold, dark mode preserved
  - Operator sees: `main.css` diff showing light mode additions
  - Database: no change
  - Logs: Nuxt dev server re-compiles

---

### STEP 14: UnoCSS Config Update

**Actor**: Frontend (uno.config.ts)
**Action**: Update UnoCSS configuration:
  1. Remove `studio` color palette (900, 800, 700)
  2. Remove `sunrise` color palette (orange, magenta)
  3. Add `primary` palette (50-900, teal scale)
  4. Add `gold` palette (400-600)
  5. Update `fontFamily`: `sans` = `Inter`, `arabic` = `Amiri`
  6. Keep breakpoints (xs, sm, md, lg, xl, 2xl)

**Input**: Current `uno.config.ts` (studio, sunrise tokens, Plus Jakarta Sans, Noto Sans Arabic)
**Output on SUCCESS**: All UnoCSS utilities use new tokens — GO TO STEP 15
**Output on FAILURE**:
  - `FAILURE(token_not_defined)`: Component references `primary-500` but UnoCSS doesn't define it -> add to theme
  - `FAILURE(shortcut_broken)`: Existing shortcuts (`.btn`, `.card`) reference removed colors -> update shortcut definitions
  - `FAILURE(gradient_utility)`: `bg-gradient-to-r from-primary-500 to-primary-600` doesn't render -> verify UnoCSS presetWind3 supports custom color gradients

**Observable states during this step**:
  - Customer sees: no visual change (config-only, compiled to CSS)
  - Operator sees: `uno.config.ts` diff showing token updates
  - Database: no change
  - Logs: UnoCSS re-generates CSS on config change

---

### STEP 15: Sticky Audio Bar (Deferred — Future Phase)

**Actor**: Frontend (app/components/StickyAudioBar.vue)
**Action**: Create `StickyAudioBar.vue` — fixed bottom, slides up when active. Replaces or wraps current `AudioPlayerPanel` on TTS Studio page. Reusable across Dashboard and Lesson pages.

**Input**: Current `AudioPlayerPanel.vue` (slide-up from bottom on TTS Studio)
**Output on SUCCESS**: `StickyAudioBar.vue` created, integrated into all pages — GO TO STEP 16
**Output on FAILURE**:
  - `FAILURE(duplicate_controls)`: Both `AudioPlayerPanel` and `StickyAudioBar` render simultaneously -> migrate all references to `StickyAudioBar`, remove `AudioPlayerPanel`
  - `FAILURE(fixed_position_overlap)`: Fixed bottom bar overlaps content on pages without bottom padding -> add `pb-20` to all page containers
  - `FAILURE(voice_selector_conflict)`: Sticky bar's speed controls conflict with VoiceSelector's speed slider -> unify speed control into Sticky bar, remove from VoiceSelector

**Observable states during this step**:
  - Customer sees: audio player bar fixed at bottom, slides up during playback
  - Operator sees: `StickyAudioBar.vue` in `app/components/`
  - Database: no change
  - Logs: Nuxt dev server re-compiles

---

### ABORT_CLEANUP: Any Step Failure

**Triggered by**: Any step's FAILURE path that leaves the system in an inconsistent state.

**Actions** (in order):
1. **Revert code changes** — git checkout modified files to pre-workflow state (if working locally) or remove new files
2. **Remove new components** — delete `GlobalNavbar.vue`, `StickyAudioBar.vue`, `dashboard.vue`, `[level]/[lesson].vue`
3. **Restore app.vue** — revert to bare `<NuxtPage />` (previous state)
4. **Restore index.vue** — revert panel heights to `100vh`, body `overflow: hidden`
5. **Restore uno.config.ts** — revert `studio`/`sunrise` tokens
6. **Restore main.css** — revert to dark-only styling
7. **Restore nuxt.config.ts** — revert font links if CDN option used
8. **Verify baseline** — `./run-tests.sh` passes (must be true for any abort)

**What customer sees**: App works exactly as before (no changes applied)
**What operator sees**: No new files in `app/`, `app.vue` unchanged, tests pass

---

## State Transitions

```
[Pre-workflow: Single-page TTS Studio at /]
  |
  +-> (Steps 1-15 succeed) -> [Post-workflow: Multi-page platform with GlobalNavbar]
  |
  +-> (Any step fails, ABORT_CLEANUP succeeds) -> [Pre-workflow state preserved]
  |
  +-> (Any step fails, ABORT_CLEANUP fails) -> [Partial state — manual intervention required]
```

### Page States (after workflow)

| Page | Route | Navbar Active Link | Progress Bar |
|---|---|---|---|
| TTS Studio | `/` | "Home" (TTS Studio) | 0% (no lesson) |
| Dashboard | `/dashboard` | "Dashboard" | 0% (no lesson) |
| Lesson | `/dashboard/level/{level}/{lesson}` | "Lessons" | Dynamic fill (per-lesson progress) |

---

## Handoff Contracts

### Nuxt Router → GlobalNavbar (Route Change Event)

**Event**: `route:change` (Nuxt router emits on SPA navigation)

**Payload**:
```json
{
  "path": "string — full URL path (e.g., '/dashboard')",
  "query": "object — URL query parameters",
  "from": "string — previous route path",
  "to": "string — new route path"
}
```

**Success response**: GlobalNavbar updates `activeLink` state, re-renders nav highlight
**Failure response**: N/A (client-side event, no server response)
**Timeout**: N/A (synchronous Reactivity update)
**On failure**: Active link doesn't update — customer sees stale highlight

### GlobalNavbar → useHealthPoll (Model Status Query)

**Endpoint**: `GET /health` (proxied to backend)

**Payload**: None (query parameter optional: `?reload=1`)

**Success response**:
```json
{
  "status": "loading | ready | error",
  "model_loaded": true | false
}
```

**Failure response**:
```json
{
  "ok": false,
  "error": "string — HTTP status + message",
  "retryable": true
}
```

**Timeout**: 10s (per request), 300s (cumulative max retries × 2s interval)
**On failure**: Progress bar shows error state (red fill), toast: "Model unavailable"

### GlobalNavbar → Backend (Per-Lesson Progress Query)

**Endpoint**: `GET /api/lessons/progress` (deferred — future phase)

**Payload**:
```json
{
  "level": "string — e.g., 'a1'",
  "lesson": "string — e.g., '1'"
}
```

**Success response**:
```json
{
  "completed_steps": "number",
  "total_steps": "number",
  "progress_percent": "number (0–100)"
}
```

**Failure response**:
```json
{
  "ok": false,
  "error": "string",
  "retryable": true
}
```

**Timeout**: 5s
**On failure**: Progress bar shows 0% (track visible, no fill)

### Frontend → Backend (Orphan Cleanup)

**Endpoint**: `POST /api/cleanup` (deferred — or use existing `/api/history?cleanup=true`)

**Payload**:
```json
{
  "synthesis_id": "string — ID of the synthesis to clean up"
}
```

**Success response**:
```json
{
  "cleaned_files": "number — count of files removed",
  "message": "string — 'Orphan files cleaned'"
}
```

**Failure response**:
```json
{
  "ok": false,
  "error": "string — e.g., 'Cleanup endpoint not implemented'",
  "retryable": false
}
```

**Timeout**: 30s (file I/O)
**On failure**: Orphan files remain on disk (see RF-1 in REGISTRY.md)

---

## Cleanup Inventory

| Resource | Created at Step | Destroyed by | Destroy Method |
|---|---|---|---|
| GlobalNavbar.vue | Step 2 | ABORT_CLEANUP | Delete file |
| StickyAudioBar.vue | Step 15 | ABORT_CLEANUP | Delete file |
| dashboard.vue | Step 7 | ABORT_CLEANUP | Delete file |
| [level]/[lesson].vue | Step 8 | ABORT_CLEANUP | Delete file + folder |
| app.vue (modified) | Step 1 | ABORT_CLEANUP | git checkout / restore |
| index.vue (modified) | Step 3 | ABORT_CLEANUP | git checkout / restore |
| uno.config.ts (modified) | Step 14 | ABORT_CLEANUP | git checkout / restore |
| main.css (modified) | Step 13 | ABORT_CLEANUP | git checkout / restore |
| nuxt.config.ts (modified) | Step 5 | ABORT_CLEANUP | git checkout / restore |
| Font files (Inter, Amiri) | Step 5 | ABORT_CLEANUP | Delete from assets/fonts/ |
| Orphan MP3 + .json files | Step 10 (cleanup) | Step 10 (cleanup) | `/api/cleanup` endpoint |

---

## Reality Checker Findings

| # | Finding | Severity | Spec section affected | Resolution |
|---|---|---|---|---|
| RC-1 | **`useHealthPoll` is NOT a singleton** — `index.vue` calls `useHealthPoll()` and `ModelStatusIndicator.vue` also calls `useHealthPoll()` — each creates an independent 2s polling interval. The GlobalNavbar needs its own `useHealthPoll()` instance for the progress bar. This means 3 simultaneous health polls (index.vue, ModelStatusIndicator, GlobalNavbar) = 6 intervals firing every 2s. | Critical | Step 11 (Backend Health Integration) | Share `useHealthPoll` state via a global composable singleton or provide `baseUrl` option to skip re-polling. |
| RC-2 | **`ModelStatusIndicator` and `MobileStatusIndicator` are embedded inside `index.vue`** — they call `useHealthPoll()` independently. After adding GlobalNavbar (which also calls `useHealthPoll()`), there will be 4 instances. The backend's single `_model_lock` doesn't care about concurrent health checks, but the frontend network traffic increases 4x. | High | Step 11 (Backend Health Integration) | Refactor to a single shared instance. |
| RC-3 | **`VoiceSelector.previewVoice()` is dead code** (RF-3) — it calls `showToast()` but plays no audio. This workflow doesn't fix it, but the requirement R-11 lists VoiceSelector as needing color token updates. The dead code path remains dead. | Low | Step 4 (Theme Token Migration) | Document as known — leave as-is (AGENTS.md §2: no drive-by fixes). |
| RC-4 | **`index.vue` has 751 lines** — adapting this monolithic file to account for navbar height is high-risk. The file contains mobile/desktop branching, panel dragging, synthesis, audio playback, keyboard shortcuts, and toast notifications all in one file. | High | Step 3 (TTS Studio Layout Adaptation) | This is not a spec gap — it's an implementation risk. Suggest splitting `index.vue` into smaller components before layout changes. |
| RC-5 | **No backend API for lesson progress** (OQ-8, OQ-9 deferred) — Step 8 (Lesson Page Shell) and Step 11 (Progress bar) reference `/api/lessons/progress` which doesn't exist yet. The spec handles this gracefully (progress bar shows 0% on failure), but it means the progress bar is non-functional until OQ-8/OQ-9 are implemented. | Medium | Step 8, Step 11 (Progress bar) | Document as deferred — progress bar is cosmetic until backend API exists. |
| RC-6 | **Existing `AudioPlayerPanel` slides up from bottom** (inside `index.vue` template, lines 650-663) — this is a floating panel on the TTS Studio page. The StickyAudioBar (Step 15) is a fixed-bottom bar. They serve the same purpose but have different positioning. | Medium | Step 15 (Sticky Audio Bar) | Must migrate all `AudioPlayerPanel` references to `StickyAudioBar` and remove the old component. |
| RC-7 | **`nuxt.config.ts` has `'/': { prerender: true }`** (line 33) — the TTS Studio page is pre-rendered. After adding a global navbar with SSR content (model status, active link), the prerendered HTML may not match CSR (hydration mismatch). | Medium | Step 1 (App Shell), Step 6 (SEO) | Remove prerender rule for `/` or ensure GlobalNavbar is fully SSR-compatible. |

---

## Test Cases

| Test | Trigger | Expected behavior |
|---|---|---|
| TC-01: Happy path — app shell restructuring | Deploy workflow, navigate to `/`, `/dashboard`, `/dashboard/level/a1/1` | Navbar renders on all pages, pages render below navbar, no layout regression |
| TC-02: Happy path — GlobalNavbar active link | Navigate to `/dashboard`, then `/dashboard/level/a1/1` | "Dashboard" highlighted on `/dashboard`, "Lessons" highlighted on lesson page |
| TC-03: Happy path — TTS Studio adaptation | Navigate to `/`, verify panel height | Panels = `calc(100vh - 60px)` on desktop, panels = `calc(100vh - 64px - safe-area)` on mobile |
| TC-04: Happy path — theme migration | Load any page in light mode, toggle dark mode | No `studio-*` or `sunrise-*` references remain, teal/gold palette renders correctly |
| TC-05: Happy path — fonts | Load any page | Inter renders for UI labels, Amiri renders for Arabic text |
| TC-06: Happy path — SEO titles | Load `/`, `/dashboard`, `/dashboard/level/a1/1` | `<title>` = "LughatChat - TTS Studio", "LughatChat - Dashboard", "LughatChat - {lesson}" |
| TC-07: Happy path — mobile navbar | Resize viewport below 768px | Nav icons visible, action buttons in dropdown, touch targets ≥ 44px |
| TC-08: Happy path — progress bar | Navigate to `/dashboard/level/a1/1` | Progress bar shows track (no fill, no backend API yet) |
| TC-09: Failure — incomplete theme migration | Run `grep -rn "studio-\|sunrise-" frontend/app/` | Zero matches expected — if any match found, workflow fails |
| TC-10: Failure — layout regression | Navigate to `/`, check panel heights | Panels sum to `calc(100vh - 60px)` — if not, abort |
| TC-11: Failure — mobile touch targets | Load `/dashboard` at < 768px, measure all interactive elements | All touch targets ≥ 44px — if any < 44px, abort |
| TC-12: Failure — hydration mismatch | Load any page in SSR, compare HTML to CSR | SSR HTML matches CSR — if mismatch, abort (fix SSR/CSR parity) |
| TC-13: Failure — orphan cleanup not triggered | Start synthesis on `/`, click "Dashboard" in navbar | Confirmation dialog appears, "Clean & Leave" cleans up files, user navigates |
| TC-14: Failure — active link stale | Navigate `/` → `/dashboard` → back (browser back button) | "Dashboard" highlighted after back navigation |
| TC-15: Failure — health poll conflict | Load any page, check network tab | Only ONE health poll interval (2s) — if multiple, abort (share singleton) |
| TC-16: Failure — prerender hydration | Load pre-rendered `/` in CSR mode | No hydration mismatch — if mismatch, remove prerender rule |
| TC-17: Failure — font not found | Load any page, check Network tab | Inter + Amiri woff2 files loaded — if 404, abort (download and place files) |
| TC-18: Failure — broken route | Navigate to `/dashboard/nonexistent` | 404 page or redirect to `/dashboard` — not a crash |

---

## Assumptions

| # | Assumption | Where verified | Risk if wrong |
|---|---|---|---|
| A1 | Nuxt 4 merges root `useSeoMeta({ title: 'LughatChat' })` + per-page `useSeoMeta({ title: 'X' })` with ` - ` separator (producing "LughatChat - X") | Not verified — must test Nuxt 4 behavior. If it doesn't merge, manual concatenation needed in root. | Titles render as "LughatChatX" (no separator) or per-page title overrides root entirely. |
| A2 | `useHealthPoll` can be shared as a singleton across components (GlobalNavbar, ModelStatusIndicator on dashboard) | Partially verified — current code creates independent instances. Need to refactor to singleton pattern. | 2 simultaneous 2s health polls = 4 requests/second to backend during model loading (120s = 240 requests).| |
| A3 | Self-hosted Inter + Amiri woff2 files are < 500KB total | Not verified — must download and measure. If too large, subset fonts. | Slow initial page load, especially on mobile networks. |
| A4 | UnoCSS `presetWind3` supports custom color palettes (primary-50 through primary-900, gold-400 through gold-600) | Not verified — must test. Tailwind v3 color scale may not map 1:1 to UnoCSS. | `bg-primary-500` utility doesn't generate — components fall back to default colors. |
| A5 | GlobalNavbar can access `useRoute()` in SSR context | Not verified — Nuxt 4 may restrict router access during SSR. If unavailable, use `useNuxtApp()` fallback. | SSR renders navbar without active link, CSR swaps (hydration mismatch). |
| A6 | Backend `/health` endpoint is always available (even during model loading) | Partially verified — backend returns `loading` status during model load. If backend is completely unreachable, frontend health poll eventually errors out. | Frontend shows "Error" state for 300s (150 retries × 2s) before giving up. |
| A7 | `onBeforeRouteLeave` (Nuxt) can intercept navigation and show a confirmation dialog | Not verified — Nuxt 4 navigation guards may not support async dialogs. If blocked, use `window.beforeunload` as fallback. | Orphan files accumulate when user navigates away from active synthesis. |
| A8 | The existing `AudioPlayerPanel` can be fully replaced by `StickyAudioBar` without losing functionality | Not verified — must audit AudioPlayerPanel features (waveform, seek, speed, download, play/pause) against StickyAudioBar spec. | Missing features on StickyAudioBar (e.g., waveform visualization not supported). |
| A9 | Docker Compose `devProxy` in `nuxt.config.ts` proxies `/api/*` to backend — this works for the new dashboard/lesson pages | Partially verified — `nuxt.config.ts:42-49` proxies `/api/` and `/health` to localhost:9000. Dashboard pages don't call API endpoints (shell only). | `/api/lessons/progress` (deferred) won't proxy correctly if backend isn't running. |
| A10 | `prefers-reduced-motion` media query in `main.css` (lines 328-364) applies to GlobalNavbar animations | Partially verified — `main.css` has `@media (prefers-reduced-motion: reduce)` block. Must verify it covers navbar transitions. | Users with motion sensitivity see animated navbar (WCAG 2.3.3 violation). |

---

## Open Questions

1. **Nuxt 4 title merging behavior** — Does Nuxt 4 automatically concatenate root + page-level `useSeoMeta({ title })` with ` - ` separator, or does per-page title override root? (Assumption A1)
2. **`useHealthPoll` singleton pattern** — How should the remaining instances (ModelStatusIndicator on dashboard, GlobalNavbar) share one polling interval?? (Assumption A2)
3. **Font file sizes** — What is the total size of Inter (400, 500, 600, 700) + Amiri (400, 700) woff2 files? (Assumption A3)
4. **Backend lesson progress API** — When will `/api/lessons/progress` be implemented? The progress bar is cosmetic until then. (RF-5 in REGISTRY.md)
5. **`AudioPlayerPanel` vs `StickyAudioBar` migration** — What features exist in `AudioPlayerPanel` that `StickyAudioBar` doesn't cover? (Assumption A8)
6. **Prerender rule impact** — Should `/` prerender rule (`nuxt.config.ts:33`) be removed to avoid SSR/CSR mismatch with dynamic navbar? (RC-7)
7. **Mobile navbar height tradeoff** — If mobile navbar is 64px (for WCAG touch targets), TTS Studio panels get `calc(100vh - 64px - safe-area)` = potentially < 200px for waveform. Is this acceptable? (Step 3)
8. **GlobalNavbar SSR compatibility** — Can the navbar render meaningful content during SSR (model status, active link), or must it render a placeholder and hydrate on client? (Assumption A5)

---

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|---|---|---|
| 2026-08-03 | Initial spec created | — |

---

## Summary: Counts

| Category | Count |
|---|---|
| **Steps** | 15 (Steps 1-15, Step 15 deferred) |
| **Failure paths per step** | 15 (≥ 1 per step, many steps have 2-3) |
| **Cleanup entries** | 11 (GlobalNavbar.vue, StickyAudioBar.vue, dashboard.vue, [level]/[lesson].vue, app.vue, index.vue, uno.config.ts, main.css, nuxt.config.ts, font files, orphan files) |
| **Test cases** | 18 (TC-01 through TC-18) |
| **Reality Checker findings** | 7 (RC-1 through RC-7) |
| **Assumptions** | 10 (A1 through A10) |
| **Open questions** | 8 |
| **ADR constraints covered** | 9 (C1 through C9) |

---

## ADR Constraint Cross-Reference

| ADR Constraint | Spec Section | Status |
|---|---|---|
| C1: `app.vue` wraps `<NuxtPage />` with `<GlobalNavbar />` | Step 1 | ✅ Covered |
| C2: Top bar 56px + progress 4px = 60px total | Step 2 | ✅ Covered |
| C3: Mobile breakpoint 768px | Step 9 | ✅ Covered |
| C4: Mobile navbar may grow to 64px for WCAG | Step 9 | ✅ Covered |
| C5: TTS Studio panels `calc(100vh - 60px)` | Step 3 | ✅ Covered |
| C6: Every page adapts layout (flex column, overflow visible) | Steps 3, 7, 8 | ✅ Covered |
| C7: Navbar aware of every page's state (active link, progress) | Steps 2, 11, 12 | ✅ Covered |
| C8: Browser back/forward updates navbar active state | Step 12 | ✅ Covered |
| C9: Testing surface expands (new component tests, integration tests) | TC-01 through TC-18 | ✅ Covered |

All 9 ADR constraints are addressed in this spec. No constraints are violated.
