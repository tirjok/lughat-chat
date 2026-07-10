# ADR-005: Content Editor and Version Control

## Status

**Accepted — Option A: Keep JSON Files** — 2026-07-10

This ADR addresses the question raised in ADR-001: *If we build a UI for creating/editing lesson JSON, does it need its own service to isolate content creation from learning?* It evaluates content editing strategies, version control integration, and the trade-off between a built-in editor vs. external JSON file management.

---

## Context

The current platform stores lesson content as **static JSON files** at `backend/content/{level}/lesson-{NN}.json`. Content is authored externally (via LLM assistance) and committed to Git. This works for the initial launch but creates friction for iterative content improvement:

| Current Workflow | Problem |
|-----------------|---------|
| Author JSON → commit to Git → deploy container | Requires Git knowledge, Docker restart, model reload |
| No preview of changes before committing | Cannot verify content renders correctly before deployment |
| No rollback UI — must use `git revert` | Mistakes in lesson content require a Git operation |
| No collaboration — single author at a time | Git merge conflicts if multiple people edit simultaneously |
| No structured editing — raw JSON in text editor | Error-prone; no validation, no autocomplete, no field hints |

The PRD states: *"Content Editor (manual JSON files via LLM assistance)"* is **out of scope for MVP**. However, this ADR evaluates what happens when the product matures and content creators need a better workflow.

### Constraints (Inherited from ADR-001)

| Constraint | Implication |
|-----------|-------------|
| **Solo developer** | Must minimize operational overhead; no separate CMS |
| **Local Docker Compose only** | No cloud CMS, no managed content APIs |
| **JSON files as source of truth** | Editor must read/write the same JSON files the backend serves |
| **Git repository** | Content changes are version-controlled; editor should integrate with this |
| **~2GB TTS model** — Resource-constrained | Editor must be lightweight; no additional heavy services |
| **No user accounts** | Content editing is not a multi-user feature in MVP |

---

## Decision

We evaluate four options for content editing.

---

### Option A: Keep JSON Files (Current) — No Editor UI

Maintain the current workflow. Content is authored externally (LLM-assisted or manual), committed to Git, and the backend serves it.

```
┌─────────────────────────────────────────────────────────────┐
│  Developer / Content Author                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Text editor / VS Code / LLM prompt                  │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  backend/content/a1/lesson-01.json          │    │   │
│  │  │  { "id": 1, "level": "A1", ... }            │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│           │ Git commit                                      │
│           ▼                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Backend (FastAPI) — serves JSON files directly       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Key characteristics:**
- **No new code** — the backend already serves JSON files
- **No new UI** — content editing happens outside the application
- **Git as version control** — every change is tracked, diffable, reversible
- **No runtime editing** — content changes require a container restart (or file watch + reload)
- **No validation** — no schema validation at edit time; errors surface at runtime

---

### Option B: Built-in Content Editor (Recommended for MVP+)

Add a **content editor page** (`/admin/lessons`) to the existing Nuxt frontend. The editor renders each lesson as a structured form (not raw JSON) and writes back to the same JSON files. No separate service, no separate database.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Nuxt SPA)                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  /admin/lessons (NEW — Content Editor)               │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │  │ Lesson    │  │ Section   │  │ Activity  │       │
│  │  │ List      │  │ Forms     │  │ Forms     │       │
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘       │
│  └────────┼──────────────┼──────────────┼──────────────┘
└───────────┼──────────────┼──────────────┼───────────────
            │              │              │
            ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend (FastAPI)                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Content Module (existing)                           │   │
│  │  GET  /api/lessons          — list + get            │   │
│  │  POST /api/lessons/:id      — create                │   │
│  │  PUT  /api/lessons/:id      — update                │   │
│  │  DELETE /api/lessons/:id    — delete                │   │
│  └─────────────────────────────────────────────────────┘   │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  JSON files on disk (backend/content/{level}/)       │   │
│  │  — lesson-01.json, lesson-02.json, ...               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Key characteristics:**
- **Same process** — editor endpoints live in the existing Content module
- **Same storage** — JSON files on disk, served by the existing Content module
- **Structured UI** — forms instead of raw JSON; field validation, autocomplete, hints
- **Validation at edit time** — JSON Schema validation before saving
- **No separate service** — one FastAPI process, one Nginx, same Docker Compose
- **Git integration** — editor writes JSON files; Git handles versioning (no Git API needed)

**Editor pages (new frontend):**

| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin/lessons` | `ContentEditor.vue` | List all lessons, create new, edit existing |
| `/admin/lessons/:id` | `LessonEditor.vue` | Edit a single lesson (sections + activities) |
| `/admin/lessons/:id/sections/:sectionIndex` | `SectionEditor.vue` | Edit a specific section |
| `/admin/lessons/:id/activities/:activityId` | `ActivityEditor.vue` | Edit a specific activity |

