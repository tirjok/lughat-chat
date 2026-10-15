# IMPL-011: PDF-to-Lesson CLI + Build-time JSON Data Loader

**Status:** Draft
**Date:** 2026-10-14
**Related ADRs:** ADR-007 (Lesson Data Model Alignment), ADR-008 (Lesson Page Section Components)
**Seam:** `scripts/pdf-to-lesson.py` (new), `frontend/app/data/data-loader.ts` (new), `frontend/app/data/curriculum.ts` (modified — data removed, types preserved)

---

## Problem Statement

LughatChat has two coexisting lesson data sources that serve different purposes but neither is the source of truth:

1. **`frontend/app/data/curriculum.ts`** (1264 lines) — The only thing the app imports. Contains all 8 lessons hardcoded as TypeScript data + types. It is the runtime source of truth but is a monolithic file that is painful to edit and has no structured authoring workflow.

2. **`frontend/app/data/lesson-01.json`** (327 lines) — A rich, nested, activity-aware JSON structure that matches the UI's data model. It is **dead data** — written but never imported or consumed by any component. The ADR-007 states it is "authoritative" but it is not used.

3. **PDF source materials** in `resources/lesson-XX/` — Real study materials (student PDF + Instructor Call PDF) that contain the actual lesson content. These are the real source of truth but are not connected to the application.

**The problem:** Content authors must hand-craft `lesson-XX.json` files from PDF study materials, then manually merge them into `curriculum.ts`. There is no tooling to convert PDFs to the application's lesson format. The JSON file exists as a dead artifact. The `curriculum.ts` is a 1264-line monolith that is hard to navigate and edit.

---

## Solution

Introduce a two-part system:

1. **CLI tool** (`scripts/pdf-to-lesson.py`) — Converts PDF study materials into structured JSON files (`frontend/app/data/lesson-XX.json`). The JSON files become the source of truth for lesson content.

2. **Build-time data loader** (`frontend/app/data/data-loader.ts`) — Replaces the embedded data in `curriculum.ts` with a build-time module that reads all `lesson-*.json` files and exports the same API surface (`loadLevels()`, `getLevelByCode()`, `getLessonById()`, etc.).

`curriculum.ts` becomes a ~50-line types-only file that re-exports from `data-loader.ts`.

---

## User Stories

1. As a content author, I want to run a CLI command on my PDF study materials so that I can generate structured JSON lesson files without manually typing the JSON.

2. As a content author, I want the CLI to extract learning goals from the "Final learning goals checklist" page of the Instructor Call PDF so that lesson competencies are populated automatically.

3. As a content author, I want the CLI to apply basic text cleanup (remove page headers, normalize spacing, strip OCR noise) so that the extracted Arabic text is readable and accurate.

4. As a content author, I want to specify which pages of the student PDF map to which section types (dialogue, vocabulary, pronouns, expressions, grammar) so that the CLI extracts the correct content for each section.

5. As a content author, I want the CLI to support page ranges (e.g., `dialogue:1-2`) so that sections spanning multiple pages are captured correctly.

6. As a content author, I want the CLI to derive the lesson ID from the directory name (e.g., `resources/lesson-01/` → `a1-01`) so that I don't have to specify it manually.

7. As a content author, I want the CLI to preserve existing activities when regenerating a lesson's JSON so that my hand-crafted exercises are not lost.

8. As a content author, I want a single CLI command to process all lessons in the `resources/` directory so that I can regenerate all lessons at once.

9. As a frontend developer, I want the application to load lesson data from JSON files at build time so that the source of truth is structured, editable JSON rather than a 1264-line TypeScript monolith.

10. As a frontend developer, I want the JSON data loader to export the same API surface as the current `curriculum.ts` (same function names, same parameter types, same return types) so that existing consumer code requires minimal changes.

11. As a frontend developer, I want `curriculum.ts` to contain only type definitions (no embedded data) so that the file is small, navigable, and focused on the data contract.

12. As a frontend developer, I want the build-time data loader to glob all `lesson-*.json` files in the data directory so that new lessons are automatically discovered without manual configuration.

13. As a frontend developer, I want the Nuxt dev server to hot-reload when JSON files change during development so that I can iterate on lesson content without restarting the dev server.

14. As a content author, I want the CLI to output JSON that matches the existing `lesson-01.json` structure exactly so that the frontend data loader can consume it without schema changes.

15. As a content author, I want the CLI to support custom section types so that future lessons can introduce new section types (e.g., "culture", "reading") without modifying the CLI.

16. As a frontend developer, I want the frontend to support custom section types in the UI so that new section types render gracefully (e.g., "Content coming soon" placeholder) without breaking the application.

17. As a QA engineer, I want existing tests to continue passing after the `curriculum.ts` → JSON migration so that no regression is introduced by the data loading change.

18. As a content author, I want the CLI to handle both single-lesson and batch processing so that I can regenerate one lesson during development or all lessons during content rollout.

---

## Implementation Decisions

### 1. CLI Tool: `scripts/pdf-to-lesson.py`

**Language:** Python (using `pypdf` for PDF text extraction — lightweight, ~50KB).

