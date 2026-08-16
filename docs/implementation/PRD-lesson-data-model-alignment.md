# Implementation Plan: Lesson Data Model Alignment

**Based on:** ADR-007 (Accepted 2026-08-16)
**Scope:** `frontend/app/data/curriculum.ts` restructuring + `[lesson].vue` template update
**Estimated effort:** 3-4 feature commits (TDD cycles)

---

## Phase 1: Data Model Restructuring (curriculum.ts only)

**Goal:** Rewrite `curriculum.ts` to use the nested structure from `lesson-01.json` while preserving backward compatibility for existing UI consumers.

### Task 1.1: Define new interfaces

**File:** `frontend/app/data/curriculum.ts` (top of file, before existing interfaces)

Add the following type definitions:

```typescript
// Section types and content unions
type SectionType = 'dialogue' | 'vocabulary' | 'pronouns' | 'expressions' | 'grammar'

interface DialogueLine {
  speaker: string
  arabic: string
  english: string
  notes?: string
}

interface VocabWord {
  arabic: string
  english: string
  singular?: string
  plural?: string
}

interface SectionContent {
  type: SectionType
  scenes?: { label: string; lines: DialogueLine[] }[]
  categories?: { label: string; words: VocabWord[] }[]
  pronouns?: { arabic: string; english: string; example: string }[]
  expressions?: { arabic: string; english: string }[]
  topics?: { name: string; description: string; examples: { arabic: string; english: string }[] }[]
}

// Activity types and content unions
type ActivityType =
  | 'listen-translate'
  | 'translate-to-english'
  | 'translate-to-arabic'
  | 'introduce-characters'
  | 'role-play'
  | 'fill-blank'
  | 'matching'

interface ListenTranslateContent {
  dialogue: Record<string, { label: string; arabic: string; english_expected: string }>
}

interface TranslateToEnglishContent {
  sentences: { arabic: string; english_expected: string }[]
}

interface TranslateToArabicContent {
  sentences: { english: string; arabic_expected: string }[]
}

interface IntroduceCharactersContent {
  characters: { name: string; arabic: string; gender: string; sentences: { english: string; arabic_expected: string }[] }[]
}

interface RolePlayContent {
  scenario: string
  expectedElements: string[]
}

type ActivityContent =
  | { type: 'listen-translate'; dialogue: ListenTranslateContent['dialogue'] }
  | { type: 'translate-to-english'; sentences: TranslateToEnglishContent['sentences'] }
  | { type: 'translate-to-arabic'; sentences: TranslateToArabicContent['sentences'] }
  | { type: 'introduce-characters'; characters: IntroduceCharactersContent['characters'] }
  | { type: 'role-play'; scenario: string; expectedElements: string[] }

interface ActivityDefinition {
  id: number
  type: ActivityType
  title: string
  description: string
  order: number
  competencyMap: Record<string, number>
  maxAttempts: number
  content: ActivityContent
}
```

### Task 1.2: Restructure `SectionDefinition` and `LessonDefinition`

**File:** `frontend/app/data/curriculum.ts`

Replace existing `SectionDefinition` and `LessonDefinition`:

```typescript
interface SectionDefinition {
  name: string
  type?: SectionType
  title?: string
  content: SectionContent
  /** Flat projection for backward compatibility with existing UI. */
  get items(): SectionItem[]
}

interface LessonDefinition {
  id: string
  title: string
  arabicTitle: string
  description: string
  competencies?: string[]
  sequence?: number
  sections: SectionDefinition[]
  activities: ActivityDefinition[]
}
```

### Task 1.3: Implement the flat `items` accessor

**File:** `frontend/app/data/curriculum.ts` (computed property on each section)

The `items` getter flattens nested content into the existing `SectionItem[]` format:

| Section type | Source | Mapping to `SectionItem` |
|-------------|--------|-------------------------|
| `dialogue` | `scenes[].lines[]` | `id = "${sectionName}-${lineIndex}"`, `arabic = line.arabic`, `english = line.english`, `notes = line.notes`, `speaker = line.speaker` (stored as notes) |
| `vocabulary` | `categories[].words[]` | `id = "${sectionName}-${wordIndex}"`, `arabic = word.arabic`, `english = word.english`, `notes = word.plural ?? word.singular` |
| `pronouns` | `pronouns[]` | `id = "${sectionName}-${index}"`, `arabic = p.arabic`, `english = p.english`, `notes = p.example` |
| `expressions` | `expressions[]` | `id = "${sectionName}-${index}"`, `arabic = e.arabic`, `english = e.english` |
| `grammar` | `topics[].examples[]` | `id = "${sectionName}-${topicIndex}-${exampleIndex}"`, `arabic = ex.arabic`, `english = ex.english`, `notes = topic.description` |
| `activities` (flat) | `items[]` (existing) | Pass-through (no change) |

