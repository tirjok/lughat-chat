# Issue #5: feat: implement LessonVocabulary component (category tables)

## What to build

Create `LessonVocabulary.vue` — renders vocabulary content from `SectionContent { type: 'vocabulary', categories: { label, words: VocabWord[] }[] }`:

- **Category grouping**: Each `categories[]` renders as a card with category header
- **Table layout**: Columns — Arabic (RTL), English, Singular (conditional), Plural (conditional)
- **Per-word audio**: Each row has a play button that emits `playWord(index)` with the word's Arabic text

The component manages no cross-component state. It emits `playWord(index)` with Arabic text for TTS.

## Acceptance criteria

- [ ] Component renders category headers from `categories[].label`
- [ ] Each category renders a table with Arabic | English | Singular | Plural columns
- [ ] Singular/Plural columns are conditional (hidden when undefined)
- [ ] Arabic text renders RTL (`dir="rtl"`)
- [ ] Each row has a play button that emits `playWord(index)` with Arabic text
- [ ] Component test covers category rendering and word play emission
- [ ] RTL layout correct

- #2 (wire LessonHero — page must render vocabulary section)

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API returns a valid response

## Workflow Reference

- WORKFLOW-lesson-details-page.md: STEP 3 (section navigation — vocabulary tab), STEP 4 (tap word → audio)
- ADR-008: Component map (LessonVocabulary — medium complexity)

## Test Cases Covered

- "switches active section on tab click" (vocabulary tab)
- "tap plays audio after 200" (vocabulary word)
