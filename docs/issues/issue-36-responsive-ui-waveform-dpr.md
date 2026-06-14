# Issue 36: Waveform Canvas — DPR Awareness

## What to build

Update the WaveformCanvas to respect `window.devicePixelRatio` when sizing the canvas element. This ensures the waveform renders sharply on Retina, HD, and high-DPI mobile screens instead of appearing blurry.

After this is complete, the waveform looks crisp on all devices regardless of screen density. No UI or layout changes are needed.

## Acceptance criteria

- [ ] `WaveformCanvas.vue` gets `resizeCanvas()` updated to multiply canvas dimensions by `window.devicePixelRatio`:
  - `canvas.width = parent.clientWidth * devicePixelRatio`
  - `canvas.height = parent.clientHeight * devicePixelRatio`
  - Context scaled via `ctx.scale(devicePixelRatio, devicePixelRatio)`
- [ ] Canvas CSS sets `width: 100%; height: 100%` (relative to parent) — no fixed pixel dimensions in CSS
- [ ] Waveform bar rendering is unaffected (bar heights, colors, positions remain the same)
- [ ] Canvas is resized on `window.resize` events (existing behavior preserved)
- [ ] No performance regression — animation frame rate stays the same
- [ ] Works correctly on both desktop (1x DPI) and mobile (2x–3x DPI) screens

## Blocked by

None - can start immediately (standalone — no other slice depends on it)
