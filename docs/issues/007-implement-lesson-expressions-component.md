# Issue #7: feat: implement LessonExpressions component (grid cards)

## What to build

Create `LessonExpressions.vue` — renders expression content from `SectionContent { type: 'expressions', expressions: { arabic, english }[] }`:

- **2-column grid**: Each card shows Arabic (RTL) + English
- **Per-card audio**: Each card is clickable for audio, emitting `playExpression(index)` with the expression's Arabic text

Low complexity. No local state beyond the emit.

## Acceptance criteria

- [ ] Component renders expressions in a 2-column CSS grid
- [ ] Each card shows Arabic (RTL) + English
- [ ] Arabic text renders RTL (`dir="rtl"`)
- [ ] Each card is clickable and emits `playExpression(index)` with Arabic text
- [ ] Component test covers grid rendering and expression play emission
- [ ] RTL layout correct

- #2 (wire LessonHero — page must render expressions section)

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API returns a valid response

## Workflow Reference

- WORKFLOW-lesson-details-page.md: STEP 3 (section navigation — expressions tab), STEP 4 (tap expression → audio)
- ADR-008: Component map (LessonExpressions — low complexity)

## Test Cases Covered

- "switches active section on tab click" (expressions tab)
- "tap plays audio after 200" (expression card)
