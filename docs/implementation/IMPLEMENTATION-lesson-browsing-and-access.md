# Implementation Plan: Lesson Browsing and Access

**Source**: `docs/workflows/WORKFLOW-lesson-browsing-and-access.md` (v0.1)
**Date**: 2026-07-10
**Status**: Draft — Awaiting review

---

## Overview

This document breaks the **Lesson Browsing and Access** workflow into **7 implementation issues** (vertical slices). Each slice is a thin, end-to-end path through all layers (schema, API, UI, tests). They are ordered by dependency — blockers first — so that each subsequent slice can reference real issue identifiers once published.

---

## Reality Check (Current State vs. Spec)

| # | Finding | Severity | Reference |
|---|---------|----------|-------------|
| RC-1 | Only 1 of 30 lesson JSON files exists (`backend/content/a1/lesson-01.json`). `a2/` and `b1/` directories are empty. | Critical | STEP 2 |
| RC-2 | No SQLite database code exists in `app.py`. No `lessons` or `user_progress` tables. | Critical | STEP 3 |
| RC-3 | No routing exists — single page app (`/` only). No `/lesson/:id` route. | High | STEP 1, STEP 5 |
| RC-4 | `useVoices` composable type mismatch with API (minor, out of scope). | Medium | STEP 4 |
| RC-5 | Sequential unlocking logic not implemented. | High | STEP 3 |

---

## Proposed Slices

### Slice 1: Backend — SQLite Database Initialization

**Type**: AFK
**Blocked by**: None
**User stories**: — (enables all other slices)

**What to build**: On first backend startup, create a SQLite database file (configurable path, default: `backend/data/lughat.db`) with two tables:

- `lessons` — mirrors the JSON lesson structure (id, level, sequence, title, competencies, sections). Populated from JSON files at startup (scan `backend/content/{level}/lesson-{NN}.json`).
- `user_progress` — tracks per-lesson status (`locked`/`available`/`in_progress`/`completed`) and activities JSON (`{ activityId: { score, attempts, status } }`).

The module must handle:
- Creating the database file and tables if they don't exist
- Migrating `lessons` table from JSON files (idempotent — skip if already populated)
- Returning a clean error if the database is corrupted

**Acceptance criteria**:
- [ ] SQLite database file is created on first backend startup with `lessons` and `user_progress` tables
- [ ] `lessons` table is populated from existing JSON files (currently `lesson-01.json`)
- [ ] `user_progress` table is empty initially (no progress records)
- [ ] Backend starts without errors when database already exists (idempotent init)
- [ ] Backend returns 500 with meaningful error when database is corrupted

**Integration verification**:
- [ ] The real backend service starts without errors in logs
- [ ] The `/health` endpoint returns success (not error)
- [ ] A database file exists at the configured path with both tables

---

### Slice 2: Backend — Content Module (`GET /api/lessons`)

**Type**: AFK
**Blocked by**: Slice 1 (SQLite must exist for progress resolution)
**User stories**: #1 (roadmap), #17 (progress visibility)

**What to build**: A `GET /api/lessons` endpoint that:

1. Reads all lesson JSON files from `backend/content/{level}/lesson-{NN}.json`
2. Parses them and returns a list of lesson summaries: `{ id, level, sequence, title, competency_count, section_count, status }`
3. Synchronizes lesson metadata into the `lessons` SQLite table (if not already synced)
4. Returns lesson summaries grouped/sorted by level then sequence

Error handling:
- Content directory missing → 404 `{"detail": "Content not configured"}`
- Malformed JSON in a lesson file → 500 `{"detail": "Invalid lesson data: {filename}"}` (partial failure — skip that lesson)
- No JSON files found → return `[]` (empty array, not an error)

**Acceptance criteria**:
- [ ] `GET /api/lessons` returns an array of lesson summaries sorted by level then sequence
- [ ] Each summary includes: `id`, `level`, `sequence`, `title`, `competency_count`, `section_count`
- [ ] Returns 404 when content directory is missing
- [ ] Returns 500 when a JSON file is malformed (with filename in error detail)
- [ ] Returns `[]` when content directory exists but has no JSON files
- [ ] Currently returns 1 lesson (lesson-01.json) with correct metadata

**Integration verification**:
- [ ] The real backend service starts without errors in logs
- [ ] `GET /api/lessons` returns a valid JSON array with the existing lesson data

