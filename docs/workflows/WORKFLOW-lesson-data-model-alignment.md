# WORKFLOW: Lesson Data Model Alignment (Restructure curriculum.ts)

**Version**: 0.1
**Date**: 2026-08-16
**Author**: Workflow Architect
**Status**: Draft
**Implements**: ADR-007 (Accepted 2026-08-16)
**Based on**: `docs/implementation/PRD-lesson-data-model-alignment.md`

---

## Overview

This workflow restructures `curriculum.ts` from a flat `items[]` model to a nested, type-aware structure while preserving backward compatibility for existing UI consumers. The flat `items` accessor on `SectionDefinition` is the contract that prevents breaking the existing lesson page template. This is a **data-model transformation** workflow — no user-facing behavior changes in Phase 1, no API changes, no new endpoints.

The workflow covers: defining new interfaces, restructuring data models, migrating all 8 existing lessons, maintaining the flat projection layer, and verifying no regression in existing tests.

---

## Actors

| Actor | Role in this workflow |
|---|---|
| Developer (Agent) | Writes new interfaces, migrates data, implements flat accessor, runs tests |
| TypeScript Compiler | Validates type correctness of new interfaces and data |
| Vitest Test Runner | Validates existing tests (`LessonPage.test.ts`, `LevelIndex.test.ts`) still pass |
| ESLint / pnpm typecheck | Validates code quality and type correctness |

---

## Prerequisites

- `frontend/app/data/lesson-01.json` exists and is the authoritative source for lesson a1-01 (327 lines, 5 sections + 5 activities)
- `frontend/app/data/curriculum.ts` exists with 8 lessons (786 lines, flat model)
- `frontend/app/pages/dashboard/level/[level]/[lesson].vue` exists and consumes `curriculum.ts` via `getLessonById()`
- `frontend/tests/components/LessonPage.test.ts` exists and tests tab rendering, navigation, 404 handling
- `frontend/tests/components/LevelIndex.test.ts` exists and tests level index rendering
- All existing tests pass before this workflow begins

---

## Trigger

Developer initiates the workflow by reading `curriculum.ts` and `lesson-01.json`, then begins restructuring.

---

## Workflow Tree

### STEP 1: Define New Interfaces

**Actor**: Developer (Agent)
**Action**: Add new type definitions to `curriculum.ts` before existing interfaces:
- `SectionType` (union: `dialogue | vocabulary | pronouns | expressions | grammar`)
- `DialogueLine`, `VocabWord`
- `SectionContent` (discriminated union by `type`)
- `ActivityType` (expanded: adds `translate-to-english`, `translate-to-arabic`, `introduce-characters`)
- `ActivityContent` (discriminated union by `type`)
- `ActivityDefinition`
- `ListenTranslateContent`, `TranslateToEnglishContent`, `TranslateToArabicContent`, `IntroduceCharactersContent`, `RolePlayContent`

**Input**: Existing `SectionItem`, `ActivityType` interfaces (lines 39-65 of `curriculum.ts`)
**Output on SUCCESS**: New interfaces exported at top of `curriculum.ts`, before existing data
**Output on FAILURE**:
- `FAILURE(type_error)`: Discriminated union is not exhaustive — TypeScript compiler rejects `SectionContent` or `ActivityContent` as a type that can never be fully checked at runtime → **recovery**: Verify all `type` discriminators are present and mutually exclusive
- `FAILURE(import_conflict)`: New interface names collide with existing names → **recovery**: Use qualified names (e.g., `NestedSectionContent`)

**Observable states during this step**:
- Developer sees: New interface definitions in `curriculum.ts` (lines 1-~100)
- TypeScript: No errors on type definitions alone (no data yet)
- Tests: Not run yet (no behavioral change)

---

### STEP 2: Restructure `SectionDefinition` and `LessonDefinition`

**Actor**: Developer (Agent)
**Action**: Replace existing `SectionDefinition` (line 34-37) and `LessonDefinition` (lines 26-32) with new definitions:
- `SectionDefinition` now has `name`, `type?`, `title?`, `content: SectionContent`, and `get items(): SectionItem[]`
- `LessonDefinition` now has `competencies?: string[]`, `sequence?: number`, `activities: ActivityDefinition[]` in addition to existing fields