**Critical:** The `items` accessor must produce output **identical** to the current structure for the existing lesson page template to render without changes. This is the contract that keeps Phase 1 non-breaking.

### Task 1.4: Migrate lesson a1-01 (full data)

**File:** `frontend/app/data/curriculum.ts`

Convert the existing `a1-01` lesson (lines 90-250) from flat sections to nested structure. This is the only lesson with complete data in `lesson-01.json`:

- **Dialogue section:** 2 scenes × 5 lines each → `scenes: [{ label, lines }]`
- **Vocabulary section:** 3 categories (Salutations, Nouns, Key Words) → `categories: [{ label, words: [{ arabic, english, singular, plural }] }]`
- **Pronouns section:** 12 pronouns → `pronouns: [{ arabic, english, example }]`
- **Expressions section:** 16 expressions → `expressions: [{ arabic, english }]`
- **Grammar section:** 3 topics with examples → `topics: [{ name, description, examples }]`
- **Activities section:** 5 activities → `activities: [{ id, type, title, description, order, competencyMap, maxAttempts, content }]`

### Task 1.5: Migrate remaining 7 lessons (flat data)

**File:** `frontend/app/data/curriculum.ts`

Convert a1-02, a2-01, a2-02, b1-01, b2-01, c1-01, c2-01 from flat `items[]` to nested structure. These lessons have simpler data (no activities beyond `listen-translate`):

- Dialogue sections: Convert `items[]` → `scenes: [{ lines: items.map(...) }]`
- Vocabulary sections: Convert `items[]` → `categories: [{ words: items }]` (single category)
- Pronouns sections: Convert `items[]` → `pronouns: [{ arabic, english }]` (no examples for most)
- Expressions sections: Convert `items[]` → `expressions: [{ arabic, english }]`
- Grammar sections: Convert `items[]` → `topics: [{ name, examples: items }]`
- Activities sections: Convert to empty `activities: []` (no rich activities for these lessons)

### Task 1.6: Update `ActivityType` and lookup helpers

**File:** `frontend/app/data/curriculum.ts`

- Expand `ActivityType` to include `"translate-to-english"`, `"translate-to-arabic"`, `"introduce-characters"` (from `lesson-01.json`)
- Keep `"fill-blank"`, `"matching"` (from existing curriculum, not in JSON yet — future activities)
- Keep `"listen-translate"`, `"role-play"` (common to both)
- Update `getLessonById()` if needed (no change expected — ID format unchanged)
- Add `getActivitiesByLesson(lessonId: string): ActivityDefinition[]` helper

### Task 1.7: Write/update tests

**File:** `frontend/tests/components/LessonPage.test.ts`

No behavioral changes expected — the flat `items` accessor must produce identical output. However, write tests for:

- `SectionDefinition.items` accessor produces correct flat items for each section type
- `LessonDefinition.activities` returns correct activity definitions
- `getActivitiesByLesson()` returns empty array for lessons without activities
- `competencies` field accessible on `LessonDefinition`

---

## Phase 2: UI Rendering (template changes)

**Goal:** Render the rich nested content in the lesson page instead of falling back to "Content coming soon."

### Task 2.1: Dialogue section rendering

**File:** `frontend/app/pages/dashboard/level/[level]/[lesson].vue`

Replace the flat `v-for="item in currentSectionItems"` with scene-aware rendering:

```vue
<div v-for="scene in dialogueContent.scenes" :key="scene.label" class="space-y-2">
  <h3 class="text-sm font-semibold text-stone-500">{{ scene.label }}</h3>
  <div v-for="line in scene.lines" :key="line.speaker" class="card">
    <p class="text-xs text-primary-600 font-medium">{{ line.speaker }}</p>
    <p class="font-arabic text-right" dir="rtl">{{ line.arabic }}</p>
    <p v-if="line.english" class="text-sm text-stone-600">{{ line.english }}</p>
    <p v-if="line.notes" class="text-xs text-primary-600 bg-primary-50 dark:bg-primary-900/30 rounded p-2">
      {{ line.notes }}
    </p>
  </div>
</div>
```

### Task 2.2: Vocabulary section rendering

**File:** `frontend/app/pages/dashboard/level/[level]/[lesson].vue`

Render vocabulary grouped by category:

```vue
<div v-for="cat in vocabContent.categories" :key="cat.label" class="space-y-2">
  <h3 class="text-sm font-semibold text-stone-500">{{ cat.label }}</h3>
  <div v-for="word in cat.words" :key="word.arabic" class="card">
    <p class="font-arabic text-right" dir="rtl">{{ word.arabic }}</p>
    <p class="text-sm text-stone-600">{{ word.english }}</p>
    <p v-if="word.plural" class="text-xs text-stone-400">Plural: {{ word.plural }}</p>
  </div>
</div>
```

### Task 2.3: Pronouns section rendering

**File:** `frontend/app/pages/dashboard/level/[level]/[lesson].vue`

