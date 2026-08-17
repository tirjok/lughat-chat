# ADR-007: Lesson Data Model Alignment

**Status:** Accepted
**Date:** 2026-08-16
**Context:** `frontend/app/data/lesson-01.json` (authoritative, rich structure, 327 lines), `frontend/app/data/curriculum.ts` (flat, 786 lines, 8 lessons), `frontend/app/pages/dashboard/level/[level]/[lesson].vue` (consumer, 197 lines)

---

## Context

LughatChat has two coexisting lesson data models that serve different purposes:

1. **`lesson-01.json`** — A rich, nested, activity-aware JSON structure (327 lines) that defines lesson content with:
   - `competencies[]` — 5 learning outcomes per lesson
   - `sections[]` — grouped by type (`dialogue`, `vocabulary`, `pronouns`, `expressions`, `grammar`) with deeply nested, type-specific content (scenes, categories, topics)
   - `activities[]` — 5 distinct exercise types (`listen-translate`, `translate-to-english`, `translate-to-arabic`, `introduce-characters`, `role-play`) with `competency_map`, `max_attempts`, and type-specific content schemas

2. **`curriculum.ts`** — A flat TypeScript definition (786 lines, 8 lessons across 6 levels) where every section is a `name → items[]` mapping, and activities are flattened into items with `activityType`.

The current lesson page (`[lesson].vue`) renders `curriculum.ts` data as flat items: Arabic text, transliteration, English translation, notes. It shows "Content coming soon" for the Activities tab.

**`lesson-01.json` is dead data** — written but never imported or consumed by any component. The two structures are incompatible: `lesson-01.json` uses `type + title + content` (nested per-type), while `curriculum.ts` uses `name + items` (flat).

This mismatch prevents:
- Rendering dialogue scenes with speaker names
- Grouping vocabulary by category with singular/plural forms
- Displaying grammar topics with descriptions and examples
- Rendering any of the 5 activity types (translate-to-english, translate-to-arabic, introduce-characters, role-play)
- Showing lesson-level competencies

## Decision

Restructure `curriculum.ts` to adopt the nested, type-aware structure from `lesson-01.json`, while maintaining a backward-compatible flat accessor for existing UI consumers.

### 7.1 Top-level `LessonDefinition` changes

Add to `LessonDefinition`:
- `competencies?: string[]` — maps directly from `lesson-01.json.competencies`
- `sequence?: number` — ordering within a level
- `activities: ActivityDefinition[]` — sibling to `sections`, not flattened into items

### 7.2 `SectionDefinition` restructured

Replace the flat `items: SectionItem[]` with a union-type `content` field keyed by `type`:

```typescript
interface SectionDefinition {
  name: string
  type?: SectionType          // "dialogue" | "vocabulary" | "pronouns" | "expressions" | "grammar"
  title?: string              // bilingual section title
  content: SectionContent     // union type, varies by section type
}
```

Where `SectionContent` is a discriminated union:

```typescript
type SectionContent =
  | { type: 'dialogue'; scenes: { label: string; lines: DialogueLine[] }[] }
  | { type: 'vocabulary'; categories: { label: string; words: VocabWord[] }[] }
  | { type: 'pronouns'; pronouns: { arabic: string; english: string; example: string }[] }
  | { type: 'expressions'; expressions: { arabic: string; english: string }[] }
  | { type: 'grammar'; topics: { name: string; description: string; examples: { arabic: string; english: string }[] }[] }
```

### 7.3 Backward-compatible flat accessor

To avoid breaking the existing lesson page template (which reads `item.arabic`, `item.english`, `item.notes`, `item.transliteration`), provide a computed `items: SectionItem[]` accessor on `SectionDefinition` that flattens the nested content into the existing flat format:

```typescript
interface SectionDefinition {
  // ... (as above)
  get items(): SectionItem[]  // computed: flattens nested content to flat items
}
```

This accessor preserves:
- `id` (generated from section name + index)
- `arabic`, `english`, `notes`, `transliteration`
- The first-item access pattern used by `extractLearningTags()`

**Trade-off**: The flat accessor is a projection layer, not the source of truth. It adds ~30 lines of mapping logic but eliminates the need to rewrite every existing template binding.

### 7.4 Activity model

Add `ActivityDefinition` as a top-level array on `LessonDefinition`:

```typescript
interface ActivityDefinition {
  id: number
  type: ActivityType          // expanded: "listen-translate" | "translate-to-english" | "translate-to-arabic" | "introduce-characters" | "role-play" | "role-play" | "fill-blank" | "matching"
  title: string
  description: string
  order: number
  competencyMap: Record<string, number>
  maxAttempts: number
  content: ActivityContent    // union type per activity type
}
```

