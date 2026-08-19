# Issue #13: feat: implement page-leave cleanup (ABORT_CLEANUP)

## What to build

Implement comprehensive cleanup on page leave (`onBeforeRouteLeave` / `onUnmounted`) in `[lesson].vue`. This ensures no resource leaks when the user navigates away from the lesson page.

Cleanup steps (in order, all capabilities verified in existing code):
1. Stop playback (`pause()`); clear the sequential-playback 800ms timer and any pending `setTimeout` in page/section scope
2. Abort any in-flight TTS fetch (AbortController)
3. `useAudioModule.dispose()` → `revokeAll()` object URLs (verified: tracks all created URLs in a Set; idempotent) + clear the audio element `src`
4. Reset `StickyAudioBar` `active = false` (bar hides; viewport `padding-bottom` released via the bar's own transition — verified)
5. Reset the shared progress state for this lesson (to 0 / cleared — per Assumption A6)
6. Remove the page-level keydown listener (StickyAudioBar's own shortcut listener self-removes on unmount — verified)

## Acceptance criteria

- [ ] `onBeforeRouteLeave` / `onUnmounted` cleanup handler implemented in `[lesson].vue`
- [ ] Playback stopped (`pause()`) on leave
- [ ] 800ms sequential-playback timer cleared on leave
- [ ] In-flight TTS fetch aborted (AbortController) on leave
- [ ] `useAudioModule.dispose()` called → `revokeAll()` object URLs + clear `src`
- [ ] `StickyAudioBar.active` reset to `false` (bar hides)
- [ ] Shared progress state cleared (`clearLessonProgress`)
- [ ] Page-level keydown listener removed
- [ ] Double unmount is safe (idempotent cleanup)
- [ ] Partial-failure variant: TTS failed mid-lesson, then leave — steps 1, 3 (no-op if no URL), 4, 5, 6 still run
- [ ] Component test covers leave during playback, leave during fetch, timer cleared, double unmount
- [ ] RTL layout correct

## Blocked by

- #12 (implement shared progress state composable — cleanup needs progress composable)

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API returns a valid response

## Workflow Reference

- WORKFLOW-lesson-details-page.md: ABORT_CLEANUP (Page leave — all 6 cleanup steps)
- ADR-008: Cleanup inventory (9 resources tracked)

## Test Cases Covered

- "leave during playback revokes URL, stops audio, hides bar"
- "leave during fetch aborts request"
- "sequential timer cleared on leave"
- "double unmount is safe"
