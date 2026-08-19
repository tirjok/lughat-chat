# Issue #10: feat: wire StickyAudioBar playback controls (part 2 of 3 — playback)

## What to build

This is **part 2 of 3** — playback transport controls only (no error handling, no TTS handoff — that's Issue #9).

The page must wire `useAudioModule()` playback methods to `StickyAudioBar` transport events:
- `play()` / `pause()` / `toggle()` — updates `isPlaying`/`isPaused` refs
- `seek(ratio)` — jumps to position (±5s via bar's seek bar)
- `download(filename?)` — triggers MP3 download
- `timeupdate` event drives `currentTime` ref
- `ended` event applies repeat mode: `off` → idle, `one` → replay current line, `all` → next line in sequence
- "Play Scene" sequential playback: 800ms gap between lines (per Assumption A2), cleared on user stop, section change, or page leave
- Speed change: re-synthesizes at new speed (not live `playbackRate`, per Assumption A3)
- Keyboard shortcuts: `Ctrl/Cmd+Enter` toggle, `Space` toggle (bar's handler), `ArrowLeft`/`ArrowRight` seek ±5s (when bar focused)

## Acceptance criteria

- [ ] `play()` / `pause()` / `toggle()` update `isPlaying`/`isPaused` refs correctly
- [ ] `seek(ratio)` jumps audio to correct position (±5s via bar controls)
- [ ] `download(filename?)` triggers MP3 download
- [ ] `timeupdate` event drives `currentTime` ref
- [ ] `ended` event applies repeat mode: `off` → idle, `one` → replay, `all` → next line
- [ ] "Play Scene" sequential playback uses 800ms gap between lines (per Assumption A2)
- [ ] 800ms timer cleared on user stop, section change, or page leave
- [ ] Speed change re-synthesizes at new speed (not live `playbackRate`, per Assumption A3)
- [ ] Keyboard shortcuts work: `Ctrl/Cmd+Enter` toggle, `Space` toggle, `ArrowLeft`/`ArrowRight` seek ±5s
- [ ] Keyboard shortcuts self-remove on bar unmount (verified in existing code)
- [ ] Component test covers play/pause, seek, repeat modes, speed change, keyboard shortcuts
- [ ] RTL layout correct

## Blocked by

- #9 (wire StickyAudioBar + TTS handoff — playback controls require audio loaded)

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API returns a valid response

## Workflow Reference

- WORKFLOW-lesson-details-page.md: STEP 5 (Playback and transport control — bar controls, keyboard shortcuts, repeat modes, speed change, sequential playback)
- ADR-004: Bar at bottom of viewport, transport controls, keyboard shortcuts

## Test Cases Covered

- "play/pause toggle updates state"
- "seek updates currentTime"
- "prev/next triggers TTS for adjacent line"
- "speed change re-synthesizes at new speed"
- "repeat off/one/all behave per mode"
- "close hides bar and resets"
