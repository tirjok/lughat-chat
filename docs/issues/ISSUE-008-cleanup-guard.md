# ISSUE-008: Add onBeforeRouteLeave Guard with Cleanup Dialog (R-7)

**Spec Reference:** `docs/workflows/WORKFLOW-multi-page-spa-routing.md` (Step 2a; ADR-001, RC-3)
**Dependencies:** ISSUE-003 (TTS Studio layout adapted), ISSUE-004 (Dashboard page exists for navigation target)
**Scope:** Frontend only (`frontend/app/pages/index.vue`)

---

## Problem

`index.vue` currently has **no `onBeforeRouteLeave` guard** (RC-3: Critical). The workflow spec's Step 2a (cleanup dialog) is **not yet implemented**. When a user navigates away from `/` during an in-flight synthesis, orphaned MP3 + .json files accumulate on disk (cleanup inventory, row 8). R-7 ("Orphan File Cleanup on Navigation") is explicitly in scope for this phase.

## Acceptance Criteria

### AC-1: Navigation guard exists
- `index.vue` uses Nuxt's `onBeforeRouteLeave` composable (from `vue-router` / Nuxt)
- Guard fires when navigating away from `/` to any other route (`/dashboard`, `/dashboard/level/**`)

### AC-2: In-flight synthesis detection
- Guard checks `isGenerating.value === true` OR `audioModule.isStreaming` (from `useAudioModule`)
- If NO in-flight synthesis: navigation proceeds without dialog (clean leave)
- If IN-FLIGHT synthesis: dialog is shown (see AC-3)

### AC-3: Cleanup dialog UI
- When in-flight synthesis is detected, a confirmation dialog appears: "A synthesis is in progress. Clean up the generated files when you leave?"
- Dialog has two buttons: "Clean & Leave" and "Stay"
- Dialog uses a Nuxt UI dialog component or a custom modal (implementation detail)
- Dialog is accessible (keyboard focus trap, ESC to dismiss, ARIA attributes)

### AC-4: "Clean & Leave" path
- User clicks "Clean & Leave":
  1. `audioModule.dispose()` is called — revokes object URLs, removes event listeners
  2. `POST /api/cleanup` is called — triggers backend orphan file cleanup
  3. Navigation proceeds to the target route
  4. If `POST /api/cleanup` returns success: toast "Cleanup complete"
  5. If `POST /api/cleanup` fails (network error or 503): toast "Cleanup failed — files will be cleaned by 24h TTL" or "Backend unavailable — orphan files will be cleaned by scheduled job"
  6. Navigation ALWAYS proceeds (never blocks on cleanup failure)

### AC-5: "Stay" path
- User clicks "Stay":
  1. Navigation is cancelled (router aborts)
  2. TTS Studio remains active
  3. Synthesis continues (or is restored if `audioModule` was already disposed — `audioModule.load(audioBlob)`)
  4. Toast: "Navigation cancelled — synthesis will continue."

### AC-6: Network error handling
- If backend returns 503 during cleanup: toast "Backend unavailable — orphan files will be cleaned by scheduled job." Navigation proceeds.
- If network error during cleanup: toast "Cleanup failed — files will be cleaned by 24h TTL." Navigation proceeds.
- In both cases: orphan files may remain on disk (acceptable — 24h TTL cleanup catches them)

## Test Cases Covered

| Spec Test | How Verified |
|---|---|
| TC-04: In-flight synthesis — user clicks "Clean & Leave" | Cleanup dialog appears, `audioModule.dispose()` called, `POST /api/cleanup` succeeds, navigation proceeds |
| TC-05: In-flight synthesis — user clicks "Stay" | Navigation cancelled, TTS Studio remains, synthesis continues |
| TC-06: Backend unavailable during cleanup | Toast: "Backend unavailable — orphan files will be cleaned by scheduled job." Navigation proceeds |
| TC-14: In-flight synthesis — cleanup network error | Orphan files may remain. Toast: "Cleanup failed — files will be cleaned by 24h TTL." Navigation proceeds |
| TC-15: Active synthesis — no navigation | `isGenerating = false`, no cleanup dialog, direct navigation works |

## ADR References

- **ADR-001** (Shared Layout with Global Navbar): Assumption A5 — "The cleanup dialog (R-7) is implemented before this workflow is tested"
- **RC-3**: Critical — `index.vue` has no `onBeforeRouteLeave` guard; R-7 must be implemented before testing

## Files

- `frontend/app/pages/index.vue` (modified — add `onBeforeRouteLeave` guard)
- Component test: `frontend/tests/index.cleanup-guard.test.ts` (new — tests the cleanup dialog behavior)
