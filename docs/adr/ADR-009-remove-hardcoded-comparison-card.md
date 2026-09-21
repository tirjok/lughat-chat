# ADR-009: No Hardcoded Content in LessonDialogue Component

**Status:** Accepted

**Date:** 2026-09-12

**Context:** `specs/general/UI-IMPROVEMENTS.md` (LessonDialogue review, Issue 3), `frontend/app/components/LessonDialogue.vue` (lines 184-204, hardcoded comparison card referencing A1-01-specific content), `frontend/app/data/curriculum.ts` (ADR-007 nested `DialogueLine` type), `frontend/app/components/` (existing component pattern: presentational, data-driven).

---

## Context

`LessonDialogue.vue` (lines 184-204) renders a **comparison card** containing lesson-specific pedagogical content — hardcoded text about gender suffixes, verb conjugation, and welcome phrases that describes the dialogue between Muhammad↔Ali and Khadija↔Aisha from lesson A1-01. The card is gated by `v-if="dialogueContent.scenes.length > 1"` — it appears for any lesson with multi-scene dialogues — but its **content is never derived from the curriculum data**.

This means:

1. When viewing lesson A1-01, the card shows correct content by accident.
2. When viewing lesson A1-02 (Numbers & Personal Info, which also has a multi-scene dialogue), the card shows Muhammad/Ali comparison text — **pedagogically wrong content about the wrong characters**.
3. When new lessons are added, the card silently displays A1-01 content regardless of which lesson is active.

The spec recommends removing the hardcoded card entirely and, if comparison content is needed, extending the `DialogueLine` or `DialogueScene` data model (already defined in ADR-007) to carry `comparison_notes: string[]` or a `comparison` field.

This is the only ADRable decision from the UI-IMPROVEMENTS spec. All other reviewed issues (dashboard progress wiring, accessibility attributes, visual polish, interaction tweaks) are reversible implementation details.

---

## Decision

**Remove the hardcoded comparison card from `LessonDialogue.vue` immediately.** If future lessons require comparison content, it must flow through the curriculum data model as a field on `DialogueScene` or `DialogueLine` (per ADR-007's discriminated union), not as a hardcoded JSX/HTML block inside a reusable component.

The component must remain **purely presentational**: it renders whatever data the curriculum gives it. Hardcoding lesson-specific pedagogy inside a reusable component violates the separation of data and presentation established in ADR-007 and ADR-008.

### Implementation

1. **Delete** the hardcoded comparison card block (lines 184-204 of `LessonDialogue.vue`) — the entire `<div>` with its comparison heading, three comparison rows, and `!text-base` override.
2. **Do not** add a `comparison_notes` or `comparison` field to `DialogueLine` or `DialogueScene` at this time. The spec offers it as a future option, but no lesson currently requires it, and adding schema for unneeded content is speculative. If a future lesson (e.g., A2-01 or B1-01) explicitly needs cross-scene comparison content, add the field then with a focused PR.
3. The removal itself is the deliverable.

### Rationale

- **Correctness:** The card shows wrong content for any lesson other than A1-01. This is a bug, not a feature.
- **Maintainability:** Every time curriculum changes (new lessons, revised dialogues), this hardcoded card must be manually updated. It is a maintenance liability.
- **Reusability:** `LessonDialogue` is used by `/dashboard/level/[level]/[lesson].vue` for all 8 lessons. A lesson-specific card breaks this contract.
- **Consistency with ADR-007:** The data model defines a strict `DialogueLine` structure. Hardcoded content inside the component that consumes it breaks the contract.

---

## Consequences

### What becomes easier

- **Lesson expansion** — Adding new lessons with multi-scene dialogues no longer risks displaying stale comparison content.
- **Code review** — Reviewers no longer need to verify that the hardcoded card matches the active lesson's characters and content.
- **Component reuse** — `LessonDialogue` is correctly reusable across all lessons, fulfilling the architecture established in ADR-008 (one component per section type).
- **Debugging** — If comparison content appears incorrectly, there is no hidden hardcoded block to hunt for. The data source is the single point of truth.

### What becomes harder

- **A1-01 lesson loses its comparison feature** — Learners viewing the A1-01 dialogue will no longer see the side-by-side gender comparison (male ↔ female) that was embedded in the hardcoded card. This is an **accepted loss**: the content can be recovered as curriculum data if valuable, but the current cost (showing wrong content for 7 of 8 lessons) outweighs the benefit.
- **No comparison feature exists today** — Removing the hardcoded card means no comparison UI exists in the product until curriculum data is added to drive it. This is **not a regression** — the card was broken for all lessons except A1-01. The net effect is: 1 lesson gains a minor feature (correct comparison), 7 lessons lose an incorrect one (buggy comparison).
- **If curriculum data adds comparison later**, a developer must both extend the data model and build the UI. There is no stub to inherit from. This is intentional — adding schema before use would be speculative, violating ADR-007's principle of adding data fields only when consumed.

### What stays the same

- **Scene tab navigation** — Scene switching works independently of the comparison card (ADR-008).
- **Line card rendering** — Individual line cards (Arabic, transliteration, English, speaker badges) are unaffected.
- **Data model** — `DialogueLine` and `DialogueScene` types from ADR-007 are unchanged. Removing hardcoded content does not require schema changes.
- **Audio playback** — `playLine()` and `playScene()` emits are independent of the comparison card.

### Long-term risks

1. **Comparison content may be lost from A1-01** — If no one re-adds the comparison as curriculum data, A1-01 learners lose the gender-differentiation comparison. **Mitigation**: Track this as a content task in the curriculum authoring backlog. The content exists in the deleted card — it needs to be migrated to `curriculum.ts`, not lost.
2. **UI regressions silently accepted** — Removing the card without replacement might set a precedent: "hardcoded UI content is fine to delete." **Mitigation**: This is the desired precedent. Hardcoded UI content is a bug. The ADR enforces it.

---

## Alternative considered: Keep hardcoded card, restrict by lesson ID

Render the comparison card only when the active lesson ID equals `a1-01`:

```html
<div v-if="dialogueContent.scenes.length > 1 && props.lessonId === 'a1-01'" class="...">
  <!-- hardcoded comparison -->
</div>
```

**Rejected because:**

- This pushes lesson-specific content into a component that should be reusable across all lessons. Every new lesson that *wants* a comparison card would need another `lessonId` check or a whitelist.
- It violates the component contract: `LessonDialogue` accepts a `section` prop, not a `lessonId` prop. Adding `lessonId` as a prop creates coupling to the page router, not the data model.
- It is equally fragile — if lesson IDs change (e.g., `a1-01` is renamed to `greetings`), the hardcoded check breaks silently.
- It still has the fundamental problem: the comparison content is **lesson-specific data baked into a presentational component**. The correct home for lesson-specific content is the curriculum data model (ADR-007), not a `v-if` guard inside a reusable component.

The data-driven approach (remove hardcoded, extend schema if needed) is the only sustainable option.
