# Implementation Plan: Lesson Content Serving

**Source**: `docs/workflows/WORKFLOW-lesson-content-serving.md` (v0.1)
**Date**: 2026-07-10
**Status**: Draft — Awaiting review

---

## Reality Check (Current State vs. Spec)

| # | Finding | Severity |
|---|---------|----------|
| RC-1 | Only 1 of 30 lesson JSON files exists (`backend/content/a1/lesson-01.json`). `a2/` and `b1/` are empty. | Critical |
| RC-2 | No SQLite code exists in `app.py` — no database initialization. | Critical |
| RC-3 | No `/api/lessons` or `/api/lessons/:id` endpoints exist. | Critical |
| RC-4 | No schema validation code exists. | Medium |

---

## Proposed Slices

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
**User stories**: #3 (variable sections)

**What to build**: One-time database initialization that populates the SQLite `lessons` table from JSON files:

1. On first backend startup, create SQLite database file with `lessons` table
2. Insert or update all lessons from JSON files into the `lessons` table
3. Store `competencies` and `sections` as JSON strings (not separate tables — simple, sufficient for MVP)
4. Idempotent: subsequent runs only update changed lessons (compare by `id`)

**Acceptance criteria**:
- [ ] SQLite database file is created on first backend startup
- [ ] `lessons` table is populated from JSON files (currently 1 lesson)
- [ ] Subsequent backend restarts update changed lessons (idempotent)
- [ ] Schema: `id INTEGER PRIMARY KEY, level TEXT, sequence INTEGER, title TEXT, competencies TEXT, sections TEXT`

**Integration verification**:
- [ ] Backend starts without errors
- [ ] SQLite database file exists with lesson data after startup

---

### Slice 3: Backend — `GET /api/lessons` Endpoint (Lesson List)

**Type**: AFK
**Blocked by**: Slice 1 (JSON scanner), Slice 2 (SQLite `lessons` table)
**User stories**: #1 (roadmap), #3 (variable sections)

**What to build**: A `GET /api/lessons` endpoint that returns all lessons from the `lessons` SQLite table:

- Returns lesson summaries: `{ id, level, sequence, title, competency_count, section_count }`
- Sorted by level (A1, A2, B1) then sequence (1, 2, 3...)
- Progress status is resolved by the Progress module (see Lesson Browsing workflow)
- Returns `[]` when no lessons exist (not an error)

**Acceptance criteria**:
- [ ] `GET /api/lessons` returns an array of lesson summaries sorted by level then sequence
- [ ] Each summary includes: `id`, `level`, `sequence`, `title`, `competency_count`, `section_count`
- [ ] Returns `[]` when no lessons exist (not an error)
- [ ] Returns 500 when SQLite query fails

**Integration verification**:
- [ ] The real backend service starts without errors in logs
- [ ] `GET /api/lessons` returns valid JSON with lesson data

---

### Slice 4: Backend — `GET /api/lessons/:id` Endpoint (Single Lesson)

**Type**: AFK
**Blocked by**: Slice 1 (JSON scanner), Slice 2 (SQLite `lessons` table), Slice 3 (list endpoint)
**User stories**: #3 (variable sections), #4 (mandatory practice activities), #5 (competency checklist)

**What to build**: A `GET /api/lessons/:id` endpoint that returns full lesson data:

- Full lesson JSON: `id`, `level`, `sequence`, `title`, `competencies`, `sections`, `activities`
- Sections include: dialogue, vocabulary, grammar, expressions (variable per lesson)
- Activities include: `listen-translate`, `translate-to-english`, `translate-to-arabic`, `introduce-characters`, `role-play`
- Progress data: `{ status, activities: { activityId: { score, attempts, status } } }`
- Sequential lockout check (see Lesson Browsing workflow)

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

### Slice 5: Backend — Schema Validation for Lesson JSON

**Type**: AFK
**Blocked by**: Slice 1 (JSON scanner)
**User stories**: #3 (variable sections)

**What to build**: JSON Schema validation for lesson files (per ADR-006, Option B: JSON Schema Files):

- Schema files in `backend/content/schemas/` (one per activity type + common schema)
- Validates lesson JSON against schema at serve time (not at write time)
- Required fields: `id`, `level`, `sequence`, `title`, `competencies`, `sections`, `activities`
- Each activity validated against its type-specific schema (see ADR-006)
- Invalid lessons are skipped with a log warning (partial failure — same behavior as malformed JSON)

