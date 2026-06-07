# ADR-001: Audio Playback Timing with Vue Refs in Transitions

**Status**: Accepted
**Date**: 2026-06-05
**Context**: Audio playback fails on first "Generate Speech" click; works on second.

## Problem

When `loadAudio()` sets a new blob URL, the `<audio ref="audioRef">` element is inside a `<Transition>` component. Calling `play()` immediately after `loadAudio()` fails because `audioRef.value` is still `null` — Vue's DOM update hasn't completed yet.

## Decision

Always use `await nextTick()` after any operation that changes reactive state which controls the presence or content of a `<ref>`-bound element, especially when that element is inside:

- A `<Transition>` component
- A `v-if` / `v-show` conditional block

### Code Pattern (Correct)

```ts
const url = loadAudio(audioBlob)
await nextTick() // Wait for Vue to mount/update the DOM
if (audioRef.value && url) {
  await play()
}
```

### Code Pattern (Broken — Before Fix)

```ts
const url = loadAudio(audioBlob)
// audioRef.value is null here — DOM not yet updated
if (audioRef.value && url) { // Guard fails, play() never called
  await play()
}
```

## Why This Happens

Vue batches DOM updates asynchronously. When a reactive ref changes:
1. Vue schedules a DOM update (microtask)
2. The current synchronous code continues executing
3. Only after the microtask queue drains does Vue patch the DOM

So `audioRef.value` (a template ref) is only populated **after** Vue patches the DOM, which happens after the current tick.

## Additional Safety Net

The `watch(audioUrl)` in `useAudioPlayer.ts` uses `{ flush: 'post' }` to ensure event listeners are attached after DOM updates, not during the reactive batch.

```ts
watch(audioUrl, (newUrl) => {
  if (newUrl && audioRef.value) {
    setupAudioEvents()
    audioRef.value.src = newUrl
  }
}, { flush: 'post' }) // DOM updated before this fires
```

## Related Files

- `app/pages/index.vue` — calls `loadAudio()` then `play()`
- `app/composables/useAudioPlayer.ts` — manages audio refs and watch

## References

- [Vue 3 Docs: Template Refs](https://vuejs.org/guide/essentials/template-refs.html)
- [Vue 3 Docs: nextTick](https://vuejs.org/api/general.html#nexttick)
- [Vue 3 Docs: Watch flush option](https://vuejs.org/api/computed.html#flush)
