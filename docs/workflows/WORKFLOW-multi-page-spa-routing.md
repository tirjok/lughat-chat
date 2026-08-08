# WORKFLOW: Multi-Page SPA Routing

**Version**: 0.1
**Date**: 2026-08-03
**Author**: Workflow Architect
**Status**: Draft
**Implements**: ADR-002 (Multi-Page SPA Routing Structure)
**References**: `docs/requirements/navigation-dashboard.md` (D2, D3, D4, R-8, R-9, R-13), `docs/workflows/REGISTRY.md` (RF-6, RF-7, RF-11)

---

## Overview

LughatChat transitions from a single-page TTS Studio (`/`) to a multi-page Language Learning Platform with three route groups: TTS Studio at `/`, Dashboard at `/dashboard`, and hierarchical lesson pages at `/dashboard/level/{level}/{lesson}`. This workflow specifies the complete lifecycle of **page navigation** — from the moment a user clicks a navigation link (or types a URL) to the moment the new page is fully rendered, all composables are torn down, and any in-flight synthesis is handled. Every path through the navigation system is specified, including failure modes, cleanup, and cross-page state handoffs.

This workflow covers **four actors**: Customer (navigates), Frontend SPA Router (Nuxt file-based routing), Composables (health poll, audio, voices, panel toggle), and Backend (health endpoint, API proxy via Nginx).

---

## Actors

| Actor | Role in this workflow |
|---|---|
| Customer | Clicks nav link, types URL, or uses browser back/forward |
| Nuxt Router | Resolves file-based routes, mounts/unmounts page components |
| GlobalNavbar (new) | Provides navigation links, detects active route, renders on all pages |
| Composables (existing) | `useHealthPoll`, `useAudioModule`, `useVoices`, `usePanelToggle`, `useTtsApi`, `useInputValidation`, `useToast`, `useScrollReveal` — lifecycle tied to page/component mount/unmount |
| Nginx Reverse Proxy | Serves SPA fallback for all routes, proxies `/api/*` and `/health` to backend |
| Backend (FastAPI) | Serves `/health`, `/api/*` endpoints — same as before, unaffected by routing |

---

## Prerequisites

- [ ] `app/components/GlobalNavbar.vue` exists and renders correctly on all pages
- [ ] `app/pages/dashboard.vue` exists (dashboard shell)
- [ ] `app/pages/dashboard/level/[level]/index.vue` exists (level shell)
- [ ] `app/pages/dashboard/level/[level]/[lesson].vue` exists (lesson shell)
- [ ] `nuxt.config.ts` `routeRules` updated to include new routes (or explicitly excluded from prerender)
- [ ] `nginx.conf` SPA fallback handles new routes (already does: `try_files $uri $uri/ /index.html` matches all)
- [ ] `app.vue` wraps `<NuxtPage />` with `<GlobalNavbar />` (layout restructuring complete)
- [ ] `index.vue` (TTS Studio) layout adapted to `calc(100vh - 60px)` with navbar height subtracted
- [ ] All 11 existing customer journeys on `/` remain functional (R-13)

---

## Trigger

The workflow is triggered by any of:

1. **Customer clicks a `<NuxtLink>`** in `GlobalNavbar` (Home, Dashboard, My Courses)
2. **Customer types a URL** directly into the browser address bar
3. **Customer uses browser back/forward buttons**
4. **Programmatic navigation** via `navigateTo()` from composables or components

---

## Workflow Tree

### STEP 1: Route Resolution

**Actor**: Nuxt Router (file-based)
**Action**: Resolves the URL path to the corresponding page file using Nuxt 4 file-based routing.

**Input**: `{ path: string }` — e.g., `/dashboard`, `/dashboard/level/a1`, `/dashboard/level/a1/1`

**Output on SUCCESS**: `{ matchedRoute: string, pageComponent: VueComponent }` → GO TO STEP 2

**Output on FAILURE**:
- `FAILURE(not_found)`: No matching page file exists → [recovery: render 404 page (Nuxt default), log warning, no cleanup needed]
- `FAILURE(malformed_route)`: Invalid dynamic segment (e.g., `/dashboard/level/`) → [recovery: redirect to `/dashboard`, no cleanup needed]