---

### Slice 3: Backend — Progress Module (Sequential Unlocking)

**Type**: AFK
**Blocked by**: Slice 1 (SQLite tables), Slice 2 (lesson metadata from JSON)
**User stories**: #1 (roadmap), #2 (sequential completion)

**What to build**: Extend `GET /api/lessons` to resolve each lesson's status by reading from the `user_progress` SQLite table and applying sequential unlock rules:

1. **Lesson 1 (A1, seq 1)**: Always starts as `available` (no prerequisites).
2. **Subsequent lessons in same level**: `available` if the previous lesson's status is `completed`; `locked` otherwise.
3. **Lessons in higher levels (A2, B1)**: `locked` until ALL lessons in the previous level are `completed`.
4. **`in_progress`**: User has submitted at least one activity for this lesson (check `activities` JSON in `user_progress`).
5. **`completed`**: All activities in the lesson have scores ≥ threshold (0.7 per ADR-007).

The `status` field is appended to each lesson summary from Slice 2.

**Acceptance criteria**:
- [ ] `GET /api/lessons` returns lesson summaries with resolved `status` field
- [ ] Lesson 1 (A1, seq 1) defaults to `available` (no prior progress)
- [ ] Subsequent lessons default to `locked` (no prior progress)
- [ ] `in_progress` status is set when user has submitted at least one activity
- [ ] `completed` status is set when all activities meet the 0.7 threshold
- [ ] Sequential unlock rules are enforced at the backend (not frontend)
- [ ] Returns 500 if SQLite is missing or corrupted

**Integration verification**:
- [ ] The real backend service starts without errors in logs
- [ ] `GET /api/lessons` returns lessons with correct status values for a fresh database
- [ ] Direct API call to `/api/lessons` returns valid JSON with status fields

---

### Slice 4: Backend — Single Lesson Endpoint (`GET /api/lessons/:id`)

**Type**: AFK
**Blocked by**: Slice 1 (SQLite), Slice 2 (lesson metadata), Slice 3 (progress resolution)
**User stories**: #1 (roadmap), #2 (sequential), #5 (competency checklist)

**What to build**: A `GET /api/lessons/:id` endpoint that returns full lesson data for a single lesson, including a sequential lockout check:

1. Look up the lesson by ID from the `lessons` table (populated from JSON)
2. Check if the lesson is accessible:
   - **Locked** → return 403 `{"detail": "This lesson is locked. Complete previous lessons first."}`
   - **Completed** → return 200 with full lesson data, mark as "review mode" (all activities shown as completed, no new submissions)
   - **Available / in_progress** → return 200 with full lesson data (sections + activities + progress)
3. Include progress data in the response: `{ status, activities: { activityId: { score, attempts, status } } }`

Error handling:
- Lesson not found → 404 `{"detail": "Lesson not found."}`
- SQLite error → 500 `{"detail": "Database error"}`

**Acceptance criteria**:
- [ ] `GET /api/lessons/:id` returns full lesson data (sections + activities + progress) for accessible lessons
- [ ] Returns 403 for locked lessons with appropriate error message
- [ ] Returns 200 with "review mode" indicator for completed lessons
- [ ] Returns 404 for non-existent lesson IDs
- [ ] Progress data is included in the response (status + activities)
- [ ] Sequential lockout is enforced at the API level (not frontend)

**Integration verification**:
- [ ] The real backend service starts without errors in logs
- [ ] `GET /api/lessons/1` returns full lesson data (fresh database)
- [ ] `GET /api/lessons/999` returns 404
- [ ] Locking a lesson via `user_progress` results in 403 response

---

### Slice 5: Frontend — Dashboard Page (Roadmap Rendering)

**Type**: HITL (requires design review for roadmap UI)
**Blocked by**: Slice 2 (lessons list API), Slice 3 (progress status)
**User stories**: #1 (roadmap), #17 (progress visibility)

**What to build**: A Dashboard page (`app/pages/index.vue` — currently the TTS Studio page, needs to be replaced or extended) that:

1. Calls `GET /api/lessons` on mount
2. Groups lessons by level (A1, A2, B1)
3. For each level, shows:
   - Level header with progress percentage (completed / total × 100)
   - Each lesson as a card: lesson number, title, status icon (🔒/→/◉/✓)
   - Clickable cards for `available` and `in_progress` lessons
   - Non-clickable (grayed out) cards for `locked` lessons
   - Expand/collapse each level (optional)

