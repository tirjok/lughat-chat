# Implementation Plan: Lesson Content Serving

**Source**: `docs/workflows/WORKFLOW-lesson-content-serving.md` (v0.1)
**Date**: 2026-07-10 (updated 2026-07-11)
**Status**: Draft — Awaiting review

---

## Pre-Flight: Skill & Document Discovery

**Before implementing ANY slice, the agent MUST:**

### Skills Required
| Skill | Purpose | Install If Missing | Why |
|-------|---------|-------------------|-----|
| `solid` | SOLID principles, architecture patterns, code review | `pi skills install solid` | Slices 1–6 (backend: JSON scanner, SQLite, schema validation) |
| `vue` + `vue-best-practices` | Vue 3 Composition API, `<script setup>`, reactivity | `pi skills install vue` | Slices 7–9 (frontend: composables, pages, components) |
| `vueuse-functions` | VueUse composables (useRoute, useRouter) | `pi skills install vueuse-functions` | Slice 7 (useLessons composable), Slice 9 (lesson detail) |
| `vue-testing-best-practices` | Test naming, AAA pattern, lean testing | `pi skills install vue-testing-best-practices` | All frontend tests (Slices 7, 8, 9) |
| `testing-best-practices` | 50+ JavaScript/Node.js testing best practices | `pi skills install testing-best-practices` | All test files |
| `librarian` | Search library internals with source code + GitHub permalinks | `pi skills install librarian` | Slice 1 (Python file scanning patterns), Slice 6 (jsonschema API internals) |
| `find-skills` | Discover and install skills when needed | (pre-installed) | Audit environment before starting |
| `review` | Review changes since a fixed point | `pi skills install review` | After each slice, review the diff |
| `ui-designer` | Component specs, design tokens, pixel-perfect implementation | `pi skills install ui-designer` | Slice 9 (SectionRenderer UI spec) |
| `unocss` | UnoCSS utility rules, shortcuts, presets | `pi skills install unocss` | Section rendering, RTL support, dark mode |

### Document Search Required
| Document | What to Find | Source |
|----------|-------------|--------|
| `docs/workflows/REGISTRY.md` | Missing workflow specs (audio playback, toast lifecycle) | Cross-reference before starting |
| `docs/workflows/WORKFLOW-INTERCONNECTED-MAP.md` | Cross-workflow dependencies (Lesson Browsing, Activity Submission) | Slices 2–9 |
| `docs/workflows/WORKFLOW-lesson-browsing-and-access.md` | SQLite tables (lessons, user_progress), sequential unlocking | Slice 2–4 |
| `docs/workflows/WORKFLOW-activity-submission-and-scoring.md` | 5 activity types (listen-translate, translate-to-english, etc.) | Slice 5 (single lesson), Slice 9 (SectionRenderer) |
| `docs/workflows/WORKFLOW-playground-access.md` | Playground route (moved from `/`) | Slice 7 (routing) |
| `docs/workflows/WORKFLOW-model-loading-readiness.md` | Health polling, model loading states | Integration with existing health check |
| `docs/architecture/ADR-005` | Content Editor and Version Control (keep JSON files) | Slice 1 (JSON scanning), Slice 6 (schema validation) |
| `docs/architecture/ADR-006` | Activity type taxonomy (JSON Schema) | Slice 6 (schema validation) |
| `docs/architecture/ADR-009` | Frontend SPA architecture (Option C: Hybrid) | Slices 7, 8, 9 |
| `docs/PRD.md` | User stories #3 (variable sections), #18 (content creator) | All backend slices |
| `backend/content/a1/lesson-01.json` | Existing lesson data (5 sections, 5 activities) | All slices use this as test subject |

### Agent Instruction
> "Run `find-skills` to audit the environment. Install any missing skills from the table above. Read `docs/architecture/ADR-005`, `ADR-006`, and `ADR-009` for domain knowledge. Read `backend/content/a1/lesson-01.json` to understand the existing lesson structure. Read `docs/workflows/WORKFLOW-lesson-browsing-and-access.md` — its Slice 1 (SQLite initialization) is a prerequisite for this workflow's Slices 1–9. Then begin Slice 1."

---

## Reality Check (Current State vs. Spec)

