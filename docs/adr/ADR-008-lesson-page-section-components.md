# ADR-008: Per-Section Component Decomposition for Lesson Page

**Status:** Accepted

**Date:** 2026-08-19
**Context:** `docs/requirements/lesson-details-page.md`, `frontend/app/pages/dashboard/level/[level]/[lesson].vue` (skeleton, 197 lines), `frontend/app/components/LessonHero.vue`, `frontend/app/components/StickyAudioBar.vue`, `frontend/app/composables/useAudioModule.ts`

---

## Context

The lesson details page (`[lesson].vue`) currently renders a **generic flat item list** for every section tab. When a user clicks "Dialogue", "Vocabulary", "Pronouns", "Expressions", "Grammar", or "Activities", the same template renders `item.arabic`, `item.english`, `item.notes`, and `item.transliteration` — regardless of section type. Sections that have rich, type-specific data (dialogue scenes with speaker names, vocabulary with singular/plural forms, grammar topics with descriptions) render as "Content coming soon."

The data model (`curriculum.ts`) already provides the rich nested structure (scenes, categories, topics, activities) via the flat accessor introduced in ADR-007. The gap is purely in **rendering**: the page has no section-specific UI.

The requirements document proposes **seven new components** — one per section type — plus an activity dispatcher:

| Component | Section | Complexity |
|---|---|---|
| `LessonCompetencies` | None (top-level) | Low |
| `LessonDialogue` | Dialogue | High (scene tabs, line cards, audio binding, sequential playback, comparison card) |
| `LessonVocabulary` | Vocabulary | Medium (category grouping, tables, singular/plural) |
| `LessonPronouns` | Pronouns | Medium (color-coded grid, legend) |
| `LessonExpressions` | Expressions | Low (grid cards) |
| `LessonGrammar` | Grammar | Low (topic cards) |
| `LessonActivities` | Activities | High (5 interactive activity types, form state, validation, scoring) |
| `LessonActivityRunner` | Activity sub-dispatcher | Medium (type dispatch, per-type forms) |

The decision point is whether to build these as **seven focused components** (one per section type) or as **fewer, broader components** (e.g., a single `LessonContent.vue` with type-switching logic, or a hybrid with a few multi-section components).

## Decision

The application uses **one dedicated component per section type**, each responsible for rendering exactly one section's data shape. The lesson page acts as an orchestrator: it reads `getLessonById()`, routes `activeSection` to the appropriate component, and wires shared state (audio module, progress) across all components.

### Component Map

```
[lesson].vue (orchestrator)
├── LessonHero (existing, wired)
├── LessonCompetencies (NEW)
├── LessonDialogue (NEW)
├── LessonVocabulary (NEW)
├── LessonPronouns (NEW)
├── LessonExpressions (NEW)
├── LessonGrammar (NEW)
└── LessonActivities → LessonActivityRunner (NEW)
```

Each component:
- Accepts **section-specific props** derived from `LessonDefinition.sections[]` or `LessonDefinition.activities[]`.
- Emits **section-specific events** (e.g., `playLine(index)`, `activityComplete(id, score)`).
- Manages **its own local state** (e.g., `LessonDialogue` tracks `currentSceneIndex`, `currentLineIndex`; `LessonActivities` tracks per-activity attempt counts and completion states).
- Receives **shared bindings** from the page: `useAudioModule()` state, `StickyAudioBar` event handlers, progress callback.

### Page Orchestrator Pattern

The lesson page does **not** pass raw data to all components. Instead, it computes **section-specific data slices** and passes only what each component needs:

```typescript
// In [lesson].vue
const dialogueSection = computed(() =>
  lesson.value?.sections.find(s => s.type === 'dialogue')
)
const vocabularySection = computed(() =>
  lesson.value?.sections.find(s => s.type === 'vocabulary')
)
// ... one computed per section type
```

The page renders a `<section v-if>` block per section type, rendering the corresponding component only when its tab is active.

### Audio Integration

Each content component (except `LessonGrammar`, which is informational) emits a `play` event with the Arabic text to be synthesized. The page intercepts these events, calls `audioModule.load(blob)` with the text sent to the TTS backend, and wires the result to `StickyAudioBar`.

## Consequences

### What becomes easier

- **Focused testing** — Each component has a narrow, well-defined interface. `LessonVocabulary` can be tested independently of `LessonDialogue`. Component tests are smaller, faster, and more targeted.
- **Incremental implementation** — Sections can be built one at a time (as the requirements document suggests) without blocking others. A developer can implement `LessonExpressions` (low complexity) while another works on `LessonDialogue` (high complexity).
- **Clear ownership** — Each component has a single responsibility. When a vocabulary table layout is broken, a developer knows exactly which file to modify. There is no "find the right `v-if` branch inside a 500-line component" problem.
- **Reusability** — Section components can be extracted and reused elsewhere (e.g., `LessonVocabulary` could be embedded in a "word of the day" widget or a review mode) without dragging unrelated dialogue logic.
- **Matching existing patterns** — The codebase already uses small, focused components (e.g., `SpeedSlider.vue`, `ModelStatusIndicator.vue`, `ToastNotification.vue`). This decision continues that convention.

