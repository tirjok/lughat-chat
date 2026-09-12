# Issue #020: feat: add keyboard tab navigation to scene tabs in LessonDialogue

## What's wrong

Scene tabs in `LessonDialogue.vue` are rendered as `<button>` elements inside a `role="tablist"` container, but they have no keyboard navigation. A keyboard user can tab into the tablist but cannot use ArrowLeft/ArrowRight to switch scenes — the visual click handler only responds to mouse clicks. This is an accessibility violation per ARIA Authoring Practices for tab lists.

## What to build

Add ARIA-compliant keyboard navigation to the scene tab list:

- **ArrowRight / ArrowLeft**: Cycle through tabs (wrapping: last → first, first → last). Update `currentSceneIndex`, switch the scene, reset `currentLineIndex` to 0.
- **Enter / Space**: Activate the currently focused (non-active) tab.
- **Focus management**: Active tab gets `tabindex="0"`; inactive tabs get `tabindex="-1"`. After switching, move focus to the newly active tab.
- **`aria-activedescendant`**: Set on the `role="tablist"` container, bound to the active tab's `id` (each tab gets a unique `:id="scene-tab-${index}"`).
- **Cleanup**: Remove the `@keydown` listener in `onUnmounted` to prevent memory leaks.

## Acceptance criteria

- [ ] ArrowRight on the active tab moves focus to the next tab and switches the scene
- [ ] ArrowLeft wraps from first tab to the last tab and switches the scene
- [ ] Enter or Space on a focused (non-active) tab activates it
- [ ] Active tab has `tabindex="0"`; inactive tabs have `tabindex="-1"`
- [ ] `onUnmounted` removes the `@keydown` listener (no memory leak)
- [ ] Existing click-to-switch behavior is unchanged (regression-free)
- [ ] Test added: keyboard nav on scene tabs (ArrowRight, ArrowLeft, Enter, Space, focus management)

## Blocked by

None - can start immediately

## Integration Verification

- [ ] The component renders correctly in the lesson page with multi-scene dialogues
- [ ] Keyboard navigation works with a screen reader (NVDA/JAWS)

## Workflow Reference

- WORKFLOW-lesson-dialogue-ui-improvements.md: STEP 3 (Scene tab keyboard navigation)
- ADR-008: Component map (LessonDialogue — high complexity)

## Test Cases Covered

- TC-02: ArrowRight keyboard navigation
- TC-03: ArrowLeft keyboard navigation
- TC-04: Enter/Space activation
- TC-17: Focus management on scene switch
