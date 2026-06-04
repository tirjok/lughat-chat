## What to build

Add `aria-hidden="true"` to all decorative icons (Lucide icon spans) throughout the frontend so screen readers skip them and don't announce meaningless character strings or icon names.

## Acceptance criteria

- [ ] All `<span class="i-lucide-*">` elements have `aria-hidden="true"`
- [ ] Affected files: AudioPlayer.vue, AudioPlayerContainer.vue, ModelStatusIndicator.vue, ToastNotification.vue, index.vue
- [ ] No visual changes — icons render identically

## Blocked by

None - can start immediately
