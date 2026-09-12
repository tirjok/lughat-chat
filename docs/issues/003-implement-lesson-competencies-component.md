# Issue #3: feat: implement LessonCompetencies component

## What to build

Create `LessonCompetencies.vue` — a collapsible competency checklist component. It reads `lesson.competencies[]` (array of strings) from the page and renders:

- A collapsible header with arrow icon (rotates on toggle)
- A list of checkboxes, one per competency string
- A counter: "X of N competencies"
- Checked state tracked in page-owned state (Set<string> of checked competency strings)

The component emits `update:checked` with the count of checked competencies. The page mediates cross-component state (per ADR-008).

## Acceptance criteria

- [ ] Component renders a collapsible header with arrow icon
- [ ] Renders one checkbox per `competencies[]` entry
- [ ] Toggling a checkbox updates the "X of N" counter
- [ ] Collapsing hides the checkbox list body
- [ ] Expanding shows the checkbox list body
- [ ] Component accepts `competencies: string[]` as prop
- [ ] Component emits `update:checked` with checked count
- [ ] Component test covers toggle and collapse/expand behavior
- [ ] RTL layout correct (Arabic-first UI)

## Blocked by

- #2 (wire LessonHero — page must render competencies section)

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API returns a valid response

## Workflow Reference

- WORKFLOW-lesson-details-page.md: STEP 6 (competency checklist: collapse/expand, checkbox toggle, "X of N" counter)
- ADR-008: Component map (LessonCompetencies — top-level, low complexity)

## Test Cases Covered

- "competency toggle updates counter"
- "collapses/expands checklist"
