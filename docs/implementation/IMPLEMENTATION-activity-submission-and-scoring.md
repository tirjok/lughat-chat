# Implementation Plan: Activity Submission and Scoring

**Source**: `docs/workflows/WORKFLOW-activity-submission-and-scoring.md` (v0.1)
**Date**: 2026-07-10
**Status**: Draft — Awaiting review

---

## Pre-Flight: Skill & Document Discovery

**Before implementing ANY slice, the agent MUST:**

### Skills Required
| Skill | Purpose | Install If Missing | Why |
|-------|---------|-------------------|-----|
| `solid` | Ensures SOLID principles in scoring algorithms (single responsibility per activity type) | `pi skills install solid` | 5 distinct algorithms must not be mixed |
| `vue` + `vue-best-practices` | Vue 3 Composition API, `<script setup>`, reactivity | `pi skills install vue` | All frontend slices (4, 5, 6) use Vue components/composables |
| `vue-testing-best-practices` | Test naming, AAA pattern, lean testing | `pi skills install vue-testing-best-practices` | Slice 4 tests (composable), Slice 5 tests (component) |
| `testing-best-practices` | 50+ JavaScript/Node.js testing best practices | `pi skills install testing-best-practices` | All test files follow these standards |
| `librarian` | Search library internals with source code + GitHub permalinks | `pi skills install librarian` | Slice 1 needs `rapidfuzz` API details (harakat normalization) |
| `find-skills` | Discover and install skills when needed | (pre-installed) | Audit environment before starting |
| `review` | Review changes since a fixed point (standards, spec, code quality) | `pi skills install review` | After each slice, review the diff |

### Document Search Required
| Document | What to Find | Source |
|----------|-------------|--------|
| `docs/workflows/REGISTRY.md` | Missing workflow specs (audio playback, toast lifecycle) | Cross-reference before starting |
| `docs/workflows/WORKFLOW-INTERCONNECTED-MAP.md` | Cross-workflow dependencies between all workflows | Slice 2/3 blocked by Lesson Browsing |
| `docs/architecture/ADR-006` | Activity type taxonomy (5 types defined here) | Slice 1 scoring algorithms |
| `docs/architecture/ADR-007` | Progress scoring and competency aggregation (weighted average) | Slice 3 competency computation |
| `docs/PRD.md` | User stories #4, #6, #7 (mandatory practice, retry, score tracking) | All slices reference these |

### Agent Instruction
> "Run `find-skills` to audit the environment. Install any missing skills from the table above. Read `docs/workflows/REGISTRY.md` to identify missing workflow specs. Read `docs/architecture/ADR-006` and `ADR-007` for scoring domain knowledge. Then begin Slice 1."

---

## Reality Check (Current State vs. Spec)

| # | Finding | Severity |
|---|---------|----------|
| RC-010 | No scoring logic exists — 5 algorithms must be built | Critical |
| RC-011 | No SQLite code exists in `app.py` | Critical |
| RC-014 | No activity submission endpoint exists | Critical |
| RC-015 | No `useActivitySubmission` composable exists | High |
| RC-016 | No `ActivityRenderer` component exists | High |
| RC-017 | No fuzzy matching library in requirements | High |
| RC-018 | No harakat normalization/comparison exists | High |
| RC-019 | No competency score computation exists | High |

---

## Proposed Slices

### Slice 1: Backend — Scoring Library (5 Algorithms)

**Type**: AFK
**Blocked by**: None
**User stories**: — (enables all scoring slices)

**What to build**: A scoring library module (`backend/content/scoring.py`) that provides 5 distinct scoring functions, one per activity type, plus a dispatch/routing function that selects the correct algorithm by `activity.type`:

1. **`listen-translate`** — Fuzzy string match (case-insensitive, whitespace-normalized) between user's English translation and the expected answer. Score = similarity ratio (0.0–1.0).
2. **`translate-to-english`** — Same fuzzy match as above (case-insensitive, whitespace-normalized). Score = similarity ratio (0.0–1.0).
3. **`translate-to-arabic`** — Fuzzy match with **harakat-aware** comparison: strips harakat (Arabic diacritics: ّ َ ِ ُ ّ ً ٍ ْ) for baseline comparison, then applies × 0.8 penalty if the user omitted diacritics that were in the expected answer. Score = similarity ratio with harakat penalty.
4. **`introduce-characters`** — Content validation: checks that the user's answer contains required keywords/phrases from the character's expected sentences. Score = keyword match ratio (0.0–1.0).
5. **`role-play`** — Dialogue completion scoring: checks that the user's lines match the expected dialogue in the correct order. Score = ordered match ratio (0.0–1.0).

Also adds `rapidfuzz` to `requirements.txt` (pure Python, no C extension needed for Docker).