**Input**: Lines 26-37 of `curriculum.ts` (existing interfaces)
**Output on SUCCESS**: Both interfaces re-exported with new shape; `get items()` is a getter returning `SectionItem[]`
**Output on FAILURE**:
- `FAILURE(getter_not_computed)`: `get items()` is not a computed property but a static field — the flat accessor won't reflect nested content changes → **recovery**: Must be `get items()` (getter syntax), not `items: SectionItem[]`
- `FAILURE(competencies_optional)`: `competencies` is not optional (`?`) — existing lessons without competencies will fail type check → **recovery**: Must be `competencies?: string[]`

**Observable states during this step**:
- Developer sees: Updated interface definitions in `curriculum.ts` (lines 26-37)
- TypeScript: No errors on interface definitions alone
- Tests: Not run yet

---

### STEP 3: Implement the Flat `items` Accessor

**Actor**: Developer (Agent)
**Action**: Implement the `items` getter on each `SectionDefinition` instance that flattens nested content to `SectionItem[]`:

| Section type | Source | Mapping to `SectionItem` |
|-------------|--------|-------------------------|
| `dialogue` | `scenes[].lines[]` | `id = "${sectionName}-${lineIndex}"`, `arabic = line.arabic`, `english = line.english`, `notes = line.notes` |
| `vocabulary` | `categories[].words[]` | `id = "${sectionName}-${wordIndex}"`, `arabic = word.arabic`, `english = word.english`, `notes = word.plural ?? word.singular` |
| `pronouns` | `pronouns[]` | `id = "${sectionName}-${index}"`, `arabic = p.arabic`, `english = p.english`, `notes = p.example` |
| `expressions` | `expressions[]` | `id = "${sectionName}-${index}"`, `arabic = e.arabic`, `english = e.english` |
| `grammar` | `topics[].examples[]` | `id = "${sectionName}-${topicIndex}-${exampleIndex}"`, `arabic = ex.arabic`, `english = ex.english`, `notes = topic.description` |
| `activities` (flat) | `items[]` (existing) | Pass-through (no change) |

**Input**: All 8 lesson definitions with nested `content` objects
**Output on SUCCESS**: Every `SectionDefinition.items` returns `SectionItem[]` with identical structure to current `items[]` data
**Output on FAILURE**:
- `FAILURE(id_collision)`: Generated IDs collide with existing IDs (e.g., `"a1-01-d1"` vs `"a1-01-Dialogue-0"`) — existing tests check `item.id` values → **recovery**: The flat accessor must produce the **exact same** `id` values as the current flat data. This requires the accessor to know the original section ordering and use the original `id` format, not generate new ones.
- `FAILURE(audioUrl_loss)`: Flat data has `audioUrl?: string` on `SectionItem` — nested content provides no audio URLs → **recovery**: The `audioUrl` will be `undefined` on all flattened items (acceptable — audio is handled separately via TTS API).

**Critical constraint**: The flat accessor must produce output **identical** to the current `items[]` format for the existing lesson page template to render without changes. This is the contract that keeps Phase 1 non-breaking.

**Observable states during this step**:
- Developer sees: Each `SectionDefinition` instance has a working `items` getter
- TypeScript: Getter returns `SectionItem[]` — type checks pass
- Tests: Not run yet (no behavioral change confirmed)

---

### STEP 4: Migrate Lesson a1-01 (Full Data)

**Actor**: Developer (Agent)
**Action**: Convert the `a1-01` lesson (lines 90-250 of `curriculum.ts`) from flat sections to nested structure, using `lesson-01.json` as the authoritative source:

- **Dialogue section** (currently 4 items) → 2 scenes × 5 lines (from `lesson-01.json`)
- **Vocabulary section** (currently 5 items) → 3 categories (Salutations, Nouns, Key Words) with words (from `lesson-01.json`)
- **Pronouns section** (currently 4 items) → 12 pronouns (from `lesson-01.json`)
- **Expressions section** (currently 2 items) → 16 expressions (from `lesson-01.json`)
- **Grammar section** (currently 2 items) → 3 topics with examples (from `lesson-01.json`)
- **Activities section** (currently 2 items with `activityType`) → 5 activities (from `lesson-01.json`)

