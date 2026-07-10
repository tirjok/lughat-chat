# ADR-006: Activity Type Taxonomy and Validation

## Status

**Accepted — Option B: JSON Schema Files** — 2026-07-10

This ADR addresses the question raised in ADR-001: *How do we define, validate, and extend new activity types without breaking existing lessons?* It evaluates activity type taxonomy, JSON Schema validation, scoring strategies, and the trade-off between strict schemas and flexible content.

---

## Context

The platform supports **5 mandatory activity types per lesson**, each with different interaction patterns, scoring logic, and rendering requirements:

| Type | Interaction | Scoring | Example |
|------|------------|---------|---------|
| `listen-translate` | Read Arabic → type English answer | Fuzzy string match | "Translate: السلام عليكم" |
| `translate-to-english` | Translate Arabic → type English | Fuzzy string match | "Translate to English" |
| `translate-to-arabic` | Translate English → type Arabic | Fuzzy match with harakat | "Translate to Arabic" |
| `introduce-characters` | Type character introduction | Content validation | "Introduce yourself in Arabic" |
| `role-play` | Multi-turn dialogue | Dialogue completion | Role-play conversation |

Additional activity types may be added (e.g., `matching`, `fill-blank`, `multiple-choice`, `pronunciation`). Each new type requires:

1. **A schema definition** — What fields does the activity JSON contain?
2. **A validator** — Does the lesson's activity JSON conform to the schema?
3. **A renderer** — A Vue component that renders the activity in the lesson view
4. **A scoring strategy** — How is the learner's answer evaluated?
5. **An API endpoint** — How is the answer submitted and scored?

The PRD defines 5 activity types and states that sections are "freeform JSON — validated at render time, not at content-creation time." This ADR evaluates whether that approach is sustainable.

### Constraints (Inherited from ADR-001)

| Constraint | Implication |
|-----------|-------------|
| **JSON files as source of truth** | Activity types are defined in JSON; validation must parse JSON |
| **Variable lesson structure** — Not fixed per lesson | Schema must support flexible, per-lesson content |
| **5+ activity types** — Each has unique rendering and scoring | Schema must encode type-specific constraints |
| **Content is static** — Written once, served many times | Validation happens at read time (API), not at edit time |
| **Solo developer** — Must minimize schema maintenance overhead | Schema changes should not break existing lessons |
| **CPU-only, local** — No cloud validation services | All validation happens locally |

---

## Decision

We evaluate three options for activity type management.

---

### Option A: Validate at Render Time (Current PRD Approach)

No schema validation at content-creation time. Activities are raw JSON; validation happens when the frontend renders the activity. If the JSON is malformed, the renderer fails gracefully (shows an error, skips the activity).

```
┌─────────────────────────────────────────────────────────────┐
│  Backend (FastAPI)                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Content Module                                      │   │
│  │  GET /api/lessons/:id  — returns raw JSON from file │   │
│  │  (no validation — trusts content authors)            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Nuxt SPA)                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ActivityRenderer.vue                                │   │
│  │  switch (activity.type) {                            │   │
│  │    case 'listen-translate':  → ListenTranslate.vue  │   │
│  │    case 'translate-to-english': → TranslateEn.vue   │   │
│  │    case 'translate-to-arabic':  → TranslateAr.vue   │   │
│  │    case 'introduce-characters': → IntroduceChars.vue│   │
│  │    case 'role-play':           → RolePlay.vue       │   │
│  │    default: → ErrorFallback.vue (skip activity)     │   │
│  │  }                                                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Key characteristics:**
- **No schema** — activities are raw JSON; no validation layer
- **Graceful degradation** — malformed JSON shows an error, skips the activity
- **No validation overhead** — backend serves raw JSON; frontend handles errors
- **Flexible but fragile** — any JSON structure works, but errors surface at runtime

---

### Option B: JSON Schema Validation (Recommended)

Define a **JSON Schema** for each activity type. The Content module validates activities against the schema when serving lessons. Invalid activities are rejected with a clear error message.

```
┌─────────────────────────────────────────────────────────────┐
│  Backend (FastAPI)                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Content Module                                      │   │
│  │  GET /api/lessons/:id  — validates against schema   │   │
│  │                       — returns validated JSON       │   │
│  │                       — 400 if invalid               │   │
│  └─────────────────────────────────────────────────────┘   │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Activity Schemas (content/schemas/)                 │   │
│  │  ┌─────────────────┐  ┌─────────────────┐           │   │
│  │  │ listen-translate│  │ translate-to-en │           │   │
│  │  │ .schema.json    │  │ .schema.json    │           │   │
│  │  └─────────────────┘  └─────────────────┘           │   │
│  │  ┌─────────────────┐  ┌─────────────────┐           │   │
│  │  │ translate-to-ar │  │ introduce-chars │           │   │
│  │  │ .schema.json    │  │ .schema.json    │           │   │
│  │  └─────────────────┘  └─────────────────┘           │   │
│  │  ┌─────────────────┐  ┌─────────────────┐           │   │
│  │  │ role-play       │  │  common.json    │  ← shared │   │
│  │  │ .schema.json    │  │ (id, type,      │           │   │
│  │  └─────────────────┘   order, etc.)     │           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Schema structure (JSON Schema Draft 2020-12):**

