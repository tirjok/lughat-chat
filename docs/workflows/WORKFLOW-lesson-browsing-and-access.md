# WORKFLOW: Lesson Browsing and Access
**Version**: 0.1
**Date**: 2026-07-10
**Author**: Workflow Architect
**Status**: Draft
**Implements**: PRD — "As a learner, I want to see a roadmap of my learning journey (A1 → A2 → B1) so that I know where I am"

---

## Executive Summary
User opens Dashboard (`/`) → frontend calls `GET /api/lessons` → backend merges lesson JSON metadata (from `backend/content/{level}/lesson-{NN}.json`) with `user_progress` status from SQLite → returns 30 lessons with resolved status (`locked`/`available`/`in_progress`/`completed`) → frontend renders roadmap grouped by 3 CEFR levels. User clicks a lesson → navigates to `/lesson/:id` → frontend fetches full lesson data + progress. **Critical gap:** no `/api/lessons` endpoint exists, no SQLite code exists, no routing exists, only 1 of 30 lesson JSON files exists (data gap). **Known issues:** sequential unlock logic unimplemented (RC-5), `useVoices` type mismatch (RC-4), no `/lesson/:id` route (RC-3).

---

## Overview
A learner opens the Dashboard (`/`) and sees a **roadmap** of all 30 lessons across 3 CEFR levels (A1, A2, B1). Each lesson shows its status: `locked` 🔒, `available` →, `in_progress` ◉, or `completed` ✓. The learner can click any `available` or `in_progress` lesson to enter the lesson view (`/lesson/:id`). The system checks SQLite `user_progress` to determine each lesson's status, and the Content module to serve the lesson metadata (title, competencies, section count). This is the **gateway workflow** — every other learning workflow flows through it.

---

## Actors
| Actor | Role in this workflow |
|---|---|
| Learner (Customer) | Opens Dashboard, browses roadmap, clicks a lesson |
| Frontend (Nuxt SPA) | Renders Dashboard page, calls `/api/lessons`, navigates to `/lesson/:id` |
| Nginx (reverse proxy) | Routes `/api/lessons*` to backend, serves SPA files |
| Backend (FastAPI) | Serves lesson metadata from JSON files + SQLite progress, resolves status |
| Content Module (backend) | Reads lesson JSON files from `backend/content/{level}/lesson-{NN}.json` |
| Progress Module (backend) | Reads `user_progress` table from SQLite, resolves lesson status |
| SQLite (file) | Stores lesson metadata (static) and user progress (mutable) |

---

## Prerequisites
- Backend container is running and `/health` returns `status: "ready"`
- SQLite database file exists (or is created on first run) with `lessons` and `user_progress` tables
- Lesson JSON files exist in `backend/content/{level}/lesson-{NN}.json` for all planned lessons
- Frontend SPA is served by Nginx (static files)
- No authentication system — single user, no user table

---

## Trigger
**Primary**: User navigates to `/` (Dashboard page) in the browser.
**Secondary**: User navigates to `/lesson/:id` directly (from bookmarks, shared links, or sidebar navigation).
**Tertiary**: User clicks a lesson card in the collapsible roadmap sidebar.

---

## Workflow Tree

### STEP 1: Dashboard Page Loads (Frontend)
**Actor**: Frontend (Nuxt file-based routing, `app/pages/index.vue` — Dashboard page)
**Action**: Nuxt renders the Dashboard page component. On mount, calls `GET /api/lessons` to fetch all lessons with progress status.
**Timeout**: N/A (page render is synchronous, < 100ms)
**Input**: `{ }` (no parameters — Dashboard shows all lessons)
**Output on SUCCESS**: Dashboard renders with roadmap data → GO TO STEP 2
**Output on FAILURE**:
  - `FAILURE(api_unreachable)`: Backend not responding → Show "Cannot connect to server" toast → Dashboard shows empty roadmap with "Try Again" button
  - `FAILURE(lessons_api_404)`: `/api/lessons` endpoint not implemented → Show "Feature not yet available" toast → Dashboard shows placeholder content
  - `FAILURE(lessons_api_500)`: Backend error (SQLite missing, JSON parse error) → Show "Failed to load lessons" toast → Dashboard shows error state

**Observable states during this step**:
  - Customer sees: Dashboard page loads with roadmap (or error state if API fails). Top navigation bar visible. TTS status indicator in top-right.
  - Operator sees: Nginx serves `index.html` (SPA), then frontend makes `GET /api/lessons` request.
  - Database: No changes (read-only).
  - Logs: `[nginx] GET /api/lessons 200` (or appropriate status code).

