# Issue #11: feat: wire StickyAudioBar error handling (part 3 of 3 — errors)

## What to build

This is **part 3 of 3** — error handling only (TTS handoff is #9, playback controls is #10).

The page must handle all TTS failure modes from `POST /api/generate`:
- **503 (model loading)**: retryable. UI: "Model is still loading" state on tapped item + bar; honor 503 (AGENTS.md §5). No cleanup needed (no URL created).
- **422 (validation)**: permanent. Show validation message on tapped item. (Requirement's "400" is stale — Finding F-1.)
- **500 (speaker missing)**: "Speaker WAV file not found: ..." — permanent; surface detail.
- **500 (generic)**: "Failed to generate audio" or "Failed to encode audio — FFmpeg conversion error" — treat as permanent; surface "An error occurred on the server" + detail. (No `retryable` flag exists in response — Finding F-3.)
- **Network error**: fetch rejects → "Unable to connect to the server" (existing client message) → transient; retryable.
- **Timeout**: 30s client budget expired → abort; treat as 500-class "request timed out" → transient; retryable.
- **Supersede**: a newer tap aborted this in-flight request → silent by design (no error UI); the aborted request's response, if it still arrives, is discarded.
- **Decode error**: media `error` event (corrupt/unsupported MP3) → bar error state "Unable to play audio"; text retained.
- **Autoplay reject**: `play()` promise rejects (autoplay policy) → module `error` string set (existing behavior); bar shows error state.

All errors must be classified by HTTP status code and `detail` content (since no `retryable` flag exists — Finding F-3).

## Acceptance criteria

- [ ] 503 (model loading) shows "Model is still loading" state; retryable
- [ ] 422 (validation) shows validation message on tapped item; permanent
- [ ] 500 (speaker missing) surfaces "Speaker WAV file not found" detail; permanent
- [ ] 500 (generic inference/FFmpeg) surfaces "An error occurred on the server" + detail; permanent
- [ ] Network error surfaces "Unable to connect to the server"; retryable
- [ ] Timeout (30s) surfaces "request timed out"; retryable
- [ ] Superseded request silently discarded (no error UI)
- [ ] Decode error (corrupt MP3) shows "Unable to play audio"; text retained
- [ ] Autoplay reject sets module `error` string; bar shows error state
- [ ] Error classification by HTTP status code and `detail` content (no `retryable` flag)
- [ ] Component test covers all error paths (503, 422, 500 speaker, 500 generic, network, timeout, supersede, decode, autoplay)
- [ ] RTL layout correct

## Blocked by

- #9 (wire StickyAudioBar + TTS handoff — error handling requires TTS integration)

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API returns a valid response

## Workflow Reference

- WORKFLOW-lesson-details-page.md: STEP 4 (Audio request — TTS handoff failure modes), STEP 5 (Playback failure modes)
- ADR-008: Audio integration (page intercepts play events → `useLessonAudio` composable)

## Test Cases Covered

- "503 shows loading state"
- "422 shows validation message"
- "speaker-missing 500 surfaces detail"
- "generic 500 surfaces error"
- "fetch reject shows connect error"
- "30s timeout aborts and shows retryable error"
- "new tap aborts in-flight request"
- "media error shows error state"
- "rejected autoplay sets module error"
