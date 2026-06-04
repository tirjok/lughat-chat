## What to build

Replace custom `@keyframes spin` animations in AudioPlayer.vue and ModelStatusIndicator.vue with compositor-friendly CSS using only `transform: rotate()`. Custom keyframes that animate properties like `left`/`top` or trigger layout/paint are expensive and can cause jank on low-end devices.

## Acceptance criteria

- [ ] AudioPlayer.vue: custom `@keyframes tts-spin` replaced with `transform: rotate(360deg)` using CSS `animation`
- [ ] ModelStatusIndicator.vue: custom `@keyframes spin` replaced with the same compositor-friendly approach
- [ ] Both loaders use identical animation timing for visual consistency
- [ ] No layout or paint is triggered during the spin (only composite)

## Blocked by

None - can start immediately
