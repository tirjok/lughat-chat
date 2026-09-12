# WORKFLOW: Lesson Dialogue UI/UX Improvements

**Version**: 0.1
**Date**: 2026-09-12
**Author**: Workflow Architect
**Status**: Draft
**Implements**: `specs/general/UI-IMPROVEMENTS.md` (LessonDialogue review, Issues 1–9), ADR-009 (remove hardcoded comparison card)
**Based on**: `frontend/app/components/lesson/LessonDialogue.vue` (206 lines), `frontend/app/data/curriculum.ts` (DialogueLine interface), `frontend/tests/components/LessonDialogue.test.ts` (241-line test suite)

---

## Overview

A learner navigates to a lesson page containing a dialogue section. The `LessonDialogue` component renders the dialogue's scenes as tabs and individual lines as cards with Arabic text, transliteration, English translation, speaker badges, and audio playback buttons. This spec defines the full improvement workflow: fixing critical accessibility (keyboard tab navigation), splitting conflicting interactions (card tap vs. play button), removing hardcoded content (ADR-009), and adding proper state management (playing indicator, error handling, loading state). The component is purely presentational — it renders whatever data `curriculum.ts` provides via the `section` prop.

---

## ADR-009 Constraint Index

Every ADR-009 constraint mapped to a specific step in this spec:

| ADR-009 Constraint | Map To Step | Rationale |
|---|---|---|
| Remove the hardcoded comparison card (lines 184–204) entirely | **STEP 4** — Remove hardcoded comparison card block | Direct deletion, no replacement |
| Do NOT add `comparison_notes` or `comparison` field to `DialogueLine` or `DialogueScene` | **STEP 5** — Data model constraint: explicitly prohibited | Schema change blocked |
| Component must remain purely presentational | **All steps** | Every step modifies presentational layer only; no business logic introduced |
| If comparison content needed in future, extend data model (ADR-007 discriminated union) | **STEP 5** — Future extension path documented but deferred | No today; spec records the constraint |
| Hardcoded content violates the contract between ADR-007 data model and component | **STEP 1** — Identify the violation in current code | Root-cause analysis |

---

## Actors

| Actor | Role in this workflow |
|---|---|
| Learner (customer) | Navigates to a lesson with a dialogue section, switches scenes via tabs, selects/reviews lines without triggering audio, plays specific lines or full scenes, interacts with speaker badges |
| Page orchestrator (`[lesson].vue` or lesson index page) | Renders `LessonDialogue` as a section component; owns shared `useAudioModule` state; wires `playLine`/`playScene` emits |
| `LessonDialogue.vue` | Renders scene tabs, line cards, speaker badges, play buttons, comparison card (to be removed), and all local UI state (current scene, current line) |
| `curriculum.ts` | Static data source: provides `SectionDefinition` with `content.type === 'dialogue'` containing `scenes[]` with `label` and `lines[]` (each `DialogueLine` with `speaker`, `arabic`, `english`, `notes?`) |
| `useAudioModule()` | Owns audio element: load/play/pause/seek; emits playback state events (new) |
| Global state (singleton or composable) | Tracks which line is currently playing; emits `playing` event to `LessonDialogue` |
| Nginx + Backend (FastAPI + Coqui XTTS-v2) | Synthesizes speech via `POST /api/generate`; returns MP3 binary |

---

## Prerequisites

- `SectionDefinition` has `name?`, `type?`, `title?`, `content: SectionContent`, `_lessonId: string`, and a `get items(): SectionItem[]` accessor (verified in `curriculum.ts:30-36`).
- `DialogueLine` interface: `{ speaker: string, arabic: string, english: string, notes?: string }` (verified `curriculum.ts:126-131`). **No `comparison` or `comparison_notes` field exists or shall be added (ADR-009 constraint).**
- `DialogueScene` (local to `LessonDialogue.vue`): `{ label: string, lines: DialogueLine[] }` (verified in `LessonDialogue.vue:16-18`).
- `SectionContent` union includes `{ type: 'dialogue', scenes: { label: string, lines: DialogueLine[] }[] }` (verified `curriculum.ts:141`).
- Existing test suite: `frontend/tests/components/LessonDialogue.test.ts` (241 lines) covers scene tabs, scene switching, speaker badges, Arabic RTL, play line/scene emits, active line highlighting (verified).
- Backend is running; `/health` returns `loading → ready | error`; a not-ready backend answers synthesis with 503.
- ADR-009 status: **Accepted** — comparison card removal is a hard requirement, not optional.

---

## Trigger

User navigates to a lesson page (`/dashboard/level/{level}/{lesson}`) where the lesson's `sections[]` contains one or more sections with `content.type === 'dialogue'`. The page orchestrator renders `<LessonDialogue :section="..." :isAudioDisabled="...">` (existing contract).

---

## Workflow Tree