**Acceptance criteria**:
- [ ] `rapidfuzz` added to `backend/requirements.txt`
- [ ] `listen-translate` scoring function returns similarity ratio 0.0–1.0 (case-insensitive, whitespace-normalized)
- [ ] `translate-to-english` scoring function returns similarity ratio 0.0–1.0 (case-insensitive, whitespace-normalized)
- [ ] `translate-to-arabic` scoring function performs harakat-aware comparison: strips harakat for baseline, applies × 0.8 penalty if user omits diacritics present in expected answer
- [ ] `introduce-characters` scoring function computes keyword match ratio (checks required keywords/phrases from character sentences)
- [ ] `role-play` scoring function computes ordered dialogue match ratio (checks user lines match expected dialogue in order)
- [ ] A dispatch/routing function (`score_activity(activity_type, user_answer, activity_content)`) selects and calls the correct scoring algorithm by `activity.type`
- [ ] Unknown activity type returns a clear error: `"Unknown activity type: {type}"`
- [ ] Unit tests cover each of the 5 scoring functions with edge cases (empty input, special characters, harakat variations, partial keyword matches, out-of-order dialogue)

**Integration verification**:
- [ ] Backend starts without errors (new dependency installed)
- [ ] Importing `scoring.py` does not raise exceptions

---

### Slice 2: Backend — Activity Submission Endpoint

**Type**: AFK
**Blocked by**: Slice 1 (scoring library), Lesson Browsing Slice 1 (SQLite + lesson data — `lessons` and `user_progress` tables)
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
**Blocked by**: Slice 2 (submission endpoint), Lesson Browsing Slice 1 (SQLite tables — `lessons` and `user_progress`)
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

- Score bar (0.0–1.0) with color coding (green ≥ 0.7 threshold, red below)
- Feedback message (shown on first attempt)
- Remaining attempts counter
- "Next Activity" button (when activity is complete and more activities exist)
- "Complete Lesson" button (when all activities are complete)
- "Lesson completed ✓" message with "Back to Roadmap" button
- Dashboard refresh after lesson completion (re-fetch `/api/lessons` to update roadmap)

**Acceptance criteria**:
- [ ] Score bar displays 0.0–1.0 with color coding (green ≥ 0.7, red below)
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

- **Slice 1** is independent — can start immediately (no dependencies). Builds all 5 scoring algorithms in one library.
- **Slices 2 → 3** are sequential backend (scoring first, then persistence). Both depend on Lesson Browsing Slice 1 for SQLite tables.
- **Slice 4** can run in parallel with backend slices (once the API exists).
- **Slices 5 → 6** are sequential frontend (renderer first, then completion UI).
- **Slice 6** depends on both backend (Slice 3) and frontend (Slice 5).
- **Cross-workflow dependency**: Slices 2 and 3 depend on Lesson Browsing Slice 1 (SQLite `lessons` + `user_progress` tables).

---

## Open Questions

1. **Scoring threshold**: What is the exact score threshold for "completed" per activity? (ADR-007 specifies 0.7 as the default threshold for all competencies — single global threshold, no per-activity tuning.)

2. **Phased rollout — Lesson 1 first**: Only 1 lesson JSON file exists (`backend/content/a1/lesson-01.json`) with 5 activities. **The implementation plan is NOT blocked by this gap.** All 6 slices are written to work with the single existing lesson. Slice 1 (Scoring Library) implements 5 algorithms that work against lesson-01.json's 5 activities. The remaining 29 lesson JSON files (A2 + B1) are a **separate data-creation task** — not an implementation task. Once the backend scoring infrastructure is complete, content authors can populate the remaining 29 JSON files (each with their own activities and expected answers) and the system will automatically apply the same scoring algorithms (no code changes needed).

3. **Activity data gap** (RC-012): The existing `lesson-01.json` has 5 activities with `content` fields containing `arabic`, `english_expected`, `sentences`, `characters`, and `expected_elements` — but no flat `expected_answer` field. The scoring functions must work with the existing JSON structure (not a separate field). Should populating expected answers be a separate issue, or is it a data gap outside implementation scope?

3. **Slice granularity**: Should Slices 2 and 3 be combined ("Activity Submission: score + persist") since they're the same API call? Currently kept separate to allow testing scoring logic independently from persistence.

4. **Dependencies on Lesson Browsing**: Slices 2 and 3 both depend on Lesson Browsing Slice 1 (SQLite tables `lessons` and `user_progress`). This cross-workflow dependency is now explicitly noted in each slice's "Blocked by" field.

5. **Partial retry UX**: When a user re-opens a lesson with some activities completed and some not, should completed activities be shown as "locked from editing" (read-only) or hidden entirely?

6. **Pronunciation scoring (ADR-003/ADR-008)**: The `role-play` activity has a second scoring path via audio recording → STT (Whisper) → pronunciation scoring. This is out of scope for the current slices — it belongs to the separate Pronunciation Scoring workflow.

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
| TC-15: `listen-translate` scoring | 1, 2 | Fuzzy match score computed (case-insensitive, whitespace-normalized) |
| TC-16: `translate-to-arabic` scoring | 1, 2 | Fuzzy match with harakat penalty (× 0.8 if diacritics omitted) |
| TC-17: `role-play` scoring | 1, 2 | Ordered match ratio computed (line order matters) |