**Backend changes (new endpoints):**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/lessons` | POST | Create a new lesson (writes JSON file) |
| `PUT /api/lessons/:id` | PUT | Update a lesson (overwrites JSON file) |
| `DELETE /api/lessons/:id` | DELETE | Remove a lesson (deletes JSON file) |

**Validation strategy:**

```python
# Content module validates JSON against a schema before writing
import jsonschema

LESSON_SCHEMA = {
    "type": "object",
    "required": ["id", "level", "sequence", "title", "competencies", "sections", "activities"],
    "properties": {
        "id": {"type": "integer", "minimum": 1},
        "level": {"type": "string", "enum": ["A1", "A2", "B1"]},
        "sequence": {"type": "integer", "minimum": 1, "maximum": 10},
        "competencies": {"type": "array", "minItems": 5, "maxItems": 5},
        "sections": {"type": "array", "minItems": 1},
        "activities": {"type": "array", "minItems": 3, "maxItems": 5}
    }
}

def validate_and_save(lesson: dict, filepath: str) -> None:
    jsonschema.validate(lesson, LESSON_SCHEMA)
    with open(filepath, 'w') as f:
        json.dump(lesson, f, indent=2, ensure_ascii=False)
```

---

### Option C: Headless CMS (Standalone Service)

Deploy a separate headless CMS (Strapi, Sanity, Contentful) as a third service. The Lughat Chat backend syncs content from the CMS at startup or on demand.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Nuxt SPA)                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  /admin/lessons (Content Editor UI)                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
            │                           │
            ▼                           ▼
┌─────────────────────┐     ┌─────────────────────────────────────┐
│  Lughat Backend     │     │  Headless CMS (Strapi / Sanity)     │
│  (FastAPI)          │     │  ┌─────────────────────────────┐    │
│  ┌─────────────┐    │     │  │  Content API (REST/GraphQL)│    │
│  │ Content     │    │     │  │  ┌─────────────────────┐   │    │
│  │ Module      │    │     │  │  │  Lessons            │   │    │
│  │ (syncs at   │    │     │  │  │  Sections           │   │    │
│  │  startup)   │    │     │  │  │  Activities         │   │    │
│  └──────┬─────┘    │     │  │  └─────────────────────┘   │    │
│         │          │     │  └─────────────────────────────┘    │
│         ▼          │     │  ┌─────────────────────────────┐    │
│  SQLite / JSON    │     │  │  Admin UI (built-in)        │    │
│  (cached)         │     │  └─────────────────────────────┘    │
└─────────────────────┘     └─────────────────────────────────────┘
```

---

### Option D: Markdown + YAML (No Editor, Structured Files)

Replace JSON with a more editor-friendly format (Markdown + YAML frontmatter). Content is still authored externally, but the format is more readable and less error-prone than raw JSON.

```
backend/content/a1/
  lesson-01.md
  lesson-02.md
  ...
```

**Each lesson file:**

```markdown
---
id: 1
level: A1
sequence: 1
title: "The Salutations — التحيّة الأولى"
competencies:
  - "Can read fluently short paragraphs with harakat"
  - "Good understanding of basic salutations"
---

## Dialogue

**Teacher:** السلام عليكم
**Student:** وعليكم السلام

## Vocabulary

| Arabic | English |
|--------|---------|
| سلام | peace |
| مرحبا | hello |

## Activities

- type: listen-translate
  content: { ... }
```