### STEP 1: Route resolution and dialogue section identification

**Actor**: Page orchestrator
**Action**: Resolve lesson from route params; scan `lesson.sections[]` for sections where `content.type === 'dialogue'` (or where `content` is not one of the known union types, treating it as "no dialogue"). For each dialogue section, pass it to `LessonDialogue` as the `section` prop.
**Timeout**: n/a (synchronous static data).
**Input**: `{ level: string, lesson: string }` route params.
**Output on SUCCESS**: `LessonDialogue` mounts with `section` prop containing `content: { type: 'dialogue', scenes: [...] }` → GO TO STEP 2.
**Output on FAILURE**:
- `FAILURE(no_dialogue_section)`: lesson has no section with `content.type === 'dialogue'` → `LessonDialogue` is not rendered (page renders other section components only) → TERMINAL for this workflow.
- `FAILURE(malformed_content)`: section exists but `content.type` is not `'dialogue'` → component falls through to empty scenes (`{ scenes: [] }`) → GO TO STEP 2 (degraded; step 9 error state renders).
- `FAILURE(missing_scenes)`: content is `type: 'dialogue'` but `scenes` is `undefined` or `[]` → component renders `{ scenes: [] }` (current behavior) → GO TO STEP 2 (degraded; step 9 error state renders).
**Observable states during this step**:
- Customer sees: lesson page with dialogue section rendered (or absent).
- Operator sees: console only.
- Database: n/a (static data).
- Logs: n/a.

---

### STEP 2: Component mount and data parsing

**Actor**: `LessonDialogue` component
**Action**: (1) Read the `section` prop; (2) Check `section.content?.type === 'dialogue'`; (3) If truthy, cast `content as DialogueScene[]` (current `EmptyDialogue` wrapper removed in this workflow — `scenes: DialogueScene[]` directly); (4) Compute `sceneLabels` from `scenes[].label`; (5) Initialize `currentSceneIndex = 0`, `currentLineIndex = 0`; (6) Initialize `isPlaying = false`, `playingLineIndex: number | null = null` (NEW — from global state); (7) Initialize `errorState: string | null = null` (NEW); (8) Initialize `isLoading = false` (NEW — for audio fetches).
**Timeout**: n/a (synchronous).
**Input**: `{ section: SectionDefinition }` from page prop, optional `isAudioDisabled: boolean`.
**Output on SUCCESS**: Component renders scene tabs (if `scenes.length > 1`), line cards (if `scenes[0].lines?.length > 0`), and play-scene button → GO TO STEP 3.
**Output on FAILURE**:
- `FAILURE(undefined_content)`: `section.content` is undefined → render `{ scenes: [] }` → error state (STEP 9) renders "No dialogue content for this lesson."
- `FAILURE(wrong_type)`: `content.type` is not `'dialogue'` → render `{ scenes: [] }` → error state (STEP 9).
**Observable states**:
- Customer sees: scene tabs (if multi-scene), line cards (if lines exist), or "No dialogue content" message.
- Operator sees: console (dev mode).
- Database: n/a.
- Logs: n/a.

---

### STEP 3: Scene tab keyboard navigation (Issue 1 — Critical)

**Actor**: Learner
**Trigger**: User focuses the tablist via tab navigation and presses ArrowRight, ArrowLeft, Enter, or Space.
**Action**: (1) Add `tabindex="0"` to the active tab and `tabindex="-1"` to all inactive tabs (required for arrow key cycling per ARIA Authoring Practices). (2) Add `@keydown` handler on the `role="tablist"` container: if `event.key` is `ArrowRight` or `ArrowLeft`, prevent default, compute next index `(currentSceneIndex.value + dir + sceneLabels.length) % sceneLabels.length`, call `selectScene(nextIndex)`. (3) If `event.key` is `Enter` or `Space`, prevent default, call `selectScene(currentSceneIndex.value)` (no-op if already active, but consistent with spec). (4) The `selectScene()` function resets `currentLineIndex = 0` (existing behavior). (5) Update `aria-selected` on each tab (existing binding, already correct). (6) Move focus to the newly active tab button (NEW — call `.focus()` on the target button DOM element after DOM update via `nextTick`).
**Timeout**: n/a (synchronous DOM operation).
**Input**: Keyboard event (`ArrowRight`, `ArrowLeft`, `Enter`, `Space`).
**Output on SUCCESS**: Scene switches; visual active state updates; focus moves to the new tab; line cards reset to first line of the new scene → LOOP (user may interact with STEP 4 or STEP 5).
**Output on FAILURE**:
- `FAILURE(focus_not_movable)`: tab button elements are not focusable (e.g., if refactored to `<div>` instead of `<button>`) → arrow navigation works but focus stays on tablist container (ARIA violation). **Guarantee**: tabs remain `<button>` elements.
- `FAILURE(negative_scenes)`: `sceneLabels.length <= 1` → tablist is hidden (`v-if="sceneLabels.length > 1"`) → this step is unreachable → SAFE.
**Concurrency**: rapid arrow key presses → last `selectScene()` wins; scene tab visual updates per CSS transition.
**Observable states**:
- Customer sees: active tab highlights; scene content switches; active line resets to 0.
- Operator sees: none.
- Database: n/a.
- Logs: n/a.

