# Implementation Plan: Activity Submission and Scoring

**Source**: `docs/workflows/WORKFLOW-activity-submission-and-scoring.md` (v0.1)
**Date**: 2026-07-10
**Status**: Draft — Awaiting review

---

## Reality Check (Current State vs. Spec)

| # | Finding | Severity |
|---|---------|----------|
| RC-1 | No scoring logic exists — 5 algorithms must be built | Critical |
| RC-2 | No SQLite code exists in `app.py` | Critical |
| RC-3 | No activity submission endpoint exists | Critical |
| RC-4 | No `useActivitySubmission` composable exists | High |
| RC-5 | No `ActivityRenderer` component exists | High |
| RC-6 | No fuzzy matching library in requirements | High |
| RC-7 | No harakat normalization/comparison exists | High |
| RC-8 | No competency score computation exists | High |

---

## Proposed Slices

### Slice 1: Backend — Fuzzy Matching & Harakat Library

**Type**: AFK
**Blocked by**: None
**User stories**: — (enables all scoring slices)

**What to build**: A scoring library module (`backend/content/scoring.py`) that provides:

- **Fuzzy string matching** (case-insensitive, whitespace-normalized) for `listen-translate` and `translate-to-english`
- **Harakat-aware Arabic comparison** for `translate-to-arabic` — strips harakat for comparison, applies × 0.8 penalty if user omits diacritics
- **Content validation** for `introduce-characters` — keyword match ratio
- **Dialogue completion scoring** for `role-play` — ordered match ratio

Add `rapidfuzz` to `requirements.txt` (pure Python, no C extension needed for Docker).

**Acceptance criteria**:
- [ ] `rapidfuzz` added to `backend/requirements.txt`
- [ ] Fuzzy matching returns similarity ratio 0.0–1.0 (case-insensitive, whitespace-normalized)
- [ ] Harakat-aware comparison penalizes missing diacritics by × 0.8
- [ ] Content validation computes keyword match ratio
- [ ] Dialogue scoring computes ordered match ratio
- [ ] All 5 activity types have a scoring function

**Integration verification**:
- [ ] Backend starts without errors (new dependency installed)

---

### Slice 2: Backend — Activity Submission Endpoint

**Type**: AFK
**Blocked by**: Slice 1 (scoring library), Lesson Browsing Slice 1 (SQLite + lesson data)
**User stories**: #4 (mandatory practice activities)

**What to build**: A `POST /api/lessons/:lessonId/activities/:activityId/submit` endpoint that:

1. Validates the lesson is accessible (not locked) — 403 if locked
2. Validates the activity exists — 404 if not found
3. Checks attempt count — 429 if max attempts exhausted
4. Scores the answer using the correct strategy per activity type
5. Returns score (0.0–1.0), feedback, remaining attempts, activity_complete, competency_impact, and correct_answer (if max attempts reached)

**Acceptance criteria**:
- [ ] `POST /api/lessons/:lessonId/activities/:activityId/submit` scores all 5 activity types
- [ ] Returns 403 for locked lessons
- [ ] Returns 404 for non-existent activity IDs
- [ ] Returns 429 when max attempts are exhausted
- [ ] Returns 500 for unknown activity types or scoring errors
- [ ] Response includes: score, feedback, attempts_remaining, activity_complete, competency_impact

**Integration verification**:
- [ ] The real backend service starts without errors in logs
- [ ] `POST /api/lessons/1/activities/1/submit` returns a valid score response

---

### Slice 3: Backend — Progress Persistence (Write `user_progress`)

**Type**: AFK
**Blocked by**: Slice 2 (submission endpoint), Lesson Browsing Slice 1 (SQLite tables)
**User stories**: #4 (mandatory practice), #6 (partial retry), #7 (score tracking)

**What to build**: Extend the submit endpoint to persist scores to SQLite:

