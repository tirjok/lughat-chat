# Issue #026: feat: add error state and loading state rendering to LessonDialogue

## What's wrong

When a dialogue section has no content (e.g., malformed data, wrong `content.type`, or missing `scenes`), the component currently renders nothing visible — an invisible blank area. There is no error state for the learner to understand what happened. There is also no loading or error feedback during audio synthesis requests.

## What to build

Add three new render states to `LessonDialogue.vue`:

1. **No dialogue content**: When `dialogueContent.scenes.length === 0` (whether from malformed data or missing content), render a centered message: `<p class="text-center py-8 text-stone-400">No dialogue content for this lesson.</p>`
2. **Loading state**: When `isLoading` is true for a line (audio fetch in progress), show a small inline spinner next to the Arabic text.
3. **Error state**: When an audio fetch fails (422, 500, 503, network error), display an error chip below the line: `<span class="text-xs text-red-600 bg-red-50 rounded px-2 py-1">[error message]</span>`.

These states are driven by props provided by the parent page (the component itself does not manage the fetch logic — it renders whatever state the parent passes).

## Acceptance criteria

- [ ] When `scenes.length === 0` (no dialogue section, wrong type, malformed content), a centered message "No dialogue content for this lesson." renders
- [ ] The error message uses `text-stone-400` (consistent with the page's error styling)
- [ ] A test verifies the error message renders when content is missing
- [ ] `isLoading` prop (from parent) shows a spinner on the specific line being fetched
- [ ] `errorState` prop (from parent) shows a red error chip below the line
- [ ] Empty/malformed content no longer renders silently (previously an invisible blank area)

## Blocked by

None - can start immediately

## Integration Verification

- [ ] The component renders correctly when passed a malformed section from the page orchestrator
- [ ] The error message is visible and readable in both light and dark mode

## Workflow Reference

- WORKFLOW-lesson-dialogue-ui-improvements.md: STEP 9 (Error state and loading state)

## Test Cases Covered

- TC-13: No dialogue content — error state