| # | Finding | Severity |
|---|---------|----------|
| RC-012 | Only 1 of 30 lesson JSON files exists (`backend/content/a1/lesson-01.json`). `a2/` and `b1/` directories are empty. | Critical |
| RC-011 | No SQLite code exists in `app.py` — no database initialization. | Critical |
| RC-013 | No `/api/lessons` or `/api/lessons/:id` endpoints exist. | Critical |
| RC-033 | No schema validation code exists. | Medium |
| RC-032 | No `user_progress` table exists — progress status cannot be resolved for lesson summaries or locked-lesson checks. | Critical |
| RC-006 | No frontend lesson pages or composables exist — no `useLessons.ts`, no lesson list page, no lesson detail page. | Critical |

---

## Proposed Slices (9 total)

### Slice 1: Backend — JSON Content Scanner

**Type**: AFK
**Blocked by**: None
**User stories**: #3 (variable sections)

**What to build**: A Content module that scans `backend/content/` directory recursively for `.json` files, parses them, and returns lesson data.

Scanning logic:
- Recursively find all `backend/content/{level}/lesson-{NN}.json` files
- Parse each JSON file, extract: `id`, `level`, `sequence`, `title`, `competencies`, `sections`, `activities`
- Sort by level (A1, A2, B1) then sequence (1, 2, 3...)
- Skip malformed files (log error, continue with valid ones — partial failure)

**Acceptance criteria**:
- [ ] Content module scans `backend/content/` recursively for `.json` files
- [ ] Returns parsed lesson data sorted by level then sequence
- [ ] Skips malformed JSON files (logs error, returns valid lessons — partial failure)
- [ ] Returns `[]` when content directory is missing or empty (not an error)
- [ ] Currently returns 1 lesson (lesson-01.json) with 5 sections and 5 activities

**Integration verification**:
- [ ] Backend starts without errors

---

### Slice 2: Backend — SQLite `lessons` Table Initialization

**Type**: AFK
**Blocked by**: Slice 1 (JSON scanner)
**User stories**: #1 (roadmap), #3 (variable sections)

**What to build**: One-time database initialization that populates the SQLite `lessons` table from JSON files:

1. On first backend startup, create SQLite database file with `lessons` table
2. Insert or update all lessons from JSON files into the `lessons` table
3. Store `competencies` and `sections` as JSON strings (not separate tables — simple, sufficient for MVP)
4. Idempotent: subsequent runs only update changed lessons (compare by `id`)
5. **Sync strategy**: on each startup, delete SQLite entries whose `id` no longer has a corresponding JSON file (prevents stale data from deleted JSON files)

**Acceptance criteria**:
- [ ] SQLite database file is created on first backend startup
- [ ] `lessons` table is populated from JSON files (currently 1 lesson)
- [ ] Subsequent backend restarts update changed lessons (idempotent)
- [ ] Deleted JSON files result in corresponding SQLite entries being removed (sync strategy)
- [ ] Schema: `id INTEGER PRIMARY KEY, level TEXT, sequence INTEGER, title TEXT, competencies TEXT, sections TEXT`

**Integration verification**:
- [ ] Backend starts without errors
- [ ] SQLite database file exists with lesson data after startup

---

### Slice 3: Backend — `user_progress` Table

**Type**: AFK
**Blocked by**: Slice 2 (SQLite `lessons` table)
**User stories**: #1 (roadmap), #2 (sequential lessons), #7 (score tracking)

**What to build**: A `user_progress` table that tracks learner progress per lesson and per activity:

Table schema:
```sql
CREATE TABLE user_progress (
    lesson_id INTEGER,
    activity_id INTEGER,
    score REAL DEFAULT 0,
    status TEXT DEFAULT 'locked',  -- 'locked' | 'available' | 'in_progress' | 'completed'
    attempts INTEGER DEFAULT 0,
    PRIMARY KEY (lesson_id, activity_id)
);
```

- On first run, populate all (lesson_id, activity_id) combinations from JSON files with `status = 'locked'`
- The status resolution logic: a lesson is `'available'` if the previous lesson (same level, sequence - 1) has all activities `'completed'`; otherwise `'locked'`
- The first lesson in each level is `'available'`

**Acceptance criteria**:
- [ ] `user_progress` table is created on first backend startup
- [ ] All (lesson_id, activity_id) combinations are populated with `status = 'locked'` (except first lesson per level = `'available'`)
- [ ] Status resolution logic correctly marks lessons as `'available'` or `'locked'` based on previous lesson completion
- [ ] Subsequent restarts preserve existing progress data

**Integration verification**:
- [ ] Backend starts without errors
- [ ] `user_progress` table exists with correct initial data after startup

---

### Slice 4: Backend — `GET /api/lessons` Endpoint (Lesson List)

**Type**: AFK
**Blocked by**: Slices 1 (JSON scanner), 2 (SQLite `lessons` table), 3 (user_progress table)
**User stories**: #1 (roadmap), #3 (variable sections), #17 (progress in roadmap)