Error handling:
- Backend unreachable → "Cannot connect to server" toast, empty roadmap with "Try Again"
- API returns empty `[]` → "No lessons available" state
- API returns 500 → "Failed to load lessons" toast

**Acceptance criteria**:
- [ ] Dashboard page loads and calls `GET /api/lessons` on mount
- [ ] Lessons are grouped by level (A1, A2, B1) with level headers
- [ ] Each level header shows progress percentage
- [ ] Lesson cards show correct status icons (🔒/→/◉/✓)
- [ ] `available` and `in_progress` cards are clickable
- [ ] `locked` cards are grayed out and non-clickable
- [ ] Error states show appropriate toasts (unreachable, empty, server error)
- [ ] Dashboard is responsive (mobile + desktop)

**Integration verification**:
- [ ] The real service starts without errors in logs
- [ ] Navigating to `/` loads the Dashboard with lesson data from the live backend

---

### Slice 6: Frontend — Lesson View Page (`/lesson/:id`)

**Type**: HITL (requires design review for lesson view + lockout/review states)
**Blocked by**: Slice 4 (single lesson endpoint)
**User stories**: #1 (roadmap), #2 (sequential), #5 (competency checklist)

**What to build**: A Lesson View page (`app/pages/lesson/[id].vue`) that:

1. On mount, calls `GET /api/lessons/:id` (lesson data) and `GET /api/progress/lesson/:id` (progress data)
2. Renders lesson content (sections + activities)
3. Handles states:
   - **Locked** → Shows "🔒 This lesson is locked. Complete previous lessons first." with "Back to Roadmap" button
   - **Completed** → Shows "✓ Lesson completed — review mode" with all activities visible (no new submissions)
   - **Available / in_progress** → Shows full lesson content, allows activity interaction

Error handling:
- Lesson API 404 → "Lesson not found" toast, navigate back to Dashboard
- Lesson API 500 → "Failed to load lesson" toast, navigate back to Dashboard
- Progress API 404 → Normal (no prior progress — treat as "available")
- Progress API 500 → Show lesson data without progress (partial failure)

**Acceptance criteria**:
- [ ] Lesson View page (`/lesson/:id`) loads and fetches lesson + progress data
- [ ] Locked lessons show "🔒 locked" message with "Back to Roadmap" navigation
- [ ] Completed lessons show "✓ review mode" with all activities visible
- [ ] Available/in_progress lessons show full lesson content
- [ ] 404 responses show "Lesson not found" toast and navigate back to Dashboard
- [ ] Progress API failure is handled gracefully (show lesson without progress)
- [ ] Navigation from Dashboard cards to Lesson View works (Slice 7 prerequisite)

**Integration verification**:
- [ ] The real service starts without errors in logs
- [ ] Navigating to `/lesson/1` loads the Lesson View with data from the live backend
- [ ] Navigating to `/lesson/999` shows error and navigates back

---

### Slice 7: Frontend — Navigation Infrastructure

**Type**: AFK
**Blocked by**: None (can be built in parallel with backend slices)
**User stories**: #15 (top nav), #16 (collapsible sidebar), #17 (progress visibility)

**What to build**: The navigation infrastructure that enables routing between Dashboard and Lesson View:

1. **Nuxt file-based routing**:
   - `app/pages/index.vue` — Dashboard page (replaces current TTS Studio, or coexists)
   - `app/pages/lesson/[id].vue` — Lesson View page
   - `app/pages/playground.vue` — Existing TTS Studio (moved from `/`)

2. **NavBar component** (`app/components/NavBar.vue`):
   - Hamburger button (opens roadmap sidebar)
   - Logo ("LughatChat")
   - Navigation links: Roadmap, Playground
   - TTS status indicator (existing `ModelStatusIndicator`)

3. **Composables** (per ADR-009, Option C — Hybrid):
   - `useNavigation.ts` — Current page, current lesson ID (from URL via vue-router)
   - `useSidebar.ts` — Sidebar open/closed, toggle, close, open
   - `useCurrentLesson.ts` — Current lesson, current activity, select lesson, navigate activities

4. **Navigation from Dashboard**: Clicking a lesson card navigates to `/lesson/:id` (Nuxt `useRouter().push()`)

