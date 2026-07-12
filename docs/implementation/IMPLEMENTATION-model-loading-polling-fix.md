# Implementation Plan: Fix Frontend Health Polling Window

**Source**: `docs/workflows/WORKFLOW-model-loading-readiness.md` (v0.1) — RC-001
**Date**: 2026-07-11
**Status**: Draft — Ready for implementation

---

## Problem Statement

The frontend health polling window is **20 seconds** (10 retries × 2s interval), but the XTTS-v2 model takes **~120 seconds** to load on CPU. After 20 seconds, the frontend enters `error` state and permanently disables the Generate button — even though the model is still loading in the background. The user sees a false "Error" state for **100 seconds** before the model actually finishes loading.

The Docker health check correctly accounts for 120 seconds (`start_period: 120s`, `retries: 200`), but the frontend polling does not. This is a critical UX bug: the frontend gives up 6× faster than the model loads.

---

## Reality Check (Current State vs. Spec)

| # | Finding | Severity |
|---|---------|----------|
| RC-001 | Frontend health polling max is 10 retries × 2s = **20 seconds**, but model loading takes **~120 seconds** | **Critical** |
| (Consolidated into RC-001) | Docker health check has `start_period: 120s` and `retries: 200` (correct), but frontend polling (20s) does NOT match — see RC-001 for full details | (See RC-001) |
| RC-038 | Frontend is a static SPA served by Nginx — it loads regardless of backend health | Medium |

---

## Master Index — All 10 Slices Across 5 Files

This file is the **critical path** — it must be implemented first. All other files depend on its Slice 1.

| ID | File | Title | Blocked By | Priority |
|----|------|-------|------------|----------|
| **M-01** | This file | Increase polling to 60 retries (120s) | **None** | **P0 — Critical** |
| M-02 | This file | Update tests for 60-retry default | M-01 | P0 |
| M-03 | This file | Update GenerateButton loading text | M-01 | P1 |
| M-04 | IMPLEMENTATION-model-cache-volume-fix.md Slice 1 | Fix volume mount path | **None** | P1 |
| M-05 | IMPLEMENTATION-model-cache-volume-fix.md Slice 2 | Verify model persistence | M-04 | P1 |
| M-06 | IMPLEMENTATION-model-loading-progress.md Slice 1 | Add `model_name` + `sub_status` to `/health` | **None** | P2 |
| M-07 | IMPLEMENTATION-model-loading-progress.md Slice 2 | Frontend reads new fields | M-01, M-06 | P2 |
| M-08 | IMPLEMENTATION-model-loading-recovery.md Slice 1 | Retry-after-error state machine | M-01 | P2 |
| M-09 | IMPLEMENTATION-model-loading-recovery.md Slice 2 | UI shows "Retrying..." | M-08 | P2 |
| M-10 | IMPLEMENTATION-model-loading-recovery.md Slice 3 | Manual retry button | M-09 | P2 |
| M-11 | IMPLEMENTATION-model-loading-ux-during-wait.md Slice 1 | Persistent loading banner | M-01 | P2 |
| M-12 | IMPLEMENTATION-model-loading-ux-during-wait.md Slice 2 | Disable controls during loading | M-11 | P2 |
| M-13 | IMPLEMENTATION-model-loading-ux-during-wait.md Slice 3 | Ready toast notification | M-01, M-11, M-12 | P2 |

**Implementation order (topological sort):**
```
Phase 1 (no blockers): M-01 → M-04 → M-06  (can run in parallel)
Phase 2 (depends on Phase 1): M-02, M-03, M-05, M-07
Phase 3 (depends on Phase 2): M-08, M-11
Phase 4 (depends on Phase 3): M-09, M-10, M-12
Phase 5 (depends on Phase 4): M-13
```

---

## Slices

### Slice M-01: Increase Frontend Health Polling to Match Model Load Time

**Type**: AFK
**Blocked by**: None (critical path — start here)
**Depends on**: Nothing
**Used by**: M-02, M-03, M-07, M-08, M-11, M-12, M-13
**User stories**: User can wait for model to load without seeing a false "Error" state

**What to build**: Modify `useHealthPoll` composable (`frontend/app/composables/useHealthPoll.ts`) to support a configurable `maxRetries` parameter that defaults to **60 retries** (120 seconds at 2s intervals). The composable should accept an options object with `maxRetries` (default: 60) and `pollInterval` (default: 2000ms).

