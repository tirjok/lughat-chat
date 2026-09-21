# Issue #025: fix: style the Play Scene button in LessonDialogue

## What's wrong

The "Play Scene" button in `LessonDialogue.vue` (lines 174–182) is a plain text `<button>` with no icon, no visual styling beyond the base button, and no accessibility hint when disabled. It doesn't match the visual language of the individual line play buttons (which have rounded-full, bg-primary-600, SVG icon).

## What to build

Replace the text-only "Play Scene" button with a styled version:

- Add a rounded full button with a play SVG icon (same as individual line play buttons: `M8 5v14l11-7z`).
- Add text label "Play Scene" to the right of the icon.
- Match the style of individual line play buttons (rounded-full, `bg-primary-600 text-white hover:bg-primary-700`), but 48×48 for full-width visibility.
- Position the button as full-width or right-aligned below all line cards, visually separated.
- When `isAudioDisabled` is true, add `title="Audio is currently disabled"` and keep the disabled attribute.

## Acceptance criteria

- [ ] The Play Scene button has a rounded icon (play SVG) + text label
- [ ] The button styling matches individual line play buttons (rounded, primary-600 bg, hover state)
- [ ] The button renders below all line cards, visually separated
- [ ] When `isAudioDisabled` is true, the button is disabled AND has `title="Audio is currently disabled"`
- [ ] When `isAudioDisabled` is false (or absent), the button is enabled with no title
- [ ] Existing test "emits playScene when the Play Scene button is clicked" still passes (behavior unchanged, only styling changed)

## Blocked by

None - can start immediately

## Integration Verification

- [ ] The styled button renders in the lesson page
- [ ] Screen reader announces "Play Scene" and the disabled state correctly

## Workflow Reference

- WORKFLOW-lesson-dialogue-ui-improvements.md: STEP 7 (Play Scene button styling)

## Test Cases Covered

- TC-11: Play Scene button styled
- TC-12: Play Scene button disabled state
