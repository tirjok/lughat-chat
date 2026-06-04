## Parent

Lughat Chat PRD — Frontend Audio Player State Machine

## What to build

A composable that manages the audio playback state machine. It handles Blob URL creation and cleanup, exposes reactive state (idle/loading/playing/paused/ended), and provides methods to play, pause, toggle play/pause.

The composable should:
- Accept a Blob from the API and create an object URL for playback
- Track state transitions: idle → loading → playing → paused → ended
- Clean up object URLs to prevent memory leaks (revoke on unmount)
- Expose reactive refs for `isPlaying`, `isPaused`, `isLoading`
- Emit events on playback end (callback support)

## Acceptance criteria

- [ ] Composable accepts a Blob and creates a playable object URL
- [ ] State transitions are correct: idle → loading → playing → paused → ended
- [ ] `play()` method triggers audio playback and sets isPlaying=true
- [ ] `pause()` method pauses playback and sets isPaused=true
- [ ] `togglePlayPause()` correctly alternates between play and pause
- [ ] Object URLs are revoked on cleanup to prevent memory leaks
- [ ] Reactive state is exposed for template binding (isPlaying, isPaused, isLoading)
- [ ] Playback end callback fires when audio finishes

## Blocked by

- Issue 11 (Frontend API Composable) — need the Blob response to test playback

---

## Triage: ready-for-agent
