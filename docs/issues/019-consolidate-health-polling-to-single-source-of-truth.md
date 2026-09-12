# Issue #019: fix: consolidate /health polling to a single source of truth

## What's wrong

Every page view sends **two concurrent `GET /health` requests** simultaneously, each firing every 2 seconds. The health check is a lightweight operation but running two independent polling loops wastes backend resources and creates unnecessary load on the TTS model server.

The double-polling happens because the health status is not shared — every consumer calls `useBackendHealth()`, and since that function is not a singleton, each call creates an independent `useTimeoutPoll` with its own 2-second interval.

## What I expected

The `/health` endpoint should be called from **a single source of truth** — one polling loop that writes status into a global reactive state, and all components read from that shared state without triggering additional requests.

## Steps to reproduce

1. Open the browser's Network tab (Chrome DevTools or equivalent).
2. Navigate to any page: `/` (TTS Studio), `/dashboard`, or `/dashboard/level/a1/1` (lesson page).
3. Observe the `/health` requests in the Network panel.
4. Two `GET /health` requests fire simultaneously every 2 seconds, both coming from the same page view.

On lesson pages:
- GlobalNavbar calls `useBackendHealth()` (via `app.vue` layout)
- The lesson page (`[lesson].vue`) also calls `useBackendHealth()`
- Both start independent 2-second polling intervals

On `/` (TTS Studio):
- GlobalNavbar calls `useBackendHealth()`
- The index page (`index.vue`) also calls `useBackendHealth()`
- Same double-polling pattern

On `/dashboard`:
- Only GlobalNavbar calls `useBackendHealth()`
- The dashboard page does **not** call it (so no double-polling here — this page got it right by accident).

## Blocked by

None — can start immediately.

## Additional context

### Architecture: two composables doing the same thing

Two separate composables exist, both implementing identical health-polling logic:

- `useBackendHealth()` (in `composables/studio/`) — imported by GlobalNavbar, index page, and lesson pages.
- `useHealthPoll()` (in `composables/studio/`) — mocked everywhere in tests but not used by any application page.

Both use `@vueuse/core`'s `useTimeoutPoll` with a 2-second interval, identical retry logic, identical state shape (`status` + `modelLoaded`), and identical polling behavior. They differ only in naming and whether they accept a `baseUrl` option.

### Root cause: no singleton

Both composables are plain functions — calling them creates a fresh reactive context each time. Every page that calls it, plus the navbar that's always rendered, spawns an independent poller. No centralization, no shared state.

### Impact

- On every page view, **2× the network requests** to the health endpoint
- Both pollers run the same 2-second interval roughly in sync, creating bursts of concurrent requests to the backend
- State is duplicated — each poller maintains its own `status` ref, so briefly they may disagree about the health state

### Design guidance for the fix

- Consolidate to **one** composable that starts a single `useTimeoutPoll`
- All consumers (GlobalNavbar, index page, lesson pages) read from the same reactive `status` ref
- The navbar should not spawn its own poller — it should simply read the status written by the page
- Consider whether the navbar should be allowed to read health status without being the poller itself (it has no page lifecycle of its own since it's rendered via `app.vue` at the layout level)
- The orphaned `useHealthPoll` can be removed or aliased to the consolidated composable
- All tests that currently mock both `useHealthPoll` and `useBackendHealth` need to converge on the single composable
- The fix should preserve the existing behavior: polling starts on mount, pauses on unmount, errors after 10 retries, stops polling when ready
