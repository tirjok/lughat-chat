## Parent

Lughat Chat PRD — Frontend Play/Pause Button

## What to build

A play/pause button that toggles between play and pause icons based on audio playback state. It should be disabled while audio is loading and visually indicate its active/inactive states.

The button should:
- Display a play icon when audio is not playing (or paused)
- Display a pause icon when audio is actively playing
- Be disabled while audio is loading (cursor: not-allowed, reduced opacity)
- Trigger the composable's `togglePlayPause()` method on click
- Support hover and active states (scale effect)

## Acceptance criteria

- [ ] Button displays play icon when not playing
- [ ] Button displays pause icon when actively playing
- [ ] Icon swaps correctly on click via togglePlayPause()
- [ ] Button is disabled while audio is loading (disabled state)
- [ ] Hover and active visual states work correctly
- [ ] Button is styled consistently with the audio player design

## Blocked by

- Issue 13 (Audio Player State Machine) — need the composable's togglePlayPause() method

---

## Triage: ready-for-agent
