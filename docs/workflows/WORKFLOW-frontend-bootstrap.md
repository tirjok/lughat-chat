# WORKFLOW: Frontend Application Bootstrap

**Version**: 0.1
**Date**: 2026-08-02
**Author**: Workflow Architect
**Status**: Draft
**Implements**: SPA load → model polling → ready state → UI initialization

---

## Overview

When a customer opens the app in their browser, the SPA (single prerendered HTML file) loads. The `index.vue` component mounts, initializes all composables, and starts polling the backend `/health` endpoint every 2 seconds. Simultaneously, the voice list is fetched from `/api/voices`. The UI remains in a "loading" state until the backend model is ready. Once ready, the customer can interact with the full TTS studio.

This workflow covers the complete frontend lifecycle from page load to interactive readiness.

---

## Actors

| Actor | Role in this workflow |
|---|---|
| Browser | Loads prerendered HTML, executes JavaScript |
| Nuxt | Hydrates SPA; auto-imports components and composables |
| `index.vue` (main page) | Orchestrates all composables and components |
| `useHealthPoll()` | Polls `/health` every 2 seconds; maps status to UI |
| `useVoices()` | Fetches `/api/voices` on mount; populates voice selector |
| `usePanelToggle()` | Detects mobile/desktop; manages panel state |
| `useScrollReveal()` | Observes DOM elements for fade-up animations |
| `useToast()` | Module-level shared toast state |
| Nginx | Serves SPA static files; proxies `/api/*` and `/health` to backend |

---

## Prerequisites

- Backend container is running (or will start soon)
- Docker network `lughat-network` is configured
- Nginx reverse proxy is configured (SPA files + API proxy)
- Browser supports modern JavaScript (ES6+, fetch API)

---

## Trigger

Browser navigates to the frontend URL (host port 9001 in production, port 3000 in development).

---

## Workflow Tree

### STEP 1: SPA Load
**Actor**: Browser (loads prerendered HTML)
**Action**: Loads `index.html` (prerendered single page); JavaScript bundle executes; Nuxt hydrates the app
**Timeout**: N/A (browser rendering time)
**Input**: URL (e.g., `http://localhost:9001/`)
**Output on SUCCESS**: SPA rendered; DOM contains full page layout → GO TO STEP 2
**Output on FAILURE**:
  - `FAILURE(navigation_error)`: 404 or server error → customer sees error page

**Observable states during this step**:
- Customer sees: Prerendered HTML (static content); then SPA renders (full-page studio layout)
- Operator sees: Nginx serves `index.html` and JS/CSS assets (30d cache)
- Database: N/A
- Logs: Nginx access log entry

---

### STEP 2: Composable Initialization
**Actor**: `index.vue` (`<script setup>`)
**Action**: Initializes all composables:
  - `usePanelToggle()` → detects mobile/desktop, sets `activePanel = 'control-deck'`
  - `useScrollReveal()` → sets up IntersectionObserver for fade-up animations
  - `useAudioModule()` → creates audio playback state
  - `useTtsApi()` → creates API client
  - `useHealthPoll()` → **starts polling `/health` immediately** (every 2s)
  - `useVoices()` → **fetches `/api/voices` immediately**
  - `useInputValidation()` → reactive validation (text + model status)
  - `useToast()` → module-level shared state

**Timeout**: N/A (synchronous initialization)
**Input**: N/A (automatic on component mount)
**Output on SUCCESS**: All composables initialized; polling started; voice list loading → WORKFLOW CONTINUES (waiting for model)
**Output on FAILURE**:
  - `FAILURE(voice_load_error)`: `/api/voices` fails → `useVoices().error` set; console.error logged; voice selector shows empty state

**Observable states during this step**:
- Customer sees: Full-page studio layout renders; status pill shows "Loading..." (orange dot); voice selector shows loading state
- Operator sees: Nginx serves JS/CSS assets (30d cache); backend receives `/health` and `/api/voices` requests
- Database: N/A
- Logs: `"Failed to load voices: {error}"` (console.error, if voice load fails)

---