**ARIA contract** (new, for this step):
- `role="tablist"` on the container.
- `role="tab"` on each `<button>`.
- `aria-selected="true"` on the active tab (existing binding).
- **NEW**: `tabindex="0"` on active tab, `tabindex="-1"` on inactive tabs.
- **NEW**: `aria-activedescendant` on the tablist, bound to the active tab's `id` (each tab gets a unique `:id="`scene-tab-${index}`"`).

---

### STEP 4: Remove hardcoded comparison card (ADR-009)

**Actor**: Developer (implementation step, not runtime user action).
**Action**: Delete lines 184–204 of `LessonDialogue.vue` — the entire `<div data-testid="comparison-card" class="...">` block, including its heading ("Key Differences Between Scenes"), three hardcoded comparison paragraphs (gender suffixes, verb conjugation, welcome phrases), and the outer `v-if="dialogueContent.scenes.length > 1"` guard.
**Constraint (ADR-009)**: No replacement functionality, no data model extension, no stub. The card is gone. If a future lesson (A2-01 or beyond) requires cross-scene comparison content, a developer must: (a) extend `DialogueLine` or `DialogueScene` in `curriculum.ts` with a `comparison` or `comparison_notes` field, (b) render it in `LessonDialogue` based on that field, (c) update the existing test suite.
**Output on SUCCESS**: `LessonDialogue.vue` is now 183 lines (from 206); no comparison card renders for any lesson.
**Output on FAILURE**:
- `FAILURE(card_referenced_by_test)`: the 241-line test file references `data-testid="comparison-card"` — removing the card breaks that test. **Resolution**: update the test file to remove or modify the comparison-card test case (in scope of the same PR).
- `FAILURE(card_referenced_by_other_component)`: any parent component checks for comparison card visibility — grep for `comparison-card` across the repo before deleting.
**Observable states**:
- Customer sees: no comparison card below the dialogue lines (for any lesson). A1-01 loses the (broken) comparison feature; 7 other lessons are unaffected (they were already seeing wrong content).
- Operator sees: diff showing 20 lines removed.

---

### STEP 5: Split conflicting card interaction (Issue 2 — Critical)

**Actor**: Learner
**Trigger**: User clicks a line card (either the body area or the play button).
**Current behavior (BROKEN)**: The `<div>` wrapping the entire line card has `@click="currentLineIndex = lineIndex; playLine(lineIndex)"`. The inner `<button>` has `@click.stop="playLine(lineIndex)"`. The `.stop` modifier prevents bubbling, but both the card body AND the play button trigger `playLine()`. Clicking the body both selects the line AND plays audio simultaneously — this is a conflicting interaction model.
**Action (TWO SEPARATE INTERACTIONS)**:
1. **Card body click (select, no play)**: Remove `playLine(lineIndex)` from the card body's `@click`. The card body click sets `currentLineIndex = lineIndex` only. This highlights the active line WITHOUT triggering audio. (Visual highlight per STEP 6, unchanged).
2. **Play button click (play, no select)**: The `<button>` keeps `@click.stop="playLine(lineIndex)"` (existing). Additionally, the button internally calls `selectScene(lineIndex)` so the active line highlight follows the audio selection (NEW — the play button should set `currentLineIndex = lineIndex` before emitting `playLine`).
**Timeout**: n/a (synchronous state update).
**Input**: Mouse click event on either the card body or the play button.
**Output on SUCCESS**:
- Clicking the card body: `currentLineIndex` updates; visual highlight changes; NO audio plays → GO TO STEP 5a (user may then click the play button to play).
- Clicking the play button: `currentLineIndex` updates; audio plays via `emit('playLine', index)` → GO TO STEP 6 (playing indicator).
**Output on FAILURE**:
- `FAILURE(lost_play_emit)`: removing `playLine` from card body could break a parent listener that expects the emit on body click. **Mitigation**: review the parent page's `@playLine` handler — if it uses the emit to BOTH select AND play, refactor the parent to separate selection (local state) from playback (audio module).
- `FAILURE(stale_test)`: the 241-line test file has a test "clicking a line card triggers playLine" — after this change, clicking the card body should NOT emit `playLine`. The test must be updated: one test for card-body click (no emit), one test for play-button click (emit).
**Observable states**:
- Customer sees: clicking a line highlights it (same visual) without playing audio; clicking the play button highlights AND plays.
- Operator sees: none.
- Database: n/a.
- Logs: n/a.

