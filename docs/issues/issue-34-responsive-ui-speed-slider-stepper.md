# Issue 34: Speed Slider — Mobile Stepper Buttons

## What to build

On mobile/tablet screens (<768px), replace the horizontal speed slider with stepper-style +/- buttons that flank the speed value. On desktop, the existing horizontal slider is preserved unchanged. This avoids the touch-action conflict where horizontal slider gestures interfere with vertical page scrolling.

After this is complete, mobile users can adjust speech speed with simple tap buttons, while desktop users still get the precise slider control.

## Acceptance criteria

- [ ] `SpeedSlider.vue` renders stepper buttons on mobile (<768px):
  - Layout: `-` button, speed value display (e.g., `1.0x`), `+` button, all in a horizontal row
  - Each button has minimum 44×44px touch target
  - `-` decreases speed by 0.1 (clamped to 0.5 minimum)
  - `+` increases speed by 0.1 (clamped to 2.0 maximum)
  - Speed value display is enlarged on mobile (`text-lg` → `text-xl`) for readability
- [ ] `SpeedSlider.vue` preserves existing horizontal slider on desktop (≥768px):
  - Pointer event handling (pointerdown/pointermove/pointerup) unchanged
  - `touch-action: pan-y` for touchpad users
  - Track, fill, thumb, and range markers unchanged
- [ ] `v-model` interface unchanged — existing `index.vue` integration works without modification
- [ ] Existing clamping logic (0.5–2.0 range, 0.1 steps) preserved
- [ `displayValue` format (`1.0x`) preserved

## Blocked by

- Issue 31: Viewport, Breakpoints & Scroll Fix
