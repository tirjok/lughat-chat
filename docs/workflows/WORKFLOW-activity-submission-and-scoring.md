# WORKFLOW: Activity Submission and Scoring
**Version**: 0.1
**Date**: 2026-07-10
**Author**: Workflow Architect
**Status**: Draft
**Implements**: PRD — "As a learner, I want each lesson to have mandatory practice activities so that I can demonstrate mastery"

---

## Executive Summary
User submits an answer to a practice activity in Lesson View. Backend validates, scores (activity-type-specific: fuzzy match, harakat-aware, keyword match, ordered dialogue match), writes score to SQLite `user_progress`, returns score + feedback. Supports 5 activity types (`listen-translate`, `translate-to-english`, `translate-to-arabic`, `introduce-characters`, `role-play`) with up to 3 attempts each. **Critical gap:** no scoring logic, no SQLite code, no submission endpoint, no activity submission composable, no `ActivityRenderer` component — all must be built from scratch. **Post-ADR-003 update:** `role-play` now has a second scoring path via audio recording → STT → pronunciation scoring (see new workflow). **Known issues:** fuzzy matching library missing (RC-017), harakat normalization missing (RC-018), competency score computation missing (RC-019).

---

## Overview
A learner is in the Lesson View (`/lesson/:id`) and encounters a practice activity. They submit an answer (varies by activity type: text input, multiple choice, audio recording, etc.). The system validates the answer, scores it (activity-type-specific scoring logic), returns a score (0.0–1.0) with feedback, updates the `user_progress` table in SQLite, and determines whether the activity is complete or if more attempts remain. This workflow supports up to 3 attempts per activity (configurable). It covers **all 5 activity types** defined in the PRD: `listen-translate`, `translate-to-english`, `translate-to-arabic`, `introduce-characters`, and `role-play`. This is the **core learning workflow** — it's the reason the platform exists beyond TTS playback.

---

## Actors
| Actor | Role in this workflow |
|---|---|
| Learner (Customer) | Submits an answer to an activity in the lesson view |
| Frontend (Nuxt SPA) | Renders the activity, collects the answer, sends to `/api/lessons/:id/activities/:activityId/submit`, displays score + feedback |
| Nginx (reverse proxy) | Routes `/api/lessons*` to backend |
| Backend (FastAPI) | Validates the request, scores the answer, updates progress in SQLite, returns score + feedback |
| Content Module (backend) | Provides the activity schema (type, expected answer, scoring rules) |
| Progress Module (backend) | Updates `user_progress` table with score, attempts, and status |
| SQLite (file) | Stores user progress (mutable) |
| TTS (XTTS-v2) | Optional: plays Arabic text for the activity (on-demand TTS, not part of scoring) |

---

## Prerequisites
- User has accessed a lesson via `/lesson/:id` (Lesson Browsing and Access workflow)
- The lesson is accessible (not locked) — checked by Lesson Browsing workflow
- The activity exists in the lesson's `activities` array
- The activity's `type` is one of: `listen-translate`, `translate-to-english`, `translate-to-arabic`, `introduce-characters`, `role-play`
- The activity's `max_attempts` is set (default: 3)
- The user has not yet exhausted all attempts for this activity
- TTS model is loaded (if the activity requires audio playback)

---

## Trigger
**Primary**: User clicks "Submit Answer" button within an activity in the Lesson View.
**Secondary**: User presses `Enter` key (if the activity uses a text input field).
**Tertiary**: User submits via voice recording (future — out of scope for MVP).

---

## Workflow Tree

### STEP 1: Frontend Collects Answer (User Input)
**Actor**: Frontend (Activity Renderer component — `app/components/ActivityRenderer.vue`)
**Action**: Render the activity based on its `type`. Collect the user's answer:
  - **`listen-translate`**: User types English translation of Arabic text (text input).
  - **`translate-to-english`**: User types English translation of Arabic text (text input).
  - **`translate-to-arabic`**: User types Arabic translation of English text (RTL text input).
  - **`introduce-characters`**: User selects from options or types character introductions (multiple choice or text).
  - **`role-play`**: User completes a dialogue by filling in missing lines (text input or multiple choice).