**Observable states during this step**:
- Customer sees: Current page still visible (no flash)
- Operator sees: Route transition in Nuxt DevTools (if enabled)
- Database: No change
- Logs: `[nuxt] route resolved: /dashboard → dashboard.vue`

---

### STEP 2: Old Page Teardown (UNMOUNT)

**Actor**: Vue 3 (Nuxt page lifecycle)
**Action**: Unmounts the currently active page component. All composables scoped to that page are disposed. This is the **critical step** where cross-page state is handled.

**Input**: `{ oldPage: VueComponent, oldComposables: ComposableInstances[] }`

**Output on SUCCESS**: `{ disposedComposables: string[], orphanedResources: ResourceList }` → GO TO STEP 3

**Output on FAILURE**:
- `FAILURE(composable_error)`: A composable's `onUnmounted` handler throws → [recovery: catch and log error, continue with remaining disposals, mark the failing composable as "partially disposed"]
- `FAILURE(inflight_synthesis)`: `isGenerating.value === true` or `audioModule.isStreaming` on the old page → [recovery: TRIGGER ORPHAN CLEANUP DIALOG (R-7), see STEP 2a]

**Observable states during this step**:
- Customer sees: Current page content (no change yet — teardown is synchronous)
- Operator sees: Vue DevTools show component unmount
- Database: No change
- Logs: `[nuxt] page unmount: index.vue`, `[composable] useAudioModule.dispose()`, `[composable] useHealthPoll.stop()`

#### STEP 2a: In-Flight Synthesis Cleanup (Conditional — R-7)

**Triggered by**: `isGenerating.value === true` OR `audioModule.isStreaming` during Step 2.

**Actor**: Frontend (TTS Studio page component)
**Action**: Per R-7, intercept the navigation with a confirmation dialog.

**Input**: `{ isGenerating: boolean, audioUrl: string | null, textInput: string }`

**Output on SUCCESS (user clicks "Clean & Leave")**:
1. `audioModule.dispose()` — revokes object URLs, removes event listeners
2. `fetch('/api/cleanup')` — triggers backend orphan file cleanup
3. Continue to Step 3 (navigation proceeds)

**Output on FAILURE (user clicks "Stay")**:
- Abandon navigation, restore old page component (if router supports), log warning

**Output on FAILURE (network error during cleanup)**:
- Files may remain orphaned on disk. Log error, show toast: "Cleanup failed — files may need manual removal." Continue navigation (files will be caught by 24h TTL cleanup).

**Output on FAILURE (backend unavailable — 503)**:
- Same as network error. Show toast: "Backend unavailable — orphan files will be cleaned by scheduled job." Continue navigation.

**Observable states during this step**:
- Customer sees: Confirmation dialog ("A synthesis is in progress. Clean up the generated files when you leave?")
- Operator sees: `isGenerating = true` flag in state
- Database: No change
- Logs: `[navigation] in-flight synthesis detected, showing cleanup dialog`

---

### STEP 3: New Page Mount (MOUNT)

**Actor**: Vue 3 (Nuxt page lifecycle)
**Action**: Mounts the new page component. All page-scoped composables are initialized.

**Input**: `{ pageComponent: VueComponent, routeParams: RouteParams }`

**Output on SUCCESS**: `{ mountedPage: string, initializedComposables: string[] }` → GO TO STEP 4

**Output on FAILURE**:
- `FAILURE(composable_error)`: A composable's `onMounted` handler throws → [recovery: catch error, log, render page skeleton with error boundary, show toast]
- `FAILURE(ssr_mismatch)`: Hydration mismatch between server-rendered HTML and client — [recovery: Nuxt warns, falls back to client render, page may flash]

**Observable states during this step**:
- Customer sees: New page content loading (skeleton/placeholder if async)
- Operator sees: Vue DevTools show component mount
- Database: No change
- Logs: `[nuxt] page mount: dashboard.vue`, `[composable] useHealthPoll.start()`, `[composable] useVoices.loadVoices()`

---

### STEP 4: Composable Initialization

**Actor**: Each composable (scoped to the new page)
**Action**: Every composable used by the new page initializes its state and starts its lifecycle.

**Composables that initialize on every page mount**:

