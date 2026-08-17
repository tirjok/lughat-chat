# Implementation Issues: Lesson Data Model Alignment

Derived from `docs/workflows/WORKFLOW-lesson-data-model-alignment.md` and `docs/adr/ADR-007-lesson-data-model-alignment.md`.

Each issue is an independently implementable, independently testable vertical slice.
One behavior per issue. No frontend+backend spans unless the spec demands it.

---

## Issue 1: Define New Type Interfaces in curriculum.ts

**File**: `frontend/app/data/curriculum.ts` (top of file, before existing data)

**Spec branch**: WORKFLOW Step 1, ADR-007 §7.1-§7.2

**Acceptance Criteria**:
- `SectionType` union exported: `'dialogue' | 'vocabulary' | 'pronouns' | 'expressions' | 'grammar'`
- `DialogueLine` interface exported with `speaker`, `arabic`, `english`, `notes?`
- `VocabWord` interface exported with `arabic`, `english`, `singular?`, `plural?`
- `SectionContent` discriminated union exported (5 variants by `type`)
- `ActivityType` union expanded: adds `'translate-to-english' | 'translate-to-arabic' | 'introduce-characters'` alongside existing `'listen-translate' | 'role-play' | 'fill-blank' | 'matching'`
- `ActivityContent` discriminated union exported (5 variants by `type`)
:- `ActivityDefinition` interface exported with `id: number`, `type`, `title`, `description`, `order`, `competencyMap`, `maxAttempts`, `content` — IDs match `lesson-01.json` (1–5, integers)
:- Existing `SectionItem.activityType` values (`'listen-translate' | 'role-play' | 'fill-blank' | 'matching'`) are unchanged — these are a separate type system from the new `ActivityDefinition.type` union (which adds 3 new types). The two do not collide.
- All existing exports (`CurriculumLevel`, `LessonDefinition`, `SectionDefinition`, `SectionItem`, `getLessonById`, etc.) remain unchanged and importable

**Dependencies**: None (pure type definitions, no data)

**Test Cases**: N/A (type definitions validated by TypeScript compiler — this IS the test)

**Reference**: `WORKFLOW-lesson-data-model-alignment.md` Step 1; `ADR-007` §7.1-§7.2

---

## Issue 2: Restructure SectionDefinition and LessonDefinition Interfaces

**File**: `frontend/app/data/curriculum.ts`

**Spec branch**: WORKFLOW Step 2, ADR-007 §7.2

**Acceptance Criteria**:
- `SectionDefinition` now has: `name: string`, `type?: SectionType`, `title?: string`, `content: SectionContent`
- `SectionDefinition` has a getter `get items(): SectionItem[]` (computed property syntax, NOT a static field)
- `LessonDefinition` now has: `competencies?: string[]` (optional), `sequence?: number` (optional), `activities: ActivityDefinition[]` (required, non-empty array)
- Existing `LessonDefinition` fields (`id`, `title`, `arabicTitle`, `description`, `sections`) are preserved
- Existing `SectionDefinition` field `name: string` is preserved (unchanged — used for tab labels)
- TypeScript compiler reports zero errors on interface definitions alone (no data yet)
- All existing lookup helpers (`getLessonById`, `getLevelByCode`, etc.) remain type-correct

**Dependencies**: Issue 1 (new type interfaces must exist first)

**Test Cases**: N/A (interface definitions validated by TypeScript compiler)

**Reference**: `WORKFLOW-lesson-data-model-alignment.md` Step 2; `ADR-007` §7.2

---

## Issue 3: Implement Flat `items` Accessor for All 5 Section Types

**File**: `frontend/app/data/curriculum.ts`

**Spec branch**: WORKFLOW Step 3, ADR-007 §7.3

