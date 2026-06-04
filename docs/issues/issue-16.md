## Parent

Lughat Chat PRD — Frontend Time Display

## What to build

A time display component that shows the current playback position and total audio duration in MM:SS format. It should update in real-time during playback and handle edge cases (NaN, zero duration).

The time display should:
- Show current time on the left and total duration on the right (RTL layout)
- Format times as MM:SS (e.g., "1:23" for 1 minute 23 seconds)
- Handle edge cases gracefully (NaN → "0:00", undefined → "0:00")
- Update in real-time during playback via the composable's currentTime ref

## Acceptance criteria

- [ ] Displays current time and total duration in MM:SS format
- [ ] Time updates in real-time during playback (every second)
- [ ] Handles NaN and undefined values gracefully (displays "0:00")
- [ ] RTL layout with current time on right, duration on left
- [ ] Monospace font for aligned numbers

## Blocked by

- Issue 13 (Audio Player State Machine) — need the composable's currentTime and duration refs

---

## Triage: ready-for-agent