**Interface:**
```
python scripts/pdf-to-lesson.py <source-dir> \
  --level <CODE> \
  --sequence <NUMBER> \
  --sections <TYPE:PAGE[...]> \
  --competency-pages <PAGE[...]> \
  --instructor-pages <PAGE[...]> \
  --output <OUTPUT-DIR>
```

**Behavior:**
- Derives lesson ID from directory name: `resources/lesson-01/` → `a1-01`
- Reads `lesson-XX.pdf` from source directory — extracts text from pages specified by `--sections`
- Reads `Instructor Call Lesson XX.pdf` from source directory — extracts competencies from pages specified by `--competency-pages`
- Applies full text cleanup:
  - Remove page headers/footers (e.g., "الدرس الأول", page numbers)
  - Normalize spacing (remove extra spaces between Arabic characters)
  - Strip noise characters (OCR artifacts like `￼`, `ـ`)
- Outputs `frontend/app/data/lesson-XX.json` matching the existing `lesson-01.json` structure exactly
- Preserves existing `activities` array if the JSON file already exists (merge mode)
- Supports `--sections` with page ranges: `dialogue:1-2 vocabulary:3`

**Section types supported:** `dialogue`, `vocabulary`, `pronouns`, `expressions`, `grammar`, plus custom types (arbitrary string).

**Batch mode:** When source directory is `resources/` (not a specific lesson directory), processes all `lesson-XX/` subdirectories.

### 2. Frontend: `frontend/app/data/data-loader.ts`

**Purpose:** Build-time module that reads all `lesson-*.json` files and exports the same API surface as the current `curriculum.ts`.

**API surface (identical to current):**
- `loadLevels(): CurriculumLevel[]` — loads all lessons, grouped by level
- `getLevelByCode(code: string): CurriculumLevel | undefined` — lookup by level code
- `getLessonById(id: string): LessonDefinition | undefined` — lookup by lesson ID
- `getLevelForLesson(lessonId: string): CurriculumLevel | undefined` — find level containing a lesson
- `getAllLessons(): LessonDefinition[]` — flat list of all lessons
- `getTotalLessonCount(): number` — total lesson count
- `getActivitiesByLesson(lessonId: string): ActivityDefinition[]` — activities for a lesson

**Discovery:** Globs all `lesson-*.json` files in the data directory. No manual configuration needed.

**Build-time:** JSON files are imported at build time and bundled into the application. No network calls at runtime.

**Dev environment:** Nuxt dev server watches JSON files and rebuilds `data-loader.ts` on change. Hot-reload works.

### 3. `frontend/app/data/curriculum.ts` — Types Only

**Before:** 1264 lines — types + embedded data for 8 lessons.

**After:** ~50 lines — types only + re-exports from `data-loader.ts`.

**What stays:**
- All interfaces: `CurriculumLevel`, `LessonDefinition`, `SectionDefinition`, `SectionItem`, `SectionContent`, `ActivityDefinition`, `ActivityContent`, `DialogueLine`, `VocabWord`, `DialogueScene`
- All helper functions: `getLevelByCode`, `getLessonById`, `getLevelForLesson`, `getAllLessons`, `getTotalLessonCount`, `getActivitiesByLesson`
- `SECTION_CHARS` and `buildSectionId` (internal)
- `flattenSectionContent` (flat accessor — backward compatibility)

**What goes:**
- All embedded lesson data (8 lessons, ~1100 lines of data)

### 4. Consumer Updates (6 files)

| File | Current | New |
|---|---|---|
| `dashboard/index.vue` | `import { curriculum, getTotalLessonCount } from '~/data/curriculum'` | `import { loadLevels, getTotalLessonCount } from '~/data/curriculum'` |
| `dashboard/level/[level]/index.vue` | `import { getLevelByCode, type LessonDefinition } from '~/data/curriculum'` | `import { loadLevels, type LessonDefinition } from '~/data/curriculum'` |
| `dashboard/level/[level]/[lesson].vue` | `import { getLessonById, type SectionDefinition } from '~/data/curriculum'` | `import { loadLesson, type SectionDefinition } from '~/data/curriculum'` |
| `dashboard/[lesson].vue` (404) | `import { getLessonById } from '~/data/curriculum'` | `import { loadLesson } from '~/data/curriculum'` |
| 6 lesson components | `import type { SectionDefinition } from '~/data/curriculum'` | No change (type-only import) |

**Note:** The API surface is preserved. Function names change from `getLessonById` to `loadLesson` (async) because JSON loading is async at build time. The 404 page and lesson page need minor updates.

### 5. Migration Strategy

1. Create `scripts/pdf-to-lesson.py`
2. Create `frontend/app/data/data-loader.ts` (build-time loader)
3. Run CLI to generate JSON for all 8 existing lessons (migrate from `curriculum.ts` data)
4. Replace `curriculum.ts` with types-only + re-exports from `data-loader.ts`
5. Update 6 consumer files to use new loader functions
6. Run existing tests — all should pass

### 6. JSON Schema (matches existing `lesson-01.json` exactly)

