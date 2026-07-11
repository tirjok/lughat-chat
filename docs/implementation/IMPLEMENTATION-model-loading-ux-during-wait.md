# Implementation Plan: UX During Model Loading Wait

**Source**: `docs/workflows/WORKFLOW-model-loading-readiness.md` (v0.1) — RC-038
**Date**: 2026-07-11
**Status**: Draft — Ready for implementation

---

## Problem Statement

The frontend is a static SPA served by Nginx — it loads instantly regardless of backend health. During the 120-second model loading window, all API calls (health, voices, synthesis) will fail silently until the backend is ready. The user sees the full UI (text area, voice selector, speed slider) and might try to generate speech before the model is ready, resulting in a confusing 503 error.

There is no persistent "Model Loading" banner that can't be dismissed, and the UI doesn't communicate the system state during the 120-second wait.

---

## Reality Check (Current State vs. Spec)

| # | Finding | Severity |
|---|---------|----------|
| RC-038 | Frontend is a static SPA served by Nginx — it loads regardless of backend health | **Medium** |
| RC-001 | Frontend polling window (20s) is 6× shorter than model load time (120s) — critical bug | Critical (fixed by other slices) |

---

## Master Index — All 10 Slices Across 5 Files

This file is on the **secondary path** — it depends on M-01 (polling fix).

| ID | File | Title | Blocked By | Priority |
|----|------|-------|------------|----------|
| **M-11** | This file | Persistent loading banner | M-01 | **P2** |
| M-12 | This file | Disable controls during loading | M-11 | P2 |
| M-13 | This file | Ready toast notification | M-01, M-11, M-12 | P2 |
| M-01 | IMPLEMENTATION-model-loading-polling-fix.md Slice 1 | Increase polling to 60 retries (120s) | **None** | P0 |
| M-02 | IMPLEMENTATION-model-loading-polling-fix.md Slice 2 | Update tests for 60-retry default | M-01 | P0 |
| M-03 | IMPLEMENTATION-model-loading-polling-fix.md Slice 3 | Update GenerateButton loading text | M-01 | P1 |
| M-04 | IMPLEMENTATION-model-cache-volume-fix.md Slice 1 | Fix volume mount path to `/app/.cache/tts` | **None** | P1 |
| M-05 | IMPLEMENTATION-model-cache-volume-fix.md Slice 2 | Verify model persistence | M-04 | P1 |
| M-06 | IMPLEMENTATION-model-loading-progress.md Slice 1 | Add `model_name` + `sub_status` to `/health` | **None** | P2 |
| M-07 | IMPLEMENTATION-model-loading-progress.md Slice 2 | Frontend reads new fields | M-01, M-06 | P2 |
| M-08 | IMPLEMENTATION-model-loading-recovery.md Slice 1 | Retry-after-error state machine | M-01 | P2 |
| M-09 | IMPLEMENTATION-model-loading-recovery.md Slice 2 | UI shows "Retrying..." | M-08 | P2 |
| M-10 | IMPLEMENTATION-model-loading-recovery.md Slice 3 | Manual retry button | M-09 | P2 |

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

### Slice M-11: Add Persistent "Model Loading" Banner