---

### STEP 2: Backend Fetches Lesson Metadata (Content Module)
**Actor**: Backend (Content module — `GET /api/lessons` endpoint)
**Action**: Read all lesson JSON files from `backend/content/{level}/lesson-{NN}.json`, parse them, and return a list of lesson summaries (id, level, sequence, title, competency count, section count).
**Timeout**: 5 seconds (file I/O + JSON parsing — should be < 100ms for 30 files)
**Input**: `GET /api/lessons` (no body)
**Output on SUCCESS**: `[{ id, level, sequence, title, competency_count, section_count }]` (array of lesson summaries) → GO TO STEP 3
**Output on FAILURE**:
  - `FAILURE(content_directory_missing)`: `backend/content/` directory doesn't exist → Return 404 `{"detail": "Content not configured"}` → Frontend shows "Feature not yet available"
  - `FAILURE(json_parse_error)`: A lesson JSON file is malformed → Return 500 `{"detail": "Invalid lesson data: {filename}"}` → Frontend shows error toast, skips that lesson (partial failure)
  - `FAILURE(no_lessons_found)`: Directory exists but no JSON files → Return `[]` (empty array) → Frontend shows "No lessons available" state

**Observable states during this step**:
  - Customer sees: (nothing — invisible backend work)
  - Operator sees: Backend reads 30 JSON files, parses them, returns list.
  - Database: No changes (Content module reads JSON files, not SQLite).
  - Logs: (no logs from Content module — silent).

---

### STEP 3: Backend Resolves Progress Status (Progress Module)
**Actor**: Backend (Progress module — reads `user_progress` table from SQLite)
**Action**: For each lesson returned from Content module, look up its progress in `user_progress` table. If no progress record exists, default status is `locked`. If a record exists, use its `status` field. Apply sequential unlocking rules:
  1. **Lesson 1 (A1, seq 1)**: Always starts as `available` (no prerequisites).
  2. **Subsequent lessons in same level**: `available` if the previous lesson's status is `completed`; `locked` otherwise.
  3. **Lessons in higher levels (A2, B1)**: `locked` until ALL lessons in the previous level are `completed`.
  4. **`in_progress`**: User has submitted at least one activity for this lesson (check `activities` JSON in `user_progress`).
  5. **`completed`**: All activities in the lesson have scores ≥ threshold (defined in ADR-007).

**Timeout**: 1 second (SQLite query — should be < 50ms for 30 rows)
**Input**: `GET /api/lessons` (same as STEP 2)
**Output on SUCCESS**: `[{ id, level, sequence, title, competency_count, section_count, status }]` (array with resolved status) → GO TO STEP 4
**Output on FAILURE**:
  - `FAILURE(sqlite_missing)`: SQLite file doesn't exist or tables aren't created → Return 500 `{"detail": "Database not initialized"}` → Frontend shows error
  - `FAILURE(sqlite_corrupt)`: SQLite file is corrupted → Return 500 `{"detail": "Database error"}` → Frontend shows error
  - `FAILURE(inconsistent_status)`: Progress record has invalid status value (not in `locked|available|in_progress|completed`) → Return 500 `{"detail": "Invalid progress status for lesson {id}"}` → Frontend shows error

**Observable states during this step**:
  - Customer sees: (nothing — invisible backend work)
  - Operator sees: SQLite query reads `user_progress` table, joins with lesson metadata, resolves sequential unlock rules.
  - Database: `user_progress` table read (no writes).
  - Logs: (no logs from Progress module — silent).

---

### STEP 4: Frontend Renders Roadmap (Dashboard)
**Actor**: Frontend (Dashboard page — `app/pages/index.vue` Dashboard variant)
**Action**: Group lessons by level (A1, A2, B1). For each level, show:
  - Level header with progress percentage (completed / total × 100)
  - Each lesson as a card showing: lesson number, title, status icon (🔒 / → / ◉ / ✓)
  - Clickable cards for `available` and `in_progress` lessons
  - Non-clickable (grayed out) cards for `locked` lessons
  - Optionally: expand/collapse each level

**Timeout**: N/A (synchronous render, < 200ms)
**Input**: `[{ id, level, sequence, title, competency_count, section_count, status }]` (from STEP 3)
**Output on SUCCESS**: Dashboard fully rendered with roadmap → GO TO STEP 5
**Output on FAILURE**:
  - `FAILURE(malformed_response)`: Backend returns unexpected data structure → Frontend shows "Failed to render roadmap" toast → Dashboard falls back to loading skeleton
  - `FAILURE(navigation_fails)`: Clicking a lesson card to navigate to `/lesson/:id` fails (route not configured) → Frontend shows "Lesson view not yet available" toast