**What to build**: A `GET /api/lessons` endpoint that returns all lessons from the `lessons` SQLite table with status resolved from the `user_progress` table:

- Returns lesson summaries: `{ id, level, sequence, title, competency_count, section_count, status }`
- `status` resolved from `user_progress`: `'available'` or `'locked'`
- Sorted by level (A1, A2, B1) then sequence (1, 2, 3...)
- Returns `[]` when no lessons exist (not an error)

**Acceptance criteria**:
- [ ] `GET /api/lessons` returns an array of lesson summaries sorted by level then sequence
- [ ] Each summary includes: `id`, `level`, `sequence`, `title`, `competency_count`, `section_count`, `status`
- [ ] `status` correctly reflects `'available'` (first lesson per level) or `'locked'` (subsequent lessons)
- [ ] Returns `[]` when no lessons exist (not an error)
- [ ] Returns 500 when SQLite query fails

**Integration verification**:
- [ ] The real backend service starts without errors in logs
- [ ] `GET /api/lessons` returns valid JSON with lesson summaries including status field

---

### Slice 5: Backend — `GET /api/lessons/:id` Endpoint (Single Lesson)

**Type**: AFK
**Blocked by**: Slices 1 (JSON scanner), 2 (SQLite `lessons` table), 3 (user_progress table), 4 (list endpoint)
**User stories**: #3 (variable sections), #4 (mandatory practice activities), #5 (competency checklist), #7 (score tracking)

**What to build**: A `GET /api/lessons/:id` endpoint that returns full lesson data:

- Full lesson JSON: `id`, `level`, `sequence`, `title`, `competencies`, `sections`, `activities`
- Sections include: dialogue, vocabulary, grammar, expressions, pronouns (variable per lesson)
- Activities include: `listen-translate`, `translate-to-english`, `translate-to-arabic`, `introduce-characters`, `role-play`
- Progress data from `user_progress`: `{ status, activities: { activityId: { score, attempts, status } } }`
- Sequential lockout: returns 403 if lesson status is `'locked'` (with "This lesson is locked" message)

**Acceptance criteria**:
- [ ] `GET /api/lessons/:id` returns full lesson data (sections + activities + progress)
- [ ] Returns 404 for non-existent lesson IDs
- [ ] Returns 403 for locked lessons (with "This lesson is locked" message)
- [ ] Returns 500 when SQLite query fails
- [ ] Currently returns lesson-01.json with 5 sections and 5 activities

**Integration verification**:
- [ ] The real backend service starts without errors in logs
- [ ] `GET /api/lessons/1` returns full lesson data with 5 sections and 5 activities
- [ ] `GET /api/lessons/999` returns 404

---

### Slice 6: Backend — Schema Validation Integration

**Type**: AFK
**Blocked by**: Slice 1 (JSON scanner)
**User stories**: #3 (variable sections), #18 (content creator validation)

**What to build**: JSON Schema validation for lesson files (per ADR-006, Option B: JSON Schema Files), integrated into the scanner pipeline:

- Schema files in `backend/content/schemas/` (one per activity type + common schema)
- Schema loader initializes at startup (loads all `.schema.json` files)
- Validator runs on each parsed lesson during scanning (integrated into scanner output pipeline)
- Required fields: `id`, `level`, `sequence`, `title`, `competencies`, `sections`, `activities`
- Each activity validated against its type-specific schema (see ADR-006)
- Invalid lessons are skipped with a log warning (partial failure — same behavior as malformed JSON)

Schema files (per ADR-006):
- `common.schema.json` — shared properties (id, type, title, order, max_attempts)
- `listen-translate.schema.json`
- `translate-to-english.schema.json`
- `translate-to-arabic.schema.json`
- `introduce-characters.schema.json`
- `role-play.schema.json`

**Acceptance criteria**:
- [ ] JSON Schema files exist in `backend/content/schemas/` (common + 5 activity types)
- [ ] Schema loader initializes at startup and loads all schema files
- [ ] Validator integrated into scanner pipeline — each lesson validated before being returned
- [ ] Invalid lessons are skipped with a log warning (partial failure)
- [ ] `jsonschema` library added to `requirements.txt`
- [ ] Currently passes validation for lesson-01.json (existing lesson is valid)

**Integration verification**:
- [ ] Backend starts without errors (new dependency installed)
- [ ] `GET /api/lessons` returns lessons that pass schema validation

---

### Slice 7: Frontend — `useLessons` Composable

