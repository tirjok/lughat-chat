# Issue #16: feat: implement LessonActivities + LessonActivityRunner placeholder skeleton (Phase 2)

## What to build

Create placeholder skeleton components for the Activities section. **No interactive behavior** — this is a Phase 2 reservation per ADR-008. The components exist so the tab entry point is not lost, but implement no activity interaction.

**`LessonActivities.vue`** (placeholder):
- Renders a tab entry in the section navigation
- Shows "Activities" tab label
- Renders "Content coming soon" fallback card (same as unknown section type)
- No interactive UI, no form state, no validation, no scoring

**`LessonActivityRunner.vue`** (placeholder):
- Does not exist yet (Phase 2)
- No file created

The Activities tab must appear in `sectionTabs` (derived from `lesson.sections[].name` where `type === 'activity'`). The tab is reachable but shows the fallback card.

## Acceptance criteria

- [ ] `LessonActivities.vue` component created as placeholder
- [ ] Component renders "Content coming soon" fallback card (same as unknown section type)
- [ ] Activities tab appears in `sectionTabs` when curriculum has `type: 'activity'` sections
- [ ] No interactive UI, no form state, no validation, no scoring
- [ ] Component test covers fallback card rendering
- [ ] RTL layout correct
- [ ] No backend changes required

## Blocked by

- None - can start immediately (or anytime; no Phase 1 behavior)

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API returns a valid response

## Workflow Reference

- WORKFLOW-lesson-details-page.md: STEP 7 (Activity flow — DEFERRED Phase 2, placeholder branch only)
- ADR-008: Component map (LessonActivities → LessonActivityRunner — deferred to Phase 2)

## Test Cases Covered

- 0 (deferred to Phase 2; no Phase 1 tests)