```json
// content/schemas/common.schema.json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://lughat.chat/schemas/common.schema.json",
  "type": "object",
  "required": ["id", "type", "title", "order", "max_attempts"],
  "properties": {
    "id": { "type": "integer", "minimum": 1 },
    "type": { "type": "string" },
    "title": { "type": "string", "minLength": 1 },
    "order": { "type": "integer", "minimum": 0 },
    "max_attempts": { "type": "integer", "minimum": 1, "maximum": 10 },
    "competency_map": {
      "type": "object",
      "additionalProperties": { "type": "number", "minimum": 0, "maximum": 1 }
    }
  }
}
```

```json
// content/schemas/listen-translate.schema.json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://lughat.chat/schemas/listen-translate.schema.json",
  "allOf": [
    { "$ref": "common.schema.json" },
    {
      "type": "object",
      "required": ["content"],
      "properties": {
        "type": { "const": "listen-translate" },
        "content": {
          "type": "object",
          "required": ["arabic_text", "expected_translation"],
          "properties": {
            "arabic_text": { "type": "string", "minLength": 1 },
            "expected_translation": { "type": "string", "minLength": 1 },
            "audio_url": { "type": "string", "format": "uri" },
            "hints": {
              "type": "array",
              "items": { "type": "string" }
            }
          }
        }
      }
    }
  ]
}
```

**Validation at serve time:**

```python
# Content module validates activities when serving a lesson
import json
import jsonschema
from pathlib import Path

SCHEMA_DIR = Path(__file__).parent.parent / "schemas"

def load_schemas() -> dict[str, dict]:
    """Load all activity schemas at startup."""
    schemas = {}
    for schema_file in SCHEMA_DIR.glob("*.schema.json"):
        with open(schema_file) as f:
            schema = json.load(f)
            schemas[schema["$id"]] = schema
    return schemas

# Called once at startup
ACTIVITY_SCHEMAS = load_schemas()

def validate_activity(activity: dict) -> bool:
    """Validate an activity against its type-specific schema."""
    activity_type = activity.get("type")
    if not activity_type:
        return False

    schema_id = f"https://lughat.chat/schemas/{activity_type}.schema.json"
    if schema_id not in ACTIVITY_SCHEMAS:
        return False  # Unknown type — skip

    try:
        jsonschema.validate(activity, ACTIVITY_SCHEMAS[schema_id])
        return True
    except jsonschema.ValidationError:
        return False
```

**New activity type workflow:**

1. Create `content/schemas/{new-type}.schema.json` — define the JSON Schema
2. Add a renderer component: `app/components/Activity{NewType}.vue`
3. Add a scoring strategy: `content/scoring.py`
4. Add an API endpoint: `POST /api/lessons/:id/activities/:id/submit`
5. Write sample lesson JSON that uses the new type

---

### Option C: Polymorphic Type Registry (Dynamic Registration)

Define a **type registry** in the backend. Each activity type registers itself with the registry: its schema, renderer, and scoring strategy. New types are added by registering a new entry — no schema files needed.

```python
# Content module — type registry
class ActivityTypeRegistry:
    """Registry of activity types, each with schema, renderer, scorer."""

    def __init__(self):
        self._types: dict[str, ActivityType] = {}

    def register(self, activity_type: str, type_def: ActivityType):
        self._types[activity_type] = type_def

    def get_schema(self, activity_type: str) -> dict | None:
        return self._types.get(activity_type)?.schema

    def get_scorer(self, activity_type: str) -> Scorer | None:
        return self._types.get(activity_type)?.scorer

registry = ActivityTypeRegistry()

# Register existing types at startup
from content.types import (
    ListenTranslateType,
    TranslateToEnglishType,
    TranslateToArabicType,
    IntroduceCharactersType,
    RolePlayType,
)

registry.register("listen-translate", ListenTranslateType())
registry.register("translate-to-english", TranslateToEnglishType())
registry.register("translate-to-arabic", TranslateToArabicType())
registry.register("introduce-characters", IntroduceCharactersType())
registry.register("role-play", RolePlayType())
```

**Each activity type is a class:**

