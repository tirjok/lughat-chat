# Issue #021: feat: split conflicting card body click vs. play button in LessonDialogue

## What's wrong

Clicking a line card body currently does both `currentLineIndex = lineIndex` (select) AND `playLine(lineIndex)` (play) simultaneously. The `.stop` modifier on the play button prevents bubbling, but the result is that clicking the card body triggers both selection highlight AND audio playback — a conflicting interaction model. Users expect clicking a line to highlight it without playing audio; they expect the play button to both highlight and play.

## What to build

Split the card body click from the play button click in `LessonDialogue.vue`:

- **Card body click**: Only sets `currentLineIndex = lineIndex` (select, no play). This highlights the active line without triggering audio.
- **Play button click**: Sets `currentLineIndex = lineIndex` (select) AND emits `playLine(index)` (play). The play button should set the highlight so the active line follows the audio selection.
- **Existing parent contract**: The page orchestrator's `@playLine="handleDialoguePlayLine"` handler must still work — the emit is the same, just now triggered from a different source (button only, not body).

Test updates required: the existing test "clicking a line card triggers playLine" must be split: one test verifies body click does NOT emit, another verifies play button click DOES emit.

## Acceptance criteria

- [ ] Clicking a line card body updates `currentLineIndex` (visual highlight) but does NOT emit `playLine`
- [ ] Clicking the play button emits `playLine(index)` and sets `currentLineIndex = lineIndex`
- [ ] The `@playLine` emit is only emitted from the play button, never from card body clicks
- [ ] Existing test "clicking a line card triggers playLine" is updated: one test verifies body click does NOT emit, another verifies play button click DOES emit
- [ ] A parent page's `@playLine` handler behavior is preserved (it currently listens to both selects and plays — the emit is the same, just triggered from a different trigger)

## Blocked by

None - can start immediately (but should be done after Issue #020 and Issue #023 to ensure component stability)

## Integration Verification

- [ ] The lesson page handles `@playLine` correctly after the split (playLine from the button still triggers TTS synthesis)
- [ ] No regression: `lesson-pre-gate.test.ts` (audio disabled state) still passes

## Workflow Reference

- WORKFLOW-lesson-dialogue-ui-improvements.md: STEP 5 (Split conflicting card interaction)
- ADR-009: Component must remain purely presentational — this is a UI interaction fix, not a data change

## Test Cases Covered

- TC-06: Card body click — selects line, does NOT play
- TC-07: Play button click — selects AND plays
