## What to build

Replace all instances of `transition: all` (or `transition-all`) with explicit property lists. Using `all` causes the browser to animate every possible CSS property, which is expensive and can trigger unwanted layout/paint animations.

## Acceptance criteria

- [ ] ArabicTextarea.vue: `.tts-input__ring-fill` uses explicit `transition: background-color, box-shadow`
- [ ] AudioPlayer.vue: `.tts-slide-up-leave-active` and `.tts-slide-up-enter-active` use explicit `transition: transform, opacity`
- [ ] AudioPlayerContainer.vue: same as above for slide-up transitions
- [ ] SeekableProgressBar.vue: `.tts-audio__progress-fill` uses explicit `transition: width`
- [ ] ToastNotification.vue: `.tts-toast-enter-active` and `.tts-toast-leave-active` use explicit `transition: transform, opacity`
- [ ] index.vue: all slide-up transitions and range thumb hover use explicit properties

## Blocked by

None - can start immediately