Activity content is a discriminated union:

```typescript
type ActivityContent =
  | { type: 'listen-translate'; dialogue: { [sceneKey: string]: { label: string; arabic: string; english_expected: string } } }
  | { type: 'translate-to-english'; sentences: { arabic: string; english_expected: string }[] }
  | { type: 'translate-to-arabic'; sentences: { english: string; arabic_expected: string }[] }
  | { type: 'introduce-characters'; characters: { name: string; arabic: string; gender: string; sentences: { english: string; arabic_expected: string }[] }[] }
  | { type: 'role-play'; scenario: string; expectedElements: string[] }
  | { type: 'fill-blank'; prompt: string; answer: string; options?: string[] }
  | { type: 'matching'; pairs: { source: string; target: string }[] }
```

### 7.5 Existing lessons migration

All 8 existing lessons in `curriculum.ts` must be migrated to the new structure:

| Lesson | ID | Sections | Activities (JSON only) |
|--------|----|----------|----------------------|
| Greetings & Introductions | a1-01 | 6 (dialogue, vocab, pronouns, expressions, grammar, activities) | 5 (JSON only) |
| Numbers & Personal Info | a1-02 | 6 | 0 (JSON has none) |
| Daily Routine | a2-01 | 6 | 0 |
| At the Market | a2-02 | 6 (empty pronouns) | 0 |
| Travel Plans | b1-01 | 6 (empty pronouns) | 0 |
| Technology & Society | b2-01 | 6 (empty pronouns) | 0 |
| Literary Arabic | c1-01 | 6 (empty pronouns, expressions) | 0 |
| Modern Standard Mastery | c2-01 | 6 (empty pronouns, expressions) | 0 |

Migration priority: **a1-01** (has full JSON data for all 5 sections + 5 activities). Other lessons migrate from existing flat data to the new nested structure without activity content (activities section becomes empty `items: []` or `content` with empty arrays).

## Consequences

### What becomes easier

- **Rich section rendering** — Dialogue scenes render with speaker names; Vocabulary groups by category with singular/plural forms; Grammar displays topics with descriptions and examples.
- **Activity implementation** — All 5 activity types have defined schemas ready for UI components (translate-to-english, translate-to-arabic, introduce-characters, role-play, listen-translate).
- **Competency tracking** — Lesson-level `competencies[]` and per-activity `competency_map` enable future progress tracking tied to specific learning outcomes.
- **Single source of truth** — `lesson-01.json` data can be merged into `curriculum.ts` without structural translation; future lessons follow the same schema.
- **Backend readiness** — When `GET /api/lessons` exists, the nested structure maps directly to a database schema (lessons → sections → content JSON).

### What becomes harder

- **Migration effort** — All 8 existing lessons must be rewritten from flat `items[]` to nested `content` objects. This is ~786 lines of data rewriting in a single file.
- **Flat accessor adds complexity** — The `items` projection layer is an extra abstraction. Future developers might reach for the flat accessor when they should be using the nested content directly.
- **Template rewrite deferred** — The existing lesson page template continues rendering flat items (via the accessor), meaning the rich structure (scenes, categories, topics) is available but not yet displayed. This creates a "zombie structure" risk — data exists but users never see it.
- **Type complexity increases** — Discriminated unions for `SectionContent` and `ActivityContent` increase the type surface area from ~15 types to ~30 types. TypeScript handles this well, but code review burden increases.
- **Existing tests must pass** — `LessonPage.test.ts` mounts the component and checks tab rendering. The flat accessor must produce identical output to the current `items[]` format, or tests must be updated.

### What stays the same

- **Route structure** — `/dashboard/level/{level}/{lesson}` unchanged.
- **Tab navigation** — Section tabs render from `section.name`, unchanged.
- **Dashboard** — Level tiles use `curriculum` and `lessons.length`, unaffected.
- **Level index** — `extractLearningTags` uses `section.items[0]`, preserved via flat accessor.

### Long-term risks

1. **Structural drift** — The flat accessor and nested content must stay in sync. If the nested content changes but the flat accessor isn't updated, the lesson page silently shows stale data. **Mitigation**: The flat accessor is a computed property with explicit type assertions, reviewed alongside content changes.

2. **JSON-to-TS sync** — `lesson-01.json` and `curriculum.ts` will diverge if both are edited independently. **Mitigation**: `curriculum.ts` is the source of truth. `lesson-01.json` is an authoring template that feeds into `curriculum.ts` during content creation.

3. **Activity rendering gap** — The flat accessor preserves the "Content coming soon" state for activities. This is acceptable for Phase 1 but creates user expectation risk if activities are marketed but never rendered.