**Input**: `curriculum.ts` a1-01 (lines 90-250), `lesson-01.json` (full file)
**Output on SUCCESS**: `a1-01` lesson uses nested structure; `items` accessor produces flat items that match the current rendering
**Output on FAILURE**:
- `FAILURE(data_divergence)`: `lesson-01.json` and `curriculum.ts` contain different data for the same section (e.g., different Arabic text, different number of items) → **recovery**: `lesson-01.json` is the authoritative source (per ADR-007 §7.5). Rewrite `curriculum.ts` a1-01 to match `lesson-01.json` exactly, then verify the flat accessor still produces valid `SectionItem[]`.
- `FAILURE(item_count_mismatch)`: The current flat data has 4 dialogue items but `lesson-01.json` has 10 dialogue lines (2 scenes × 5 lines) — the `items` accessor must produce 10 items, not 4 → **recovery**: Phase 1 renders flat items as-is (more items visible, no grouping). The nested structure (scenes, speaker names) is available but not displayed. Update the template in Phase 2 to render scenes with speaker names. Existing tests check "renders section tabs" and "tab container uses pill-style classes" — these do NOT check item count. The test `renders the lesson heading with level and lesson params` checks the heading text, not content. This is acceptable for Phase 1.

**Observable states during this step**:
- Developer sees: `a1-01` lesson in `curriculum.ts` with nested structure (dialogue scenes, vocab categories, 12 pronouns, 16 expressions, 3 grammar topics, 5 activities)
- TypeScript: All types resolve; `get items()` returns `SectionItem[]`
- Tests: `LessonPage.test.ts` must still pass (tabs render, navigation works, 404 works)

---

### STEP 5: Migrate Remaining 7 Lessons (Flat Data)

**Actor**: Developer (Agent)
**Action**: Convert a1-02, a2-01, a2-02, b1-01, b2-01, c1-01, c2-01 from flat `items[]` to nested structure. These lessons have simpler data (no activities beyond `listen-translate`):

- Dialogue sections: Convert `items[]` → `scenes: [{ lines: items.map(...) }]` (single scene)
- Vocabulary sections: Convert `items[]` → `categories: [{ words: items }]` (single category)
- Pronouns sections: Convert `items[]` → `pronouns: [{ arabic, english }]` (no examples for most)
- Expressions sections: Convert `items[]` → `expressions: [{ arabic, english }]`
- Grammar sections: Convert `items[]` → `topics: [{ name, examples: items }]` (single topic)
- Activities sections: Convert to empty `activities: []` (no rich activities for these lessons)

**Input**: Lines 252-755 of `curriculum.ts` (remaining 7 lessons)
**Output on SUCCESS**: All 8 lessons use nested structure; all `items` accessors produce valid flat `SectionItem[]`
**Output on FAILURE**:
- `FAILURE(section_name_mismatch)`: The lesson page gets section names from `lesson.sections.map(s => s.name)` (line 48 of `[lesson].vue`) — if the nested model changes `name` to something else, tabs break → **recovery**: `SectionDefinition.name` remains a plain `string` (unchanged from current model).

**Observable states during this step**:
- Developer sees: `curriculum.ts` has all 8 lessons in nested structure
- TypeScript: All types resolve; no runtime errors
- Tests: `LessonPage.test.ts` and `LevelIndex.test.ts` must pass

---

### STEP 6: Update ActivityType and Lookup Helpers

**Actor**: Developer (Agent)
**Action**: Expand `ActivityType` to include `"translate-to-english"`, `"translate-to-arabic"`, `"introduce-characters"` (from `lesson-01.json`). Keep `"fill-blank"`, `"matching"`, `"listen-translate"`, `"role-play"`. Add `getActivitiesByLesson(lessonId: string): ActivityDefinition[]` helper.

