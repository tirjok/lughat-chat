# Implementation Plan: Add Recovery — Retry After Error State

**Source**: `docs/workflows/WORKFLOW-model-loading-readiness.md` (v0.1) — Open Question
**Date**: 2026-07-11
**Status**: Draft — Ready for implementation

---

## Pre-Flight: Skill & Document Discovery

**Before implementing ANY slice, the agent MUST:**

### Skills Required
| Skill | Purpose | Install If Missing | Why |
|-------|---------|-------------------|-----|
| `solid` | SOLID principles, state machines, error handling | `pi skills install solid` | Slices M-08 to M-10 (state machine, UI components) |
| `vue` + `vue-best-practices` | Vue 3 Composition API, `<script setup>`, reactivity | `pi skills install vue` | Slices M-08, M-09, M-10 (composable, components) |
| `vue-testing-best-practices` | Test naming, AAA pattern, lean testing | `pi skills install vue-testing-best-practices` | Slices M-08, M-09, M-10 tests |
| `testing-best-practices` | 50+ JavaScript/Node.js testing best practices | `pi skills install testing-best-practices` | All test files |
| `librarian` | Search library internals with source code | `pi skills install librarian` | Coqui TTS crash/recovery patterns |
| `find-skills` | Discover and install skills when needed | (pre-installed) | Audit environment before starting |
| `review` | Review changes since a fixed point | `pi skills install review` | After each slice, review the diff |
| `unocss` | UnoCSS utility rules, shortcuts, presets | `pi skills install unocss` | Slices M-09, M-10 (status indicator styling) |

### Document Search Required
| Document | What to Find | Source |
|----------|-------------|--------|
| `docs/workflows/REGISTRY.md` | Missing workflow specs (container orchestration, health check) | Cross-reference before starting |
| `docs/workflows/WORKFLOW-INTERCONNECTED-MAP.md` | Cross-workflow dependencies (Model Loading blocks all) | All slices |
| `docs/workflows/WORKFLOW-model-loading-polling-fix.md` | Health polling fix (M-01 — prerequisite for M-08, M-09, M-10) | Slices M-08, M-09, M-10 |
| `docs/workflows/WORKFLOW-model-loading-progress.md` | Model loading progress (M-06, M-07) | Cross-reference |
| `docs/workflows/WORKFLOW-model-loading-ux-during-wait.md` | UX during loading (M-11 to M-13 — depends on M-01) | Cross-reference |
| `docs/workflows/WORKFLOW-speech-synthesis.md` | Speech synthesis (S-01 to S-08 — model must be ready) | All slices |
| `docs/workflows/WORKFLOW-dashboard-navigation-and-roadmap.md` | Dashboard navigation (status indicator integration) | Slices M-09, M-10 |
| `docs/architecture/ADR-010` | Non-blocking frontend boot (LoadingScreen) | Slice M-08 (loading screen integration) |
| `docs/PRD.md` | Known issue RC-001 (polling window mismatch) | Slice M-08 |

### Agent Instruction
> "Run `find-skills` to audit the environment. Install any missing skills from the table above. Read `docs/workflows/WORKFLOW-model-loading-polling-fix.md` — its Slice M-01 (increase polling) is a prerequisite for this file's Slices M-08, M-09, M-10. Read `docs/workflows/WORKFLOW-model-loading-ux-during-wait.md` — its Slices M-11, M-12, M-13 also depend on M-01. Then begin Slice M-08 (add retry-after-error state machine)."

---

## Problem Statement

Once `useHealthPoll` enters the error state (server down, network error, or max retries exceeded), it **never retries**. The user must reload the page to attempt recovery. If the backend crashes and restarts, or if there's a temporary network issue, the frontend has no way to recover without a page reload.

This is especially problematic during the 120-second model loading window: if the backend takes longer than expected (e.g., slow disk, high CPU), the frontend will error out before the model finishes loading.