**Acceptance criteria**:
- [ ] JSON Schema files exist in `backend/content/schemas/` (common + 5 activity types)
- [ ] Lesson JSON is validated against schema when served via API
- [ ] Invalid lessons are skipped with a log warning (partial failure)
- [ ] `jsonschema` library added to `requirements.txt`
- [ ] Currently passes validation for lesson-01.json (existing lesson is valid)

**Integration verification**:
- [ ] Backend starts without errors (new dependency installed)
- [ ] `GET /api/lessons` returns lessons that pass schema validation

---

### Slice 6: Frontend — Section Renderer (`SectionRenderer.vue`)

**Type**: HITL (design review needed for 4 section UI patterns)
**Blocked by**: Slice 4 (single lesson API)
**User stories**: #3 (variable sections)

**What to build**: A `SectionRenderer.vue` component that renders 4 variable section types within a lesson:

- **`dialogue`**: Arabic text with TTS playback (click to hear), speaker labels
- **`vocabulary`**: Arabic word + English translation, TTS playback
- **`pronouns`**: Pronoun table (subject/object, gender), TTS playback
- **`expressions`**: Common expressions with translations, TTS playback
- **`grammar`**: Grammar rules with examples, TTS playback (note: lesson-01.json has 5 sections including `grammar`)

Each section is rendered based on its `type` field from the lesson JSON. Sections are displayed sequentially within the lesson view, between the lesson header and the practice activities.

**Acceptance criteria**:
- [ ] `SectionRenderer.vue` renders all 4+ section types (dialogue, vocabulary, pronouns, expressions, grammar)
- [ ] Arabic text supports TTS playback (click to hear — uses existing TTS endpoint)
- [ ] RTL rendering for Arabic content
- [ ] Sections are displayed sequentially within the lesson view
- [ ] Graceful fallback for unknown section types (skip section, show error)

**Integration verification**:
- [ ] The real service starts without errors in logs
- [ ] Loading lesson-01.json renders all 5 sections correctly

---

## Dependency Graph

```
Slice 1 (JSON Scanner) ──► Slice 2 (SQLite Init) ──► Slice 3 (List API) ──► Slice 4 (Single Lesson) ──► Slice 6 (Section Renderer)
       │                                                                                              │
       └──────────────────────────────────────────────────────────────────────────────────────────────┘
                                    (Slice 5 can run in parallel with Slices 1-4)
```

- **Slice 1** is the foundation — can start immediately
- **Slices 2 → 3 → 4** are sequential backend (scanner → SQLite → list → single lesson)
- **Slice 5** (schema validation) can run in parallel with Slices 1–4 (it extends the scanner)
- **Slice 6** is the only frontend slice — depends on Slice 4 (single lesson API)

---

## Open Questions

1. **Data gap** (RC-1): Only 1 of 30 lesson JSON files exists. Should creating the remaining 29 files be a separate issue, or is it a data gap outside implementation scope?

2. **Schema validation scope** (RC-4): Should schema validation be strict (reject invalid lessons with 400) or lenient (skip invalid lessons, return valid ones — partial failure)? The workflow specifies partial failure, but strict validation is safer for content quality.

3. **Section data in lesson-01.json**: The existing lesson has 5 sections (dialogue, vocabulary, pronouns, expressions, grammar). The workflow mentions 4 types (dialogue, vocabulary, grammar, expressions). Should `pronouns` be treated as a sub-type of `vocabulary`, or a distinct section type?

4. **SQLite storage**: Should `competencies` and `sections` be stored as JSON strings (simpler) or as separate tables (more queryable)? The plan chooses JSON strings for the MVP.

5. **Content sync**: What happens if a JSON file is added or removed after SQLite is initialized? The plan uses idempotent upsert by `id` — new files are picked up on next restart, deleted files are not removed from SQLite. Is this acceptable?

---

## Test Cases (from workflow, mapped to slices)

| Test | Slice | Description |
|------|-------|-------------|
| TC-01: No content files | 1 | Returns `[]` (empty array) — not an error |
| TC-02: One valid lesson | 1, 3, 4 | Returns 1 lesson summary (lesson-01.json) |
| TC-03: Malformed JSON | 1 | Skips that file, returns all valid lessons (partial failure) |
| TC-04: Missing required fields | 5 | Skips that file, returns all valid lessons (partial failure) |
| TC-05: All 30 lessons | 1, 3, 4 | Returns 30 lesson summaries (data gap — only 1 exists currently) |
| TC-06: Single lesson by ID | 4 | Returns full lesson 1 (sections + activities) |
| TC-07: Single lesson not found | 4 | Returns 404 |
| TC-08: Locked lesson access | 4 | Returns 403 with "This lesson is locked" message |