The backend parses these files at startup and serves them via the same API.

---

## Trade-off Analysis

| Concern | A: JSON Files | B: Built-in Editor | C: Headless CMS | D: Markdown + YAML |
|---------|---------------|-------------------|-----------------|-------------------|
| **Setup complexity** | ✅ None — already works | ⚠️ ~5 new Vue components, 4 new endpoints | ❌ 3rd service, API sync logic, auth | ⚠️ Parser library, format migration |
| **Resource usage** | ✅ Zero overhead | ✅ ~10MB (extra Vue components) | ❌ ~200MB (CMS container) | ✅ Zero overhead |
| **Authoring experience** | ❌ Raw JSON in text editor | ✅ Structured forms, validation, hints | ✅ Best-in-class CMS UI | ⚠️ Better than JSON, worse than forms |
| **Validation** | ❌ None — errors at runtime | ✅ Schema validation at save time | ✅ Built-in validation | ⚠️ Partial — YAML is valid, content may not be |
| **Version control** | ✅ Git tracks every change | ✅ Git tracks every change | ⚠️ CMS has version history, but JSON files are static snapshots | ✅ Git tracks every change |
| **Collaboration** | ❌ Git merge conflicts | ❌ Git merge conflicts | ✅ Built-in collaboration, branching | ❌ Git merge conflicts |
| **Offline capability** | ✅ Full | ✅ Full (same as A) | ❌ Requires CMS availability | ✅ Full |
| **Migration cost** | ✅ N/A — current state | ⚠️ Migrate existing JSON to form state | ❌ Full sync system, data migration | ⚠️ Convert all JSON to Markdown |
| **Team size** | ✅ 1 developer (author) | ✅ 1 developer (author + editor builder) | ⚠️ 2+ (CMS admin + Lughat dev) | ✅ 1 developer |
| **Learning curve** | ✅ JSON (known) | ⚠️ Learn form building + validation | ❌ Learn CMS platform | ⚠️ Learn Markdown + YAML |
| **Docker image size** | ✅ No change | ✅ No change | ❌ +200MB CMS image | ✅ No change |

---

### When Option B (Built-in Editor) Would Be Warranted

A built-in editor makes sense when:

1. **Content needs frequent iteration** — Lessons are revised often; a JSON editor is too error-prone
2. **Non-technical authors** — Content creators don't know JSON or Git
3. **Validation is important** — Bad JSON breaks the learning experience; schema validation prevents this
4. **Single-user or small team** — Git merge conflicts are manageable; no need for CMS collaboration features
5. **Offline is required** — The editor must work without internet (local CMS is not an option)

**These conditions apply to Lughat Chat.** The platform is local, offline, solo-developed, and content-iterative.

### When Option C (Headless CMS) Would Be Warranted

A headless CMS makes sense when:

1. **Multiple content creators** — Several people editing simultaneously (CMS handles collaboration, branching, review)
2. **Review workflow** — Content goes through editorial review before publishing
3. **Multi-channel delivery** — Same content served to web, mobile, API, print
4. **Budget for operational overhead** — Extra container, extra maintenance, extra learning curve
5. **Team has CMS experience** — Someone on the team knows Strapi/Sanity/Contentful

**None of these apply to Lughat Chat.** The platform is solo-developed, single-channel, local, and offline.

### When Option D (Markdown + YAML) Would Be Warranted

Markdown + YAML makes sense when:

1. **Content is mostly text** — Lessons are long-form (stories, essays) with minimal structure
2. **Authors prefer plain text** — Markdown is more readable than JSON for prose
3. **No interactive elements** — No forms, no quizzes, no dynamic content in lessons
4. **Git-first workflow** — Authors edit files directly in Git; no UI editor needed

