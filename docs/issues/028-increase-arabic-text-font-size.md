# Issue #028: feat: increase Arabic text font size in LessonDialogue

## What's wrong

Arabic text in `LessonDialogue.vue` line cards uses `text-lg md:text-xl` (16px on mobile, 18px on desktop). For A1/A2 learners reading Arabic, this is too small. The spec calls for `text-xl md:text-2xl` (20px on mobile, 24px on desktop).

## What to build

Change the Arabic text paragraph CSS class from `text-lg md:text-xl` to `text-xl md:text-2xl` in the line card template (currently line 135).

Verify no text overflow in card padding (`p-4 md:p-5`). Adjust padding if needed.

## Acceptance criteria

- [ ] Arabic text paragraph uses `class="font-arabic text-xl md:text-2xl"`
- [ ] No text overflow in the card at mobile or desktop widths
- [ ] Card padding (`p-4 md:p-5`) provides sufficient margin for the larger text
- [ ] A test verifies the class change (new test case)
- [ ] No layout shift visible in the rendered lesson page

## Blocked by

None - can start immediately (trivial CSS change, can be done anytime)

## Integration Verification

- [ ] Arabic text renders correctly in both light and dark mode
- [ ] The text size is visually readable for A1/A2 learners

## Workflow Reference

- WORKFLOW-lesson-dialogue-ui-improvements.md: STEP 10 (Arabic text font size increase)

## Test Cases Covered

- TC-15: Arabic text font size increased
