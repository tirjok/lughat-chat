## What to build

Replace `outline: none` with proper `focus-visible` styles on the Arabic textarea and index.vue input/select elements. Currently, keyboard-focusable inputs lose their visible focus indicator entirely when focused, making it impossible for keyboard users to know where they are.

## Acceptance criteria

- [ ] ArabicTextarea.vue: `.tts-input:focus` replaced with `:focus-visible` selector with visible focus ring
- [ ] index.vue: `.tts-input:focus, .tts-select:focus` replaced with `:focus-visible` selector
- [ ] Focus ring is visible against both light and dark backgrounds (check contrast)
- [ ] Mouse-click focus does NOT show the ring (only keyboard/tab focus triggers it)

## Blocked by

None - can start immediately
