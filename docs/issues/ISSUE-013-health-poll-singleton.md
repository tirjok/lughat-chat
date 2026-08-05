# ISSUE-013: Refactor useHealthPoll to Singleton (Eliminate Duplicate Polling)

**Spec Reference:** `docs/workflows/WORKFLOW-global-navbar-navigation.md` (Step 11 — Backend Health Integration; Reality Checker RC-1, RC-2), `docs/workflows/WORKFLOW-multi-page-spa-routing.md` (Step 4 — Composable Initialization)
**Dependencies:** ISSUE-001 (GlobalNavbar exists and calls `useHealthPoll()`), ISSUE-004 (Dashboard page may call `useHealthPoll()`), ISSUE-003 (TTS Studio `index.vue` calls `useHealthPoll()`)
**Scope:** Frontend composable (`frontend/app/composables/useHealthPoll.ts`)

---

## Problem

`useHealthPoll` is **not a singleton**. Currently, three components independently call `useHealthPoll()`:

1. `index.vue` (TTS Studio) — calls `useHealthPoll()` for the model status banner
2. `ModelStatusIndicator.vue` (embedded inside `index.vue`) — calls `useHealthPoll()` independently
3. `GlobalNavbar.vue` (global navbar, renders on every page) — calls `useHealthPoll()` for the progress bar

Each call creates an **independent 2-second polling interval**, meaning **6 intervals fire every 2 seconds** (3 components × 2 intervals each for loading/ready state checks).

During the ~120-second model load phase, this generates **360 health check requests** to the backend. After the model is ready, it settles at 6 requests/second.

The spec's Reality Checker RC-1 marks this as **Critical** and RC-2 (ModelStatusIndicator + MobileStatusIndicator both inside index.vue) as **High**, bringing the total to potentially **4 independent instances** = 8 intervals.

The backend's single `_model_lock` doesn't care about concurrent health checks, but the frontend network traffic is 4× higher than necessary, and the spec explicitly requires: "share state via composable singleton or provide `baseUrl` option to skip re-polling."

---

## Acceptance Criteria

### AC-1: Singleton pattern implemented
- `useHealthPoll()` returns the **same instance** regardless of which component calls it
- First caller starts the 2s polling interval; subsequent callers receive the existing state without starting a new interval
- When the last component using the composable unmounts, the interval is cleaned up (`clearInterval`)
- No component can accidentally start a duplicate polling interval

### AC-2: All existing callers work without modification
- `index.vue` receives health status (`loading` / `ready` / `error`) exactly as before
- `ModelStatusIndicator.vue` receives health status exactly as before
- `GlobalNavbar.vue` receives health status exactly as before (used by the progress bar)
- No API surface changes — the composable's exported state and methods are identical

### AC-3: Health poll respects terminal state per spec
- When model is `loading`: progress bar shows indeterminate animation (GlobalNavbar) / "loading" banner (index.vue)
- When model is `ready`: progress bar shows 0% fill (GlobalNavbar on `/` and `/dashboard`)
- When model is `error`: progress bar shows error state (red fill), toast: "Model unavailable"
- Polling stops after 150 retries (300s max) per spec — singleton must respect this limit

### AC-4: Dashboard and lesson pages do NOT restart polling on navigation
- When navigating from `/` to `/dashboard`, the existing polling interval continues (does not restart)
- Dashboard pages that import `useHealthPoll()` receive the current state without starting a new interval
- This satisfies the spec's RC-1: "Dashboard pages should NOT block on health"

### AC-5: No regression in existing behavior
- `./run-tests.sh` passes (lint + typecheck + all existing tests)
- No new network traffic observed in browser dev tools (verify: exactly 1 interval of 2s in Network tab)
- No change to the `/health` API contract

---

## Test Cases Covered

| Spec Test | How Verified |
|---|---|
| TC-15: Failure — health poll conflict | Network tab shows exactly ONE health poll interval (2s) — if multiple, abort (share singleton) |
| TC-08: Health poll failure on dashboard | Dashboard renders during 120s model load, health poll shows "loading" (singleton preserves state across page navigation) |
| TC-13: Multiple rapid navigations | Navigating `/` → `/dashboard` → `/` does not create additional intervals |

---

## ADR References

- **ADR-001** (Shared Layout with Global Navbar): Reality Checker RC-1 — "3 simultaneous health polls = 6 intervals firing every 2s" — Critical severity
- **ADR-001**: Reality Checker RC-2 — "4 instances (index.vue, ModelStatusIndicator, MobileStatusIndicator, GlobalNavbar)" — High severity
- **WORKFLOW-global-navbar-navigation.md** Step 11: "share state via composable singleton or provide `baseUrl` option to skip re-polling"

## Implementation Notes

The spec does not mandate a specific singleton pattern. Preferred approach:

1. **Module-level singleton** (simplest, recommended): Use a module-scoped variable inside `useHealthPoll.ts`. Nuxt's module system guarantees exactly one instantiation per module load. The composable just reads/writes this variable.

2. **Reference-counted** (if explicit cleanup is desired): Track call count; start interval on first call, stop on last unmount. More code, same behavior.

3. **NOT recommended**: WeakRef pool, custom injection tokens, or plugin-based approaches — these add complexity without functional benefit for this use case.

**Key invariant:** Exactly ONE `setInterval` fires, regardless of how many components call `useHealthPoll()`.
---

## Files

- `frontend/app/composables/useHealthPoll.ts` (modified — implement singleton pattern)
- Component test: `frontend/tests/useHealthPoll.test.ts` (new — tests singleton behavior, interval count, cleanup on unmount)
- Integration impact: `frontend/app/pages/index.vue`, `frontend/app/components/ModelStatusIndicator.vue`, `frontend/app/components/GlobalNavbar.vue` (no code changes required if API surface is preserved)