**Timeout**: N/A (synchronous UI interaction)
**Input**: `{ activity: { type, content }, priorAttempts: number }`
**Output on SUCCESS**: `{ answer: string, metadata?: object }` → GO TO STEP 2
**Output on FAILURE**:
  - `FAILURE(empty_answer)`: User submits without entering any answer → Show inline error: "Please enter your answer." → Stay on activity (no API call).
  - `FAILURE(answer_too_long)`: User's answer exceeds maximum length (e.g., 500 chars) → Show inline error: "Answer is too long." → Stay on activity.
  - `FAILURE(max_attempts_exhausted)`: User has used all 3 attempts and hasn't completed the activity → Show "Max attempts reached. Showing correct answer." → Show correct answer, mark activity as complete (auto-skip).

**Observable states during this step**:
  - Customer sees: Activity-specific UI (text input, multiple choice buttons, etc.). If empty answer: inline error message. If max attempts reached: correct answer shown, activity marked complete.
  - Operator sees: (nothing — purely client-side).
  - Database: No changes.
  - Logs: No logs.

---

### STEP 2: Frontend Sends Answer to Backend (API Call)
**Actor**: Frontend (`useActivitySubmission` composable — new composable)
**Action**: Send `POST /api/lessons/:lessonId/activities/:activityId/submit` with `{ answer, metadata }`.
**Timeout**: 10 seconds (scoring logic should be fast — string comparison, fuzzy matching)
**Input**: `{ lessonId: number, activityId: number, answer: string, metadata?: object }`
**Output on SUCCESS**: `{ score: number, feedback: string, attempts_remaining: number, activity_complete: boolean, competency_impact: object, correct_answer?: string }` → GO TO STEP 3
**Output on FAILURE**:
  - `FAILURE(403_locked)`: Lesson is locked → Return 403 → Frontend shows "This lesson is locked." toast → Stay on lesson view (don't navigate away).
  - `FAILURE(404_activity_not_found)`: Activity ID doesn't exist in the lesson → Return 404 → Frontend shows "Activity not found." toast → Stay on lesson view.
  - `FAILURE(400_invalid_answer)`: Answer is empty or invalid format → Return 400 → Frontend shows inline error on the activity.
  - `FAILURE(429_too_many_attempts)`: User has already used all max attempts for this activity → Return 429 → Frontend shows "Max attempts reached. Showing correct answer." → Mark activity complete.
  - `FAILURE(500_scoring_error)`: Backend scoring logic fails (unknown activity type, corrupt activity data) → Return 500 → Frontend shows "Failed to score your answer. Please try again." toast.
  - `FAILURE(500_sqlite_error)`: SQLite write fails (database locked, corrupt) → Return 500 → Frontend shows "Failed to save your progress. Your answer was scored but not saved." toast (partial failure — score is still valid).
  - `FAILURE(connection_error)`: Backend unreachable → Frontend shows "Unable to connect to the server." toast → Stay on lesson view, don't navigate away.

**Observable states during this step**:
  - Customer sees: Submit button shows "Scoring..." with spinner. Button is disabled. After response, score + feedback displayed inline.
  - Operator sees: Backend receives POST request, scores answer, writes to SQLite.
  - Database: `user_progress` table updated (see STEP 4).
  - Logs: `[backend] Activity submitted: lesson={id}, activity={id}, answer="{answer[:50]}"`.

---

### STEP 3: Backend Validates and Scores the Answer (Content Module)
**Actor**: Backend (Content module — scoring logic)
**Action**: Retrieve the activity from the lesson JSON file, determine the scoring method based on `type`, and score the user's answer:
  - **`listen-translate`**: Fuzzy string match between user's English translation and the expected answer (case-insensitive, whitespace-normalized). Score = similarity ratio (0.0–1.0).
  - **`translate-to-english`**: Fuzzy string match between user's English translation and the expected answer. Score = similarity ratio.
  - **`translate-to-arabic`**: Fuzzy string match with **harakat-aware** comparison (diacritics matter). If user omits harakat, partial credit (score × 0.8). Score = similarity ratio.
  - **`introduce-characters`**: Content validation — check that user's answer contains required keywords/phrases. Score = keyword match ratio.
  - **`role-play`**: Dialogue completion — check that user's lines match the expected dialogue (order matters). Score = ordered match ratio.

**Timeout**: 2 seconds (scoring should be fast — string operations)
**Input**: `{ activity: { type, content, expected_answer }, user_answer: string }`
**Output on SUCCESS**: `{ score: number (0.0–1.0), feedback: string, correct_answer?: string }` → GO TO STEP 4
**Output on FAILURE**:
  - `FAILURE(unknown_activity_type)`: Activity type is not one of the 5 defined types → Return 500 `{"detail": "Unknown activity type: {type}"}`.
  - `FAILURE(missing_expected_answer)`: Activity data doesn't contain an expected answer → Return 500 `{"detail": "Activity data is incomplete"}`.
  - `FAILURE(scoring_logic_error)`: Scoring function throws an exception → Return 500 `{"detail": "Scoring failed: {error}"}`.

**Observable states during this step**:
  - Customer sees: (nothing — invisible backend work, "Scoring..." spinner).
  - Operator sees: Backend runs scoring logic (string comparison, fuzzy matching).
  - Database: No changes yet (score is not persisted until STEP 4).
  - Logs: `[backend] Scored activity: lesson={id}, activity={id}, score={score:.2f}`.

---

### STEP 4: Backend Updates User Progress (Progress Module)
**Actor**: Backend (Progress module — `PUT /api/progress/lesson/:lessonId` or inline in the submit endpoint)
**Action**: Write the score and attempt count to the `user_progress` table in SQLite:
  1. Find or create the `user_progress` record for this `lesson_id`.
  2. Update the `activities` JSON field with the new score and attempt count for this `activity_id`.
  3. Increment `attempts` counter for this activity.
  4. If the activity's best score (across all attempts) meets the threshold, mark the activity as `completed`.
  5. If ALL activities in the lesson are now `completed`, update `user_progress.status` to `completed` and set `completed_at` timestamp.
  6. If a lesson was `in_progress` and all activities are now complete, the next lesson in the same level becomes `available` (sequential unlock).

**Timeout**: 2 seconds (SQLite write — should be < 100ms)
**Input**: `{ lesson_id: int, activity_id: int, score: float, attempts: int, status: str }`
**Output on SUCCESS**: `{ success: true, lesson_status: str, next_lesson_unlocked: bool }` → GO TO STEP 5
**Output on FAILURE**:
  - `FAILURE(sqlite_locked)`: SQLite database is locked (concurrent write) → Return 500 → Frontend shows "Failed to save progress. Your answer was scored but not saved." (partial failure — see above).
  - `FAILURE(sqlite_foreign_key)`: Lesson ID doesn't exist in `lessons` table → Return 500 → Frontend shows "Failed to save progress." toast.
  - `FAILURE(sqlite_constraint)`: Unique constraint violation (shouldn't happen with proper logic) → Return 500 → Frontend shows "Failed to save progress." toast.

**Observable states during this step**:
  - Customer sees: (nothing — invisible backend work, but the Dashboard roadmap will update when reloaded).
  - Operator sees: SQLite `user_progress` table updated with score, attempt count, and status.
  - Database: `user_progress` table written (score, attempts, status).
  - Logs: `[backend] Progress updated: lesson={id}, activity={id}, score={score:.2f}, status={status}`.

---

### STEP 5: Frontend Displays Score and Feedback
**Actor**: Frontend (Activity Renderer component)
**Action**: Display the score (0.0–1.0), feedback message, remaining attempts, and whether the activity is complete. If the activity is complete, show a "Next Activity" button. If all activities are complete, show a "Complete Lesson" button.
**Timeout**: N/A (synchronous render, < 100ms)
**Input**: `{ score: number, feedback: string, attempts_remaining: number, activity_complete: boolean, competency_impact: object, correct_answer?: string }`
**Output on SUCCESS**: Score + feedback displayed inline → GO TO STEP 6
**Output on FAILURE**:
  - `FAILURE(malformed_response)`: Backend returns unexpected data structure → Frontend shows "Failed to display results." toast → Stay on activity (don't navigate away).

**Observable states during this step**:
  - Customer sees: Score bar (0.0–1.0), feedback message (green if score ≥ threshold, red if not), remaining attempts counter, "Next Activity" button (if complete), "Complete Lesson" button (if all activities complete).
  - Operator sees: (nothing — purely client-side).
  - Database: No changes (read-only display).
  - Logs: No logs.

---

### STEP 6: User Navigates to Next Activity or Completes Lesson
**Actor**: User (Customer)
**Action**: User clicks "Next Activity" (if more activities remain) or "Complete Lesson" (if all activities are complete).
**Timeout**: N/A (client-side navigation, < 100ms)
**Input**: `{ action: "next_activity" | "complete_lesson" }`
**Output on SUCCESS**: Navigate to next activity (if more) or mark lesson complete and return to Dashboard → GO TO STEP 7
**Output on FAILURE**:
  - `FAILURE(no_more_activities)`: User clicks "Next Activity" but no more activities exist → Stay on current activity (edge case — should not happen if STEP 5 is correct).
  - `FAILURE(lesson_not_completable)`: User clicks "Complete Lesson" but not all activities are complete → Show toast: "Complete all activities first." → Stay on lesson view.

**Observable states during this step**:
  - Customer sees: If more activities: next activity renders. If all complete: "Lesson completed! ✓" message, "Back to Roadmap" button.
  - Operator sees: (nothing — client-side navigation).
  - Database: No changes (navigation only).
  - Logs: (no logs from frontend navigation).

---

### STEP 7: Dashboard Updates (Optional — Background Refresh)
**Actor**: Frontend (Dashboard page — if user returns to Dashboard after lesson completion)
**Action**: When the user returns to the Dashboard (via "Back to Roadmap" or navigation bar), re-fetch `GET /api/lessons` to update the roadmap with new progress.
**Timeout**: 5 seconds (same as STEP 2 in Lesson Browsing workflow)
**Input**: `{ }` (same as Lesson Browsing workflow)
**Output on SUCCESS**: Dashboard shows updated progress (lesson now shows ✓, next lesson now shows →) → GO TO STEP 8 (complete)
**Output on FAILURE**:
  - `FAILURE(refetch_fails)`: API call fails → Dashboard keeps stale data (not ideal but not critical — user can manually refresh).

**Observable states during this step**:
  - Customer sees: Dashboard shows updated progress. Completed lesson shows ✓. Next lesson (previously locked) now shows →.
  - Operator sees: (nothing — client-side).
  - Database: No changes (read-only).
  - Logs: (no logs).

---

## ABORT_CLEANUP: Activity Submission Failure Recovery
**Triggered by**: Any failure in STEP 2 (API call) that prevents the answer from being scored.
**Actions** (in order):
  1. Frontend shows appropriate error toast or inline error.
  2. Frontend resets the submit button to "Submit Answer" state (enables it).
  3. Frontend does NOT navigate away (stays on the activity).
  4. If the error was a temporary SQLite issue (STEP 4 failure), the answer was still scored (STEP 3 succeeded) but not saved. Frontend shows a partial-failure toast: "Your answer was scored but not saved. Please try again."

**What customer sees**: Error toast at top-center (red) or inline error on the activity. Submit button returns to normal state. User can retry.

**What operator sees**: Backend logs with error detail. If STEP 4 failed, the score exists in memory but not in SQLite — the user's progress is "orphaned" until they retry.

---

## State Transitions
```
[Activity: not started]
  → (user submits answer, score ≥ threshold) → [Activity: completed ✓]
  → (user submits answer, score < threshold, attempts remain) → [Activity: in_progress ◉]
  → (user submits answer, score < threshold, no attempts remain) → [Activity: completed (correct answer shown)]
  → (user clicks "Next Activity") → [Next activity: not started]
  → (user clicks "Complete Lesson" — all activities complete) → [Lesson: completed ✓]

[Activity: in_progress (score < threshold)]
  → (user retries, score ≥ threshold) → [Activity: completed ✓]
  → (user retries, score < threshold, attempts remain) → [Activity: in_progress ◉]
  → (user retries, score < threshold, no attempts remain) → [Activity: completed (correct answer shown)]

[Lesson: all activities completed]
  → (user clicks "Complete Lesson") → [Dashboard: lesson shows ✓, next lesson shows →]
  → (user returns to this lesson) → [Lesson: review mode (all activities marked completed)]
```

---

## Handoff Contracts

### Frontend → Backend (Submit Answer)
**Endpoint**: `POST /api/lessons/:lessonId/activities/:activityId/submit`
**Payload**:
```json
{
  "answer": "string — user's answer (varies by activity type)",
  "metadata": { "key": "value" } // Activity-type-specific data (optional)
}
```
**Success response**:
```json
{
  "score": 0.85,           // 0.0 – 1.0
  "feedback": "string — immediate feedback (shown on first attempt)",
  "attempts_remaining": 2,  // max_attempts - current attempts
  "activity_complete": false, // True if all max attempts used
  "competency_impact": { "read_fluently_with_harakat": 0.4, ... },
  "correct_answer": "string" // Shown only after max attempts exhausted
}
```
**Failure response**:
```json
{
  "ok": false,
  "error": "string",
  "code": "LOCKED" | "NOT_FOUND" | "INVALID_ANSWER" | "MAX_ATTEMPTS" | "SCORING_ERROR" | "SQLITE_ERROR" | "CONNECTION_ERROR",
  "retryable": true
}
```
**Status codes**: 200 (success), 400 (invalid answer), 403 (locked), 404 (not found), 429 (max attempts), 500 (server error)
**Timeout**: 10 seconds
**On timeout**: Frontend shows "Unable to connect to the server." toast, stays on lesson view.

### Backend → Content Module (Score Answer)
**Endpoint**: In-process Python call (scoring logic)
**Payload**: `{ activity: { type, content, expected_answer }, user_answer: string }`
**Success response**: `{ score: float (0.0–1.0), feedback: string, correct_answer?: string }`
**Failure response**: Raises `Exception` → caught by FastAPI → returns 500
**Timeout**: 2 seconds
**On failure**: 500 with error detail.

### Backend → Progress Module (Update SQLite)
**Endpoint**: In-process Python call (SQLite write)
**Payload**: `{ lesson_id: int, activity_id: int, score: float, attempts: int, status: str }`
**Success response**: `{ success: true, lesson_status: str, next_lesson_unlocked: bool }`
**Failure response**: Raises `sqlite3.Error` → caught by FastAPI → returns 500
**Timeout**: 2 seconds
**On failure**: 500 with error detail.

---

## Cleanup Inventory
| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| Frontend activity state (React refs, reactive state) | STEP 1 (activity mount) | STEP 6 (navigation away) / Page unmount | GC (JavaScript) |
| Backend score computation (in-memory) | STEP 3 (scoring) | STEP 3 (function return) | GC (Python) |
| SQLite write transaction | STEP 4 (write) | STEP 4 (commit) | SQLite auto-commit |

---

## Reality Checker Findings
| # | Finding | Severity | Spec section | Resolution |
|---|---|-----------|-------------|-------------|
| RC-010 | **No scoring logic exists** — The current `app.py` has no scoring functions, no activity types, no fuzzy matching. | **Critical** | STEP 3 | The Content module must implement 5 distinct scoring algorithms (one per activity type). This is the most complex part of the entire platform. |
| RC-011 | **No `user_progress` table exists** — SQLite database code is not implemented in the current `app.py`. | **Critical** | STEP 4 | The Progress module must be built from scratch: database initialization, CRUD operations, sequential unlock logic. |
| RC-014 | **No activity submission endpoint exists** — The current API has `/api/generate`, `/health`, `/api/voices`, `/api/history`. No lesson or progress endpoints. | **Critical** | STEP 2 | The entire `/api/lessons/:id/activities/:activityId/submit` endpoint must be built. |
| RC-015 | **No `useActivitySubmission` composable exists** — The current frontend has no composable for activity submission. | **High** | STEP 2 | A new composable must be created: `app/composables/useActivitySubmission.ts`. |
| RC-016 | **No `ActivityRenderer` component exists** — The current frontend has `AudioPlayerPanel`, `WaveformCanvas`, etc. but no activity-specific renderer. | **High** | STEP 1 | A new component must be created: `app/components/ActivityRenderer.vue` — 5 distinct renderers (one per activity type). |
| RC-017 | **Fuzzy string matching is not implemented** — The PRD mentions "fuzzy string match" for translation activities. No fuzzy matching library is in `requirements.txt`. | **High** | STEP 3 | A fuzzy matching library (e.g., `python-Levenshtein` or `rapidfuzz`) must be added to `requirements.txt`. |
| RC-018 | **Harakat-aware Arabic comparison is not implemented** — The PRD mentions "harakat" (diacritics) matter for `translate-to-arabic`. No harakat normalization or comparison exists. | **High** | STEP 3 | A harakat normalization/comparison module must be built (strip harakat for comparison, apply penalty for missing harakat). |
| RC-019 | **`competency_impact` is defined in the API contract but has no implementation** — ADR-007 defines weighted aggregation, but no code computes competency scores. | **High** | STEP 4 | The Progress module must compute competency scores from activity scores (weighted average per ADR-007). |

---

## Test Cases
| Test | Trigger | Expected behavior |
|---|---|---|
| TC-01: Happy path — correct answer | User submits correct answer on first attempt | Score = 1.0, feedback: "Correct!", activity marked completed, "Next Activity" button shown |
| TC-02: Happy path — partial answer | User submits partially correct answer | Score = 0.6, feedback: "Close! Try again." (if below threshold), attempts remaining = 2 |
| TC-03: Wrong answer, attempts remain | User submits wrong answer, 2 attempts remain | Score = 0.0, feedback: "Not quite right. Try again." (if below threshold), attempts remaining = 2 |
| TC-04: Max attempts exhausted | User uses all 3 attempts without reaching threshold | Score = best of 3 attempts, feedback: "Max attempts reached. Correct answer: {answer}", activity marked complete, correct answer shown |
| TC-05: Empty answer | User clicks submit with empty text input | Inline error: "Please enter your answer." → No API call made |
| TC-06: Locked lesson | User tries to submit answer to a locked lesson | 403 returned, toast: "This lesson is locked." → Stay on lesson view |
| TC-07: Invalid activity ID | User submits to a non-existent activity ID | 404 returned, toast: "Activity not found." → Stay on lesson view |
| TC-08: Backend unreachable | Backend is down during submission | 500 or connection error, toast: "Unable to connect to the server." → Stay on lesson view |
| TC-09: SQLite write fails | SQLite database is locked or corrupt | 500, partial-failure toast: "Your answer was scored but not saved." → Score is valid but not persisted |
| TC-10: All activities complete — lesson completion | User completes all 5 activities in a lesson | Lesson status changes to `completed`, "Complete Lesson" button shown, next lesson unlocked |
| TC-11: Sequential unlock — same level | User completes all 3 activities in Lesson 2 (A1) | Lesson 3 (A1) status changes from `locked` to `available` |
| TC-12: Sequential unlock — level boundary | User completes all 10 A1 lessons | Lesson 1 (A2) status changes from `locked` to `available` |
| TC-13: Review mode — completed lesson | User re-opens a completed lesson | All activities shown as completed, no new submissions allowed (read-only) |
| TC-14: Partial retry — retry failed activities only | User completes 3 of 5 activities, then re-opens lesson | 3 activities shown as completed (locked from editing), 2 activities available for retry |
| TC-15: `listen-translate` scoring | User submits English translation of Arabic text | Fuzzy match score computed (case-insensitive, whitespace-normalized) |
| TC-16: `translate-to-arabic` scoring | User submits Arabic translation of English text | Fuzzy match with harakat penalty (score × 0.8 if harakat missing) |
| TC-17: `role-play` scoring | User completes dialogue with missing lines | Ordered match ratio computed (line order matters) |
| TC-18: Keyboard shortcut — Enter to submit | User presses Enter in text input | Same as clicking "Submit Answer" button |

---

## Assumptions
| # | Assumption | Where verified | Risk if wrong |
|---|---|---|---|
| A1 | All 5 activity types will be implemented with distinct scoring algorithms | PRD defines 5 types (not yet implemented) | Critical — if one type is missing, the API will return 500 for that activity |
| A2 | Fuzzy string matching library (`rapidfuzz` or `python-Levenshtein`) will be added to `requirements.txt` | PRD mentions "fuzzy string match" (not yet in requirements) | High — without fuzzy matching, translation activities cannot score partial answers |
| A3 | Harakat normalization/comparison logic will be built for `translate-to-arabic` | PRD mentions "harakat" (not yet implemented) | High — without harakat handling, Arabic translation scoring will be inaccurate |
| A4 | SQLite database will be initialized on first run with `lessons` and `user_progress` tables | PRD defines schema (not yet implemented) | Critical — without SQLite, no progress can be tracked |
| A5 | `max_attempts` defaults to 3 for all activities | PRD (3–5 scored activities per lesson, "up to 3 attempts each") | Low — configurable per activity in JSON |
| A6 | Competency scores are computed as weighted averages (ADR-007) | ADR-007 (Accepted) | Medium — if the aggregation model changes, the competency_impact computation changes |
| A7 | Scoring is computed server-side (not client-side) | ADR-001 module boundaries (Progress module on backend) | Critical — if scoring is client-side, answers can be manipulated |
| A8 | The `metadata` field in the request is optional and activity-type-specific | PRD (flexible activity data) | Low — this is a design decision |

---

## Open Questions
- What is the exact scoring threshold per activity? (Is 0.7 the threshold for "completed"?)
- Should `introduce-characters` use multiple-choice (simpler) or free-text (harder)?
- How do we handle `role-play` scoring when there are multiple valid dialogue completions?
- Should there be a "hint" system (costs attempts, reveals part of the answer)?
- What happens if a lesson JSON file is updated after a user has already completed it? Do their scores persist?
- Should there be a "leaderboard" or "streak" system? (Out of scope for MVP, but worth noting.)
- How do we handle the case where an activity requires audio recording (future)? What are the browser permission flows?

---

## Spec vs Reality Audit Log
| Date | Finding | Action taken |
|---|---|---|
| 2026-07-10 | Initial spec created from codebase analysis | — |
| 2026-07-10 | RC-010: No scoring logic exists — 5 algorithms must be built | Flagged as Critical — most complex part of the platform |
| RC-011: No SQLite code exists in current `app.py` | Flagged as Critical — Progress module must be built from scratch |
| RC-014: No activity submission endpoint exists | Flagged as Critical — entire endpoint must be built |
| RC-015: No `useActivitySubmission` composable exists | Flagged as High — new composable must be created |
| RC-016: No `ActivityRenderer` component exists | Flagged as High — new component must be created (5 renderers) |
| RC-017: No fuzzy matching library in requirements | Flagged as High — must be added |
| RC-018: No harakat normalization/comparison exists | Flagged as High — must be built |
| RC-019: No competency score computation exists | Flagged as High — must be implemented in Progress module |