### What becomes harder

- **Component count and file management** — Seven new Vue files (plus `LessonActivityRunner`) increase the surface area for imports, exports, and naming decisions. Each file must be created, tested, and maintained. This is a **one-time cost** but adds to the project's file count and onboarding burden for new developers scanning the component directory.
- **State coordination across components** — The lesson page must coordinate state between independently-stateful components. For example, `LessonDialogue` tracks `currentLineIndex` for audio highlighting, while `LessonActivities` tracks per-activity completion states. If a future feature requires cross-section state (e.g., "mark all vocabulary words as learned"), the page must mediate between components that don't communicate directly. This creates a **hub-and-spoke coupling** where the page becomes the single point of inter-component communication.
- **Audio wiring complexity** — Five of seven content components need to wire to `useAudioModule()`. Each component must emit a play event, the page must intercept it, call the TTS backend (or mock), and update `StickyAudioBar`. This is **five separate integration points** for the same underlying mechanism. If the audio API changes, five components need updating. A shared composable (e.g., `useLessonAudio()`) could reduce this coupling but adds an abstraction layer.
- **The page orchestrator grows** — `[lesson].vue` must maintain computed slices for every section type, event handlers for every component's events, and routing logic for section tabs. Without discipline, this file becomes a **second monolith** — not large in lines, but dense in coordination logic. The flat accessor from ADR-007 mitigates this by providing a uniform `items` projection, but the section-specific components bypass it, meaning the page must also navigate the nested structure.
- **No section is "free"** — Each component requires a component test, a visual verification, and RTL testing. The requirements document lists seven new components; delivering all seven means ~7 new test files, ~7 new component files, and integration with the audio system. This is a **significant delivery cost** that should be factored into sprint planning.

### What stays the same

- **Route structure** — `/dashboard/level/{level}/{lesson}` unchanged (ADR-002).
- **Data model** — Nested `SectionContent` and `ActivityDefinition` from ADR-007 remain the source of truth.
- **Section tab navigation** — `activeSection` state and tab rendering unchanged (already exists in the skeleton).
- **Audio infrastructure** — `StickyAudioBar` (ADR-004) and `useAudioModule()` remain the audio backbone.

### Long-term risks

1. **Orchestrator bloat** — As more sections are added (e.g., a future "Reviews" or "Progress" section), `[lesson].vue` accumulates more computed slices and event handlers. **Mitigation**: Extract a `useLessonOrchestrator()` composable that manages section routing, data slicing, and event wiring. This keeps the page template thin while preserving the composable's state.

2. **Audio API coupling** — Five components directly emit play events that the page wires to `useAudioModule()`. If the TTS backend changes (e.g., streaming audio instead of blobs, or WebSocket-based real-time synthesis), five components need updating. **Mitigation**: A `useLessonAudio()` composable that encapsulates the audio loading/playback logic and exposes a simple `play(text: string)` interface to all components.

3. **Component naming consistency** — Seven components starting with `Lesson` (`LessonCompetencies`, `LessonDialogue`, etc.) creates a naming cluster. Future developers might wonder whether `LessonCompetencies` and `LessonDialogue` share an interface or can be swapped. **Mitigation**: Document the component contract (props/emits) in a shared interface file or a README within `app/components/lesson/`.

4. **Testing overhead** — Each component needs a component test. With seven new components, that's seven new test files. If the project's test budget is tight, some components may ship without tests, increasing regression risk. **Mitigation**: Prioritize tests for high-complexity components (`LessonDialogue`, `LessonActivities`) and use visual regression for low-complexity ones (`LessonExpressions`, `LessonGrammar`).
5. **`useLessonAudio()` composable deferred** — ADR-008 (line 105) identifies
   a `useLessonAudio()` composable as the mitigation for "audio API coupling"
   (five components directly emit play events). Issue #009 wires TTS handoff
   directly in the page without extracting this composable. This is an
   **accepted Phase 1 technical debt**: the coupling is manageable with six
   content components, and the composable extraction is a straightforward
   refactor when the component count grows. Track as Phase 2 technical debt;
   no Phase 1 issue required.

### Alternative considered: Monolithic `LessonContent.vue`

A single component with `v-if`/`v-switch` branches per section type would reduce file count and eliminate the orchestrator pattern. The page would pass the full `LessonDefinition` to one component, which dispatches internally.

**Rejected because:**
- It recreates the exact problem the current skeleton has: a single component that renders all sections generically, making it hard to implement section-specific UI without bloating the component.
- Testing a monolithic component means testing all seven section types in one file, making failures harder to isolate.
- It contradicts the existing codebase pattern of small, focused components.
- It makes incremental implementation harder — you can't build "just the vocabulary section" without touching the dialogue logic.

The per-section decomposition has a higher initial file count but pays dividends in testability, maintainability, and incremental delivery.