**Type**: AFK
**Blocked by**: Slice 5 (single lesson API must exist)
**User stories**: #1 (roadmap), #3 (variable sections), #17 (progress in roadmap)

**What to build**: A `useLessons.ts` composable (following the pattern of existing `useTtsApi.ts`, `useVoices.ts`) that wraps API calls for lesson content:

Functions:
- `fetchLessons()`: Calls `GET /api/lessons`, returns `{ lessons, loading, error }`
- `fetchLesson(id)`: Calls `GET /api/lessons/:id`, returns `{ lesson, loading, error }`
- Handles loading states, error states, and retry logic
- Uses existing `API_BASE_URL` from environment

**Acceptance criteria**:
- [ ] `useLessons.ts` composable created in `frontend/app/composables/`
- [ ] `fetchLessons()` calls `GET /api/lessons` and returns lesson summaries with status
- [ ] `fetchLesson(id)` calls `GET /api/lessons/:id` and returns full lesson data
- [ ] Handles loading, error, and success states (following existing composable patterns)
- [ ] Returns 1 lesson summary from existing `lesson-01.json`

**Integration verification**:
- [ ] Backend service starts without errors
- [ ] `fetchLessons()` returns valid lesson data from running backend

---

### Slice 8: Frontend — Lesson List Page (Roadmap View)

**Type**: HITL (design review needed for roadmap UI)
**Blocked by**: Slice 7 (useLessons composable)
**User stories**: #1 (roadmap), #17 (progress in roadmap)

**What to build**: A lesson list page (`app/pages/lessons/index.vue`) that displays the learning roadmap:

- Shows all lessons grouped by level (A1, A2, B1)
- Each lesson card shows: title, level, sequence number, status indicator (available ✓ / locked 🔒)
- Clickable lesson cards navigate to lesson detail page
- Follows existing Nuxt page structure and UnoCSS styling conventions
- RTL support for Arabic lesson titles

**Acceptance criteria**:
- [ ] `app/pages/lessons/index.vue` page created
- [ ] Displays lessons grouped by level (A1, A2, B1) with status indicators
- [ ] Clickable cards navigate to lesson detail page (`/lessons/:id`)
- [ ] First lesson per level shows as `'available'`, subsequent as `'locked'`
- [ ] Follows existing design system (UnoCSS, dark mode, RTL)

**Integration verification**:
- [ ] The real service starts without errors in logs
- [ ] Navigating to `/lessons` shows lesson list with 1 lesson (lesson-01.json)

---

### Slice 9: Frontend — Lesson Detail Page + SectionRenderer

**Type**: HITL (design review needed for 5 section UI patterns)
**Blocked by**: Slices 5 (single lesson API), 6 (schema validation), 7 (useLessons composable)
**User stories**: #3 (variable sections), #4 (mandatory practice activities), #5 (competency checklist), #9 (TTS on Arabic text)

**What to build**: A lesson detail page (`app/pages/lessons/[id].vue`) with `SectionRenderer.vue` component:

**SectionRenderer.vue** renders 5 variable section types within a lesson:
- **`dialogue`**: Arabic text with TTS playback (click to hear), speaker labels, scene grouping
- **`vocabulary`**: Arabic word + English translation, TTS playback, plural forms
- **`pronouns`**: Pronoun table (subject/object, gender, dual/plural), TTS playback
- **`expressions`**: Common expressions with translations, TTS playback
- **`grammar`**: Grammar rules with examples, TTS playback

Each section is rendered based on its `type` field from the lesson JSON. Sections are displayed sequentially within the lesson view, between the lesson header and the practice activities.

**Lesson detail page** wraps `SectionRenderer` with:
- Lesson header (title, level, competency checklist)
- Sections rendered by `SectionRenderer`
- Practice activities section (placeholder for Activity Submission workflow)

**Acceptance criteria**:
- [ ] `SectionRenderer.vue` component created in `frontend/app/components/`
- [ ] Renders all 5 section types (dialogue, vocabulary, pronouns, expressions, grammar)
- [ ] Arabic text supports TTS playback (click to hear — uses existing TTS endpoint)
- [ ] RTL rendering for Arabic content
- [ ] Sections displayed sequentially within the lesson view
- [ ] `app/pages/lessons/[id].vue` page created and navigable
- [ ] Graceful fallback for unknown section types (skip section, show error)

**Integration verification**:
- [ ] The real service starts without errors in logs
- [ ] Loading lesson-01.json renders all 5 sections correctly

---

## Dependency Graph

