# Issue #023: fix: remove hardcoded comparison card from LessonDialogue (ADR-009)

## What's wrong

`LessonDialogue.vue` (lines 184–204) contains a hardcoded comparison card with lesson-specific pedagogical content about gender suffixes, verb conjugation, and welcome phrases from lesson A1-01. The card is gated by `v-if="dialogueContent.scenes.length > 1"` — it renders for any multi-scene dialogue — but its content is hardcoded and never derived from curriculum data. This means:

1. For A1-01 (the only lesson with the right characters), it shows correct content by accident.
2. For the other 7 lessons with multi-scene dialogues, it shows A1-01's character names and text — **pedagogically wrong content displayed for the wrong characters**.
3. When new lessons are added, the card silently displays A1-01 content regardless of which lesson is active.

The card is the only hardcoded lesson-specific content in the component. ADR-009 (Accepted, 2026-09-12) mandates its removal.

## What to build

Delete the comparison card block (lines 184–204 of `LessonDialogue.vue`) and all references:

- Delete the entire `<div data-testid="comparison-card" class="...">` block, including its heading ("Key Differences Between Scenes"), 3 hardcoded comparison paragraphs, and the outer `v-if="dialogueContent.scenes.length > 1"` guard.
- Remove all 3 comparison-card tests from `LessonDialogue.test.ts` (lines 202–241): renders existence, renders key differences text, renders absence for single-scene.
- No replacement functionality, no data model extension, no stub. (If a future lesson requires cross-scene comparison, a developer must extend the data model and UI then.)
- Grep the repo for any other references to `comparison-card` before deleting (parent components, other lessons).

## Acceptance criteria

- [ ] Lines 184–204 of `LessonDialogue.vue` are removed (file goes from 206 to ~183 lines)
- [ ] No element with `data-testid="comparison-card"` exists in the DOM for any lesson
- [ ] All 3 comparison-card tests are removed from `LessonDialogue.test.ts`
- [ ] No other component in the repo references `comparison-card` (grep-verified)
- [ ] A1-01 no longer shows the comparison card; 7 other lessons are unaffected (they were already showing wrong content)
- [ ] No data model changes (ADR-009 constraint enforced)

## Blocked by

None - can start immediately (in fact, this is the simplest slice and should be done early)

## Integration Verification

- [ ] The component compiles without errors after deletion
- [ ] Multi-scene dialogues render correctly without the comparison card

## Workflow Reference

- WORKFLOW-lesson-dialogue-ui-improvements.md: STEP 4 (Remove hardcoded comparison card)
- ADR-009: No Hardcoded Content in LessonDialogue Component (status: Accepted)

## Test Cases Covered

- TC-05: Comparison card REMOVED
- TC-16: Multi-scene A1-01 no longer shows hardcoded comparison
