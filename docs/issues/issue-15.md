## Parent

Lughat Chat PRD — Frontend Seekable Progress Bar

## What to build

A seekable progress bar for the audio player that shows playback position and allows users to click anywhere on the bar to seek to that position. It should be RTL-aware (progress fills from right to left for Arabic UI).

The progress bar should:
- Display a fill indicator that shows current playback position as percentage
- Support click-to-seek (calculate seek position from click coordinates)
- Fill from right to left for RTL layout compatibility
- Include a draggable thumb indicator at the current position
- Update in real-time as audio plays

## Acceptance criteria

- [ ] Progress bar shows fill indicator proportional to current playback position
- [ ] Click on progress bar seeks audio to that position (RTL-aware calculation)
- [ ] Fill direction is right-to-left for RTL layout
- [ ] Thumb indicator follows current playback position
- [ ] Progress updates in real-time during playback (timeupdate event)
- [ ] Visual styling matches the audio player design system

## Blocked by

- Issue 13 (Audio Player State Machine) — need the composable's currentTime and duration refs

---

## Triage: ready-for-agent