**Acceptance Criteria**:
:- **CRITICAL**: `id` must match the **current** flat data format (e.g., `"a1-01-d1"`, `"a1-01-d2"`, `"a1-01-v1"`, `"a1-01-p1"`, `"a1-01-e1"`, `"a1-01-g1"`), NOT `"${sectionName}-${index}"`. The accessor must know the lesson ID prefix and section ordering to generate IDs identical to the current flat data. This is the backward-compatibility contract — any code that reads `item.id` will break if IDs change. (See workflow spec Step 3, `FAILURE(id_collision)`.)
- `dialogue` section: `items` getter flattens `scenes[].lines[]` to `SectionItem[]` where `id` matches the current flat data format (e.g., `"a1-01-d1"` through `"a1-01-d10"` for 10 lines), `arabic = line.arabic`, `english = line.english`, `notes = line.notes`
- `vocabulary` section: `items` getter flattens `categories[].words[]` to `SectionItem[]` where `id` matches the current flat data format (e.g., `"a1-01-v1"` through `"a1-01-v9"` for 9 words), `arabic = word.arabic`, `english = word.english`, `notes = word.plural ?? word.singular`
- `pronouns` section: `items` getter flattens `pronouns[]` to `SectionItem[]` where `id` matches the current flat data format (e.g., `"a1-01-p1"` through `"a1-01-p12"` for 12 pronouns), `arabic = p.arabic`, `english = p.english`, `notes = p.example`
- `expressions` section: `items` getter flattens `expressions[]` to `SectionItem[]` where `id` matches the current flat data format (e.g., `"a1-01-e1"` through `"a1-01-e16"` for 16 expressions), `arabic = e.arabic`, `english = e.english`
- `grammar` section: `items` getter flattens `topics[].examples[]` to `SectionItem[]` where `id` matches the current flat data format (e.g., `"a1-01-g1"` through `"a1-01-g9"` for 9 examples), `arabic = ex.arabic`, `english = ex.english`, `notes = topic.description`
- `activities` section: `items` getter passes through existing flat `items[]` unchanged
- All 5 section types produce `SectionItem[]` with correct structure (arabic, english, notes present where applicable)
- `transliteration` is NOT produced by the flat accessor (undefined) — this is acceptable per RC-1
- `audioUrl` is NOT produced by the flat accessor (undefined) — this is acceptable per RC-4
- **Transliteration check**: every flattened `SectionItem.transliteration` is `undefined` (the nested model provides no transliteration data, per RC-1 resolution)
- **AudioUrl check**: every flattened `SectionItem.audioUrl` is `undefined` (audio is handled via TTS API, per RC-4 resolution)
:- **TC-04**: Flat accessor produces `SectionItem[]` with `id` values identical to the current flat data for all 8 lessons (structure-level validation).
:- **TC-14**: Flat accessor item count matches nested content count for every section across all 8 lessons.
**Dependencies**: Issue 2 (restructured interfaces must exist)

**Test Cases**:
- TC-04: Flat accessor produces identical `SectionItem[]` for all 8 lessons (structure-level validation)
- TC-14: Flat accessor count matches nested content count for every section

**Reference**: `WORKFLOW-lesson-data-model-alignment.md` Step 3; `ADR-007` §7.3

---

## Issue 4: Migrate Lesson a1-01 to Nested Structure (Full Data)

**File**: `frontend/app/data/curriculum.ts` (a1-01 lesson data, lines ~90-250)

**Spec branch**: WORKFLOW Step 4, ADR-007 §7.5