**Partial fit for Lughat Chat.** Lessons have structured sections and activities that are hard to express in Markdown. The JSON structure (nested sections, typed activities) loses semantic meaning when flattened to Markdown.

---

## Consequences

### Choosing Option B (Built-in Content Editor)

#### What becomes easier

- **Content iteration** — Authors can edit lessons through a UI, validate changes, and see the result without restarting containers
- **Error prevention** — JSON Schema validation catches missing fields, wrong types, and out-of-range values before saving
- **Structured editing** — Forms for each field (title, competencies, sections, activities) instead of raw JSON
- **No new infrastructure** — Same Docker Compose, same containers, same deployment
- **Git integration** — Changes are written to JSON files; Git handles versioning, diffing, rollback
- **Preview** — Authors can preview a lesson in the lesson view after saving (no restart needed if using file watch)
- **Onboarding** — New content creators don't need to learn JSON; they fill in forms

#### What becomes harder

- **~5 new Vue components** — `ContentEditor`, `LessonEditor`, `SectionEditor`, `ActivityEditor`, and a validation feedback component
- **4 new API endpoints** — Create, update, delete lessons (the existing Content module needs write support; currently it only reads)
- **JSON Schema maintenance** — The schema must be updated when new section types or activity types are added
- **Form state management** — Each editor component manages its own form state; errors, dirty state, undo/redo
- **File system permissions** — The Docker container must have write access to `backend/content/` (currently a read-only host mount)
- **Migration of existing content** — If content was authored as JSON, the editor must be able to load it for editing

#### New code to write

**None.** Option A is the current state — no new code, no new components, no new endpoints.

#### Docker Compose change

**None.** The content directory remains a read-only host mount:

```yaml
volumes:
  - ./backend/content:/app/content  # Read-only (unchanged)
```

---

### Choosing Option A (Keep JSON Files)

#### What becomes easier

- **Zero development cost** — no new code, no new UI, no new endpoints
- **Git-native workflow** — content changes are Git operations; no custom versioning
- **No file system permissions** — no write access needed in the container
- **No schema maintenance** — no JSON Schema to update when adding new types
- **No migration** — existing JSON files work as-is

#### What becomes harder

- **Error-prone editing** — JSON syntax errors, missing fields, wrong types are not caught until runtime
- **No structured editing** — authors must write raw JSON in a text editor; no autocomplete, no field hints
- **No validation** — bad content silently breaks the learning experience
- **No preview** — cannot verify changes before committing and restarting
- **No onboarding path** — new content creators must learn JSON and Git; steep learning curve
- **No iterative improvement** — every content change requires a container restart

---

### Choosing Option C (Headless CMS)

#### What becomes easier

- **Best-in-class editing UI** — Strapi/Sanity/Contentful have excellent CMS interfaces
- **Built-in collaboration** — Branching, review workflows, multi-author support
- **Version history** — CMS tracks every change; rollback is a click away
- **Multi-channel** — Same content served to web, mobile, API

#### What becomes harder

- **Third service** — 3 containers instead of 2, ~200MB extra, extra health checks
- **Sync logic** — Backend must sync content from CMS at startup (or on demand). What happens if the CMS is unavailable?
- **Data duplication** — Content exists in both the CMS and the JSON files (cached). Which is the source of truth?
- **No offline capability** — CMS is cloud-based; content editing requires internet
- **No Git integration** — CMS has its own versioning; Git on JSON files becomes stale
- **Migration complexity** — Existing JSON files must be imported into the CMS
- **No benefit for solo developer** — The operational cost far exceeds any benefit for a single content creator

---

### Choosing Option D (Markdown + YAML)

#### What becomes easier

- **More readable than JSON** — Markdown + YAML is easier to write by hand than raw JSON
- **Git-friendly** — Markdown diffs are human-readable; Git handles versioning
- **No editor needed** — Authors edit files directly in their preferred text editor
- **No runtime parsing** — Backend parses files at startup (same as JSON)

#### What becomes harder