**Type**: AFK
**Blocked by**: M-01 (this file's Slice M-01 — increased polling window)
**Depends on**: M-01
**Used by**: M-12, M-13
**User stories**: User always sees a clear, persistent message that the model is loading during the 120-second wait

**What to build**: Add a persistent banner at the top of the UI that displays when `modelStatus === 'loading'`. The banner should be non-dismissible and visible on both desktop and mobile layouts.

**Current behavior**:
- Model status indicator shows a small orange dot + "Loading..." in the top-right (desktop) or top bar (mobile)
- No persistent banner or message during the 120-second wait
- User might not notice the small status indicator

**Target behavior**:
- When `modelStatus === 'loading'`: Show a persistent banner at the top of the page (below the status indicator, or replacing it) with:
  - Icon: spinning loader or hourglass
  - Text: "Loading TTS Model... This may take up to 2 minutes"
  - Background: subtle orange tint (not alarming — just informative)
  - Icon + text should be visible on both desktop and mobile
- When `modelStatus === 'ready'`: Banner disappears
- When `modelStatus === 'error'` or `'retrying'`: Banner shows error/retry message (from other slices)

**Acceptance criteria**:
- [ ] When `modelStatus === 'loading'`, a persistent banner displays at the top of the page
- [ ] Banner text: "Loading TTS Model... This may take up to 2 minutes" (or similar, using model name from M-06)
- [ ] Banner includes a spinning loader icon
- [ ] Banner has a subtle orange background (informative, not alarming)
- [ ] Banner is visible on both desktop (side-by-side layout) and mobile (stacked layout)
- [ ] Banner disappears when `modelStatus` transitions to `"ready"`
- [ ] Banner is not dismissable (no close button)
- [ ] Banner does not interfere with the text input area (positioned above it)

**Integration verification**:
- [ ] Frontend dev server starts without errors
- [ ] Banner appears immediately when SPA loads (before model is ready)
- [ ] Banner disappears when model finishes loading (~120 seconds)
- [ ] Banner is visible in both desktop and mobile layouts

---

### Slice M-12: Disable User Interactions During Model Loading

**Type**: AFK
**Blocked by**: M-11 (this file, Slice M-11)
**Depends on**: M-11
**User stories**: User cannot interact with TTS features while the model is loading (prevents confusing 503 errors)

**What to build**: When `modelStatus === 'loading'`, disable all user-interactive elements in the TTS Studio:
- Text input area (textarea) — grayed out, non-editable
- Voice selector dropdown — grayed out, non-clickable
- Speed slider — grayed out, non-adjustable
- Generate button — already disabled (from existing code)

**Current behavior**:
- Textarea is editable during loading (user can type text)
- Voice selector is clickable during loading
- Speed slider is adjustable during loading
- Only the Generate button is disabled

**Target behavior**:
- When `modelStatus === 'loading'`:
  - Textarea: `disabled` attribute, grayed out visually, placeholder text changes to "Model is loading... Please wait"
  - Voice selector: `disabled` attribute, grayed out visually
  - Speed slider: `disabled` attribute, grayed out visually
  - Generate button: already disabled (no change)
- When `modelStatus === 'ready'`: All controls re-enable
- When `modelStatus === 'error'` or `'retrying'`: All controls disabled (from other slices)

**Acceptance criteria**:
- [ ] Textarea is disabled (non-editable) when `modelStatus === 'loading'`
- [ ] Textarea placeholder text changes to "Model is loading... Please wait" when disabled
- [ ] Voice selector dropdown is disabled when `modelStatus === 'loading'`
- [ ] Speed slider is disabled (cannot adjust) when `modelStatus === 'loading'`
- [ ] All controls re-enable when `modelStatus` transitions to `"ready"`
- [ ] Controls are disabled when `modelStatus === 'error'` or `'retrying'`
- [ ] Visual feedback: disabled controls are grayed out (lower opacity)
- [ ] Accessibility: `aria-disabled="true"` on all disabled controls

**Integration verification**:
- [ ] Frontend dev server starts without errors
- [ ] User cannot type in textarea during the 120s loading window
- [ ] User cannot change voice or speed during the 120s loading window
- [ ] All controls become functional when model finishes loading

---

### Slice M-13: Show Toast When Model Finishes Loading

**Type**: AFK
**Blocked by**: M-01 (polling fix) + M-11 (UX banner) + M-12 (disable controls)
**Depends on**: M-01, M-11, M-12
**User stories**: User gets a clear notification when the model is ready to use

**What to build**: When the model finishes loading (status transitions from `"loading"` to `"ready"`), show a brief toast notification: "Model ready — you can now generate speech." The toast should be subtle (info level, not success/error) and auto-dismiss after 3 seconds.

**Current behavior**:
- No notification when model finishes loading
- User must notice the status indicator change from orange to green
- User might not realize the model is ready

**Target behavior**:
- When `modelStatus` transitions from `"loading"` to `"ready"`:
  - Show a toast notification: "Model ready" (or "XTTS-v2 ready")
  - Toast style: info level (blue/icon), not success (green) or error (red)
  - Auto-dismiss after 3 seconds
  - Only show once per loading cycle (not on every poll that returns "ready")

**Acceptance criteria**:
- [ ] Toast notification appears when `modelStatus` transitions from `"loading"` to `"ready"`
- [ ] Toast text: "Model ready" (or "XTTS-v2 ready" using model name from M-06)
- [ ] Toast style: info level (blue, not green or red)
- [ ] Toast auto-dismisses after 3 seconds
- [ ] Toast only appears once per loading cycle (not on every poll)
- [ ] Toast appears on both desktop and mobile layouts
- [ ] Toast does not appear if the model was already ready (page reload after model loaded)

**Integration verification**:
- [ ] Frontend dev server starts without errors
- [ ] Toast appears ~120 seconds after page load (when model finishes loading)
- [ ] Toast disappears after 3 seconds
- [ ] Toast does not appear on subsequent polls (only on transition)

---

## Open Questions

- Should the "Model Loading" banner include a progress estimate? (e.g., "Loading... 0:30 / ~2:00") — This would require tracking elapsed time in `useHealthPoll`. Could be a future enhancement.
- Should we show the banner only on the main TTS Studio page (`/`), or also on other pages (if lesson views are added)? Probably only on the TTS Studio page.
- Should the toast notification use the existing `showToast()` composable, or should we create a new `showInfoToast()` variant? The existing composable supports `success`, `error`, and `info` levels — `info` is appropriate here.