**Input**: Current `ActivityType` (lines 61-65 of `curriculum.ts`)
**Output on SUCCESS**: Expanded `ActivityType` union; new `getActivitiesByLesson()` helper returns activities for a lesson ID
**Output on FAILURE**:
- `FAILURE(helper_unused)`: `getActivitiesByLesson()` is defined but never called by any component — dead code → **recovery**: Accept as Phase 1 scaffolding (activities rendering is deferred per PRD §2.6). Document as "deferred — used when activity rendering component is built."
- `FAILURE(activityType_collision)`: New activity types collide with existing `SectionItem.activityType` values → **recovery**: The new `ActivityType` is a separate type from `SectionItem.activityType`. The existing `SectionItem.activityType` continues to work for the flat "Activities" tab sections. These are two separate type systems — the new one is for `ActivityDefinition[]`.

**Observable states during this step**:
- Developer sees: Expanded `ActivityType` union (8 values)
- TypeScript: No errors
- Tests: Not directly tested (activities rendering is deferred)

---

### STEP 7: Verify Tests Pass

**Actor**: Developer (Agent)
**Action**: Run `./run-tests.sh` (or equivalent: `pnpm typecheck`, `pnpm test`, `npx vitest --config vitest.component.config.ts`)

**Input**: Restructured `curriculum.ts`
**Output on SUCCESS**: All existing tests pass without modification
**Output on FAILURE**:
- `FAILURE(tab_count_mismatch)`: The lesson page computes `sectionTabs` from `lesson.sections.map(s => s.name)` (line 48). If the a1-01 lesson now has 6 sections (dialogue, vocabulary, pronouns, expressions, grammar, activities) instead of 6 (same count), the tab rendering is unchanged. But if the number of sections changes, tab count changes → **recovery**: Verify the section count matches. a1-01 currently has 6 sections (Dialogue, Vocabulary, Pronouns, Expressions, Grammar, Activities) in both models — no change expected.
- `FAILURE(item_count_visible_change)`: The lesson page renders `currentSectionItems` — if the flat accessor produces different item counts, the visible content changes (more dialogue lines, more vocabulary items) → **recovery**: This is acceptable for Phase 1 (more content is visible, no less). The tests check tab rendering, not item count.
- `FAILURE(extractLearningTags_breakage)`: `LevelIndex.test.ts` may use `section.items[0]` for `extractLearningTags` (per ADR-007 §7.3) — if the flat accessor does not preserve the first-item access pattern, the level index breaks → **recovery**: Verify the flat accessor preserves `items[0]` having the same `arabic`, `english`, `notes` as the current first item.

**Observable states during this step**:
- Developer sees: Test results (pass/fail)
- Tests: `LessonPage.test.ts` (tab rendering, navigation, 404), `LevelIndex.test.ts` (level heading, lesson list, breadcrumbs)
- CI: `./run-tests.sh` passes (lint, typecheck, all tests)

---

### STEP 8: Write New Tests for Nested Model

**Actor**: Developer (Agent)
**Action**: Write tests for the new nested model features (per PRD §1.7):
- `SectionDefinition.items` accessor produces correct flat items for each section type (dialogue, vocabulary, pronouns, expressions, grammar)
- `LessonDefinition.activities` returns correct activity definitions for a1-01
- `getActivitiesByLesson()` returns empty array for lessons without activities
- `competencies` field accessible on `LessonDefinition`

**Input**: Restructured `curriculum.ts` (Phase 1 complete)
**Output on SUCCESS**: New tests in `frontend/tests/` (not in source directories) — all pass
**Output on FAILURE**:
- `FAILURE(test_location_violation)`: Tests placed in `frontend/app/data/` or other source directories → **recovery**: Per AGENTS.md §3, all test files must be in `frontend/tests/` or `backend/tests/`.
- `FAILURE(tautological_mock)`: Tests mock the `items` getter and assert the mock's return value → **recovery**: Tests must assert the getter's **behavioral output** (correct `SectionItem[]` structure), not the mock.

**Observable states during this step**:
- Developer sees: New test files in `frontend/tests/`
- Tests: All new + existing tests pass
- CI: `./run-tests.sh` passes

---

### ABORT_CLEANUP: Rollback

