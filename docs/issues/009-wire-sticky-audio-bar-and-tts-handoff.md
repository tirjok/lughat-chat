# Issue #9: feat: wire StickyAudioBar into lesson page + TTS handoff (part 1 of 3 — TTS handoff)

## What to build

Wire the existing `StickyAudioBar` component into the lesson page and integrate `useAudioModule()` for TTS handoff. This is **part 1 of 3** — TTS handoff only (no playback controls, no error handling).

The page must:
1. Mount `StickyAudioBar` with bound props: `active`, `textContent`, `isPlaying`, `isPaused`, `currentTime`, `duration`, `shortcutsEnabled`
2. Wire event handlers: `@close`, `@toggle`, `@prevTrack`, `@nextTrack`, `@seek`, `@speedChange`, `@repeatChange`
3. Wire `useAudioModule()` — call `audioModule.load(blob)` when TTS returns 200, activate bar
4. Wire `useTtsApi().synthesize(text)` — `POST /api/generate` with `{ text, language: "ar", speaker?, speed?, seed? }`
5. Handle 200 response: binary MP3 → `audioModule.load(blob)` → `audioModule.play()` → bar slides up
6. AbortController: cancel previous in-flight request on new tap (per Finding F-4)
7. 30s client-side timeout (per Assumption A1)
8. `<audio ref="audioModule.audioRef" />` element in page template

## Acceptance criteria

- [ ] `StickyAudioBar` mounted in lesson page template with all props bound
- [ ] All event handlers wired (`@close`, `@toggle`, `@prevTrack`, `@nextTrack`, `@seek`, `@speedChange`, `@repeatChange`)
- [ ] `useAudioModule()` called on 200 TTS response → `load(blob)` → `play()` → bar active
- [ ] `useTtsApi().synthesize()` called with correct payload (`text`, `language: "ar"`, optional `speaker`, `speed`, `seed`)
- [ ] AbortController cancels previous in-flight request on new tap
- [ ] 30s client-side timeout enforced (per Assumption A1)
- [ ] `<audio>` element wired via `audioModule.audioRef`
- [ ] Bar hidden when `active=false` (default state)
- [ ] Component test covers TTS handoff happy path (200 → bar active)
- [ ] RTL layout correct

- #4, #5, #6, #7, #8 (all six content components must exist before TTS wiring)

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API returns a valid response

## Workflow Reference

- WORKFLOW-lesson-details-page.md: STEP 4 (Audio request — TTS handoff, system boundary), STEP 5 (Playback and transport control — bar controls)
- ADR-008: Component map (page orchestrator intercepts play events → `useLessonAudio` composable)

## Test Cases Covered

- "tap plays audio after 200" (bar active + playing; object URL created)
- "empty text rejected client-side" (no request sent)