```json
{
  "id": "a1-01",
  "level": "A1",
  "sequence": 1,
  "title": "The Salutations — التحيّة الأولى",
  "arabicTitle": "التحيّة الأولى",
  "description": "...",
  "competencies": [
    "Can read fluently short paragraphs with harakat",
    "Good understanding of basic salutations",
    "Ability to use pronouns correctly",
    "Differentiates between the pronouns used when talking to the different genders",
    "Grasps the method of forming nominative sentences with pronouns + nouns"
  ],
  "sections": [
    {
      "type": "dialogue",
      "title": "Main Text — الحوار",
      "content": {
        "scenes": [
          {
            "label": "Scene 1: Muhammad ↔ Ali (Male-to-Male)",
            "lines": [
              { "speaker": "Muhammad", "arabic": "...", "english": "...", "notes": "..." }
            ]
          }
        ]
      }
    }
  ],
  "activities": [
    {
      "id": 1,
      "type": "listen-translate",
      "title": "Read the Dialogue & Translate",
      "description": "...",
      "order": 1,
      "competencyMap": { "read_fluently_with_harakat": 0.4, "understand_basic_salutations": 0.3 },
      "maxAttempts": 3,
      "content": { ... }
    }
  ]
}
```

---

## Testing Decisions

### What makes a good test

- Test **external behavior** only: function signatures, return types, data structure shape
- Test that the CLI produces valid JSON matching the schema
- Test that the data loader exports the same API surface as the current `curriculum.ts`
- Test that existing consumer tests pass after migration (no regression)

### Modules to test

1. **CLI tool** (`scripts/pdf-to-lesson.py`):
   - Unit tests: text extraction, cleanup, JSON output structure
   - Integration tests: full pipeline from PDF → JSON
   - Edge cases: missing files, invalid page numbers, empty sections

2. **Data loader** (`frontend/app/data/data-loader.ts`):
   - Unit tests: `loadLevels()`, `getLevelByCode()`, `getLessonById()` return correct data
   - Unit tests: glob discovery finds all `lesson-*.json` files
   - Unit tests: error handling for missing/malformed JSON files

3. **Consumer tests** (existing):
   - `curriculum-interfaces.test.ts` — verify API surface unchanged
   - `LessonPage.test.ts` — verify lesson page renders correctly
   - `LevelIndex.test.ts` — verify level index renders correctly
   - `Dashboard.test.ts` — verify dashboard renders correctly

### Prior art

- `frontend/tests/composables/curriculum-interfaces.test.ts` — tests current `curriculum.ts` API surface (function signatures, return types, data structure). This test file should be updated to test the new `data-loader.ts` API surface.
- `frontend/tests/components/LessonPage.test.ts` — tests lesson page rendering. Should continue to pass after migration.
- `frontend/tests/components/LevelIndex.test.ts` — tests level index rendering. Should continue to pass after migration.

---

## Out of Scope

- **Activity generation from PDFs** — Activities are hand-crafted. The CLI outputs `"activities": []` for new lessons and preserves existing activities for regenerated lessons.
- **Backend API endpoints** — No `GET /api/lessons` endpoints are built in this spec. The JSON structure is ready for a future backend API.
- **Real-time PDF parsing in the browser** — PDF parsing happens at build time (CLI), not at runtime.
- **UI rendering of new section types** — Custom section types render as "Content coming soon" (existing behavior). UI components for new section types are future work.
- **Migration of non-a1-01 lessons from flat to nested structure** — The CLI generates JSON from PDFs. For existing lessons without PDFs, the CLI must convert from `curriculum.ts` flat data to JSON nested structure. This is handled by the CLI's migration mode.

---

## Further Notes

### Relationship to ADR-007

ADR-007 restructured `curriculum.ts` to adopt the nested structure from `lesson-01.json` while maintaining a backward-compatible flat accessor. This spec goes one step further: it makes the JSON files the **actual** source of truth (not just "authoritative" in name) and eliminates the 1264-line monolith entirely.

The flat `items` accessor in `curriculum.ts` is preserved for backward compatibility with existing UI consumers. It projects nested JSON content into the flat `SectionItem[]` format that the lesson page template expects.

### Relationship to ADR-008

ADR-008 established section-specific rendering components (`LessonDialogue`, `LessonVocabulary`, etc.). This spec does not change those components — they continue to receive `SectionDefinition` objects from the data loader.

### Risk: JSON-to-TS sync

The JSON files and `curriculum.ts` types must stay in sync. If the JSON schema changes (new fields, new section types), the TypeScript interfaces in `curriculum.ts` must be updated. This is a manual step but is straightforward — the JSON file is the source of truth, and the TypeScript interfaces are the contract.

### Risk: Build-time vs runtime

JSON files are loaded at build time and bundled into the application. This means:
- **Pro:** No network calls, fast runtime, works offline
- **Con:** Cannot update lesson content without rebuilding the app

If runtime loading is needed in the future, `data-loader.ts` can be updated to fetch JSON files from a backend API. The API surface remains the same.

### Risk: Dev environment

During development, JSON files are watched by the Nuxt dev server. When a JSON file changes, the dev server rebuilds `data-loader.ts` and hot-reloads the application. This works because Nuxt's dev server watches all files in the `app/` directory.
