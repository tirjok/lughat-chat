# Issue #15: feat: implement route resolution and error handling for lesson page

## What to build

Implement robust route resolution in `[lesson].vue` for the lesson details page. The page must handle:
- Read `level` + `lesson` route params (via `safeRoute`/`safeRouter` wrappers for test-safety — already partially implemented)
- Resolve `level` against `curriculum.ts` levels
- Resolve lesson via `getLessonById()`
- Handle failure paths:
  - `unknown_level`: level not in curriculum → redirect to `/dashboard` (existing behavior, needs test coverage)
  - `unknown_lesson`: level known, lesson id not found → render 404 page (existing behavior, needs test coverage)
  - `data_shape`: lesson found but `sections[]` empty or a section's `content` type not in the union → page shell renders with per-section fallback cards ("Content coming soon")

## Acceptance criteria

- [ ] `level` + `lesson` route params read via `safeRoute`/`safeRouter` wrappers (already partially implemented)
- [ ] `level` resolved against `curriculum.ts` levels
- [ ] Lesson resolved via `getLessonById(level + '-' + lesson.padStart(2, '0'))`
- [ ] Unknown level → redirect to `/dashboard` (existing behavior, now tested)
- [ ] Unknown lesson → render 404 page (existing behavior, now tested)
- [ ] Empty sections or unknown section type → fallback cards ("Content coming soon") per section
- [ ] Existing `LessonPage.test.ts` tests pass (AC-1, AC-2, AC-3)
- [ ] New tests cover all failure paths (unknown level, unknown lesson, data shape)
- [ ] No unrelated files touched

## Blocked by

- #1 (fix skeleton bug — tabs must render correctly for route resolution to be meaningful)

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API returns a valid response

## Workflow Reference

- WORKFLOW-lesson-details-page.md: STEP 1 (Route resolution and lesson load — unknown level redirect, unknown lesson 404, data shape fallback)
- ADR-002: Routes unchanged; TTS Studio untouched

## Test Cases Covered

- "resolves level + lesson from params"
- "redirects to /dashboard on unknown level"
- "renders 404 page on unknown lesson"
