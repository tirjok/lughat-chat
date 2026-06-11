## Type

AFK

## What to build

Build an `AudioPlayerPanel` component — a slide-up panel at the bottom of the right content area that appears when audio is generated. The panel features:

- **Slide-up animation** using `cubic-bezier(0.16, 1, 0.3, 1)` easing — hidden by default, appears when audio is generated
- **Canvas-based heatmap waveform** with 60 animated bars:
  - Colors interpolated between magenta (#DD2476) and orange (#FF512F) based on bar height
  - Bars animate via `requestAnimationFrame` during playback (sine wave + random noise modulation)
  - Static state: bars settle to random target heights
  - Synced to playback state via existing `useAudioPlayer` composable (`isPlaying` flag)
- **Time display** showing "current / total" (e.g., "0:12 / 0:45")
- **Large magenta play/pause button** (Lucide `play` / `pause`)
- **Download button** (Lucide `download`) to save the generated MP3
- **Manual collapse** via X button (Lucide `x`) — panel stays visible after playback ends (no auto-collapse)
- Panel remains visible after playback ends until manually collapsed

## Acceptance criteria

- [ ] Panel slides up from bottom of right panel with `cubic-bezier(0.16, 1, 0.3, 1)` easing
- [ ] Panel is hidden by default, appears when audio is generated
- [ ] Canvas renders 60 animated bars
- [ ] Bar colors interpolated between magenta (#DD2476) and orange (#FF512F) based on height
- [ ] Bars animate via `requestAnimationFrame` during playback
- [ ] Time display shows "current / total" format (e.g., "0:12 / 0:45")
- [ ] Large magenta play/pause button toggles playback
- [ ] Download button saves the generated MP3 file
- [ ] X button manually collapses the panel
- [ ] Panel stays visible after playback ends (no auto-collapse)
- [ ] Tests: slide-up animation on audio ready, canvas renders 60 bars, canvas waveform animates during playback, play/pause toggles, download triggers, collapse hides panel

## Blocked by

- #01-two-panel-layout-header-keyboard-shortcut (Slice 1)
- #05-generate-button-conic-gradient-state-swap (Slice 5)
