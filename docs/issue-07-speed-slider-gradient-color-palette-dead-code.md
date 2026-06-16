# Issue 7: Speed Slider Gradient-Fill + Color Palette + Dead Code Cleanup

## What to build

Three independent changes: (1) SpeedSlider gradient-fill styling updated to use CSS variable approach (not JS `trackPercent` calc); (2) `studio-700` color changed from `#525252` to `#2A2A2A` in `uno.config.ts` (affects 40+ locations); (3) `AudioPlayer.vue` dead code (~300 lines) deleted.

## Acceptance criteria

### SpeedSlider changes
- [ ] SpeedSlider: gradient-fill uses CSS variable (`--fill`) for track fill, not JS `trackPercent` width calc
  - **Current code**: `trackPercent` computed in JS, applied via `:style="{ width: \`${trackPercent}%\}`"` on `.speed-slider__fill` and `:style="{ left: \`calc(${trackPercent}% - 8px)\}`"` on `.speed-slider__thumb`
  - **New approach**: JS sets a CSS variable (e.g., `--fill: ${trackPercent}%`) on the track element; CSS reads it for both fill width and thumb left position
  - **Prototype note**: The prototype uses **inline JS** to set `speedSlider.style.background = ...` (not CSS variables). The PRD explicitly says "CSS variable approach, not JS calc" — this is a deliberate PRD decision that differs from the prototype.
- [ ] SpeedSlider: stepper buttons preserved (existing custom implementation kept, `md:hidden` on desktop slider)
  - **Prototype note**: The prototype uses a **native `<input type="range">`** styled with CSS (webkit slider thumb, gradient track). The current code uses a **custom pointer-event implementation** (div-based track, thumb, filled track) with stepper buttons on mobile. The PRD says to keep the custom implementation for usability (stepper buttons on mobile). This is a deliberate PRD decision that differs from the prototype.
- [ ] SpeedSlider: gradient track uses `linear-gradient(to right, #DD2476, #FF512F)` (matches prototype)
  - Prototype JS: `speedSlider.style.background = \`linear-gradient(to right, #DD2476, #FF512F ${percentage}%, #2A2A2A ${percentage}%, #2A2A2A 100%)\``
- [ ] SpeedSlider tests updated (`SpeedSlider.test.ts`: `trackPercent` → CSS variable tests)
- [ ] SpeedSlider: native `<input type="range">` styling from prototype (webkit slider thumb, gradient track) is NOT used — current code uses custom pointer-event implementation per PRD decision

### Color palette change
- [ ] `studio-700` in `uno.config.ts` changed from `#525252` to `#2A2A2A` (exact prototype match)
- [ ] All 40+ locations using `border-studio-700` or `bg-studio-700` reflect new color:
  - `index.vue`: Control Deck `border-r`, Canvas `border-l`, header `border-b`, textarea wrapper `border-b`, shortcut hint `border`, canvas header `border-b`, clear button `border`
  - `SpeedSlider.vue`: stepper buttons `bg-studio-700` + `border-studio-600`, display value `border-studio-700`
  - `PanelToggle.vue`: `bg-studio-700` + `border-studio-600`
  - `AudioPlayerPanel.vue`: `border-studio-700`
  - `ToastNotification.vue`: `border-studio-700`
  - `AudioPlayer.vue` (deleted): `border-studio-700`
  - `uno.config.ts` scrollbar-thumb: `#2A2A2A` (already correct)
- [ ] Any test asserting `studio-700: #525252` fails as expected (color change to `#2A2A2A`)

### Dead code cleanup
- [ ] `AudioPlayer.vue` component deleted (dead code, ~300 lines, unused by any component)
- [ ] `AudioPlayer.test.ts` removed (tests for deleted component)
- [ ] No imports of `AudioPlayer.vue` remain in any component

- [ ] `./run-tests.sh` passes (lint + typecheck + tests)

## Blocked by

None — can start immediately (independent of layout changes).
