# WORKFLOW: Lesson Content Serving
**Version**: 0.1
**Date**: 2026-07-10
**Author**: Workflow Architect
**Status**: Draft
**Implements**: PRD — "As a learner, I want each lesson to have variable sections (dialogue, vocabulary, grammar) so that content adapts to the topic"

---

## Executive Summary
Backend serves lesson content from JSON files (`backend/content/{level}/lesson-{NN}.json`). Content module reads + parses all files, populates SQLite `lessons` table on first run, then serves via `GET /api/lessons` (list) and `GET /api/lessons/:id` (full detail with progress). **Critical gap:** no SQLite code exists, no `/api/lessons` endpoints exist, no schema validation exists, only 1 of 30 lesson JSON files exists (data gap). This is the **foundation** for both Lesson Browsing and Activity Submission — without it, no learning content is served.

---

## Overview
The backend serves lesson content from JSON files stored in `backend/content/{level}/lesson-{NN}.json`. Each lesson contains variable sections (dialogue, vocabulary, grammar, expressions) and mandatory practice activities. The Content module reads these files, validates the JSON structure, and serves them via API endpoints. This workflow covers the **entire lifecycle of lesson content** — from file storage to API response. It is the **foundation** for both Lesson Browsing and Activity Submission workflows.

---

## Actors
| Actor | Role in this workflow |
|---|---|
| Backend (FastAPI) | Serves lesson content via API endpoints |
| Content Module (backend) | Reads JSON files, validates structure, returns parsed data |
| SQLite (file) | Stores lesson metadata (id, level, sequence, title) — mirrors JSON for fast lookups |
| Content Creator (Operator) | Writes lesson JSON files, commits to repository |

---

## Prerequisites
- Lesson JSON files exist in `backend/content/{level}/lesson-{NN}.json`
- Directory structure: `backend/content/{level}/lesson-{NN}.json` (e.g., `backend/content/a1/lesson-01.json`)
- Each JSON file follows the lesson schema (id, level, sequence, title, competencies, sections, activities)
- SQLite database exists with `lessons` table (id, level, sequence, title, competencies, sections) — populated from JSON files on first run

---

## Trigger
**Primary**: Frontend calls `GET /api/lessons` (Dashboard) or `GET /api/lessons/:id` (Lesson View).
**Secondary**: Backend initializes — reads all JSON files and populates SQLite `lessons` table.

---

## Workflow Tree

### STEP 1: Backend Reads JSON Files (Content Module)
**Actor**: Backend (Content module)
**Action**: Scan `backend/content/` directory recursively, find all `.json` files, parse each one.
**Timeout**: 5 seconds (file I/O + JSON parsing for 30 files — should be < 500ms)
**Input**: `{ }` (scan all files)
**Output on SUCCESS**: `[{ id, level, sequence, title, competencies, sections, activities }]` (array of parsed lessons) → GO TO STEP 2
**Output on FAILURE**:
  - `FAILURE(directory_missing)`: `backend/content/` directory doesn't exist → Return `[]` (empty list) — this is not an error, just means no content is configured.
  - `FAILURE(json_parse_error)`: A JSON file is malformed → Log error, skip that file, return all other valid lessons (partial failure).
  - `FAILURE(schema_validation_error)`: A JSON file passes parsing but fails schema validation (missing required fields) → Log error, skip that file, return all other valid lessons (partial failure).

**Observable states during this step**:
  - Customer sees: (nothing — invisible backend work).
  - Operator sees: Backend reads 30 JSON files, parses them. Errors logged for any malformed files.
  - Database: No changes yet (SQLite populated in STEP 2).
  - Logs: `[backend] Loaded {N} lessons from JSON files (skipped {M} errors)`.

---

