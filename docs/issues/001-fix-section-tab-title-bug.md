# Issue #1: fix: correct section tab rendering — s.title → s.name in skeleton

## What to build

Fix the skeleton bug in `[lesson].vue` where section tab labels read `s.title` (undefined on `SectionDefinition`) instead of `s.name`. The `SectionDefinition` interface has `name?` (optional string) and `title?` (optional string); the skeleton currently maps `lesson.sections.map(s => s.title)` which always produces `undefined` tabs, falling back to hardcoded defaults.

This is a one-line fix in the `sectionTabs` computed property (line 48 of `[lesson].vue`): change `s.title` to `s.name`.

## Acceptance criteria

- [ ] `sectionTabs` computed property reads `s.name` instead of `s.title`
- [ ] Tab labels render correctly from curriculum data (e.g., "Dialogue", "Vocabulary")
- [ ] Existing tests still pass (tab rendering tests verify correct labels)
- [ ] No other files touched

## Blocked by

None - can start immediately

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API returns a valid response

## Workflow Reference

- WORKFLOW-lesson-details-page.md: STEP 3 (tab rendering reads `s.name` correctly per spec, but skeleton reads `s.title` — Finding F8)
- ADR-008: Component map (page orchestrator pattern)

## Test Cases Covered

- "resolves level + lesson from params" (tab rendering)
- "renders hero, competencies, tab bar, first section" (tab names correct)
