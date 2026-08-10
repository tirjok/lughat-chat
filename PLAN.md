# Plan: Fix SpeedSlider Thumb Track Centering

## Summary

Replace the native `<input type="range">` in `SpeedSlider.vue` with a pure CSS `<div>`-based track + thumb, matching the pattern already used by `StickyAudioBar`'s progress bar. This fixes the visual bug where the filled track extends past the thumb, making it appear off-center.

## Context

**Current implementation** (`SpeedSlider.vue`, lines 61-71):
- Uses native `<input type="range">` with `-webkit-appearance: none; appearance: none`.
- JS `updateSliderFill()` sets `el.style.background` to a `linear-gradient` where the color split point is at the percentage position.
- Browser renders the native thumb **on top** of this gradient. The gradient fills the entire input width, so the filled color extends past the thumb to the right edge — visually making the thumb appear off-center.

**Existing pattern** (`StickyAudioBar.vue`, lines 216-232):
- Uses a `<div role="slider">` with an inner `<div>` fill that uses `:style="{ width: '${percent}%' }"`.
- No native input. Pure CSS. Works correctly.

**Consumers** (no changes needed):
- `DesktopPanels.vue` line 123-126: `<SpeedSlider :model-value="speedValue" @update:model-value="..."/>`
- `MobileSplitScreen.vue` line 178-181: same usage pattern
- Both only care about `modelValue` prop and `update:modelValue` event — the API surface stays identical.

**Tests** (`frontend/tests/components/SpeedSlider.test.ts`, 15 tests):
- 3 tests in "native range input" assert on `input[type="range"]` existence, attributes, and value.
- 12 other tests assert on behavior (display value, clamping, v-model emissions, responsive layout).
- All behavioral tests (value display, clamping, emission) work regardless of DOM structure — only the 3 "native range input" tests need rewriting.

## System Impact

- **API surface**: Unchanged. `modelValue` prop + `update:modelValue` event remain identical.
- **Consumers**: Zero changes needed in `DesktopPanels.vue` or `MobileSplitScreen.vue`.
- **Tests**: 3 tests rewritten (assert on `<div>` structure instead of `<input>`). 12 behavioral tests unaffected.
- **No new dependencies, no new files, no new composables.**

## Approach

Replace the native `<input type="range">` with a `<div>`-based track + thumb:

1. **Track `<div>`**: Full-width, 4px height, rounded corners. Background is the track color (`#a8a29e` / `#2A2A2A` in dark mode).
2. **Fill `<div>`**: Inner element inside the track, `height: 4px`, `background: #14b8a6`, `border-radius: 2px`, `width: ${percentage}%`. This is the exact same pattern as `StickyAudioBar`'s progress fill.
3. **Thumb `<div>`**: 16px circle, positioned absolutely at `left: calc(percentage% - 8px)` (half the thumb width). Teal background with glow box-shadow. Hover: scale 1.2.

The percentage calculation stays the same (computed from `clampedValue`). The `handleInput` handler updates the model value — since there's no native input, we add a `@mousedown`/`@click` handler on the track to calculate position.

### Interaction Model

Instead of relying on native `<input>` interaction, the track div captures click/mousedown events and calculates the percentage from the click position relative to the track width. The thumb updates immediately via the computed percentage.

### Accessibility

Add `role="slider"`, `aria-label="Speech speed"`, `aria-valuemin="0.5"`, `aria-valuemax="2"`, `aria-valuenow` (computed from clampedValue), and `tabindex="0"` for keyboard focus. Add `@keydown` handler for arrow keys.

## Changes

### `frontend/app/components/SpeedSlider.vue` — Rewrite slider to `<div>`-based track + thumb

**Script** (lines 1-43):
- Remove `sliderRef` ref (no longer an `<input>`).
- Remove `updateSliderFill()` function (no longer sets JS background gradient).
- Keep `clampedValue` computed, `displayValue` computed.
- Add `sliderValue` computed: `((clampedValue.value - 0.5) / 1.5) * 100` (the percentage 0-100).
- Add `handleTrackClick(event: MouseEvent)` — calculates percentage from `event.offsetX / trackWidth`.
- Add `handleKeydown(event: KeyboardEvent)` — ArrowRight increases by 0.1, ArrowLeft decreases by 0.1.

**Template** (lines 45-72):
- Replace `<input type="range">` with:
  ```html
  <div
    ref="sliderRef"
    role="slider"
    aria-label="Speech speed"
    :aria-valuemin="0.5"
    :aria-valuemax="2"
    :aria-valuenow="clampedValue"
    :tabindex="0"
    class="relative h-4 w-full cursor-pointer group"
    @click="handleTrackClick"
    @keydown="handleKeydown"
  >
    <div class="absolute inset-y-0 left-0 w-1 bg-stone-300 dark:bg-stone-600 rounded-full" />
    <div
      class="absolute inset-y-0 rounded-full"
      :style="{ width: `${sliderValue}%`, background: '#14b8a6' }"
    />
    <div
      class="absolute top-1/2 -translate-y-1/2 rounded-full"
      :style="{ left: `calc(${sliderValue}% - 8px)`, width: '16px', height: '16px', background: '#14b8a6', boxShadow: '0 0 10px rgba(20, 184, 166, 0.8)' }"
    />
  </div>
  ```

**Style** (lines 75-125):
- Remove ALL `::-webkit-slider-thumb`, `::-webkit-slider-runnable-track`, `::-moz-range-thumb`, `::-moz-range-track` rules (30+ lines of browser-specific pseudo-elements).
- Keep only the hover scale transition on the thumb div (can be done via CSS class).

### `frontend/tests/components/SpeedSlider.test.ts` — Rewrite 3 tests, add 1

**Removed**: 3 tests in "native range input" describe block (assert on `input[type="range"]`).

**Added**: 1 test in new "slider interaction" describe block:
- "When track is clicked at 50% then thumb centers" — asserts the thumb element exists with correct left position.

**Modified**: 2 responsive tests — change `toContain('type="range"')` to `toContain('role="slider"')`.

**Unaffected**: 10 behavioral tests (display value, clamping, v-model emissions, formatting).

### `specs/general/UI-IMPROVEMENTS.md` — Update Issue 13

Update the "Current State" and "Recommendation" to reference the new `<div>`-based implementation and note that the thumb centering bug is resolved.

## Verification

```bash
# Run full test suite
./run-tests.sh

# Specifically component tests for SpeedSlider
cd frontend && pnpm vitest --config vitest.component.config.ts run tests/components/SpeedSlider.test.ts
```

**Edge cases to check**:
- Value at 0.5 (min) → thumb at leftmost position (0%)
- Value at 2.0 (max) → thumb at rightmost position (100%)
- Value at 1.25 (mid) → thumb at 50% position
- Keyboard arrow keys (ArrowLeft/ArrowRight)
- Click on track at various positions
- Dark mode track color