**Triggered by**: Any step that cannot be recovered within the same session, or if tests fail and the root cause cannot be identified.

**Actions** (in order):
1. Revert `curriculum.ts` to the pre-modification state (git checkout)
2. Verify `./run-tests.sh` passes on the reverted state (baseline confirmed)
3. Document the failure reason in the workflow spec under "Reality Checker Findings"

**What developer sees**: `curriculum.ts` is back to the original flat model. No behavioral change to the application.

---

## State Transitions

```
[Not Started] -> (Step 1-7 succeed) -> [Complete: curriculum.ts restructured, all tests pass]
[Not Started] -> (any step fails, cannot recover) -> [Aborted: curriculum.ts reverted]
```

---

## Handoff Contracts

### Step 3 (Flat Accessor) → Step 4 (a1-01 Migration)

**Handoff**: The flat accessor must be functional before migrating a1-01 data.

**Payload**:
```typescript
{
  "sectionType": "dialogue" | "vocabulary" | "pronouns" | "expressions" | "grammar",
  "nestedContent": SectionContent,
  "flattenedItems": SectionItem[]
}
```

**Success**: `SectionDefinition.items` returns `SectionItem[]` for all 5 section types
**Failure**:
```json
{
  "error": "FLAT_ACCESSOR_BROKEN",
  "sectionType": "string",
  "detail": "Which section type's flat accessor is broken",
  "recovery": "Implement the items getter for this section type"
}
```

### Step 4 (a1-01 Migration) → Step 5 (Remaining Lessons)

**Handoff**: a1-01 must have a working `items` accessor before migrating other lessons.

**Payload**:
```typescript
{
  "lessonId": "a1-01",
  "sections": SectionDefinition[],
  "activities": ActivityDefinition[],
  "sectionsHaveWorkingItems": boolean,
  "activitiesCount": number,
  "competencies": string[] | undefined
}
```

**Success**: a1-01 lesson has nested structure with working `items` accessor and 5 activities
**Failure**:
```json
{
  "error": "A1_01_MIGRATION_FAILED",
  "detail": "Which section or activity failed migration",
  "recovery": "Fix the section data mapping, re-run Step 4"
}
```

### Step 7 (Tests) → Step 8 (New Tests)

**Handoff**: Existing tests must pass before writing new tests for the nested model.

**Payload**:
```json
{
  "existingTestsPass": boolean,
  "failedTests": string[],
  "failureReasons": string[]
}
```

**Success**: All existing tests pass
**Failure**:
```json
{
  "error": "EXISTING_TESTS_FAIL",
  "detail": "Which existing tests failed and why",
  "recovery": "Fix the flat accessor or the data mapping; do NOT modify existing tests (AGENTS.md §2.1)"
}
```

---

## Cleanup Inventory

| Resource | Created at Step | Destroyed by | Destroy method |
|---|---|---|---|
| New interface definitions in `curriculum.ts` | Step 1 | ABORT_CLEANUP | git checkout `curriculum.ts` |
| Restructured `SectionDefinition` / `LessonDefinition` | Step 2 | ABORT_CLEANUP | git checkout `curriculum.ts` |
| Flat `items` getter implementations | Step 3 | ABORT_CLEANUP | git checkout `curriculum.ts` |
| Migrated a1-01 lesson data | Step 4 | ABORT_CLEANUP | git checkout `curriculum.ts` |
| Migrated 7 remaining lesson data | Step 5 | ABORT_CLEANUP | git checkout `curriculum.ts` |
| Expanded `ActivityType` + `getActivitiesByLesson()` | Step 6 | ABORT_CLEANUP | git checkout `curriculum.ts` |
| New test files in `frontend/tests/` | Step 8 | ABORT_CLEANUP | Delete test files (not in source dirs, safe to remove) |

---

## Reality Checker Findings