**Observable states during this step**:
  - Customer sees: Dashboard with roadmap — 30 lesson cards grouped by level, each showing status icon. Clickable cards for available/in-progress lessons. Grayed out cards for locked lessons. Progress percentage per level.
  - Operator sees: (nothing — purely client-side).
  - Database: No changes.
  - Logs: (no logs from frontend render).

---

### STEP 5: User Selects a Lesson (Navigation)
**Actor**: User (Customer)
**Action**: User clicks on a lesson card (status = `available` or `in_progress`). Frontend navigates to `/lesson/:id` (Nuxt file-based routing).
**Timeout**: N/A (client-side navigation, < 100ms)
**Input**: `{ lessonId: number }` (from clicked lesson card)
**Output on SUCCESS**: Navigate to `/lesson/:id` → GO TO STEP 6 (Lesson Browsing and Access — Lesson View)
**Output on FAILURE**:
  - `FAILURE(click_locked_lesson)`: User clicks a `locked` lesson card (should be non-clickable, but if JS bug allows) → Show toast: "This lesson is locked. Complete previous lessons first." → Stay on Dashboard.
  - `FAILURE(navigation_route_missing)`: `/lesson/:id` route doesn't exist (Nuxt page not created) → Show toast: "Lesson view not yet available." → Stay on Dashboard.
  - `FAILURE(lesson_not_found)`: Backend returns 404 for `/api/lessons/:id` (lesson doesn't exist in JSON) → Show toast: "Lesson not found." → Stay on Dashboard.

**Observable states during this step**:
  - Customer sees: Dashboard fades out, Lesson View page loads.
  - Operator sees: Nginx logs `GET /lesson/1` (or appropriate lesson ID).
  - Database: No changes (navigation only).
  - Logs: `[nginx] GET /lesson/1 200`.

---

### STEP 6: Lesson View Loads (Frontend)
**Actor**: Frontend (Lesson page — `app/pages/lesson/[id].vue`)
**Action**: On mount, call `GET /api/lessons/:id` to fetch full lesson data (sections + activities). Also call `GET /api/progress/lesson/:id` to fetch current progress (if any).
**Timeout**: 5 seconds (API call + JSON parsing)
**Input**: `{ lessonId: number }` (from URL route `/lesson/:id`)
**Output on SUCCESS**: Lesson data + progress data loaded → GO TO STEP 7 (Lesson Rendering — Section Renderer)
**Output on FAILURE**:
  - `FAILURE(lesson_api_404)`: Lesson doesn't exist in JSON files → Show toast: "Lesson not found." → Navigate back to Dashboard.
  - `FAILURE(lesson_api_500)`: Backend error (JSON parse, SQLite error) → Show toast: "Failed to load lesson." → Navigate back to Dashboard.
  - `FAILURE(progress_api_404)`: No progress record (expected for new lesson) → Treat as "no prior progress" — this is normal, not an error.
  - `FAILURE(progress_api_500)`: Progress API fails → Show lesson data without progress (partial failure — lesson content is more important than progress).

**Observable states during this step**:
  - Customer sees: Lesson View page loads with lesson content. If locked, shows "This lesson is locked" message with "Complete previous lessons first" guidance.
  - Operator sees: Backend serves lesson JSON + progress data.
  - Database: Read from `lessons` and `user_progress` tables.
  - Logs: `[nginx] GET /api/lessons/1 200`, `[nginx] GET /api/progress/lesson/1 200`.

---

### STEP 7: Sequential Lockout Check (Backend)
**Actor**: Backend (Progress module — `/api/lessons/:id` endpoint)
**Action**: Before serving lesson content, check if the lesson is accessible:
  1. Is the lesson's status `locked`? If yes → return 403 `{"detail": "This lesson is locked. Complete previous lessons first."}`.
  2. Is the lesson's status `completed`? If yes → return 200 but mark as "review mode" (show all activities as completed, no new submissions allowed).
  3. Is the lesson's status `available` or `in_progress`? → Return 200 with full lesson data.

**Timeout**: 1 second (SQLite query)
**Input**: `GET /api/lessons/:id`
**Output on SUCCESS**: `200 { lesson JSON + progress data }` → GO TO STEP 8
**Output on FAILURE**:
  - `FAILURE(403_locked)`: Lesson is locked → Return 403 → Frontend shows "This lesson is locked" message.
  - `FAILURE(404_not_found)`: Lesson doesn't exist in JSON files → Return 404 → Frontend shows "Lesson not found."
  - `FAILURE(500_sqlite_error)`: SQLite query fails → Return 500 → Frontend shows error.

**Observable states during this step**:
  - Customer sees: If locked, the lesson view shows "🔒 This lesson is locked. Complete previous lessons first." If completed, shows "✓ Lesson completed — review mode." If available/in_progress, shows full lesson content.
  - Operator sees: Backend returns 403 for locked lessons, 200 for accessible ones.
  - Database: Read from `user_progress` table (no writes).
  - Logs: (no logs from Progress module — silent).

---

## ABORT_CLEANUP: Lesson Access Failure Recovery
**Triggered by**: Any failure in STEP 6 (Lesson View Load) or STEP 7 (Sequential Lockout Check) that prevents the user from accessing the lesson.
**Actions** (in order):
  1. Frontend shows appropriate error toast.
  2. Frontend navigates back to Dashboard (`/`) or stays on Dashboard.
  3. Frontend resets any loading states (spinners, skeletons).
  4. If the error was a temporary SQLite issue, offer a "Retry" button.

**What customer sees**: Error toast at top-center (red), lesson view either not shown or shows error message, user returns to Dashboard.

**What operator sees**: Backend logs with error detail. SQLite file may need repair if corruption is suspected.

---

## State Transitions
```
[Dashboard: no lesson selected]
  → (user clicks lesson card, status = available) → [Lesson View: active lesson]
  → (user clicks lesson card, status = in_progress) → [Lesson View: continuing lesson]
  → (user clicks lesson card, status = completed) → [Lesson View: review mode]
  → (user clicks lesson card, status = locked) → [Dashboard: toast "This lesson is locked"]
  → (user navigates directly to /lesson/:id) → [Lesson View: direct access]
  → (user clicks "Back to Roadmap") → [Dashboard: no lesson selected]

[Lesson View: active lesson]
  → (user submits activity, all activities complete) → [Lesson View: completed]
  → (user navigates away) → [Dashboard: no lesson selected]
  → (user clicks different lesson) → [Lesson View: different lesson]
  → (user accesses completed lesson) → [Lesson View: review mode]

[Lesson View: review mode]
  → (user clicks "Back to Roadmap") → [Dashboard: lesson shows ✓]
  → (user starts new lesson) → [Lesson View: new lesson]
```

---

## Handoff Contracts

### Frontend → Backend (List Lessons)
**Endpoint**: `GET /api/lessons`
**Payload**: None (no body)
**Success response**:
```json
[
  {
    "id": 1,
    "level": "A1",
    "sequence": 1,
    "title": "The Salutations — التحيّة الأولى",
    "competency_count": 5,
    "section_count": 5,
    "status": "available"
  }
]
```
**Failure response**:
```json
{
  "ok": false,
  "error": "string",
  "code": "CONTENT_MISSING" | "SQLITE_ERROR" | "JSON_PARSE_ERROR",
  "retryable": true
}
```
**Timeout**: 5 seconds
**On timeout**: Frontend shows "Failed to load lessons" toast, stays on Dashboard.

### Backend → Content Module (Read JSON)
**Endpoint**: In-process Python call (file I/O)
**Payload**: `{ }` (scan `backend/content/{level}/lesson-{NN}.json`)
**Success response**: `[{ id, level, sequence, title, competencies, sections, activities }]` (parsed JSON)
**Failure response**: Raises `Exception` → caught by FastAPI → returns 500
**Timeout**: 5 seconds (file I/O + JSON parsing)
**On failure**: 500 with filename of the problematic file.

### Backend → Progress Module (Read SQLite)
**Endpoint**: In-process Python call (SQLite query)
**Payload**: `{ lesson_id: int }`
**Success response**: `{ status: str, activities: dict }` (progress record) or `None` (no record)
**Failure response**: Raises `sqlite3.Error` → caught by FastAPI → returns 500
**Timeout**: 1 second
**On failure**: 500 "Database not initialized" or "Database error".

### Frontend → Backend (Single Lesson)
**Endpoint**: `GET /api/lessons/:id`
**Payload**: None (lesson ID from URL parameter)
**Success response**:
```json
{
  "id": 1,
  "level": "A1",
  "sequence": 1,
  "title": "The Salutations — التحيّة الأولى",
  "competencies": ["...", "..."],
  "sections": [{ "type": "dialogue", ... }, ...],
  "activities": [{ "id": 1, "type": "listen-translate", ... }, ...],
  "progress": {
    "status": "available",
    "activities": { "1": { "score": 0.8, "attempts": 1, "status": "completed" } }
  }
}
```
**Failure response**:
```json
{
  "ok": false,
  "error": "This lesson is locked. Complete previous lessons first.",
  "code": "LOCKED" | "NOT_FOUND" | "SQLITE_ERROR",
  "retryable": true
}
```
**Status codes**: 200 (accessible), 403 (locked), 404 (not found), 500 (server error)
**Timeout**: 5 seconds
**On timeout**: Frontend shows "Failed to load lesson" toast, navigates back to Dashboard.

---

## Cleanup Inventory
| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| Dashboard page state (React refs, reactive state) | STEP 1 (page mount) | STEP 5 (navigation away) / Page unmount | GC (JavaScript) |
| Lesson View page state (React refs, reactive state) | STEP 6 (page mount) | STEP 5 (navigation away) / Page unmount | GC (JavaScript) |
| SQLite read cursor | STEP 3 (query execution) | STEP 3 (query completion) | SQLite auto-close |

---

## Reality Checker Findings
| # | Finding | Severity | Spec section | Resolution |
|---|---|-----------|-------------|-------------|
| RC-1 | **No lesson content exists beyond `lesson-01.json`** — `backend/content/a2/` and `backend/content/b1/` directories exist but are empty. The workflow spec assumes 30 lessons (10 per level × 3 levels). Currently only 1 lesson exists. | **Critical** | STEP 2 | The Content module will return 1 lesson, not 30. The roadmap will show 1 lesson, not 30. This is a data gap, not a code gap. |
| RC-2 | **No SQLite database exists** — `app.py` currently has no database code. The `lessons` and `user_progress` tables are defined in the PRD but not implemented. | **Critical** | STEP 3 | The Progress module doesn't exist yet. The `/api/lessons` and `/api/progress` endpoints don't exist. This workflow cannot be tested until implemented. |
| RC-3 | **No routing exists** — The current app is a single page (`/`). There is no `/` (Dashboard) or `/lesson/:id` route. The Playground route (`/playground`) is also not implemented. | **High** | STEP 1, STEP 5 | The frontend pages (`app/pages/index.vue` for Dashboard, `app/pages/lesson/[id].vue` for Lesson View) don't exist yet. |
| RC-4 | **Current `useVoices` composable returns `Voice` objects with `dialect`, `tag`, `icon`, `speaker_wav` fields** — but the backend `/api/voices` returns simple `{ id, name }` objects. The frontend composable's type doesn't match the API. | **Medium** | STEP 4 | The `useVoices` composable needs updating to match the actual API response, or the API needs to be extended to return the richer data structure. |
| RC-5 | **Sequential unlocking logic is not implemented** — The spec describes rules (lesson N unlocks when lesson N-1 is completed), but no code implements this. | **High** | STEP 3 | The Progress module must implement sequential unlock logic at the API level, not the frontend. The frontend should only display the status returned by the backend. |

---

## Test Cases
| Test | Trigger | Expected behavior |
|---|---|---|
| TC-01: Dashboard loads with lessons | Backend has 30 lessons in JSON + SQLite, all populated | Dashboard shows 30 lesson cards, grouped by 3 levels, with correct status icons |
| TC-02: Dashboard loads with no content | Backend has no lesson JSON files | Dashboard shows "No lessons available" state |
| TC-03: Dashboard loads with no SQLite | Backend has JSON files but no SQLite database | Dashboard shows "Feature not yet available" or "Database not initialized" |
| TC-04: Sequential unlocking — first lesson | Lesson 1 has no prior progress → status = `available` | Lesson 1 card is clickable (→ icon), all other lessons are locked (🔒) |
| TC-05: Sequential unlocking — middle lesson | Lessons 1–3 completed, Lesson 4 not started | Lessons 1–3 show ✓, Lesson 4 shows →, Lessons 5–30 show 🔒 |
| TC-06: Sequential unlocking — level boundary | All A1 lessons completed, A2 not started | A1 shows all ✓, A2 Lesson 4 shows →, A2 Lessons 5–10 show 🔒, B1 all show 🔒 |
| TC-07: Click locked lesson | User clicks a 🔒 lesson card | Toast: "This lesson is locked. Complete previous lessons first." → Stay on Dashboard |
| TC-08: Click available lesson | User clicks a → lesson card | Navigate to `/lesson/:id` → Lesson View loads |
| TC-09: Click completed lesson | User clicks a ✓ lesson card | Navigate to `/lesson/:id` → Lesson View loads in "review mode" |
| TC-10: Direct navigation to /lesson/:id | User types `/lesson/5` in browser | Lesson 5 loads (if accessible) or shows "locked" message |
| TC-11: Backend API unreachable | Backend is down | Dashboard shows "Cannot connect to server" toast, stays on Dashboard |
| TC-12: Malformed lesson JSON | One lesson JSON file has syntax error | Dashboard shows that lesson as missing (partial failure), other lessons render correctly |
| TC-13: Lesson not found | User navigates to `/lesson/999` (doesn't exist) | Toast: "Lesson not found." → Navigate back to Dashboard |
| TC-14: Locked lesson access via API | Direct `GET /api/lessons/15` where lesson 15 is locked | Return 403 `{"detail": "This lesson is locked. Complete previous lessons first."}` |
| TC-15: Completed lesson access | Direct `GET /api/lessons/1` where lesson 1 is completed | Return 200 with `progress.status = "completed"`, Lesson View shows "review mode" |
| TC-16: Empty progress record | No `user_progress` record for a lesson | Default status = `locked` (except Lesson 1 which defaults to `available`) |

---

## Assumptions
| # | Assumption | Where verified | Risk if wrong |
|---|---|---|---|
| A1 | 30 lesson JSON files will exist (10 per level × 3 levels) | PRD states this (not yet verified — only lesson-01.json exists) | High — if fewer lessons exist, the roadmap shows fewer lessons. This is a data gap, not a code gap. |
| A2 | SQLite database will be created on first run with `lessons` and `user_progress` tables | PRD defines the schema (not yet implemented) | Critical — without SQLite, the Progress module cannot determine lesson status |
| A3 | Frontend SPA routing will be implemented (Nuxt file-based routing) | ADR-009 defines the routing strategy (not yet implemented) | High — without routing, Dashboard and Lesson View pages cannot exist |
| A4 | Sequential unlocking is enforced at the **backend** level, not the frontend | ADR-001 module boundaries (Progress module may import Content) | Critical — if enforced only on the frontend, a user could manipulate the URL to access locked lessons. Backend must return 403 for locked lessons. |
| A5 | Lesson 1 (A1, seq 1) always starts as `available` (no prerequisites) | PRD (implied — first lesson should be accessible) | Low — this is a reasonable default |
| A6 | Higher-level lessons (A2, B1) are locked until ALL lessons in the previous level are completed | PRD (sequential progression) | Medium — if this rule is relaxed (e.g., A2 unlocks after A1 Lesson 5), the unlocking logic changes |
| A7 | `in_progress` status is set when the user has submitted at least one activity for the lesson | PRD (implied) | Low — this is a reasonable default |
| A8 | The `/api/lessons` endpoint returns a flat array (not nested by level) — the frontend groups by level | PRD (endpoint definition) | Low — this is a design decision |

---

## Open Questions
- What happens if a lesson JSON file is added or removed after the database is initialized? Do we need to sync JSON files to the `lessons` table?
- Should completed lessons show their competency scores in the Dashboard, or just a checkmark?
- Should there be a "Continue" button on `in_progress` lessons that jumps directly to the first incomplete activity?
- What is the exact competency threshold for lesson completion? (ADR-007 defines weighted average, but what threshold? 0.7? 0.8?)
- Should there be a "skip" or "preview" mode for locked lessons (read-only, no activities)?
- How do we handle lesson reordering? If lesson 5 is renumbered to lesson 4, does the sequential unlock logic break?

---

## Spec vs Reality Audit Log
| Date | Finding | Action taken |
|---|---|---|
| 2026-07-10 | Initial spec created from codebase analysis | — |
| 2026-07-10 | RC-1: Only 1 of 30 lesson JSON files exists | Flagged as Critical — data gap, not code gap |
| 2026-07-10 | RC-2: No SQLite code exists in current `app.py` | Flagged as Critical — must be implemented before this workflow can run |
| 2026-07-10 | RC-3: No routing exists — single page app | Flagged as High — must be implemented before this workflow can run |
| 2026-07-10 | RC-4: `useVoices` composable type mismatch with API | Flagged as Medium — needs composable update |
| 2026-07-10 | RC-5: Sequential unlocking logic not implemented | Flagged as High — must be implemented in Progress module |
