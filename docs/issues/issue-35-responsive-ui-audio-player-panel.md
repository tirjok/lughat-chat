# Issue 35: Audio Player Panel — Responsive Layout

## What to build

Adapt the AudioPlayerPanel to stack vertically on mobile/tablet screens (<768px) while preserving the existing horizontal layout on desktop (≥768px). On mobile, the play button sits above the waveform so the waveform has enough width to be visible. All touch targets are enlarged to meet WCAG minimums.

After this is complete, the audio player is usable on both narrow phone screens and wide desktop monitors without layout conflicts.

## Acceptance criteria

- [ ] On mobile (<768px): `AudioPlayerPanel.vue` uses `flex-col` layout:
  - Player header (voice name, action buttons) stacks above waveform container
  - Play/pause button appears above the waveform canvas
  - Waveform has full width (not squeezed by a sidebar button)
  - Duration display is inline with the waveform
- [ ] On desktop (≥768px): existing horizontal layout preserved:
  - Play button | waveform | duration (all in one row)
  - No layout changes
- [ ] All interactive buttons enlarged to minimum 44×44px on mobile:
  - Download button
  - Close button
  - Play/pause button
  - Any other actionable elements in the player
- [ ] Slide-up transition adjusted so player doesn't cover the entire textarea on mobile
- [ ] Existing `visible` prop and `close`/`toggle`/`download` emits unchanged
- [ ] Existing `slide-up-player` CSS transition preserved (no animation changes)

## Blocked by

- Issue 31: Viewport, Breakpoints & Scroll Fix