```python
class ListenTranslateType:
    name = "listen-translate"
    schema = { ... }  # JSON Schema dict
    scoring = FuzzyStringMatchScorer()

    def render(self, activity: dict) -> dict:
        """Convert activity data to frontend-renderable format."""
        return {
            "type": self.name,
            "arabic_text": activity["content"]["arabic_text"],
            "expected_translation": activity["content"]["expected_translation"],
            "hints": activity["content"].get("hints", []),
        }

    def score(self, submitted: str, activity: dict) -> ScoreResult:
        return self.scoring.evaluate(submitted, activity)
```

---

## Trade-off Analysis

| Concern | A: Render-Time Validation | B: JSON Schema Files | C: Type Registry |
|---------|--------------------------|---------------------|------------------|
| **Setup complexity** | ✅ None — current approach | ⚠️ Schema files + loader | ⚠️ Registry + type classes |
| **Schema maintenance** | ❌ None (no schemas) | ⚠️ One file per type; must keep in sync | ⚠️ One class per type; must keep in sync |
| **Validation accuracy** | ❌ None — errors at runtime | ✅ Full schema validation | ✅ Full schema validation (in code) |
| **New type cost** | ✅ Add renderer + scorer | ⚠️ Add schema file + renderer + scorer | ⚠️ Add class (schema + renderer + scorer) |
| **Backward compatibility** | ✅ Any JSON works | ⚠️ New schema may break old lessons | ⚠️ New class may break old lessons |
| **Documentation** | ❌ None — no schema to read | ✅ Schema files are self-documenting | ⚠️ Classes are self-documenting |
| **Editor integration** | ❌ No schema to drive forms | ✅ Schema drives form generation | ⚠️ Schema is embedded in class |
| **Testing** | ❌ Must test each renderer | ✅ Test schema + scorer separately | ⚠️ Test class (schema + scorer + render) |
| **Team size** | ✅ 1 developer | ✅ 1 developer | ✅ 1 developer |
| **Extensibility** | ⚠️ Unstructured — easy to add, hard to validate | ✅ Structured — schema enforces structure | ✅ Structured — class enforces structure |

---

### When Option A (Render-Time Validation) Would Be Warranted

Render-time validation makes sense when:

1. **Activity types are fixed and few** — 2–3 types, never changing
2. **Content is curated by experts** — No risk of malformed JSON
3. **Speed of development** — No schema files to maintain; just build renderers
4. **Error tolerance** — A broken activity is acceptable (skip it, show error)

**This is the current state.** It works for the initial launch with 5 known activity types. But as types grow (matching, fill-blank, multiple-choice), unstructured JSON becomes error-prone and hard to validate.

### When Option C (Type Registry) Would Be Warranted

A type registry makes sense when:

1. **Activity types are code-defined** — Each type is a Python class with schema, renderer, and scorer
2. **Extensibility is important** — New types are registered programmatically, not via external files
3. **Single codebase** — Schema, renderer, and scorer are all in one class; easy to find and modify
4. **Testing is unit-based** — Test each class independently

**Partial fit for Lughat Chat.** The registry approach is clean but couples schema, rendering, and scoring in one class. For a solo developer, this is manageable. However, it makes schema validation less visible (embedded in code vs. explicit JSON files).

---

## Consequences

### Choosing Option B (JSON Schema Files)

#### What becomes easier

- **Validation at serve time** — Invalid activities are caught when the API serves a lesson, not when a learner encounters them
- **Schema files are self-documenting** — Anyone can read `listen-translate.schema.json` to understand the activity structure
- **Editor integration** — JSON Schema files can drive form generation in the content editor (ADR-005)
- **Clear error messages** — `jsonschema.ValidationError` provides specific field-level errors
- **New type onboarding** — Create a schema file; the Content module automatically validates it

#### What becomes harder

- **Schema file maintenance** — Each new activity type requires a new `.schema.json` file. The file must be kept in sync with the renderer and scorer.
- **Schema versioning** — If an activity's schema changes (e.g., `listen-translate` gains a `hints` field), existing lessons must be updated, or the schema must support both old and new formats.
- **Schema loader at startup** — The Content module must load all schema files at startup and validate each lesson against them. This adds ~50ms to startup time (negligible).
- **Error handling** — If a lesson contains an invalid activity, the API returns 400. The frontend must handle this gracefully (show error, skip activity, or request content fix).

#### New code to write

| Area | Backend Changes | Frontend Changes |
|------|----------------|------------------|
| **Schema files** | `content/schemas/*.schema.json` (one per type) | — |
| **Schema loader** | `content/schema_loader.py` (new file) | — |
| **Validation** | `content/validator.py` (new file) | — |
| **Error handling** | 400 response for invalid activities | Error toast + skip activity |

#### Schema file structure

```
backend/content/schemas/
├── common.schema.json       ← shared properties (id, type, title, order, max_attempts)
├── listen-translate.schema.json
├── translate-to-english.schema.json
├── translate-to-arabic.schema.json
├── introduce-characters.schema.json
├── role-play.schema.json
└── matching.schema.json     ← future type (example)
```