---

## Reality Check (Current State vs. Spec)

| # | Finding | Severity |
|---|---------|----------|
| RC-041 | Frontend polling enters error state permanently — no automatic recovery | **Critical** |
| Spec | "Should the frontend retry health polling after it enters error state (e.g., retry every 30s indefinitely)?" | **Open** |

---

## Master Index — All 10 Slices Across 5 Files

This file is on the **secondary path** — it depends on M-01 (polling fix).

| ID | File | Title | Blocked By | Priority |
|----|------|-------|------------|----------|
| **M-08** | This file | Retry-after-error state machine | M-01 | **P2** |
| M-09 | This file | UI shows "Retrying..." | M-08 | P2 |
| M-10 | This file | Manual retry button | M-09 | P2 |
| M-01 | IMPLEMENTATION-model-loading-polling-fix.md Slice 1 | Increase polling to 60 retries (120s) | **None** | P0 |
| M-02 | IMPLEMENTATION-model-loading-polling-fix.md Slice 2 | Update tests for 60-retry default | M-01 | P0 |
| M-03 | IMPLEMENTATION-model-loading-polling-fix.md Slice 3 | Update GenerateButton loading text | M-01 | P1 |
| M-04 | IMPLEMENTATION-model-cache-volume-fix.md Slice 1 | Fix volume mount path to `/app/.cache/tts` | **None** | P1 |
| M-05 | IMPLEMENTATION-model-cache-volume-fix.md Slice 2 | Verify model persistence | M-04 | P1 |
| M-06 | IMPLEMENTATION-model-loading-progress.md Slice 1 | Add `model_name` + `sub_status` to `/health` | **None** | P2 |
| M-07 | IMPLEMENTATION-model-loading-progress.md Slice 2 | Frontend reads new fields | M-01, M-06 | P2 |
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

### Slice M-08: Add Retry-After-Error State to `useHealthPoll`