```vue
<div v-for="p in pronounContent.pronouns" :key="p.arabic" class="card">
  <p class="font-arabic text-right" dir="rtl">{{ p.arabic }}</p>
  <p class="text-sm text-stone-600">{{ p.english }}</p>
  <p v-if="p.example" class="text-xs text-primary-600 bg-primary-50 dark:bg-primary-900/30 rounded p-2">
    Example: {{ p.example }}
  </p>
</div>
```

### Task 2.4: Grammar section rendering

**File:** `frontend/app/pages/dashboard/level/[level]/[lesson].vue`

```vue
<div v-for="topic in grammarContent.topics" :key="topic.name" class="space-y-3">
  <h3 class="text-base font-semibold text-stone-800">{{ topic.name }}</h3>
  <p class="text-sm text-stone-600">{{ topic.description }}</p>
  <div v-for="ex in topic.examples" :key="ex.arabic" class="card">
    <p class="font-arabic text-right" dir="rtl">{{ ex.arabic }}</p>
    <p class="text-sm text-stone-600">{{ ex.english }}</p>
  </div>
</div>
```

### Task 2.5: Competency display

**File:** `frontend/app/pages/dashboard/level/[level]/[lesson].vue`

Add a competency checklist below the hero section (matching the prototype at `docs/proto/lesson-details.html` lines 259-282):

```vue
<div v-if="currentLessonData?.competencies" class="space-y-2">
  <h3 class="text-sm font-semibold text-stone-500">Learning Objectives</h3>
  <ul class="space-y-1">
    <li v-for="(competency, idx) in currentLessonData.competencies" :key="idx" class="flex items-center gap-2 text-sm text-stone-700">
      <span class="text-green-500">✓</span> {{ competency }}
    </li>
  </ul>
</div>
```

### Task 2.6: Activity rendering (deferred)

**Status:** Deferred to a separate PR.

The activities data structure is ready in Phase 1. Rendering components for each activity type (`translate-to-english`, `translate-to-arabic`, `introduce-characters`, `role-play`) is a significant UI feature that deserves its own implementation cycle with dedicated tests.

For Phase 2, the Activities tab continues showing "Content coming soon" — but the data is now accessible via `currentLessonData.activities`.

---

## Phase 3: Integration (if needed)

### Task 3.1: Backend API stub (deferred)

When `GET /api/lessons` exists, the nested structure maps directly:

```
GET /api/lessons/a1-01
→ {
    id: "a1-01",
    competencies: [...],
    sections: [{ name, type, content: JSON }],
    activities: [{ id, type, content: JSON }]
  }
```

No frontend changes needed — the nested `content` JSON maps directly to the TypeScript union types via `jsonc` parsing or runtime type validation.

---

## Commit Strategy

| Commit | Scope | Description |
|--------|-------|-------------|
| `test: add SectionDefinition.items accessor tests` | Tests | Verify flat accessor produces correct output for all section types |
| `refactor: restructure curriculum.ts to nested model` | Data | Rewrite interfaces, add nested structure, implement flat accessor, migrate a1-01 |
| `refactor: migrate remaining 7 lessons to nested structure` | Data | Convert a1-02, a2-01, a2-02, b1-01, b2-01, c1-01, c2-01 |
| `test: verify LessonPage.test.ts still passes` | Tests | Confirm no behavioral regression |
| `feat: render dialogue scenes with speaker names` | UI | Phase 2 Task 2.1 |
| `feat: render vocabulary by category with plural forms` | UI | Phase 2 Task 2.2 |
| `feat: render pronouns with examples` | UI | Phase 2 Task 2.3 |
| `feat: render grammar topics with descriptions` | UI | Phase 2 Task 2.4 |
| `feat: display lesson competencies` | UI | Phase 2 Task 2.5 |
| `feat: render activity components (deferred)` | UI | Separate PR — activity rendering |

---

## Acceptance Criteria

- [ ] `curriculum.ts` exports nested `SectionContent` union type with `SectionType` discriminator
- [ ] `SectionDefinition` has `content` (nested) and `items` (flat accessor)
- [ ] `LessonDefinition` has `competencies?: string[]` and `activities: ActivityDefinition[]`
- [ ] Flat `items` accessor produces **identical output** to current `items[]` for all 8 lessons
- [ ] All existing tests (`LessonPage.test.ts`, `LevelIndex.test.ts`) pass without modification
- [ ] `a1-01` lesson has full nested structure matching `lesson-01.json` (dialogue scenes, vocab categories, pronouns, expressions, grammar topics, 5 activities)
- [ ] All 8 lessons migrated to nested structure
- [ ] Lesson page template renders dialogue scenes, vocabulary categories, pronouns with examples, grammar topics
- [ ] Competency checklist renders on lesson page (matching prototype)
- [ ] Activities tab data accessible via `currentLessonData.activities` (UI rendering deferred)