1. Write the score and attempt count to `user_progress.activities` JSON for the activity
2. Track best score per activity (across all attempts)
3. Compute competency scores (weighted average per ADR-007)
4. If all activities in a lesson are complete → mark lesson `completed` and set `completed_at`
5. If a lesson was `in_progress` and all activities complete → unlock the next lesson sequentially

**Acceptance criteria**:
- [ ] Scores and attempt counts are persisted to `user_progress.activities` JSON
- [ ] Best score per activity is tracked (across all attempts)
- [ ] Competency scores are computed as weighted averages (per ADR-007)
- [ ] Lesson status changes to `completed` when all activities are complete
- [ ] Next lesson becomes `available` when current lesson completes (sequential unlock)
- [ ] Graceful handling of SQLite write failures (score is valid but not persisted — partial failure toast)

**Integration verification**:
- [ ] The real backend service starts without errors in logs
- [ ] Submitting an answer to a fresh database persists the score in SQLite
- [ ] Completing all activities in a lesson updates the lesson status to `completed`

---

### Slice 4: Frontend — Activity Submission Composable

**Type**: AFK
**Blocked by**: Slice 2 (submission API)
**User stories**: #4 (mandatory practice activities)

**What to build**: A new composable (`app/composables/useActivitySubmission.ts`) that:

- Sends answers to `POST /api/lessons/:lessonId/activities/:activityId/submit`
- Manages loading state ("Scoring..." spinner, disabled submit button)
- Handles all error states:
  - 403 (locked) → toast "This lesson is locked"
  - 404 (not found) → toast "Activity not found"
  - 400 (empty/invalid answer) → inline error on activity
  - 429 (max attempts) → toast "Max attempts reached. Showing correct answer"
  - 500 (scoring error) → toast "Failed to score your answer"
  - 500 (SQLite write fails) → partial-failure toast "Your answer was scored but not saved"
  - Connection error → toast "Unable to connect to the server"

**Acceptance criteria**:
- [ ] `useActivitySubmission` composable sends answers to the backend
- [ ] Loading state shows "Scoring..." spinner and disables submit button
- [ ] All error states produce appropriate toasts or inline errors
- [ ] Partial-failure case (scored but not saved) shows specific toast
- [ ] Connection errors keep user on the current activity (no navigation)

**Integration verification**:
- [ ] The real service starts without errors in logs
- [ ] Calling the submit composable with a valid answer returns score data

---

### Slice 5: Frontend — Activity Renderer Component

**Type**: HITL (design review needed for 5 activity UI patterns)
**Blocked by**: Slice 4 (composable)
**User stories**: #3 (variable sections), #4 (mandatory practice activities), #6 (partial retry)

**What to build**: An `ActivityRenderer.vue` component that renders 5 distinct activity types:

- **`listen-translate`**: Text input — "Translate this Arabic text to English"
- **`translate-to-english`**: Text input — "Translate to English"
- **`translate-to-arabic`**: RTL text input — "Translate to Arabic" (harakat-aware)
- **`introduce-characters`**: Multiple choice or text — "Introduce this character in Arabic"
- **`role-play`**: Dialogue completion — "Fill in the missing lines"

Local validation: empty answer → inline error "Please enter your answer"; answer too long → inline error. Max attempts reached → show correct answer, mark activity complete (auto-skip).

**Acceptance criteria**:
- [ ] `ActivityRenderer.vue` renders all 5 activity types with appropriate UI
- [ ] Text inputs support RTL for Arabic activities
- [ ] Empty answer shows inline error (no API call)
- [ ] Max attempts reached shows correct answer and marks activity complete
- [ ] Keyboard shortcut: Enter key submits answer (same as clicking submit button)

**Integration verification**:
- [ ] The real service starts without errors in logs
- [ ] Rendering a lesson with 5 activities displays all 5 renderers correctly

---

### Slice 6: Frontend — Score Display & Lesson Completion Flow

**Type**: HITL (design review needed for score bar, feedback, completion UI)
**Blocked by**: Slice 5 (activity renderer), Slice 3 (progress persistence)
**User stories**: #4 (mandatory practice), #6 (partial retry), #7 (score tracking)