**Type**: AFK
**Blocked by**: M-01 (this file's Slice M-01 — increased 60-retry window)
**Depends on**: M-01
**Used by**: M-09, M-10
**User stories**: If backend crashes and restarts, frontend automatically recovers without page reload

**What to build**: Modify `useHealthPoll` to support a retry-after-error mode. When max retries are exceeded (error state reached), instead of staying in error forever, the composable enters a "retry" state that polls less frequently (e.g., every 30 seconds) indefinitely.

**Current behavior** (`useHealthPoll.ts`):
```typescript
// When max retries exceeded:
retryCount = maxRetries
status.value = 'error'
clearInterval(intervalId)
intervalId = null  // ← Stops polling forever
```

**Target behavior**:
- When max retries are exceeded, transition to a `"retrying"` state (third terminal-like state)
- In `"retrying"` state, poll less frequently (default: every 30 seconds, configurable)
- Show a "Retrying..." message in the UI
- When the model eventually becomes ready, transition back to `"ready"` state and resume normal polling (every 2 seconds)
- Provide a manual "Retry Now" button that forces an immediate health check

**New composable state machine**:
```
loading → (max retries exceeded) → retrying → (successful health check) → ready
retrying → (manual retry button) → (immediate health check) → ready | loading | error
```

**Acceptance criteria**:
- [ ] `useHealthPoll` supports a `{ retryAfterError: boolean }` option (default: `true`)
- [ ] When `retryAfterError` is `true` and max retries are exceeded, the composable enters a `"retrying"` state
- [ ] In `"retrying"` state, polling interval increases from 2s to 30s (configurable via `retryInterval` option)
- [ ] A successful health check in `"retrying"` state transitions back to `"ready"` and resumes 2s polling
- [ ] The composable exposes a `retry()` method that forces an immediate health check
- [ ] The composable exposes a `status` value of `"retrying"` (in addition to `"loading"`, `"ready"`, `"error"`)
- [ ] When `retryAfterError` is `false`, behavior is unchanged (enters error state and stops — backward compatible)

**Integration verification**:
- [ ] Frontend dev server starts without errors
- [ ] When backend is down, frontend shows "Retrying..." after 120 seconds (60 retries × 2s)
- [ ] When backend comes back up, frontend automatically transitions to "Ready"
- [ ] Manual retry button triggers an immediate health check

---

### Slice M-09: Update UI Components to Show Retry State

**Type**: AFK
**Blocked by**: M-08 (this file, Slice M-08)
**Depends on**: M-08
**User stories**: User sees "Retrying..." message instead of permanent "Error"

**What to build**: Update `ModelStatusIndicator` and `MobileStatusIndicator` to display the `"retrying"` state with appropriate visuals.

**Current behavior** (error state):
- Red dot (no animation)
- Text: "Error"
- Generate button permanently disabled

**Target behavior** (retrying state):
- Orange dot with slow pulse (same as loading, but with a different pattern)
- Text: "Retrying..."
- Generate button stays disabled
- Optional: Add a "Retry Now" button next to the status indicator

**Acceptance criteria**:
- [ ] `ModelStatusIndicator` shows "Retrying..." when `status === 'retrying'`
- [ ] `MobileStatusIndicator` shows "Retrying..." when `status === 'retrying'` (compact version)
- [ ] Retrying state uses orange dot with slow pulse (distinct from loading's fast pulse)
- [ ] Tooltip reflects retrying state ("Model XTTS-v2 — Retrying...")
- [ ] Generate button stays disabled during retrying state
- [ ] Accessibility: `aria-live="polite"` announces retrying state changes

**Integration verification**:
- [ ] Frontend loads in browser without errors
- [ ] Status indicator transitions: "Loading..." → (120s) → "Retrying..." → (backend up) → "Ready"

---

### Slice M-10: Add Manual Retry Button to Status Indicator

**Type**: AFK
**Blocked by**: M-09 (this file, Slice M-09)
**Depends on**: M-09
**User stories**: User can manually trigger a health check when they believe the backend is back up

**What to build**: Add a small "Retry" button next to the status indicator that triggers an immediate health check. This is useful when the user manually restarts the backend and wants to confirm it's ready without waiting for the next 30-second poll cycle.

**Current behavior**: No manual retry mechanism

**Target behavior**:
- Small "Retry" button appears next to the status indicator when `status === 'retrying'` or `status === 'error'`
- Clicking it triggers an immediate `checkHealth()` call
- Button shows a small spinner while the check is in progress
- Button disappears when status transitions to `"ready"` or `"loading"`

**Acceptance criteria**:
- [ ] "Retry" button appears in `ModelStatusIndicator` when `status === 'retrying'` or `status === 'error'`
- [ ] "Retry" button appears in `MobileStatusIndicator` when `status === 'retrying'` or `status === 'error'` (compact version)
- [ ] Clicking the button triggers an immediate health check
- [ ] Button shows a loading spinner during the check
- [ ] Button disappears when status changes to `"ready"` or `"loading"`
- [ ] Button is keyboard accessible (Tab + Enter/Space)
- [ ] Button is screen-reader accessible (`aria-label="Retry health check"`)

**Integration verification**:
- [ ] Frontend loads in browser without errors
- [ ] Clicking "Retry" immediately checks `/health` (visible in browser network tab)
- [ ] Status updates from "Retrying..." to "Ready" after successful retry

---

## Open Questions

- What should the default retry interval be? 30 seconds seems reasonable (not too aggressive, not too slow). Should it be configurable?
- Should there be a maximum number of retries in the retrying state? (e.g., stop after 10 retries = 5 minutes of retrying, then give up?)
- Should the manual retry button be available in the `"loading"` state too? (Probably not needed — the user knows the model is loading.)
- Should we log retry attempts to the backend? (Probably not — this is a frontend-only concern.)
