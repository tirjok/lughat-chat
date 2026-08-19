# Issue #17: feat: implement pre-gate health check for audio taps

## What to build

Wire `useHealthPoll().status` into the lesson page's audio tap gating logic.
The workflow spec (STEP 4, line 285) defines a pre-gate: if the model is
still loading, audio taps should be disabled with a "model loading" hint
rather than firing a guaranteed-failing TTS request.

**Behavior:**
- When `useHealthPoll().status === 'loading'`:
  - All audio tap affordances (line cards, word cards, pronoun cards,
    expression cards) render as disabled (opacity 0.4, cursor not-allowed).
  - A tooltip or inline hint reads "Model is loading — audio unavailable".
  - Tapping a disabled affordance is a no-op (no request sent).
- When `useHealthPoll().status === 'error'`:
  - All audio tap affordances render as disabled.
  - A persistent notice reads "TTS unavailable — check backend status".
  - Tapping a disabled affordance is a no-op.
- When `useHealthPoll().status === 'ready'`:
  - All audio tap affordances are enabled (normal behavior).

**Implementation approach:**
- The page orchestrator already calls `useHealthPoll()` (singleton, existing).
- Pass `isModelLoading: computed(() => useHealthPoll().status === 'loading')`
  and `isModelError: computed(() => useHealthPoll().status === 'error')`
  as props to each content component that emits audio events.
- Each content component adds a conditional `:disabled="isModelLoading || isModelError"`
  to its tap affordance elements and shows the appropriate hint.
- No backend changes required.

**Alternative considered:** Attempt the TTS request and handle 503 (already
done in #011). The pre-gate is preferred because it avoids guaranteed-failing
requests, saving backend load and improving perceived responsiveness.

## Acceptance criteria

- [ ] Audio tap affordances are disabled when `useHealthPoll().status === 'loading'`
- [ ] Disabled affordances show "Model is loading" hint (tooltip or inline)
- [ ] Audio tap affordances are disabled when `useHealthPoll().status === 'error'`
- [ ] Disabled affordances show "TTS unavailable" notice when status is 'error'
- [ ] Tapping a disabled affordance is a no-op (no TTS request sent)
- [ ] When status transitions to 'ready', all affordances re-enable automatically
- [ ] Component test covers disabled state for 'loading' and 'error' statuses
- [ ] RTL layout correct

## Blocked by

- None — depends only on existing `useHealthPoll()` composable (already exists)

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API returns a valid response

## Workflow Reference

- WORKFLOW-lesson-details-page.md: STEP 4 (pre-gate health check, line 285)
- ADR-008: Audio integration (page intercepts play events)

## Test Cases Covered

- "disables audio taps when model is loading"
- "disables audio taps when model is in error state"
- "reenables taps when model becomes ready"
- "tapping disabled affordance sends no request"