**Acceptance Criteria**:
- Dialogue section: 2 scenes × 5 lines (from `lesson-01.json`) stored as `scenes: [{ label, lines: DialogueLine[] }]`
- Vocabulary section: 3 categories (Salutations, Nouns, Key Words) with 9 total words stored as `categories: [{ label, words: VocabWord[] }]`
:- `competencies: string[]` set to exactly 5 strings from `lesson-01.json.competencies` (lines 7-12): `["Can read fluently short paragraphs with harakat", "Good understanding of basic salutations", "Ability to use pronouns correctly", "Differentiates between the pronouns used when talking to the different genders", "Grasps the method of forming nominative sentences with pronouns + nouns"]`
- Expressions section: 16 expressions stored as `expressions: [{ arabic, english }]`
:- **Note**: The flat accessor drops `speaker` and `scene` labels from `DialogueLine` (by design — the flat `SectionItem` has no `speaker` field). Rendering scenes with speaker names requires a Phase 2 template rewrite. This is the "zombie structure" risk acknowledged in ADR-007 §7.3.
- Activities: 5 activities (from `lesson-01.json`) stored in `LessonDefinition.activities` array with correct `ActivityDefinition` structure
- `sequence: number` set to `1` matching `lesson-01.json.sequence`
- Flat `items` accessor on each section produces correct `SectionItem[]` (verified by Issue 3's accessor)
- `getActivitiesByLesson('a1-01')` returns 5 `ActivityDefinition` objects (TC-02)
- TypeScript compiler reports zero errors

:- **TC-07**: a1-01 dialogue section's `items` getter produces exactly 10 `SectionItem[]` entries (matching 2 scenes × 5 lines from `lesson-01.json`), not the current 4. **TC-08**: a1-01 pronouns section's `items` getter produces exactly 12 entries (matching 12 pronouns from JSON), not the current 4. **TC-09**: a1-01 vocabulary section's `items` getter produces exactly 9 entries (matching 3 categories with 9 total words), not the current 5. **TC-10**: a1-01 expressions section's `items` getter produces exactly 16 entries (matching 16 expressions from JSON), not the current 2. **TC-11**: a1-01 grammar section's `items` getter produces exactly 9 entries (matching 3 topics with 9 total examples), not the current 2. **TC-12**: `getLessonById('a1-01')?.competencies` returns exactly 5 strings matching `lesson-01.json.competencies`.
**Reference**: `WORKFLOW-lesson-data-model-alignment.md` Step 4; `ADR-007` §7.5

---

## Issue 5: Migrate Remaining 7 Lessons to Nested Structure

**File**: `frontend/app/data/curriculum.ts` (a1-02, a2-01, a2-02, b1-01, b2-01, c1-01, c2-01)

**Spec branch**: WORKFLOW Step 5, ADR-007 §7.5

**Acceptance Criteria**:
- a1-02: Dialogue (2 lines), Vocabulary (5 words, 1 category), Pronouns (1 pronoun), Expressions (1 expression), Grammar (1 example, 1 topic), Activities (1 listen-translate) → all converted to nested form
- a2-01: Dialogue (2 lines), Vocabulary (5 words, 1 category), Pronouns (2 pronouns), Expressions (1 expression), Grammar (1 example, 1 topic), Activities (1 listen-translate) → all converted
- a2-02: Dialogue (2 lines), Vocabulary (5 words, 1 category), Pronouns (empty), Expressions (1 expression), Grammar (1 example, 1 topic), Activities (1 listen-translate) → all converted
- b1-01: Dialogue (2 lines), Vocabulary (5 words, 1 category), Pronouns (empty), Expressions (1 expression), Grammar (1 example, 1 topic), Activities (1 listen-translate) → all converted
:- `getLessonById('a1-02')?.competencies` is `undefined` (not `[]` or `null`) — per ADR-007 §7.1, these fields are optional and absent from non-a1-01 lessons.
- c1-01: Dialogue (1 line), Vocabulary (5 words, 1 category), Pronouns (empty), Expressions (empty), Grammar (1 example, 1 topic), Activities (1 listen-translate) → all converted
- c2-01: Dialogue (1 line), Vocabulary (5 words, 1 category), Pronouns (empty), Expressions (empty), Grammar (1 example, 1 topic), Activities (1 listen-translate) → all converted
- All 7 lessons have empty `activities: []` (no rich activities in JSON for these lessons)
- All 7 lessons have no `competencies` or `sequence` fields (absent, not null)
- Flat `items` accessor on every section of every lesson produces valid `SectionItem[]`
- `getActivitiesByLesson()` returns `[]` for all 7 non-a1-01 lessons (TC-03)
- `LessonPage.test.ts` passes (tab rendering, navigation, 404 — TC-05)
- `LevelIndex.test.ts` passes (level heading, lesson list — TC-05, TC-13)
- TypeScript compiler reports zero errors

**Dependencies**: Issue 4 (a1-01 must be migrated first — handoff contract: a1-01 must have working `items` accessor before migrating other lessons)

**Test Cases**:
:- **TC-competencies-undefined**: `getLessonById('a1-02')?.competencies` is `undefined` (not `[]` or `null`) for all 7 non-a1-01 lessons.
**Reference**: `WORKFLOW-lesson-data-model-alignment.md` Step 5; `ADR-007` §7.5

---

## Issue 6: Add `getActivitiesByLesson()` Helper and Export Activity Lookup

**File**: `frontend/app/data/curriculum.ts` (lookup helpers section, lines ~757-786)

**Spec branch**: WORKFLOW Step 6, PRD Task 1.6

**Acceptance Criteria**:
- New function `getActivitiesByLesson(lessonId: string): ActivityDefinition[]` exported
- Returns all activities from a1-01 (5 items) when called with `'a1-01'`
- Returns empty array `[]` when called with any other lesson ID (a1-02, a2-01, a2-02, b1-01, b2-01, c1-01, c2-01)
- Function is documented as "deferred — used when activity rendering component is built" (per PRD §2.6)
:- Function must include JSDoc: `/** @deprecated — used when activity rendering component is built (Phase 2+). Returns 5 activities for 'a1-01', [] for all others. */`
- TypeScript compiler reports zero errors

**Dependencies**: Issue 5 (all lessons must have `activities` field on `LessonDefinition` before the helper can iterate over them)

**Test Cases**:
- TC-02: `getActivitiesByLesson('a1-01')` returns 5 `ActivityDefinition` objects
- TC-03: `getActivitiesByLesson('a1-02')` returns `[]`

**Reference**: `WORKFLOW-lesson-data-model-alignment.md` Step 6; `ADR-007` §7.4

---

---

## Issue 8: Run Full Test Suite and Verify No Regression

**File**: N/A (verification step only)

**Spec branch**: WORKFLOW Step 7

**Acceptance Criteria**:
- Run `./run-tests.sh` (or equivalent: `pnpm typecheck`, `pnpm test`, `npx vitest --config vitest.component.config.ts`)
- All existing tests pass without modification:
  - `LessonPage.test.ts`: tab rendering, navigation, 404 handling (TC-05)
  - `LevelIndex.test.ts`: level heading, lesson list (TC-05, TC-13)
- No new lint errors introduced
- No TypeScript errors introduced
- **tab_count_mismatch check**: a1-01 still produces 6 section tabs (Dialogue, Vocabulary, Pronouns, Expressions, Grammar, Activities) — same count as before migration
- **extractLearningTags check**: `LevelIndex.test.ts` passes — `section.items[0]` still has valid `arabic`, `english`, `notes`
- **item_count_visible_change**: the lesson page renders more items for a1-01 (acceptable — more content visible, no less)

**Dependencies**: Issues 1–7 (all implementation must be complete)

**Test Cases**:
- TC-05: Existing tests pass without modification
**Reference**: `WORKFLOW-lesson-data-model-alignment.md` Step 7
## Spec Branch → Issue Mapping Table

| Spec Branch | Issue(s) | Status |
|---|---|---|
| Step 1: Define New Interfaces | Issue 1 | Pure frontend, no data |
| Step 2: Restructure Interfaces | Issue 2 | Pure frontend, depends on Issue 1 |
| Step 3: Flat Accessor | Issue 3 | Pure frontend, depends on Issue 2 |
| Step 4: Migrate a1-01 | Issue 4 | Pure frontend, depends on Issue 3 |
| Step 5: Migrate 7 Lessons | Issue 5 | Pure frontend, depends on Issue 4 |
| Step 6: Activity Helper | Issue 6 | Pure frontend, depends on Issue 5 |
| Step 7: Verify Tests Pass | Issue 8 | Standalone verification gate |
| Step 8: New Tests | Issue 7 | Pure frontend, depends on Issue 6 |

The handoff contracts (Step 3→4, Step 4→5, Step 7→8) are satisfied by the dependency ordering: Issues 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8.



| Test Case | Covers | Issue |
|---|---|---|
| TC-01: All 8 lessons migrate with working flat accessors | Full workflow validation | Issue 5 (integration of Issues 1-7) |
| TC-02: a1-01 has 5 activities via `getActivitiesByLesson` | Activity data + helper | Issue 4 + Issue 6 |
| TC-03: Non-a1-01 lessons return empty activities | Helper correctness | Issue 6 |
| TC-04: Flat accessor produces identical `SectionItem[]` | Accessor correctness (ID match) | Issue 3 + Issue 7 |
| TC-05: Existing tests pass without modification | No regression | Issue 8 (verification gate) |
| TC-06: New nested model tests pass | New feature coverage | Issue 7 |
| TC-07: Dialogue 10 lines renders 10 items | a1-01 dialogue migration (exact count) | Issue 4 |
| TC-08: Pronouns 12 pronouns renders 12 items | a1-01 pronouns migration (exact count) | Issue 4 |
| TC-09: Vocabulary 3 categories renders 9 words | a1-01 vocab migration (exact count) | Issue 4 |
| TC-10: Expressions 16 expressions renders 16 items | a1-01 expressions migration (exact count) | Issue 4 |
| TC-11: Grammar 3 topics renders 9 examples | a1-01 grammar migration (exact count) | Issue 4 |
| TC-12: Competencies accessible on a1-01 | a1-01 metadata (exact 5 strings) | Issue 4 |
| TC-13: `extractLearningTags` via `section.items[0]` | Flat accessor preserves first-item | Issue 5 |
| TC-14: Flat accessor count matches nested count | Accessor correctness (count invariant) | Issue 3 + Issue 7 |

### Resistant Spec Branches (Design Flaws) — RESOLVED

**Finding**: Issue 3 originally specified `id = "${sectionName}-${lineIndex}"` which would produce IDs like `"Dialogue-0"` — completely different from the current flat data IDs (`"a1-01-d1"`). This would silently break any code depending on `item.id` values.
**Resolution**: Issue 3's acceptance criteria now explicitly require the flat accessor to produce IDs matching the **current** flat data format (e.g., `"a1-01-d1"`, `"a1-01-v1"`, etc.). The accessor must know the lesson ID prefix and section ordering. This is the backward-compatibility contract per the workflow spec's `FAILURE(id_collision)` recovery path.

### Remaining Spec Branches (No Design Flaws)

Steps 1–2, 4–8 decompose cleanly into vertical slices:

- Steps 1–3 are pure type/interface work on `curriculum.ts` — no UI changes, no backend, no handoff contracts needed beyond TypeScript compilation.
- Steps 4–5 are data migration within a single file (`curriculum.ts`) — no component changes required (Phase 1 is non-breaking).
- Step 6 is a single helper function — independently testable.
- Step 7 (Issue 8) is test verification — a standalone gate.
- Step 8 (Issue 7) is new tests — covers all new behaviors.

The handoff contracts (Step 3→4, Step 4→5, Step 7→8) are satisfied by the dependency ordering: Issues 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8.