---

### Choosing Option A (Render-Time Validation)

#### What becomes easier

- **Zero schema maintenance** — no schema files, no validation layer, no schema loader
- **Maximum flexibility** — any JSON structure works; no validation to break
- **Fastest development** — just build the renderer; no schema to write
- **No startup cost** — no schema loading at startup

#### What becomes harder

- **Errors surface at runtime** — Learners encounter broken activities; no pre-flight validation
- **No editor integration** — The content editor (ADR-005) cannot generate forms from schemas
- **No documentation** — No schema file to read; developers must reverse-engineer the JSON structure from renderers
- **No consistency** — Different authors may structure the same activity type differently; no enforcement
- **Harder to add new types** — Without a schema, there's no reference for what a new activity type should look like

---

### Choosing Option C (Type Registry)

#### What becomes easier

- **Single source of truth** — Schema, renderer, and scorer are all in one class
- **Easy to find** — All logic for an activity type is in one file
- **Easy to test** — Unit test each class independently
- **Extensible** — New types are registered by adding a class and a `registry.register()` call

#### What becomes harder

- **Schema is embedded in code** — Less visible than JSON files; harder for non-developers to understand
- **Coupling** — Schema, renderer, and scorer are tightly coupled in one class. Changing the schema requires changing the class.
- **No editor integration** — JSON Schema files (Option B) can drive form generation. A Python class cannot.
- **More code per type** — Each type requires a class with schema dict, render method, and score method. This is more code than a single JSON file.

---

## Recommendation

**Adopt Option B: JSON Schema Files.**

### Rationale

1. **Schema files are self-documenting.** Anyone (developer, content author, reviewer) can read `listen-translate.schema.json` to understand the activity structure. A Python class (Option C) hides the schema inside code.
2. **Editor integration.** The content editor (ADR-005) can generate forms from JSON Schema files. A Python class (Option C) cannot drive form generation without extracting the schema.
3. **Separation of concerns.** Schema files define *what* an activity looks like. The Content module validates *whether* it's valid. The frontend renders *how* it looks. The API scores *whether* the answer is correct. Each concern is separate.
4. **Backward compatibility.** JSON Schema supports `oneOf` and `additionalProperties`, allowing old lesson formats to coexist with new ones. A Python class (Option C) would require version checks in code.
5. **Solo developer friendly.** One JSON file per activity type is easy to manage. The file is small, focused, and self-contained.

### Decision Matrix for Future Migration to Type Registry

| Trigger | Action |
|---------|--------|
| Schema files become hard to maintain (>20 types) | Migrate to type registry (Option C) |
| Schema and scorer are tightly coupled | Migrate to type registry (Option C) |
| Need runtime type registration (plugins) | Migrate to type registry (Option C) |

### What We're Explicitly NOT Doing

- ❌ No render-time validation only — schema validation at serve time catches errors early
- ❌ No type registry in the MVP — JSON Schema files are simpler for 5 types
- ❌ No dynamic type loading — schemas are loaded at startup, not per-request
- ❌ No cloud validation — all validation happens locally
- ❌ No strict enforcement for existing lessons — validation can be lenient for existing content, strict for new content

### Activity Type Taxonomy (Current)

| Type | Schema File | Scoring Strategy | Renderer |
|------|------------|-----------------|----------|
| `listen-translate` | `listen-translate.schema.json` | Fuzzy string match | `ListenTranslate.vue` |
| `translate-to-english` | `translate-to-english.schema.json` | Fuzzy string match | `TranslateToEnglish.vue` |
| `translate-to-arabic` | `translate-to-arabic.schema.json` | Fuzzy match with harakat | `TranslateToArabic.vue` |
| `introduce-characters` | `introduce-characters.schema.json` | Content validation | `IntroduceCharacters.vue` |
| `role-play` | `role-play.schema.json` | Dialogue completion | `RolePlay.vue` |

### Open Questions for Future ADRs

1. **Activity type versioning** — If a schema changes (e.g., `listen-translate` gains a `hints` field), how do we handle old lessons that don't have the new field? (ADR-006b)
2. **Custom activity types** — If learners or teachers create custom activities, how do we validate them? (ADR-006c)
3. **Activity composition** — Can activities be composed (e.g., a "quiz" that contains multiple sub-activities)? (ADR-006d)

---

## References

- [PRD: Activity Types (5 mandatory per lesson)](../PRD.md)
- [ADR-001: Language Learning Platform Architecture](./ADR-001-language-learning-platform-architecture.md)
- [JSON Schema Validation (Draft 2020-12)](https://bytepane.com/blog/json-schema-validation-guide/)
- [JSON Schema $ref and allOf](https://json-schema.org/understanding-json-schema/reference/reference)
- [Polymorphic Design Pattern in Python](https://refactoring.guru/design-patterns/strategy/python/example)