**Current code** (`useHealthPoll.ts`):
```typescript
const maxRetries = options.maxRetries ?? 10  // ← hardcoded 10 = 20 seconds
```

**Target behavior**:
- Default `maxRetries` changes from 10 to 60 (120 seconds total)
- Polling interval remains 2 seconds (sufficient frequency for status updates)
- Terminal states (`ready`, `error`) still stop polling immediately
- The composable exports `maxRetries` as an optional parameter: `{ maxRetries?: number, pollInterval?: number }`

**Acceptance criteria**:
- [ ] `useHealthPoll` defaults to 60 retries (120 seconds) instead of 10 (20 seconds)
- [ ] `useHealthPoll` accepts `{ maxRetries: N }` as an option to override the default
- [ ] `useHealthPoll` accepts `{ pollInterval: N }` as an option to override the default (milliseconds)
- [ ] Polling stops immediately when status is `"ready"` (no wasted polls)
- [ ] Polling stops after max retries are exceeded (enters error state)
- [ ] Network errors increment retry count but keep status as `"loading"` (not `"error"`) until max retries
- [ ] First health check fires immediately on mount (no 2s delay)
- [ ] All existing unit tests pass (update `maxRetries` expectations from 10 to 60)

**Integration verification**:
- [ ] Frontend dev server starts without errors (`pnpm dev`)
- [ ] Health polling runs for 120 seconds when backend is not ready (no false "Error" state)
- [ ] Generate button stays disabled during the 120s loading window (no premature enabling)

---

### Slice M-02: Update Tests for New Default Retry Count

**Type**: AFK
**Blocked by**: M-01 (this file, Slice M-01)
**Depends on**: M-01
**User stories**: — (test correctness)

**What to build**: Update `frontend/tests/useHealthPoll.test.ts` to reflect the new default of 60 retries instead of 10.

- The "polling stops on terminal state" test currently waits 4500ms and expects 1 fetch call. This test should still pass (1 call = immediate check, then stops on ready).
- Any tests that depend on the 10-retry threshold (20 seconds) should be updated to expect 60 retries (120 seconds).
- Add a new test: "polling continues past 20 seconds when model hasn't loaded yet" — verifies the composable doesn't error out at 20s.

**Acceptance criteria**:
- [ ] All existing unit tests pass with the new 60-retry default
- [ ] New test added: polling continues past 20 seconds without entering error state
- [ ] New test added: `useHealthPoll({ maxRetries: 10 })` still works (backward compatibility)

---

### Slice M-03: Update GenerateButton to Show Meaningful Loading State

**Type**: AFK
**Blocked by**: M-01 (this file, Slice M-01)
**Depends on**: M-01
**User stories**: User sees informative status during the 120s model loading window

**What to build**: Update the `GenerateButton` component (`frontend/app/components/GenerateButton.vue`) to show a more informative loading state when `modelStatus === 'loading'`. Currently it shows "Processing Model..." with a spinner — this text is misleading because the user can't interact with it and doesn't know how long to wait.

**Current behavior**:
- When `modelStatus === 'loading'`: Shows "Processing Model..." with a spinning loader
- Button is disabled (cannot click)
- No indication of how long the wait will be

**Target behavior**:
- When `modelStatus === 'loading'`: Show "Loading TTS Model..." with a spinner
- Keep button disabled during loading
- Optionally add a subtle hint about wait time (e.g., "This may take up to 2 minutes")

**Acceptance criteria**:
- [ ] Loading state text changes from "Processing Model..." to "Loading TTS Model..."
- [ ] Button remains disabled during loading (no user interaction possible)
- [ ] Loading state is visually distinct from the generating state (different icon/animation)
- [ ] Accessibility: `aria-busy="true"` when loading, `aria-disabled="true"` when disabled

**Integration verification**:
- [ ] Frontend loads in browser without errors
- [ ] Model status indicator and GenerateButton both show "Loading..." consistently during the 120s window

---

## Open Questions

- Should we add a visible countdown or progress indicator (e.g., "Loading... 0:30 / ~2:00")? This would require tracking the elapsed time in `useHealthPoll`. Currently the composable doesn't expose elapsed time — this could be a future enhancement.
- Should the polling interval increase as the wait gets longer (e.g., 2s for first 60s, then 5s after 60s) to reduce server load? Probably unnecessary for a single user's browser.