| # | Finding | Severity | Spec section affected | Resolution |
|---|---|---|---|---|
| RC-1 | `DialogueLine` does not include `transliteration`. Users lose transliteration for dialogue items across all 8 lessons. | Low | Step 3 (Flat Accessor) | Resolved: User decided to drop transliteration entirely. `SectionItem.transliteration` remains in the existing interface but the flat accessor produces `undefined`. |
| RC-2 | `lesson-01.json` dialogue has 10 lines (2 scenes × 5 lines) but current `curriculum.ts` has 4 dialogue items. The visible content will change (more items rendered). Existing tests do NOT check item count. | Medium | Step 4 (a1-01 Migration) | Acceptable for Phase 1. Flag for Phase 2 (UI rendering update). |
| RC-3 | `lesson-01.json` activities use `competency_map` (snake_case) while the PRD uses `competencyMap` (camelCase). The TypeScript interface must use camelCase (`competencyMap`) but the JSON uses snake_case. | Low | Step 4 (a1-01 Migration) | Resolved: User decided to use the snake_case keys as-is. During migration, each snake_case key is manually mapped to its `competencies[]` index. The `competencyMap` field in `ActivityDefinition` stores these mappings explicitly. |
| RC-4 | `curriculum.ts` `SectionItem` has `audioUrl?: string` — the nested model provides no audio URLs. The flat accessor will produce `audioUrl: undefined` for all items. | Low | Step 3 (Flat Accessor) | Resolved: User decided to remove `audioUrl` from `SectionItem` interface. Audio is handled separately via TTS API (`useAudioModule`). No user-visible change. |

---

## Test Cases

| Test | Trigger | Expected behavior |
|---|---|---|
| TC-01: Happy path — All 8 lessons migrate with working flat accessors | Steps 1-7 complete | `./run-tests.sh` passes (lint, typecheck, all tests) |
| TC-02: a1-01 has 5 activities accessible via `getActivitiesByLesson('a1-01')` | Step 4 complete | Returns 5 `ActivityDefinition` objects with correct types |
| TC-03: Non-a1-01 lessons return empty activities array | Step 6 complete | `getActivitiesByLesson('a1-02')` returns `[]` |
| TC-04: Flat accessor produces identical `SectionItem[]` for all 8 lessons | Step 3-5 complete | `section.items` for each section matches the current flat data structure (arabic, english, notes present where applicable; transliteration is undefined) |
| TC-05: Existing tests pass without modification | Step 7 | `LessonPage.test.ts` (tab rendering, navigation, 404) and `LevelIndex.test.ts` (level heading, lesson list) pass |
| TC-06: New tests for nested model features pass | Step 8 | Tests for `SectionDefinition.items`, `LessonDefinition.activities`, `getActivitiesByLesson()`, `competencies` all pass |
| TC-14: Flat accessor count matches nested content count for every section | Step 5 complete | `section.items.length === countNestedItems(section.content)` for all 8 lessons, all section types. Fails in CI if a developer adds nested content without updating the flat accessor. |
| TC-07: Dialogue section with 10 lines renders 10 items (not 4) | Step 4 | The lesson page renders 10 dialogue items instead of 4 (visible change, acceptable for Phase 1) |
| TC-08: Pronouns section with 12 pronouns renders 12 items (not 4) | Step 4 | The lesson page renders 12 pronoun items instead of 4 (visible change, acceptable for Phase 1) |
| TC-09: Vocabulary section with 3 categories renders 9 words (not 5) | Step 4 | The lesson page renders 9 vocabulary items instead of 5 (visible change, acceptable for Phase 1) |
| TC-10: Expressions section with 16 expressions renders 16 items (not 2) | Step 4 | The lesson page renders 16 expression items instead of 2 (visible change, acceptable for Phase 1) |
| TC-11: Grammar section with 3 topics renders 9 examples (not 2) | Step 4 | The lesson page renders 9 grammar items instead of 2 (visible change, acceptable for Phase 1) |
| TC-12: Competencies accessible on a1-01 | Step 4 | `getLessonById('a1-01')?.competencies` returns 5 strings matching `lesson-01.json` |
| TC-13: `extractLearningTags` still works via `section.items[0]` | Step 5 | `LevelIndex.test.ts` passes (level index renders correctly) |

---

## Assumptions

