# Issue #12: feat: implement shared progress state composable + backend endpoint

## What to build

Create a module-level singleton composable `useLessonProgress()` following the `useHealthPoll` pattern (verified in existing code). This composable manages per-lesson progress state and persists it to a new backend endpoint.

**Frontend (composable)**:
- `setLessonProgress(lessonId: string, pct: number)` — stores progress in-memory + persists to backend
- `getLessonProgress(lessonId: string): number` — reads current progress (0–100)
- `clearLessonProgress(lessonId: string)` — resets to 0 (on page leave)
- Metric: `completedLines / totalLines` (per Assumption A4: competencies confirmed by stakeholder)
- A line "completes" when its playback reaches `ended` (per Assumption A5)

**Backend (new endpoint)**:
- `GET /api/progress/{lesson_id}` — returns `{ lesson_id, progress: number }` (0–100)
- `PUT /api/progress/{lesson_id}` — accepts `{ lesson_id, progress: number }` — stores in SQLite
- Schema: `{ lesson_id: string, progress: number }` with validation (progress 0–100)
- Tests: pytest tests for the new endpoint

**GlobalNavbar wiring**:
- `GlobalNavbar.progressWidth` reads the current lesson's pct from the singleton
- Existing hardcoded `'0%'` replaced with `computed(() => ${progressWidth}%`)`

## Acceptance criteria

- [ ] `useLessonProgress()` composable created following `useHealthPoll` singleton pattern
- [ ] `setLessonProgress(lessonId, pct)` stores in-memory + persists to backend
- [ ] `getLessonProgress(lessonId)` reads current progress (0–100)
- [ ] `clearLessonProgress(lessonId)` resets to 0
- [ ] Progress metric = `completedLines / totalLines` (per Assumption A4)
- [ ] Backend `GET /api/progress/{lesson_id}` returns `{ lesson_id, progress: number }`
- [ ] Backend `PUT /api/progress/{lesson_id}` accepts and stores `{ lesson_id, progress: number }`
- [ ] Backend endpoint has Pydantic validation (progress 0–100)
- [ ] Backend endpoint has pytest tests
- [ ] `GlobalNavbar.progressWidth` reads from singleton (replaces hardcoded `'0%'`)
- [ ] Progress survives section changes (no reset on tab switch)
- [ ] Progress resets on lesson change
- [ ] Progress cleared on page leave
- [ ] Component test covers progress increment, persistence across sections, reset on lesson change, clear on leave
- [ ] RTL layout correct

## Blocked by

- #11 (StickyAudioBar error handling — page must have full audio wiring before progress tracking)

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API returns a valid response

## Workflow Reference

- WORKFLOW-lesson-details-page.md: STEP 8 (Progress aggregation and navbar wiring), ABORT_CLEANUP step 5 (progress reset)
- ADR-008: Page ↔ shared progress state → GlobalNavbar (module-level singleton composable)

## Test Cases Covered

- "progress increments when line playback ends"
- "progress survives section changes"
- "progress resets on lesson change"
- "progress cleared on leave"