**What to build**: Score display and lesson completion UI within the Lesson View:

- Score bar (0.0–1.0) with color coding (green ≥ threshold, red below)
- Feedback message (shown on first attempt)
- Remaining attempts counter
- "Next Activity" button (when activity is complete and more activities exist)
- "Complete Lesson" button (when all activities are complete)
- "Lesson completed ✓" message with "Back to Roadmap" button
- Dashboard refresh after lesson completion (re-fetch `/api/lessons` to update roadmap)

**Acceptance criteria**:
- [ ] Score bar displays 0.0–1.0 with color coding (green/red)
- [ ] Feedback message is displayed after each submission
- [ ] Remaining attempts counter is shown (e.g., "2 attempts remaining")
- [ ] "Next Activity" button appears when activity is complete
- [ ] "Complete Lesson" button appears when all activities are complete
- [ ] "Lesson completed ✓" message with "Back to Roadmap" button
- [ ] Dashboard refreshes after lesson completion (roadmap updates)

**Integration verification**:
- [ ] The real service starts without errors in logs
- [ ] Completing all activities in a lesson shows "Lesson completed" and unlocks the next lesson on the Dashboard

---

## Dependency Graph

```
Slice 1 (Scoring Library) ──► Slice 2 (Submission API) ──► Slice 3 (Progress Persist)
                                                                      │
Slice 4 (Submission Composable) ──► Slice 5 (Activity Renderer) ──► Slice 6 (Score + Completion)
```

- **Slice 1** is independent — can start immediately (no dependencies)
- **Slices 2 → 3** are sequential backend (scoring first, then persistence)
- **Slice 4** can run in parallel with backend slices (once the API exists)
- **Slices 5 → 6** are sequential frontend (renderer first, then completion UI)
- **Slice 6** depends on both backend (Slice 3) and frontend (Slice 5)

---

## Open Questions

1. **Scoring threshold**: What is the exact score threshold for "completed" per activity? (PRD implies 0.7 per ADR-007, but should it be configurable per activity?)

2. **Activity data gap** (RC-1): The existing `lesson-01.json` has 5 activities but no `expected_answer` field. Should populating expected answers be a separate issue, or is it a data gap outside implementation scope?

3. **Slice granularity**: Should Slices 2 and 3 be combined ("Activity Submission: score + persist") since they're the same API call?

4. **Dependencies on Lesson Browsing**: Slice 2 requires SQLite + lesson data from the Lesson Browsing workflow (Slice 1). Should this be noted as a cross-workflow dependency?

5. **Partial retry UX**: When a user re-opens a lesson with some activities completed and some not, should completed activities be shown as "locked from editing" (read-only) or hidden entirely?

---

## Test Cases (from workflow, mapped to slices)

| Test | Slice | Description |
|------|-------|-------------|
| TC-01: Happy path — correct answer | 2, 4, 6 | Score = 1.0, activity completed, "Next Activity" shown |
| TC-02: Happy path — partial answer | 2, 4, 6 | Score = 0.6, feedback shown, attempts remaining = 2 |
| TC-04: Max attempts exhausted | 2, 5 | Correct answer shown, activity marked complete |
| TC-05: Empty answer | 5 | Inline error "Please enter your answer" — no API call |
| TC-10: All activities complete — lesson completion | 3, 6 | Lesson status = `completed`, next lesson unlocked |
| TC-11: Sequential unlock — same level | 3 | Next lesson in same level becomes `available` |
| TC-13: Review mode — completed lesson | 2 | All activities shown as completed, no new submissions |
| TC-14: Partial retry — retry failed activities | 3, 6 | 3 activities locked (completed), 2 available for retry |
| TC-15: `listen-translate` scoring | 1, 2 | Fuzzy match score computed (case-insensitive) |
| TC-16: `translate-to-arabic` scoring | 1, 2 | Fuzzy match with harakat penalty |
| TC-17: `role-play` scoring | 1, 2 | Ordered match ratio computed |