| # | Assumption | Where verified | Risk if wrong |
|---|---|---|---|
| A1 | `lesson-01.json` is the authoritative source for a1-01 data (per ADR-007 §7.5). | ADR-007 §7.5 explicitly states this. | If `curriculum.ts` data is more accurate (e.g., has transliteration that `lesson-01.json` lacks), the migration would lose that data. |
| A2 | The flat `items` accessor must produce **identical** `SectionItem[]` output for existing tests to pass. | ADR-007 §7.3 states "The flat accessor must produce output identical to the current structure." | If the output differs (even slightly), the lesson page template will render differently, potentially breaking the UI. |
| A3 | No existing component imports `curriculum.ts` directly accesses `section.items` beyond the lesson page template. | `curriculum.ts` lookup helpers (`getLessonById`, `getLevelByCode`, `getLevelForLesson`, `getAllLessons`, `getTotalLessonCount`) are the only consumers. | If another file accesses `section.items`, it will break when the flat accessor changes. |
| A4 | The `lesson-01.json` activities (5 types) are the complete set — no other lessons will need activity types. | `lesson-01.json` only has activities for a1-01. Other 7 lessons have no activities in the JSON. | If future lessons need activities, the `ActivityType` union may need expansion (low risk). |
| A5 | `transliteration` is dropped from the nested model. `SectionItem.transliteration` remains in the existing interface but the flat accessor produces `undefined`. User accepted this tradeoff. | User decision (Q1 resolved). | No regression — transliteration was never used by any component. |
| A6 | `audioUrl` is removed from `SectionItem` interface. Audio is handled separately via `useAudioModule`. | User decision (Q5 resolved). | No regression — no component read `audioUrl`. |
| A7 | The `getActivitiesByLesson()` helper is used only by the deferred activity rendering UI (Phase 2+). | No component currently calls `getActivitiesByLesson()`. | If someone calls it before Phase 2, it returns empty arrays for non-a1-01 lessons (correct behavior). |
| A8 | The 6 section tabs (Dialogue, Vocabulary, Pronouns, Expressions, Grammar, Activities) remain the same count in the nested model. | Both the flat and nested models have 6 sections for a1-01. | If section count changes, tab rendering breaks. |
| A9 | `lesson-01.json` `competency_map` snake_case keys are manually mapped to `competencies[]` indices during migration. The mapping is explicit (key → index), not resolved at runtime. | `lesson-01.json` uses `"read_fluently_with_harakat": 0.4` — mapped to index 0 of `competencies[]`. | If the mapping is wrong, competency tracking will be incorrect. |
| A10 | The `SectionDefinition.name` field is unchanged (plain `string`). | Current model: `SectionDefinition.name: string`. | If `name` is removed or renamed, tab rendering breaks (`section.name` is used for tab labels). |

---

## Open Questions

— No unresolved open questions. All 5 questions resolved by user decisions.

---

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|---|---|---|
| 2026-08-16 | Spec updated: transliteration dropped (Q1 resolved), flat rendering accepted (Q2 resolved), competency_map explicit (Q3 resolved), flat accessor count test added (Q4 resolved), audioUrl removed (Q5 resolved). | RC-1 resolved, RC-3 resolved, RC-4 resolved, RC-5 removed. 3 findings remain (RC-2). 14 test cases. 0 open questions. |

---

## Counts Summary

| Category | Count |
|---|---|
| **Steps** | 8 (Steps 1-8) |
| **Failure paths per step** | 2-3 per step (type errors, import conflicts, data divergence, audioUrl loss, item count mismatch, test location violation, tautological mock, tab count mismatch, extractLearningTags breakage, activityType collision, helper_unused) |
| **Failure modes total** | 16 |
| **Cleanup entries** | 7 (one per step that creates resources) |
| **Test cases** | 14 (TC-01 through TC-14) |
| **Handoff contracts** | 3 (Step 3→4, Step 4→5, Step 7→8) |
| **Assumptions** | 10 (A1-A10) |
| **Open Questions** | 0 (all 5 resolved) |
| **Reality Checker Findings** | 4 (RC-1 resolved, RC-2, RC-3 resolved, RC-4) |
| **Deprecated workflows flagged** | 0 (none — this is a new workflow) |