---

### STEP 6: Speaker gradient logic and badge display (Issues 4, 7, 10, 15)

**Actor**: `LessonDialogue` component (presentational logic).
**Action**: (1) Replace the hardcoded 12-name `isMaleSpeaker()` string matching with a simpler heuristic: if `speaker.trim() === ''`, render no badge (existing `v-if="line.speaker"` handles this — no change needed for unspoken lines). (2) For named speakers, accept `malePatterns: string[]` as an optional prop from the parent (NEW — `props.malePatterns?: string[]`). If the prop is absent, fall back to checking `speaker.charAt(0).toUpperCase()`: use `"male"` as a fallback pattern (names starting with "M" default to male, others default to female — less brittle than 12-name list). (3) Add a **fallback neutral gradient** (`from-stone-500 to-stone-700`) for names that match no pattern (NEW — instead of defaulting to "female" which is incorrect for unknown male names). (4) Normalize speaker name display: `const displayName = line.speaker ? line.speaker.charAt(0).toUpperCase() + line.speaker.slice(1).toLowerCase() : ''` (NEW — ensures "ali" → "Ali", "MUHAMMAD" → "Muhammad"). (5) In dark mode, use `teal-600 → teal-800` and `pink-600 → pink-800` (NEW — lighter gradients for better contrast against `bg-stone-950`).
**Timeout**: n/a (synchronous computed).
**Input**: `line.speaker` (string, from `curriculum.ts` data).
**Output on SUCCESS**: Speaker badges display normalized names with appropriate gradient; unspoken lines show no badge; unknown names get neutral badge → GO TO STEP 7.
**Output on FAILURE**:
- `FAILURE(data_change)`: curriculum data changes speaker names (e.g., "Abdullah" is a new name) — the gradient defaults to "female" (pink) or "neutral" (stone) — acceptable under-fitting, not a correctness issue.
**Observable states**:
- Customer sees: speaker names capitalized correctly; male names in teal, female names in pink, unknown names in neutral stone gray; badges readable in dark mode.
- Operator sees: none.
- Database: n/a.
- Logs: n/a.

---

### STEP 7: Play Scene button styling (Issue 5)

**Actor**: `LessonDialogue` component (presentational).
**Action**: (1) Replace the text-only "Play Scene" `<button>` with a styled button: add a rounded `bg-primary-600 text-white hover:bg-primary-700` button (matching line play button style, but 48px × 48px for full-width visibility). (2) Embed the same play SVG icon (existing SVG path `M8 5v14l11-7z`). (3) Add text label "Play Scene" to the right of the icon. (4) When `isAudioDisabled` is true, show a `title` attribute: "Audio is currently disabled" (NEW — provides context to keyboard/screen reader users). (5) Position the button as a full-width or right-aligned action below all line cards (NEW — visually separated from line cards).
**Timeout**: n/a (presentational change).
**Input**: `currentScene.lines.length > 0` (visibility guard, existing).
**Output on SUCCESS**: Styled play scene button renders below line cards, visually consistent with line play buttons → GO TO STEP 8.
**Output on FAILURE**:
- `FAILURE(test_reference)`: the 241-line test file has `data-testid="play-scene"` — the test checks for the button's existence and click behavior. After styling, the test must still pass (no behavioral change). If the test checks text content ("Play Scene"), verify the label is still rendered.
**Observable states**:
- Customer sees: a prominent, icon+label play scene button below all lines; disabled state shows tooltip hint.
- Operator sees: none.
- Database: n/a.
- Logs: n/a.

---

### STEP 8: Playing indicator and active line highlight (Issues 6, 8)

**Actor**: `LessonDialogue` component + global state.
**Action**: (1) The page orchestrator (or a composable) tracks `isPlaying` state via `useAudioModule` events (`@playing` event NEW). (2) `LessonDialogue` receives `@playing` with `{ index: number, wordIndex?: number }` (NEW emit from parent). (3) When `playingLineIndex !== null` and `playingLineIndex === lineIndex`, apply a **pulsing animation** to the line card (NEW CSS class: `animate-pulse` or custom shimmer animation — more visible than the current light gradient). (4) When `currentLineIndex` changes (via card body click OR play button click), auto-scroll the active line card into view using `scrollIntoView({ behavior: 'smooth', block: 'center' })` (NEW — if the dialogue has many lines, the active line might be off-screen). (5) Increase the active-line gradient to `from-primary-200 to-primary-100` (light mode) and `dark:from-primary-800/60 dark:to-primary-700/40` (dark mode) — more saturated than the current `from-primary-100 to-primary-50` (existing, too subtle).
**Timeout**: n/a (client-side DOM animations).
**Input**: `@playing` event payload `{ index: number }` from parent; local `currentLineIndex` state.
**Output on SUCCESS**: Active line is clearly visible (strong gradient + optional pulse when playing); active line scrolls into view; learner can visually follow audio → GO TO STEP 9.
**Output on FAILURE**:
- `FAILURE(scroll_not_supported)`: `scrollIntoView` not available on older browsers → fallback: manual scrolling via `scrollTop` or no scrolling (graceful degradation — the highlight gradient still applies).
- `FAILURE(parent_not_emitting)`: the parent page does not implement the `@playing` event → no pulse animation or auto-scroll, but the basic highlight gradient (STEP 8, point 5) still works. **Mitigation**: document the parent's responsibility to emit `@playing` in the page orchestrator's interface contract.
**Observable states**:
- Customer sees: active line clearly highlighted (saturation increased); playing line has subtle pulse; long dialogues auto-scroll to the active line.
- Operator sees: console (dev mode).
- Database: n/a.
- Logs: n/a.