### STEP 2: Backend Populates SQLite `lessons` Table (One-Time Initialization)
**Actor**: Backend (Content module — initialization logic)
**Action**: On first run (or when JSON files change), insert or update all parsed lessons into the SQLite `lessons` table. This is a **one-time** operation — subsequent runs only update changed lessons.
**Timeout**: 5 seconds (SQLite bulk insert — should be < 1 second for 30 rows)
**Input**: `[{ id, level, sequence, title, competencies, sections }]` (from STEP 1)
**Output on SUCCESS**: `lessons` table contains all lessons → GO TO STEP 3
**Output on FAILURE**:
  - `FAILURE(sqlite_missing)`: SQLite database doesn't exist or tables aren't created → Log warning, skip (JSON serving still works, but `/api/lessons` won't include progress status).
  - `FAILURE(sqlite_schema_mismatch)`: Table schema doesn't match expected structure → Return 500.

**Observable states during this step**:
  - Customer sees: (nothing — invisible backend work).
  - Operator sees: SQLite `lessons` table populated (or not, if database is missing).
  - Database: `lessons` table written (id, level, sequence, title, competencies as JSON string, sections as JSON string).
  - Logs: `[backend] Populated {N} lessons into SQLite`.

---

### STEP 3: Backend Serves Lesson List (`GET /api/lessons`)
**Actor**: Backend (Content module — `/api/lessons` endpoint)
**Action**: Return all lessons from the `lessons` table (with status resolved by Progress module — see Lesson Browsing workflow).
**Timeout**: 5 seconds (SQLite query + JSON parsing)
**Input**: `GET /api/lessons` (no body)
**Output on SUCCESS**: `[{ id, level, sequence, title, competency_count, section_count, status }]` (array of lesson summaries with status) → GO TO STEP 4
**Output on FAILURE**:
  - `FAILURE(no_lessons)`: No lessons in JSON or SQLite → Return `[]` (empty array).
  - `FAILURE(sqlite_error)`: SQLite query fails → Return 500.

**Observable states during this step**:
  - Customer sees: (nothing — invisible backend work).
  - Operator sees: API returns lesson list.
  - Database: `lessons` table read, `user_progress` table read (for status).
  - Logs: `[nginx] GET /api/lessons 200`.

---

### STEP 4: Backend Serves Single Lesson (`GET /api/lessons/:id`)
**Actor**: Backend (Content module — `/api/lessons/:id` endpoint)
**Action**: Return full lesson data (sections + activities) for a specific lesson ID, along with the user's progress for that lesson.
**Timeout**: 5 seconds (SQLite query + JSON parsing)
**Input**: `GET /api/lessons/:id` (lesson ID from URL parameter)
**Output on SUCCESS**: `{ lesson JSON + progress data }` (full lesson with sections, activities, and user's progress) → GO TO STEP 5
**Output on FAILURE**:
  - `FAILURE(404_not_found)`: Lesson ID doesn't exist → Return 404.
  - `FAILURE(403_locked)`: Lesson is locked (see Lesson Browsing workflow) → Return 403.
  - `FAILURE(sqlite_error)`: SQLite query fails → Return 500.

**Observable states during this step**:
  - Customer sees: (nothing — invisible backend work).
  - Operator sees: API returns full lesson data.
  - Database: `lessons` table read (full data), `user_progress` table read (progress status).
  - Logs: `[nginx] GET /api/lessons/1 200`.

---

## ABORT_CLEANUP: Content Serving Failure Recovery
**Triggered by**: Any failure in STEP 1 (JSON parsing) or STEP 3/4 (SQLite query) that prevents lesson content from being served.
**Actions** (in order):
  1. If JSON parsing fails (STEP 1), skip the malformed file and return all valid lessons (partial failure).
  2. If SQLite query fails (STEP 3/4), return 500 with error detail.
  3. Frontend shows appropriate error toast.

**What customer sees**: If partial failure: some lessons missing from the list. If total failure: "Failed to load lessons" toast.

**What operator sees**: Backend logs with error detail (malformed JSON file, SQLite error).

---

## Reality Checker Findings
| # | Finding | Severity | Spec section | Resolution |
|---|---|---|---|-------------|
| RC-012 | **Only 1 of 30 lesson JSON files exists** (`backend/content/a1/lesson-01.json`). `a2/` and `b1/` directories are empty. | **Critical** | STEP 1 | The Content module will return 1 lesson, not 30. This is a data gap, not a code gap. |
| RC-011 | **No SQLite code exists in current `app.py`** — no database initialization, no `lessons` table, no `user_progress` table. | **Critical** | STEP 2 | The entire database layer must be built. |
| RC-013 | **No `/api/lessons` or `/api/lessons/:id` endpoints exist** in current `app.py`. | **Critical** | STEP 3, STEP 4 | Both endpoints must be built. |
| RC-033 | **Lesson JSON schema is defined in the PRD but not validated** — no schema validation code exists. | **Medium** | STEP 1 | Schema validation should be added (at minimum: required fields check). |

---

## Test Cases
| Test | Trigger | Expected behavior |
|---|---|---|
| TC-01: No content files | `backend/content/` is empty or missing | Return `[]` (empty array) — not an error |
| TC-02: One valid lesson | 1 JSON file exists, valid schema | Return 1 lesson summary |
| TC-03: Malformed JSON | One JSON file has syntax error | Skip that file, return all valid lessons (partial failure) |
| TC-04: Missing required fields | JSON file passes parsing but missing `competencies` | Skip that file, return all valid lessons (partial failure) |
| TC-05: All 30 lessons | 30 valid JSON files | Return 30 lesson summaries |
| TC-06: Single lesson by ID | `GET /api/lessons/1` | Return full lesson 1 (sections + activities) |
| TC-07: Single lesson not found | `GET /api/lessons/999` | Return 404 |
| TC-08: Locked lesson access | `GET /api/lessons/15` where lesson 15 is locked | Return 403 with "This lesson is locked" message |

---

## Assumptions
| # | # | Assumption | Where verified | Risk if wrong |
|---|---|---|---|
| A1 | 30 lesson JSON files will exist (10 per level × 3 levels) | PRD (data gap — only 1 exists) | Critical — roadmap shows 1 lesson, not 30 |
| A2 | SQLite will be initialized on first run with `lessons` table | PRD (schema defined, not implemented) | Critical — without SQLite, progress status cannot be resolved |
| A3 | JSON files are version-controlled (git) | PRD (operator workflow) | Low — confirmed by project structure |
| A4 | Schema validation checks: `id`, `level`, `sequence`, `title`, `competencies`, `sections`, `activities` | PRD (lesson JSON structure) | Medium — if validation is too strict, valid lessons may be rejected |

---

## Open Questions
- Should the `lessons` table store `competencies` and `sections` as JSON strings, or as separate tables?
- Should JSON files be validated at write-time (content creation) or at read-time (API serving)?
- What happens if a JSON file is added or removed after SQLite is initialized? Do we need a sync mechanism?
- Should there be a `/api/lessons/import` endpoint for bulk-importing lesson JSON files?