- **Loss of structure** — Nested JSON (sections with typed activities) loses semantic meaning when flattened to Markdown
- **Activity types** — Complex activity definitions (listen-translate with embedded audio, role-play with state) are awkward in Markdown
- **No validation** — YAML is valid, but the content within may not be
- **Migration** — All existing JSON files must be converted to Markdown + YAML
- **Parsing complexity** — Backend must parse Markdown + YAML into the same internal structure it currently reads from JSON

---

## Recommendation

**Adopt Option A: Keep JSON Files (Current).**

### Rationale

1. **The team is one person.** A headless CMS (Option C) adds operational overhead that a solo developer cannot justify. Markdown + YAML (Option D) loses the semantic structure of lessons. A built-in editor (Option B) adds ~5 Vue components, 4 API endpoints, JSON Schema maintenance, and file system permission changes for marginal benefit.
2. **Content is authored externally.** Lessons are written with LLM assistance (or manually), committed to Git, and deployed. This workflow is clear, version-controlled, and requires no new infrastructure.
3. **Errors surface at runtime, not at edit time.** This is acceptable for a solo-developed platform where content changes are infrequent and reviewed before deployment. A malformed lesson is a Git revert away.
4. **No file system permission changes.** The Docker container doesn't need write access to `backend/content/`. The content directory remains a read-only host mount.
5. **No schema maintenance.** No JSON Schema files to update when adding new section types or activity types. No schema loader at startup. No validation layer to maintain.
6. **No frontend development cost.** No content editor pages, no form components, no validation feedback UI. The existing codebase is sufficient.

### Decision Matrix for Future Migration (Built-in Editor or Headless CMS)

| Trigger | Action |
|---------|--------|
| > 3 content creators | Evaluate headless CMS (Option C) |
| Editorial review workflow needed | Evaluate headless CMS (Option C) |
| Multi-channel delivery (web + mobile) | Evaluate headless CMS (Option C) |
| Content iteration is too error-prone (JSON) | Evaluate built-in editor (Option B) |
| Non-technical authors need to edit content | Evaluate built-in editor (Option B) |
| Validation is important (schema enforcement) | Evaluate built-in editor (Option B) |

### What We're Explicitly NOT Doing

- ❌ No content editor UI — no Vue components, no form pages, no editor routes
- ❌ No write API endpoints — no POST/PUT/DELETE for lessons (Git is the write mechanism)
- ❌ No JSON Schema validation — no schema files, no validation layer
- ❌ No file system write access — the Docker container does not write to `backend/content/`
- ❌ No schema loader — no startup-time schema loading
- ❌ No content editor authentication — no API key, no hardcoded secret, no gated routes
- ❌ No Markdown format — JSON files remain the source of truth

### Module Dependency (No Change)

```
Content (no deps)
    └── GET /api/lessons    — read JSON files (existing)
    └── GET /api/lessons/:id — read single lesson (existing)
```

The Content module is **unchanged** — it only reads JSON files. No write operations, no validation, no schema files. The module boundary rules from ADR-001 still apply: Content does not depend on TTS or Progress.

### Open Questions for Future ADRs

1. **Content preview** — If a built-in editor is ever built (Option B), should it have a live preview (render the lesson as a learner would see it)? (ADR-005c)
2. **Bulk import/export** — If content is authored externally (LLM, spreadsheet), how do we import/export lesson JSON? (ADR-005d)
3. **Content versioning** — Should the platform track content versions (e.g., lesson v1, v2) in Git or in a separate version table? (ADR-005e)

---

## References

- [PRD: Content Creation (JSON files)](../PRD.md)
- [ADR-001: Language Learning Platform Architecture](./ADR-001-language-learning-platform-architecture.md)
- [Headless vs Coupled CMS: Picking the Right Architecture](https://stackharbor.com/en/knowledge-base/cms-headless-vs-coupled-decision/)
- [JSON Schema Validation (Draft 2020-12)](https://bytepane.com/blog/json-schema-validation-guide/)
- [Monolith vs Microservices: Team Topology](https://hld.handbook.academy/curriculum/architecture-patterns/monolith-vs-microservices/)
