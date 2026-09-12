# Issue #027: feat: add playing indicator and auto-scroll to active line in LessonDialogue

## What's wrong

When audio plays, the active line highlight is too subtle — it uses a light gradient that's hard to distinguish from the non-active line gradient. There is no visual indicator that a line is actively being spoken (pulsing animation). There is no auto-scroll to bring the active line into view when dialogues have many lines. The parent page (`[lesson].vue`) currently does not emit a `@playing` event to children.

## What to build

Add playing state support to `LessonDialogue.vue` and wire it from the parent page:

1. **Props**: Add `isPlaying: boolean` and `playingLineIndex: number | null` from the parent page.
2. **Pulse animation**: When `isPlaying` is true and `playingLineIndex === lineIndex`, apply a CSS pulse/shimmer animation overlay to the line card (more visible than the current light gradient).
3. **Auto-scroll**: When `currentLineIndex` changes (via body click or play button click), call `scrollIntoView({ behavior: 'smooth', block: 'center' })` on the card to scroll the active line into view.
4. **Increased highlight**: Increase the active line gradient saturation (from light to more prominent) so it's distinguishable without the pulse.
5. **Parent wiring**: Update `[lesson].vue` to pass `isPlaying` and `playingLineIndex` props from `useAudioModule` state.

**Graceful degradation**: If the parent does not pass the props, the basic highlight gradient still works (no crash). If `scrollIntoView` is unavailable, degrade to no scroll (the highlight gradient still applies).

## Acceptance criteria

- [ ] The component accepts `isPlaying: boolean` and `playingLineIndex: number | null` props
- [ ] When `isPlaying` is true and `playingLineIndex === lineIndex`, a CSS pulse/shimmer animation plays on the card
- [ ] When `currentLineIndex` updates (body click or play button click), `scrollIntoView({ behavior: 'smooth', block: 'center' })` is called on the card
- [ ] The active line highlight gradient has increased saturation (more visually prominent)
- [ ] The parent page (`[lesson].vue`) passes these props from `useAudioModule` state
- [ ] Graceful degradation: if the parent does not pass the props, the basic highlight still works (no crash)
- [ ] Browser fallback: `scrollIntoView` not available → graceful degradation (no scroll, highlight still works)
- [ ] Existing active line highlight tests still pass (the gradient is different but still identifies the active line)

## Blocked by

None - can start immediately (but requires the component to be stable from Issues #020–#026 before the parent page wiring)

## Integration Verification

- [ ] The lesson page renders with active line highlights working
- [ ] Long dialogues (many lines) scroll correctly to the active line
- [ ] The pulse animation is visible but not distracting

## Workflow Reference

- WORKFLOW-lesson-dialogue-ui-improvements.md: STEP 8 (Playing indicator and active line highlight)

## Open Questions

- The parent page (`[lesson].vue`) does not currently implement a `@playing` event. This issue creates the props interface; the parent wiring is a separate concern. The component degrades gracefully if the parent doesn't provide the props.