---

### STEP 9: Error state and loading state (Issue 9)

**Actor**: `LessonDialogue` component.
**Action**: (1) When `dialogueContent.scenes.length === 0` (no dialogue content, whether from malformed data or missing content), render a centered error state: `<p class="text-center py-8 text-stone-400">No dialogue content for this lesson.</p>` (NEW). (2) When `isLoading` is true (audio fetch in progress for a line), show a spinner on the specific line card (NEW — a small inline spinner next to the Arabic text). (3) When an audio fetch fails (422, 500, 503, network error), display an error chip below the line: `<span class="text-xs text-red-600 bg-red-50 rounded px-2 py-1">[error message]</span>` (NEW — distinct from teacher notes, which are blue).
**Timeout**: n/a (synchronous state rendering).
**Input**: `dialogueContent.scenes.length`, `isLoading`, `errorState`.
**Output on SUCCESS**: Missing dialogue content displays "No dialogue content" message; in-flight audio fetches show spinners; failed fetches show error chips → TERMINAL (user may retry by tapping the line).
**Output on FAILURE**:
- `FAILURE(silent_failure)`: if `content.type !== 'dialogue'` AND the parent renders the component (it shouldn't), the component currently returns `{ scenes: [] }` which renders an empty component (nothing visible). The error state (STEP 9) fixes this: the learner now sees "No dialogue content" instead of a blank area.
**Observable states**:
- Customer sees: "No dialogue content" message if no dialogue section exists; spinner on the line being fetched; red error chip if audio fails.
- Operator sees: none.
- Database: n/a.
- Logs: n/a.

---

### STEP 10: Arabic text font size increase (Issue 17 — Low)

**Actor**: `LessonDialogue` component (presentational).
**Action**: Change the Arabic text paragraph from `class="font-arabic text-lg md:text-xl"` to `class="font-arabic text-xl md:text-2xl"` (NEW — 20px on mobile, 24px on desktop). This is a low-impact visual change with no behavioral consequences.
**Timeout**: n/a.
**Input**: n/a (CSS class change only).
**Output on SUCCESS**: Arabic text is larger and more readable, especially for A1/A2 learners → GO TO STEP 11.
**Output on FAILURE**:
- `FAILURE(layout_shift)`: larger text may cause overflow in narrow cards. **Mitigation**: verify card padding (`p-4 md:p-5`) provides sufficient margin; adjust if needed.
**Observable states**:
- Customer sees: larger Arabic text.
- Operator sees: none (visual change only).
- Database: n/a.
- Logs: n/a.

---

## ABORT_CLEANUP: Section unmount

**Triggered by**: Page leaves, or another section (vocabulary, pronouns, grammar, etc.) becomes active (replacing the dialogue section).
**Actions** (in order):
1. Stop any audio playback for the current scene (`emit('playScene')` handled by parent to pause).
2. Clear any pending auto-scroll `scrollIntoView` animations (smooth scroll is deferred; cancel by aborting the scroll via `window.stop()` or simply ignoring the callback).
3. Reset `currentSceneIndex = 0`, `currentLineIndex = 0`, `isPlaying = false`, `playingLineIndex = null`, `errorState = null`, `isLoading = false` (NEW fields reset).
4. Remove the component-level `@keydown` handler on the tablist (NEW — must be added in a `onUnmounted` hook to prevent memory leaks).
5. Remove the `scrollIntoView` observer if implemented (NEW — `IntersectionObserver` or `ResizeObserver` on the tablist/container for auto-scroll).

**What customer sees**: component unmounts; dialogue content disappears; section tab bar reflects the new active section.
**What operator sees**: nothing (all state in-memory).

**Partial-failure variant** (dialogue section unmounts while audio is playing): steps 1, 3, 4, 5 still run; the audio may continue playing in the `StickyAudioBar` (owned by the parent). The dialogue component no longer tracks `isPlaying`, but the bar does. **No orphaned resources**.

---

## State Transitions

```
scene:       [0 (first scene)] → (tab click / arrow key / scene select) → [N (scene index)]
line:        [0 (first line)] → (card body click / play button click) → [M (line index)]
playing:     [idle] → (@playing event from parent) → [playing: index=M] → (ended) → [idle]
error:       [none] → (TTS failure for a line) → [error: "message"] → (retry) → [none]
loading:     [false] → (TTS request start) → [true] → (response) → [false]
comparison:  [present (A1-01 only, hardcoded)] → (STEP 4, ADR-009) → [absent (all lessons)]
```

---

## Handoff Contracts

### Page → `LessonDialogue` (props interface — updated)

**Props**:
```ts
{
  section: SectionDefinition,           // existing — the dialogue section
  isAudioDisabled?: boolean,            // existing — disable all audio interactions
  malePatterns?: string[]               // NEW — optional array of name substrings for male speaker detection
}
```
**Emits** (updated):
```ts
{
  playLine: [index: number],            // existing — unchanged (play button only, after STEP 5)
  playScene: [],                        // existing — unchanged
  playing: [{ index: number }]          // NEW — from parent, tells which line is playing (not an emit, a received event)
}
```
**Note**: `playing` is NOT an emit from `LessonDialogue`. The parent owns the `isPlaying` state (via `useAudioModule`) and pushes it to `LessonDialogue` via a prop or v-slot. `LessonDialogue` receives the playing index and applies the visual highlight/pulse.

### `LessonDialogue` → Page (emits — unchanged behavior, scope narrowed)

**Emit `playLine(index)`**: Only emitted from the **play button** (after STEP 5 — card body click no longer emits). This is the critical behavioral contract: **clicking the card body selects without playing; clicking the play button plays**.
**Emit `playScene()`**: Unchanged. Triggered by the styled play-scene button (STEP 7).

### Page → `useAudioModule` (existing handoff — unchanged)

**Payload**: `load(blob: Blob)`, `play()`, `pause()`, `dispose()` (existing).
**NEW**: `@playing` event emission with `{ index: number, wordIndex?: number }` — when the audio plays a line, the module emits this event for the parent to push to `LessonDialogue`.

---

## Cleanup Inventory

| Resource | Created when | Destroyed when | Destroyed by | Orphan if skipped |
|---|---|---|---|---|
| Tablist `@keydown` listener (NEW) | STEP 3 (mount) | Section unmount | Component `onUnmounted` (ABORT_CLEANUP step 4) | Arrow key navigation fires on wrong section after switch |
| Comparison card DOM nodes (DELETED) | STEP 4 (current) | STEP 4 (deletion) | N/A — removed from template | **Existing bug**: A1-01-only content shown for all multi-scene lessons |
| Audio object URL (existing) | TTS success (STEP 4 of parent workflow) | Next play or leave | `useAudioModule.revokeAll()` (parent workflow) | Memory leak per play (blob retained by URL) |
| In-flight TTS fetch (existing) | Tap (parent workflow) | Leave / supersede | AbortController (parent workflow) | Dangling response; late blob discarded |

---

## Reality Checker Findings

| # | Finding | Severity | Spec section affected | Resolution |
|---|---|---|---|---|
| RC-1 | `LessonDialogue.vue` currently has 206 lines; the comparison card (lines 184–204) exists and is **not** removed yet. ADR-009 status is "Accepted" but the implementation has not landed. | **Critical** | STEP 4 | Implementation must remove the card; spec assumes the card still exists and must be deleted. |
| RC-2 | The 241-line test file (`LessonDialogue.test.ts`) contains tests for the comparison card (`data-testid="comparison-card"`). Removing the card will break these tests. | **Critical** | STEP 4 | Tests must be updated or removed in the same PR. |
| RC-3 | `DialogueLine` interface in `curriculum.ts` has `speaker: string` (required, not optional). Lines with empty speakers exist (curriculum.ts lines 514, 527, etc.). The current `v-if="line.speaker"` hides badges for these lines. | **Medium** | STEP 6 | The spec addresses this: unspoken lines → no badge (unchanged behavior for empty speakers). |
| RC-4 | The `malePatterns` prop (NEW, STEP 6) has no default. If the parent does not pass it, the fallback heuristic (capital letter check) applies — this is less brittle than the current 12-name list. | **Low** | STEP 6 | Document the fallback in the prop's JSDoc; no default in the type. |
| RC-5 | The 241-line test file does NOT currently test keyboard tab navigation on scene tabs (Issue 1). The spec adds this as NEW test coverage. | **Medium** | STEP 3 | Write new tests: tab key cycles to the tablist, arrow keys cycle tabs, Enter/Space activates tabs. |
| RC-6 | The page orchestrator (`[lesson].vue`, 197 lines) does not currently emit a `@playing` event (Issue 8). The parent must be updated to track and emit this. | **Medium** | STEP 8 | Document the parent's responsibility in the page orchestrator's spec; create a separate workflow for the page orchestrator update if needed. |

---

## Test Cases

| Test | Trigger | Expected behavior |
|---|---|---|
| TC-01: Happy path — render multi-scene dialogue | `section.content.type === 'dialogue'` with 2+ scenes, each with lines | Scene tabs render; line cards render; speaker badges render; play buttons render |
| TC-02: Scene tab keyboard navigation — ArrowRight | Focus tablist, press `ArrowRight` | `currentSceneIndex` cycles forward; active tab highlight updates; focus moves to new tab; lines reset to 0 |
| TC-03: Scene tab keyboard navigation — ArrowLeft | Focus tablist, press `ArrowLeft` | `currentSceneIndex` cycles backward (wraps from 0 to last); active tab highlight updates |
| TC-04: Scene tab keyboard navigation — Enter/Space | Focus inactive tab, press `Enter` or `Space` | Scene switches to that tab; `currentSceneIndex` updates; lines reset to 0 |
| TC-05: Comparison card REMOVED | Any lesson with `scenes.length > 1` | NO element with `data-testid="comparison-card"` exists in the DOM (ADR-009) |
| TC-06: Card body click — selects line, does NOT play | User clicks a line card body (not the play button) | `currentLineIndex` updates; visual highlight changes; `playLine` emit is NOT triggered |
| TC-07: Play button click — selects AND plays | User clicks the play button on a line card | `currentLineIndex` updates; `playLine` emit IS triggered with the line index |
| TC-08: Speaker badge normalization | Line has `speaker: 'ali'` (lowercase) | Badge displays "Ali" (capitalized); correct gradient applied |
| TC-09: Unknown speaker gets neutral badge | Line has `speaker: 'Abdullah'` (not in any known patterns) | Badge uses neutral stone gradient (not pink or teal) |
| TC-10: Empty speaker — no badge | Line has `speaker: ''` (empty string) | No speaker badge renders (unchanged behavior) |
| TC-11: Play Scene button styled | Scene has 1+ lines | A styled play scene button renders below lines with icon + label |
| TC-12: Play Scene button disabled state | `isAudioDisabled === true` | Button is disabled; `title="Audio is currently disabled"` present |
| TC-13: No dialogue content — error state | `section.content` is undefined or wrong type | "No dialogue content for this lesson." message renders |
| TC-14: Single-scene dialogue | 1 scene, multiple lines | No scene tabs render (tablist hidden); line cards render normally |
| TC-15: Arabic text font size increased | Any dialogue | Arabic text uses `text-xl md:text-2xl` (larger than existing `text-lg md:text-xl`) |
| TC-16: Multi-scene A1-01 no longer shows hardcoded comparison | `lessonId === 'a1-01'` with 2 scenes | NO comparison card renders (ADR-009 constraint satisfied) |
| TC-17: Focus management on scene switch | User navigates tabs via keyboard | Focus moves to the newly active tab button after DOM update |

---

## Assumptions

| # | Assumption | Where verified | Risk if wrong |
|---|---|---|---|
| A1 | `curriculum.ts` is the **sole** data source for dialogue content (static import, not API-fetched) | Verified: `curriculum.ts` is a static module; `curriculum` is exported directly | If the data model were ever to become API-based, the comparison card would need to be re-approached as a data field |
| A2 | The 12-name `isMaleSpeaker()` list in `LessonDialogue.vue:62` is **incomplete** — names like "Abdullah", "Omar", "Zayd" will appear in future lessons and are not on it | Verified: the list at line 62 contains 12 names; the curriculum data contains names like "Muhammad", "Ali", "Abraham" that are listed, but also "Abdullah" (not listed) which would incorrectly get the female (pink) gradient |
| A3 | The parent page (`[lesson].vue` or the lesson index) owns the `useAudioModule` and can emit a `@playing` event to children | Verified: the parent has access to `useAudioModule`; the spec adds a NEW `@playing` event to the interface. If the parent does not implement this, STEP 8's pulse animation and auto-scroll are degraded (no fatal error — the highlight gradient still works) |
| A4 | The 241-line existing test suite covers the **current (broken) behavior**, not the improved behavior. All tests must be reviewed and updated. | Verified: test file exists at `frontend/tests/components/LessonDialogue.test.ts` with 241 lines; tests check scene tabs, scene switching, speaker badges, play line/scene emits, active line highlighting. Tests do NOT test keyboard tab navigation (Issue 1), card-body vs. play-button interaction split (Issue 2), or comparison card removal (ADR-009). |
| A5 | The comparison card in the template (lines 184–204) is the **only** hardcoded content in `LessonDialogue.vue` | Verified: a grep of the file confirms no other hardcoded lesson-specific text blocks exist | If a hardcoded block exists that was missed, ADR-009 is not fully satisfied |
| A6 | `DialogueScene` (local to `LessonDialogue.vue:16-18`) and `DialogueLine` (from `curriculum.ts:126-131`) are **not** extended by this workflow | ADR-009 explicitly forbids adding `comparison` or `comparison_notes` fields. The types remain unchanged. | If a future lesson needs cross-scene comparison, the developer must re-introduce the schema. |
| A7 | The `malePatterns` prop (NEW) is **optional**; when not provided, the component falls back to a heuristic (first letter capitalization check) | This is a design choice, not verified in code (the prop does not exist yet). | If the heuristic is wrong for the curriculum data (e.g., a female speaker's name starts with "M"), the gradient is incorrect. |
| A8 | The page orchestrator `GlobalNavbar` is rendered in `app.vue` as an **ancestor**, not a child — so `LessonDialogue` cannot pass progress data upward as props (existing contract from ADR-008) | Verified: `GlobalNavbar` rendered in `app.vue`, outside the page route. | None — this constraint is already documented in ADR-008. |
| A9 | Nginx `proxy_buffering off` and `proxy_read_timeout 1800s` (registry A13) means TTS responses may take up to 30 minutes — a `setTimeout` on the client is needed (30s per the existing Lesson Details Page spec) | Registry verified (A13). | If a TTS synthesis takes longer than 30s, the client times out and shows an error, but the backend continues processing. The orphaned MP3 is handled by the 24h TTL cleanup. |
| A10 | The 241-line test suite's `playLine` emit test currently fires from a **body click** (not just the play button). After STEP 5 (card body no longer emits), this test must be modified. | Verified: the test checks `emit('playLine')` when a card body is clicked. | If the test is not updated, it will fail (body no longer emits). |

---

## Open Questions

1. **Should the `malePatterns` prop be added, or should the curriculum data carry a `gender: 'male' \| 'female'` field on `DialogueLine`?** — A `gender` field on `DialogueLine` is more explicit but requires extending the data model (ADR-009 says "do not extend the schema at this time"). The `malePatterns` prop is a compromise: it allows curriculum data to override without changing the `DialogueLine` interface.

2. **Should "Play Scene" emit a new `playSceneLines: [startIndex: number]` event instead of calling `playLine()` repeatedly?** — This would let the parent control the sequential-playback 800ms gap timer (from the existing Lesson Details Page spec, STEP 5). Currently, the parent must listen to repeated `playLine` emits and manage the gap. A dedicated event would be cleaner.

3. **Should the `isAudioDisabled` prop be extended with `disabledReason: string` for better accessibility (tooltip + screen reader text)?** — Currently, the prop is a boolean. Adding a string reason would enable tooltips ("Audio is currently disabled because the model is loading"). This is a minor enhancement with no functional impact.

4. **What happens if a user tabs through scene tabs on a single-scene dialogue (where `v-if` hides the tablist)?** — The tablist is hidden, so there is nothing to tab to — the user tabs directly to the line cards. This is correct behavior; no keyboard navigation is needed for a single-scene dialogue.

5. **Should the comparison content from the A1-01 hardcoded card (the three comparison points) be migrated to curriculum data as a content task, per ADR-009's long-term risk #1?** — ADR-009 says "Track this as a content task in the curriculum authoring backlog." This spec does not implement the migration; it only removes the hardcoded card.

---

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|---|---|---|
| 2026-09-12 | Initial spec created based on `specs/general/UI-IMPROVEMENTS.md` (LessonDialogue review, Issues 1–9) and `ADR-009`. | Spec maps 9 UI issues + ADR-009 constraints to 10 steps + ABORT_CLEANUP + 17 test cases. |
| 2026-09-12 | `LessonDialogue.vue` at 206 lines still contains the hardcoded comparison card (lines 184–204). | STEP 4 specifies deletion; spec assumes the card exists and must be removed. |
| 2026-09-12 | 241-line test file exists with tests for the comparison card (`data-testid="comparison-card"`). | All comparison-card tests must be removed or modified in the same PR (TC-05, TC-16). |
| 2026-09-12 | The curriculum's `DialogueLine` interface does not include a `gender` field (lines 126–131). | STEP 6 uses a prop-based `malePatterns` fallback (A2) instead of extending the data model (ADR-009 constraint). |
| 2026-09-12 | The page orchestrator (`[lesson].vue`, 197 lines) does not currently emit a `@playing` event. | STEP 8 documents the parent's responsibility to implement this (A3). |

---

**Status**: Draft. Requires Reality Checker pass against the actual codebase (STEP 4 verification: comparison card exists and must be removed; STEP 5 verification: current test fires `playLine` on body click). Stakeholder decisions recorded 2026-09-12 (A2: malePatterns prop as compromise; A7: heuristic fallback for missing patterns; A10: test update mandatory).
