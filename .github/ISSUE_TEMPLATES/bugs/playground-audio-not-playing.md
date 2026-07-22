---
title: "[BUG] Audio does not play on /playground route"
labels: bug, frontend
---

## What happens

After generating speech on the /playground page, the audio is never played back — clicking play does nothing. The network request succeeds and returns the MP3 blob, but there is no sound.

## Steps to Reproduce

1. Navigate to /playground
2. Enter Arabic text in the text input
3. Click "Generate Speech" (or press Ctrl+Enter)
4. Wait for the synthesis to complete (success toast appears)
5. Click the play button in the audio player panel

**Result:** Nothing happens. No audio plays. The play button does not change state.

## Expected Behavior

After generating speech, clicking the play button should play the audio through the page's audio element. The play/pause button should toggle its state.

## Actual Behavior

The audio element exists in the DOM but never receives the generated blob. The play, pause, and seek controls are all non-functional.

## Additional Context

The hidden `<audio>` element on the page has its `src` bound to `audioUrlRef` but is missing the `ref="audioRef"` template binding. The `useAudioModule` composable relies on `audioRef` to reference the actual DOM `<audio>` element — without it, `audioRef.value` is always `null`, so `play()`, `toggle()`, and `seek()` all exit early without doing anything.

The `/playground` route is the only TTS studio page in the app. The main index page (`/`) is the lessons dashboard and does not handle audio playback.