**Acceptance criteria**:
- [ ] Nuxt file-based routing is configured for `/`, `/lesson/:id`, `/playground`
- [ ] NavBar component renders on all pages with hamburger, logo, links, TTS status
- [ ] Clicking "Roadmap" navigates to `/` (Dashboard)
- [ ] Clicking "Playground" navigates to `/playground` (existing TTS Studio)
- [ ] Clicking a lesson card on Dashboard navigates to `/lesson/:id`
- [ ] Browser back/forward buttons work correctly
- [ ] URL is shareable (bookmarking `/lesson/1` loads Lesson View)
- [ ] Sidebar composable manages open/closed state
- [ ] Navigation from Dashboard to Lesson View works end-to-end

**Integration verification**:
- [ ] The real service starts without errors in logs
- [ ] Navigating between `/`, `/lesson/1`, and `/playground` works without page reloads
- [ ] Browser back button returns to previous page

---

## Dependency Graph

```
Slice 7 (Navigation) ─────────────────────────────────┐
                                                      │
Slice 1 (SQLite Init) ──► Slice 2 (List API) ──► Slice 3 (Progress) ──► Slice 4 (Single Lesson) ──► Slice 5 (Dashboard) ──► Slice 6 (Lesson View)
```

- **Slice 7** is independent — can start immediately (no backend dependency)
- **Slice 1** is the foundation — everything else depends on it
- **Slices 2 → 3 → 4** are sequential backend slices (each builds on the previous)
- **Slices 5 → 6** are sequential frontend slices (Dashboard first, then Lesson View)

---

## Open Questions

1. **Phased rollout — Lesson 1 first** (RC-1): Only 1 of 30 lesson JSON files exists (`backend/content/a1/lesson-01.json`). **The implementation plan is NOT blocked by this gap.** All 7 slices build the backend + frontend infrastructure using the single existing lesson file. Slice 3 (Progress Module) correctly sets Lesson 1 to `available` and all others to `locked` — with only 1 lesson, this means Lesson 1 is `available` and there are no other lessons to lock. The remaining 29 lesson JSON files (A2 + B1) are a **separate data-creation task** — not an implementation task. Once the infrastructure is complete, content authors can populate the remaining 29 JSON files and the roadmap will automatically expand to show them (no code changes needed).

2. **Dashboard vs. TTS Studio**: The current `index.vue` is a full-page TTS Studio. Should it be replaced with the Dashboard (roadmap), or should both coexist (Dashboard at `/`, TTS Studio at `/playground` per ADR-009)?

3. **Playground migration**: ADR-009 says the existing TTS Studio should move to `/playground`. Is this included in Slice 7, or a separate slice?

4. **Progress API**: The workflow references `GET /api/progress/lesson/:id` (STEP 6). Should this be a separate endpoint, or is the progress data already included in `GET /api/lessons/:id` (Slice 4)?

5. **Slice granularity**: Should Slices 2 and 3 be combined into one ("Lessons API: list + progress") since they're called by the same endpoint?

---

## Test Cases (from workflow, mapped to slices)

| Test | Slice | Description |
|------|-------|-------------|
| TC-01: Dashboard loads with lessons | 5 | Dashboard shows 30 lesson cards, grouped by 3 levels, with correct status icons |
| TC-04: Sequential unlocking — first lesson | 3 | Lesson 1 shows `available`, all others `locked` |
| TC-05: Sequential unlocking — middle lesson | 3 | Lessons 1–3 show ✓, Lesson 4 shows →, Lessons 5–30 show 🔒 |
| TC-06: Sequential unlocking — level boundary | 3 | A1 shows all ✓, A2 Lesson 4 shows →, A2 Lessons 5–10 show 🔒, B1 all 🔒 |
| TC-07: Click locked lesson | 5, 6 | Toast: "This lesson is locked" → Stay on Dashboard |
| TC-08: Click available lesson | 5, 6, 7 | Navigate to `/lesson/:id` → Lesson View loads |
| TC-09: Click completed lesson | 5, 6 | Navigate to `/lesson/:id` → Lesson View loads in "review mode" |
| TC-10: Direct navigation to /lesson/:id | 6, 7 | Lesson 5 loads (if accessible) or shows "locked" message |
| TC-14: Locked lesson access via API | 4 | `GET /api/lessons/15` where locked → 403 |
| TC-15: Completed lesson access | 4 | `GET /api/lessons/1` where completed → 200 with "review mode" |