### STEP 3: Health Polling (Concurrent with Voice Loading)
**Actor**: `useHealthPoll()` (runs in background)
**Action**: Polls `/health` every 2 seconds. First check fires immediately (on `onMounted`). Stops polling on terminal state (ready or error).
**Timeout**: 2s interval; max retries configurable (default 60)
**Input**: (none); endpoint `GET /health`
**Output on SUCCESS**: Status updates to `data.status` (loading|ready|error)
**Output on FAILURE**:
  - `FAILURE(network_error)`: Increment retry count; on max retries, status = 'error', polling stops
  - `FAILURE(non_200)`: status = 'error', polling stops immediately

**Observable states during this step**:
- Customer sees: Status pill shows "Loading..." (orange dot, pulsing); all API endpoints blocked (button disabled)
- Operator sees: Backend receives `/health` requests every 2s; may return `model_loaded: false`
- Database: N/A
- Logs: (none — health polling is silent on success)

---

### STEP 4: Voice Loading (Concurrent with Health Polling)
**Actor**: `useVoices()` (runs on mount)
**Action**: Fetches `/api/voices`; populates voice selector dropdown
**Timeout**: N/A (fast, directory scan on backend)
**Input**: (none); endpoint `GET /api/voices`
**Output on SUCCESS**: `voices` ref populated; if no voice pre-selected, defaults to first voice → WORKFLOW CONTINUES
**Output on FAILURE**: `error` ref set; console.error logged; voice selector shows empty state

**Observable states during this step**:
- Customer sees: Voice selector populates with discovered voices; first voice auto-selected
- Operator sees: Backend returns `{ id, name, dialect, tag, icon, speaker_wav }` for each .wav file
- Database: N/A
- Logs: `"Failed to load voices: {error}"` (console.error, if voice load fails)

---

### STEP 5: Model Ready (Health Polling Succeeds)
**Actor**: `useHealthPoll()` (on `status == 'ready'`)
**Action**: Polling stops (terminal state reached); `modelLoaded` computed = true; input validation becomes valid (if text is non-empty)
**Timeout**: N/A (automatic)
**Input**: `GET /health` returns `{ status: "ready", model_loaded: true }`
**Output on SUCCESS**: Button becomes enabled (if text is non-empty); customer can generate speech → WORKFLOW COMPLETE (ready state)
**Output on FAILURE**: N/A (ready state is terminal — no further action needed)

**Observable states during this step**:
- Customer sees: Status pill transitions "Loading..." → "Ready" (orange → green dot); button becomes enabled (if text entered)
- Operator sees: Backend logs `"XTTS-v2 model loaded successfully!"`; frontend stops polling
- Database: N/A
- Logs: (none — polling stops silently)

---

### STEP 5b: Model Error (Health Polling Fails)
**Actor**: `useHealthPoll()` (on max retries or non-200)
**Action**: Polling stops; status = 'error'; button remains disabled
**Timeout**: 60 retries × 2s = 120s (default max wait)
**Input**: `GET /health` returns non-200 or throws network error
**Output on SUCCESS**: status = 'error'; polling stops; button stays disabled
**Output on FAILURE**: N/A (error state is terminal until reload)

**Observable states during this step**:
- Customer sees: Status pill shows "Error" (red dot); button remains disabled; no action possible
- Operator sees: Backend may be down, or model loading failed; check backend logs
- Database: N/A
- Logs: (none — polling errors are silent)

---

## State Transitions

```
[Unloaded] -> (SPA loads) -> [Initialized] (composables running, polling started)
[Initialized] -> (health check returns ready) -> [Ready] (UI interactive)
[Initialized] -> (health check fails, max retries) -> [Error] (stuck, no action possible)
[Initialized] -> (voice load fails) -> [Ready with no voices] (UI works, no voices selected)
[Ready] -> (model becomes unavailable) -> [Error] (e.g., backend restart)
[Error] -> (reload triggered) -> [Initialized] (polling restarts)
```

---

## Handoff Contracts

### Backend → Frontend: Health Check (polling)
**Endpoint**: `GET /health`
**Interval**: 2 seconds
**Max retries**: 60 (configurable)
**First check**: Immediate (on mount)
**Success**: `{ status: "loading"|"ready"|"error", model_loaded: boolean }`
**Failure**: HTTP error → status = 'error', polling stops
**Timeout**: 30s (Nginx proxy_read_timeout for /health)
**On Failure (network)**: Increment retry count; on max retries, status = 'error', polling stops

---