| Composable | File | Action | Scope |
|---|---|---|---|
| `useHealthPoll` | `useHealthPoll.ts` | Starts 2s polling of `/health`, stops on terminal state | **All pages** (cross-page persistence concern) |
| `useVoices` | `useVoices.ts` | Calls `GET /api/voices` on mount | **All pages** (cross-page persistence concern) |
| `useToast` | `useToast.ts` | Exposes `toastState` ref — no lifecycle, global singleton | **All pages** (always active) |

**Composables that initialize only on `/` (TTS Studio)**:

| Composable | File | Action | Scope |
|---|---|---|---|
| `useAudioModule` | `useAudioModule.ts` | Wires `<audio>` element, tracks playback state | **TTS Studio only** |
| `useTtsApi` | `useTtsApi.ts` | Provides `synthesize()`, `healthCheck()` | **TTS Studio only** |
| `useInputValidation` | `useInputValidation.ts` | Pure function, reactive to `textInput` + `modelStatus` | **TTS Studio only** |
| `usePanelToggle` | `usePanelToggle.ts` | Manages `activePanel`, `isMobile`, resize listener | **TTS Studio only** (dashboard/lesson pages don't use panels) |
| `useScrollReveal` | `useScrollReveal.ts` | Sets up IntersectionObserver for fade-up | **Dashboard + Lesson pages** (TTS Studio uses it too via `controlDeckDesktopRef`, `canvasHeaderRef`) |

**Output on SUCCESS**: `{ initializedComposables: string[] }` → GO TO STEP 5

**Output on FAILURE**:
- `FAILURE(health_poll_error)`: `/health` returns 503 or network error on first check → [recovery: status = 'error', stops polling after 150 retries (300s), dashboard/lesson pages continue to render, TTS Studio shows "Model unavailable" banner]
- `FAILURE(voice_load_error)`: `/api/voices` fails → [recovery: `voices.value = []`, `error.value = message`, VoiceSelector shows "No voices available" state]

**Observable states during this step**:
- Customer sees: Page content (loading spinner on health status if loading)
- Operator sees: `useHealthPoll` polling at 2s intervals, `useVoices` fetching
- Database: No change (backend only)
- Logs: `[health] polling started, interval=2000ms`, `[voices] GET /api/voices`

---

### STEP 5: Navigation Complete

**Actor**: Nuxt Router (client)
**Action**: Updates browser URL, history entry, active `<NuxtLink>` state in `GlobalNavbar`.

**Input**: `{ path: string, routeParams: RouteParams }`

**Output on SUCCESS**: `{ navigationComplete: true, historyUpdated: boolean }` → WORKFLOW COMPLETE

**Output on FAILURE**:
- `FAILURE(history_error)`: `history.pushState()` throws (rare, browser-specific) → [recovery: URL does not update in address bar, navigation still renders, user can manually refresh to fix]

**Observable states during this step**:
- Customer sees: Updated URL in address bar, active nav link highlighted
- Operator sees: Browser history entry updated
- Database: No change
- Logs: `[nuxt] navigation complete: /dashboard`

---

## ABORT_CLEANUP: Navigation Abandoned

**Triggered by**: Step 2a, user clicks "Stay" during in-flight synthesis cleanup.

**Actions** (in order):
1. Cancel navigation (router aborts)
2. Restore previous page component (if router supports navigation abort)
3. Resume synthesis (if `audioModule` was not disposed)
4. If `audioModule.dispose()` was already called: `audioModule.load(audioBlob)` — re-load the aborted blob (requires blob to still be in memory)
5. Show toast: "Navigation cancelled — synthesis will continue."

**What customer sees**: Back on the TTS Studio page, synthesis continues or is restored.

**What operator sees**: `isGenerating = true` flag re-established, no cleanup triggered.

---

## State Transitions

```
[Page A active]
  |
  +-- (user clicks nav link) --> [Route Resolution] --> [Page A Teardown] --> [Page B Mount] --> [Page B Active]
  |
  +-- (in-flight synthesis on Page A) --> [Cleanup Dialog] --> [Clean & Leave] --> [Page B Active]
  |
  +-- (in-flight synthesis on Page A) --> [Cleanup Dialog] --> [Stay] --> [Page A Active (no change)]
  |
  +-- (direct URL / browser back/forward) --> [Same as click path]
  |
  +-- (404 route) --> [404 Page Rendered]
```

### Cross-Page State Persistence

The following state **does NOT persist** across page navigation (each page gets a fresh composable instance):

| State | Current Behavior | After Multi-Page |
|---|---|---|
| `textInput` (TTS text) | Page-scoped | **Lost** on navigation away from `/` |
| `selectedSpeaker` (voice) | Page-scoped | **Lost** on navigation away from `/` |
| `speedValue` | Page-scoped | **Lost** on navigation away from `/` |
| `isGenerating` | Page-scoped | **Lost** on navigation away from `/` |
| `audioUrl`, `isPlaying`, `isPaused`, `currentTime`, `duration` | `useAudioModule` (page-scoped) | **Lost** on navigation away from `/` |
| `modelStatus` (health) | `useHealthPoll` (page-scoped) | **Restarted** on every page mount (re-polls) |
| `voices` (voice list) | `useVoices` (page-scoped) | **Reloaded** on every page mount (every page calls `/api/voices`) |
| `activePanel` (panel toggle) | `usePanelToggle` (page-scoped) | **Reset** to `'control-deck'` on dashboard/lesson pages |
| Toast notifications | `useToast` (global singleton) | **Persists** across pages (same instance) |

---

## Handoff Contracts

### GlobalNavbar → Nuxt Router

**Mechanism**: `<NuxtLink :to="path">` click event
**Payload**:
```json
{
  "path": "string — target route, e.g. '/dashboard'"
}
```
**Success response**: `{ navigationStarted: true }` (router handles rest)
**Failure response**: `{ error: string }` (route not found)
**Timeout**: N/A (synchronous)

### TTS Studio Page → Backend (Orphan Cleanup on Navigation)

**Endpoint**: `POST /api/cleanup` (existing endpoint, called from frontend)
**Payload**: `{}` (no body)
**Success response**: `{ cleaned: number, message: string }` (number of files removed)
**Failure response**:
```json
{
  "ok": false,
  "error": "string — reason",
  "code": "CLEANUP_FAILED"
}
```
**Timeout**: 10s (client-side fetch timeout)
**On timeout**: Show toast, continue navigation, files will be caught by 24h TTL

### Nginx → Backend (SPA Fallback)

**Mechanism**: `try_files $uri $uri/ /index.html` (existing nginx.conf)
**Payload**: `{ method: string, path: string }` (HTTP request)
**Success response**: `{ status: 200, body: HTML }` (SPA shell)
**Failure response**: `{ status: 404 }` (if `index.html` not found — should never happen in production)
**Timeout**: 30s (Nginx default)

### Nginx → Backend (API Proxy for Dashboard/Lesson pages)

**Mechanism**: `location /api/ { proxy_pass http://backend:8000; }` (existing nginx.conf)
**Payload**: `{ method: string, path: string, body: object }` (API request)
**Success response**: `{ data: object, status: number }` (API response)
**Failure response**: `{ ok: false, error: string, code: string, retryable: boolean }` (API error)
**Timeout**: 1800s for `/api/*` (existing: `proxy_read_timeout 1800s`)

---

## Cleanup Inventory

| Resource | Created at Step | Destroyed By | Destroy Method |
|---|---|---|---|
| `useAudioModule` object URLs (`URL.createObjectURL(blob)`) | Step 3 (mount, if TTS Studio) | Step 2 (teardown, `audioModule.dispose()`) | `URL.revokeObjectURL()` (in `revokeAll()`) |
| `<audio>` event listeners (`play`, `pause`, `ended`, `error`, `timeupdate`) | Step 3 (mount, if TTS Studio) | Step 2 (teardown, `wireEvents()` removal) | `audioElement.removeEventListener()` (in `dispose()`) |
| `useHealthPoll` interval (`setInterval(checkHealth, 2000)`) | Step 4 (mount, all pages) | Step 2 (teardown) | `clearInterval(intervalId)` (in `checkHealth()` terminal check) |
| `useVoices` API call (in-flight `fetch('/api/voices')`) | Step 4 (mount, all pages) | Step 2 (teardown) | **Not aborted** — in-flight fetch continues, result discarded (no cleanup needed, no side effects) |
| `usePanelToggle` resize listener (`window.addEventListener('resize', ...)`) | Step 4 (mount, TTS Studio only) | Step 2 (teardown) | `useEventListener` from VueUse handles cleanup |
| `useScrollReveal` IntersectionObserver | Step 4 (mount, pages with fade-up elements) | Step 2 (teardown, `disconnect()`) | `observer.disconnect()` (in `onUnmounted`) |
| Orphaned MP3 + .json files (in-flight synthesis) | TTS Studio `handleSynthesize()` (Step 3) | Step 2a (cleanup dialog → `POST /api/cleanup`) | Backend deletes files from `downloads/` |
| Toast notification entries | Any step (`showToast()`) | Step 5 (completion) | Auto-dismiss after 5s (`DISMISS_DELAY`), or manual close |
| `useToast` dismiss timers (`setTimeout`) | `scheduleDismiss()` | Step 5 (completion) | `clearTimeout(timer)` (in `useToast.onMounted`) |

---

## Reality Checker Findings

| # | Finding | Severity | Spec section affected | Resolution |
|---|---|---|---|---|
| RC-1 | `useHealthPoll` restarts on **every** page mount (including dashboard/lesson). This means every page navigation triggers a fresh health check cycle. If the backend is slow to start (120s model load), the dashboard page will also show "loading" and the user will wait. | High | Step 4 (Composable Initialization) | **ADR constraint D2**: TTS Studio is primary, dashboard is secondary. Dashboard pages should NOT block on health. Consider: (a) health poll is non-blocking (dashboard renders regardless), (b) dashboard/lesson pages could use a shorter timeout or skip health polling entirely since they don't need the model. |
| RC-2 | `useVoices` calls `GET /api/voices` on **every** page mount (including dashboard/lesson pages that don't use voices). This is wasteful but harmless (cached by browser). | Low | Step 4 (Composable Initialization) | **ADR constraint**: Dashboard/lesson pages don't need `useVoices`. The new pages should NOT import or use `useVoices`. If they do, it's a waste. |
| RC-3 | `index.vue` currently has **no `onBeforeRouteLeave` guard** (R-7 is deferred). The workflow spec's Step 2a (cleanup dialog) is **not yet implemented** in the codebase. This spec assumes the guard exists. | Critical | Step 2a (In-Flight Synthesis Cleanup) | **ADR constraint R-7**: "Orphan File Cleanup on Navigation" is explicitly listed as in scope for this phase. The implementation must add the guard. |
| RC-4 | `nginx.conf` SPA fallback (`try_files $uri $uri/ /index.html`) already handles all new routes (`/dashboard`, `/dashboard/level/a1/1`). No change needed. | Low | Handoff: Nginx → Backend (SPA Fallback) | Confirmed — no spec change needed. |
| RC-5 | `nuxt.config.ts` `routeRules` only prerenders `/`. The dashboard and lesson pages are NOT prerendered. This means they load as full SPAs (slower initial load, but shows real data). This is the correct tradeoff per ADR. | Medium | Step 5 (Navigation Complete) | **ADR constraint**: "prerendered pages load faster but can't show live progress; dynamic pages are slower to load but show real data." Confirmed correct. |
| RC-6 | `usePanelToggle` exports `BREAKPOINT_MOBILE = 768` — this is the same breakpoint used in `index.vue` for mobile/desktop rendering. If the dashboard/lesson pages use a different breakpoint, there will be a visual mismatch. | Medium | Step 4 (Composable Initialization) | **ADR constraint**: Dashboard/lesson pages should NOT use `usePanelToggle` (they don't have panels). |
| RC-7 | `GlobalNavbar` does not exist yet. The spec assumes it exists and is wired into `app.vue`. This is a new file per the requirements (R-1). | High | Step 1 (Route Resolution), Step 5 (Navigation Complete) | **ADR constraint**: R-1 is in scope. The navbar must be built before this workflow can be tested. |
| RC-8 | `StickyAudioBar` (R-10) is a new component. The spec does NOT cover its lifecycle because it's outside the routing scope. However, if the dashboard/lesson pages use it, it must be wired into the page mount/teardown. | Low | Step 3 (New Page Mount), Step 2 (Old Page Teardown) | **ADR constraint**: R-10 is deferred to a future phase ("Sticky Audio Bar" is listed but content is deferred). |

---

## Test Cases

| Test | Trigger | Expected behavior |
|---|---|---|
| **TC-01: Happy path — navigate to Dashboard** | Click "Dashboard" in GlobalNavbar | `/dashboard` renders, health poll starts, voices fetched, GlobalNavbar highlights "Dashboard" as active |
| **TC-02: Happy path — navigate to Lesson page** | Click "My Courses" → select level → select lesson | `/dashboard/level/a1/1` renders, health poll starts, voices fetched (wasteful but harmless), GlobalNavbar highlights "My Courses" |
| **TC-03: Happy path — browser back/forward** | Press browser back button from `/dashboard` to `/` | TTS Studio remounts, health poll restarts, voices reloaded, audio module re-initialized |
| **TC-04: In-flight synthesis — user clicks "Clean & Leave"** | Navigate from `/` to `/dashboard` while `isGenerating === true` | Cleanup dialog appears, `audioModule.dispose()` called, `POST /api/cleanup` succeeds, navigation proceeds to `/dashboard` |
| **TC-05: In-flight synthesis — user clicks "Stay"** | Navigate from `/` to `/dashboard` while `isGenerating === true`, user clicks "Stay" | Navigation cancelled, TTS Studio remains, synthesis continues (or is restored if already disposed) |
| **TC-06: Backend unavailable during cleanup** | Navigate from `/` to `/dashboard` while `isGenerating === true`, backend returns 503 | Toast: "Backend unavailable — orphan files will be cleaned by scheduled job." Navigation proceeds to `/dashboard` |
| **TC-07: Direct URL navigation** | Type `/dashboard/level/a1/1` in address bar | Page renders, health poll starts, 404 if route file doesn't exist |
| **TC-08: Health poll failure on dashboard** | Navigate to `/dashboard` while backend is loading (120s) | Dashboard renders (non-blocking), health poll shows "loading" state, polls every 2s until terminal |
| **TC-09: Voice load failure on dashboard** | Navigate to `/dashboard` while `/api/voices` returns 500 | `voices.value = []`, `error.value = message`, no crash, page renders with no voice selector (dashboard doesn't use voices) |
| **TC-10: Route not found (404)** | Navigate to `/nonexistent` | 404 page rendered (Nuxt default), no composable errors |
| **TC-11: Composable error during mount** | A composable's `onMounted` throws | Error caught, page skeleton rendered with error boundary, toast shown, page still accessible |
| **TC-12: SSR hydration mismatch** | Server-rendered HTML differs from client | Nuxt warns, falls back to client render, page may flash briefly |
| **TC-13: Multiple rapid navigations** | Click "Dashboard" → immediately click "Home" | Second navigation aborts first, only the last navigation completes (router handles queueing) |
| **TC-14: In-flight synthesis — cleanup network error** | Navigate from `/` while `isGenerating === true`, cleanup API call fails (network error) | Orphan files may remain on disk. Toast: "Cleanup failed — files will be cleaned by 24h TTL." Navigation proceeds |
| **TC-15: Active synthesis on TTS Studio — no navigation** | Stay on `/`, synthesis completes, navigate away | `isGenerating = false`, no cleanup dialog, direct navigation to `/dashboard` |

---

## Assumptions

| # | Assumption | Where verified | Risk if wrong |
|---|---|---|---|
| **A1** | `GlobalNavbar` uses Nuxt `<NuxtLink>` for navigation (not programmatic `navigateTo()`). | Not verified — new file. | If `navigateTo()` is used, `onBeforeRouteLeave` guards may not fire consistently. |
| **A2** | Dashboard and lesson pages do **not** use `useAudioModule`, `useTtsApi`, `useInputValidation`, or `usePanelToggle`. | Not verified — new pages. | If they do, these composables will initialize unnecessarily, wasting resources. |
| **A3** | `useHealthPoll` is imported on **all** pages (including dashboard/lesson) because it provides cross-page model status. | Not verified — new pages may or may not need it. | If dashboard pages don't need health status, they should skip health polling to avoid 300s unnecessary API calls. |
| **A4** | `useVoices` is imported on **all** pages. | Not verified — new pages. | If dashboard/lesson pages don't need voices, this is wasteful (every page mount triggers `GET /api/voices`). |
| **A5** | The cleanup dialog (R-7) is implemented **before** this workflow is tested. | Not verified — R-7 is in scope. | Without the dialog, TC-04 through TC-06 cannot be tested; orphan files will accumulate. |
| **A6** | Nginx SPA fallback (`try_files $uri $uri/ /index.html`) already handles all new routes without config changes. | **Verified**: `nginx.conf:51-54`. | No risk — confirmed working. |
| **A7** | `nuxt.config.ts` `routeRules` does NOT prerender `/dashboard` or `/dashboard/level/**` pages (dynamic content). | **Verified**: `nuxt.config.ts:33` only prerenders `/`. | Confirmed correct — dynamic pages should not be prerendered. |
| **A8** | `app.vue` wraps `<NuxtPage />` with `<GlobalNavbar />` (layout restructuring per R-3). | Not verified — new layout. | Without this, the navbar won't render on any page. |
| **A9** | `index.vue` adapts to `calc(100vh - 60px)` (navbar height subtracted per R-3). | Not verified — existing file to be modified. | If not adapted, TTS Studio panels will be partially hidden behind the navbar. |
| **A10** | All 11 existing customer journeys on `/` remain functional after layout changes (R-13). | Not verified — existing functionality to be preserved. | If broken, the TTS Studio is unusable; this is the primary landing page (D2). |
| **A11** | `useToast` is a **global singleton** (not page-scoped) — it persists across page navigation. | **Verified**: `useToast.ts:13` (`toastState` is module-level, not per-component). | Confirmed — toast notifications survive page navigation. |
| **A12** | `usePanelToggle` uses VueUse's `useEventListener` and `tryOnMounted`, which handle cleanup on unmount. | **Verified**: `usePanelToggle.ts:17-18`. | Confirmed — no manual cleanup needed for resize listener. |

---

## Open Questions

1. **Should dashboard/lesson pages skip health polling?** The health poll restarts on every page mount (Step 4). If the backend is loading (120s), the dashboard page will also show "loading" — is this desired? Or should dashboard pages have a separate, shorter timeout?

2. **Should `useVoices` be page-scoped instead of global?** Every page mount triggers `GET /api/voices`. If the voice list is static (speaker WAV files on disk), it could be cached across pages. Is there a use case for dynamically adding voices between page navigations?

3. **What is the cleanup dialog UX?** R-7 specifies: "A synthesis is in progress. Clean up the generated files when you leave?" But the exact modal implementation (Nuxt UI dialog? custom? browser `beforeunload`?) is not specified.

4. **Does `useScrollReveal` need to be page-scoped?** It's used on TTS Studio (two refs) and potentially on dashboard/lesson pages. If page-scoped, each page gets its own observer. If shared, a single observer could watch multiple containers.

5. **What happens if a user navigates during the 120s model load?** Health polling is non-blocking (dashboard renders regardless). But if the user returns to `/` during loading, the TTS Studio will show "Model unavailable" — is this correct, or should it show a "Model loading" progress indicator?

6. **Should `navigateTo()` from composables trigger the cleanup dialog?** Currently, the cleanup dialog is page-scoped (TTS Studio). If a composable calls `navigateTo('/dashboard')` programmatically, the page's `onBeforeRouteLeave` guard may not fire.

---

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|---|---|---|
| 2026-08-03 | Initial spec created | — |
| 2026-08-03 | RC-3: `index.vue` has no `onBeforeRouteLeave` guard (R-7 deferred) | Flagged as Critical — R-7 must be implemented before testing |
| 2026-08-03 | RC-4: Nginx SPA fallback already handles all routes | Confirmed — no spec change needed |
| 2026-08-03 | RC-5: `routeRules` only prerenders `/` | Confirmed correct per ADR |
| 2026-08-03 | RC-7: `GlobalNavbar` does not exist yet | Flagged as High — new file required |