```
Slice 1 (JSON Scanner)
    ├─► Slice 2 (SQLite lessons) ──► Slice 3 (user_progress) ──► Slice 4 (List API) ──► Slice 7 (useLessons) ──► Slice 8 (List Page)
    │       │                                                                    │
    │       └────────────────────────────────────────────────────────────────────┘
    │                                                                                │
    └─► Slice 5 (Single Lesson API) ────────────────────────────────────────────────┤
        │                                                                        │
        └─► Slice 6 (Schema Validation) ──────────────────────────────────────────┤
                                                                                │
    Slice 7 ────────────────────────────────────────────────────────────────────┤
                                                                                ▼
                                                                        Slice 9 (Detail Page + SectionRenderer)
```

- **Slice 1** is the foundation — can start immediately
- **Slices 2 → 3 → 4** are sequential backend (scanner → SQLite lessons → user_progress → list API)
- **Slice 5** (single lesson API) depends on Slices 1–4 (needs scanner, both tables, list API pattern)
- **Slice 6** (schema validation) can start after Slice 1 (independent of database work)
- **Slice 7** (useLessons composable) depends on Slice 5 (API must exist before frontend consumes it)
- **Slice 8** (list page) depends on Slice 7 (composable must exist before page)
- **Slice 9** (detail page + SectionRenderer) depends on Slices 5, 6, 7 (API, validation, composable)

---

## Open Questions

1. **Phased rollout — Lesson 1 first** (RC-012): Only 1 of 30 lesson JSON files exists (`backend/content/a1/lesson-01.json`). **The implementation plan is NOT blocked by this gap.** Slices 1–5 build the backend infrastructure (JSON scanner → SQLite → list API → single lesson API → schema validation) using the single existing lesson file as the test subject. All acceptance criteria are written to pass with exactly 1 lesson. The remaining 29 lesson JSON files (A2 + B1) are a **separate data-creation task** — not an implementation task. Once the backend is complete, content authors can populate the remaining 29 JSON files and the system will automatically pick them up on next restart (no code changes needed).

2. **Schema validation scope** (RC-033): Should schema validation be strict (reject invalid lessons with 400) or lenient (skip invalid lessons, return valid ones — partial failure)? The workflow specifies partial failure, but strict validation is safer for content quality.

3. **Section data in lesson-01.json**: The existing lesson has 5 sections (dialogue, vocabulary, pronouns, expressions, grammar). The workflow mentions 4 types (dialogue, vocabulary, grammar, expressions). Should `pronouns` be treated as a sub-type of `vocabulary`, or a distinct section type? (Answer: distinct — it has unique structure: pronoun table with gender/dual/plural forms.)

4. **SQLite storage**: Should `competencies` and `sections` be stored as JSON strings (simpler) or as separate tables (more queryable)? The plan chooses JSON strings for the MVP.

5. **Content sync** (RC-032 new): What happens if a JSON file is added or removed after SQLite is initialized? The plan now includes a sync strategy: on each startup, delete SQLite entries whose `id` no longer has a corresponding JSON file (prevents stale data from deleted JSON files).

6. **Progress persistence** (RC-032 new): The `user_progress` table stores learner progress. Should this be per-user (requiring authentication) or global (single learner, no auth)? For MVP, assume single learner with no authentication.

---

## Test Cases (from workflow, mapped to slices)

| Test | Slice | Description |
|------|-------|-------------|
| TC-01: No content files | 1 | Returns `[]` (empty array) — not an error |
| TC-02: One valid lesson | 1, 4, 5 | Returns 1 lesson summary (lesson-01.json) |
| TC-03: Malformed JSON | 1 | Skips that file, returns all valid lessons (partial failure) |
| TC-04: Missing required fields | 6 | Skips that file, returns all valid lessons (partial failure) |
| TC-05: All 30 lessons | 1, 4, 5 | Returns 30 lesson summaries (data gap — only 1 exists currently) |
| TC-06: Single lesson by ID | 5 | Returns full lesson 1 (sections + activities) |
| TC-07: Single lesson not found | 5 | Returns 404 |
| TC-08: Locked lesson access | 5 | Returns 403 with "This lesson is locked" message |
| TC-09: First lesson available | 3, 4 | First lesson per level has `status = 'available'` |
| TC-10: Subsequent lessons locked | 3, 4 | Lessons after first have `status = 'locked'` |
| TC-11: Deleted JSON → deleted SQLite | 2 | Removing a JSON file results in corresponding SQLite entry removed on restart |
| TC-12: Schema validation passes existing lesson | 6 | lesson-01.json passes all schema validations |