### Backend → Frontend: Voice Discovery
**Endpoint**: `GET /api/voices`
**Trigger**: Frontend `onMounted` (runs once, not polled)
**Success**: Array<{ id, name, dialect, tag, icon, speaker_wav }>
**Failure**: HTTP error → console.error logged; voice selector shows empty state
**Timeout**: N/A (fast, directory scan)
**On Failure**: Voice selector shows empty state; no voice is selected

---

## Cleanup Inventory

| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| Health polling interval | STEP 2 (onMounted) | When status = 'ready' or 'error' (terminal) | `clearInterval(intervalId)` |
| Voice list (in memory) | STEP 4 (onMounted) | Component unmount | GC (ref goes out of scope) |
| IntersectionObserver (scroll reveal) | STEP 2 (onMounted) | Component unmount | `observer.disconnect()` (onUnmounted) |
| Resize event listener (panel toggle) | STEP 2 (onMounted) | Component unmount | `useEventListener` cleanup (VueUse) |
| Toast dismiss timers | On each toast show | 5s auto-dismiss or manual close | `clearTimeout(timer)` |

---

## Test Cases

| Test | Trigger | Expected behavior |
|------|---------|-------------------|
| TC-01: SPA loads successfully | Browser navigates to / | Full-page studio layout renders; polling starts; voice list loads |
| TC-02: Model loads before frontend poll completes | Model ready in < 120s | Status transitions "Loading..." → "Ready"; button becomes enabled |
| TC-03: Model never loads (error) | Backend model fails to load | Status transitions "Loading..." → "Error" after 120s; button stays disabled |
| TC-04: Backend is down | /health returns non-200 or network error | Status transitions "Loading..." → "Error" after 120s; button stays disabled |
| TC-05: Voice load fails | /api/voices returns error | Voice selector shows empty state; console.error logged |
| TC-06: No voices available | /api/voices returns empty array | Voice selector shows "No voices" or empty dropdown |
| TC-07: Mobile viewport detected | Window width < 768px | Mobile layout renders; canvas top, controls bottom; divider visible |
| TC-08: Desktop viewport detected | Window width >= 768px | Desktop layout renders; side-by-side panels |
| TC-09: Viewport resize | Window resized across 768px breakpoint | Layout transitions between mobile/desktop |
| TC-10: Scroll reveal fires | Elements with "fade-up" class enter viewport | Elements animate (fade-up spring animation) |
| TC-11: prefers-reduced-motion | User has reduced motion preference | Animations skipped; elements appear instantly |
| TC-12: Component unmount | Navigation away (not applicable — single page) | All resources cleaned up (intervals, observers, event listeners) |

---

## Assumptions

| # | Assumption | Where verified | Risk if wrong |
|---|------------|----------------|---------------|
| A1 | SPA is prerendered (single HTML file) | `nuxt.config.ts: routeRules: { '/': { prerender: true } }` | No server-side rendering; initial load is static HTML + JS bundle |
| A2 | Health polling interval (2s) and max retries (60) provide 120s max wait | `useHealthPoll.ts:12` | If model takes > 120s to load, frontend gives up (RC-1 from model lifecycle spec) |
| A3 | Voice loading is fire-and-forget (runs once, not retried) | `useVoices.ts:34-36` (onMounted) | If voice load fails, user sees empty dropdown with no retry mechanism |
| A4 | Panel toggle defaults to 'control-deck' (left panel) | `usePanelToggle.ts:9` | If canvas should be default, this is a UX issue |
| A5 | Single page — no routing exists | `nuxt.config.ts` (single routeRules for '/') | No route-based state persistence; all state is in-memory |

---

## Open Questions

1. Should the frontend retry voice loading if it fails? (Currently: no — runs once on mount.)

2. Should there be a "retry" button if the model fails to load? (Currently: no — status stays "Error" until manual reload.)

3. Should the health polling interval be configurable? (Currently: hardcoded 2s.)

4. Should the max retries be based on the backend's 300s hard timeout instead of 120s? (Currently: 120s < 300s — RC-1 from model lifecycle spec.)

---

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|------|---------|--------------|
| 2026-08-02 | Initial spec created from `frontend/app/pages/index.vue:1-170` and `useHealthPoll.ts`, `useVoices.ts` | Documented that health polling (120s) < backend timeout (300s); voice loading is fire-and-forget with no retry |
