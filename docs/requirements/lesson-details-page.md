# Lesson Details Page — Full Brainstorm & Requirements

> **Status:** Design / Requirements Phase
> **Date:** 2025-08-18
> **Inputs:** `docs/proto/lesson-details.html`, `frontend/app/data/curriculum.ts`, `frontend/app/data/lesson-01.json`
> **Existing page:** `frontend/app/pages/dashboard/level/[level]/[lesson].vue` (skeleton, not finished)

---

## 1. Current State Assessment

### What exists (working):

| Component | Status | Notes |
|---|---|---|
| `[lesson].vue` | Skeleton page | Breadcrumbs (working), hero placeholder, section tabs, generic item list |
| `LessonHero.vue` | Props interface complete | `level`, `lessonNumber`, `arabicTitle`, `estimatedTime`, `scenes`, `audioType`, `isReady` — template fully rendered |
| `StickyAudioBar.vue` | Fully implemented | Play/pause, prev/next, progress, speed, repeat, close, keyboard shortcuts. Emits: `close`, `toggle`, `prevTrack`, `nextTrack`, `seek`, `speedChange`, `repeatChange` |
| `useAudioModule()` | Full audio composable | `load(blob)`, `play()`, `pause()`, `toggle()`, `seek()`, `download()`, `dispose()`. Exposes: `isPlaying`, `isPaused`, `currentTime`, `duration`, `audioUrl`, `audioRef` |
| `curriculum.ts` | Rich data model | `LessonDefinition`, `SectionDefinition`, `SectionContent`, `ActivityDefinition`, `ActivityContent`, and `getLessonById()` |
| `lesson-01.json` | Proto data | Identical to `curriculum.ts` data for lesson 1 |
| `GlobalNavbar.vue` | Progress bar exists | Hardcoded to `0%` — needs wiring |

### What's missing (the gap):

- No section-specific rendering (dialogue scenes, vocabulary tables, pronoun cards, grammar topics, activity cards)
- No competency checklist
- No scene switching within dialogue
- No line-to-audio binding (click line → audio bar plays it)
- No progress tracking across lesson sections
- No activity interaction (5 activity types need UI)
- Hero props not wired to actual lesson data
- StickyAudioBar not mounted or bound in the lesson page

---

## 2. Page Architecture (from proto + existing data)

```
┌─────────────────────────────────────────────────────────────────┐
│  GlobalNavbar (existing, progress bar needs wiring)               │
├─────────────────────────────────────────────────────────────────┤
│  Breadcrumbs (existing, already works)                            │
├─────────────────────────────────────────────────────────────────┤
│  LessonHero (existing, needs data wiring)                         │
│    └─ level, lessonNumber, arabicTitle,                          │
│       estimatedTime, scenes, audioType                           │
├─────────────────────────────────────────────────────────────────┤
│  Competency Checklist (NEW — collapsible)                         │
│  - 5 checkboxes linked to lesson.competencies                    │
│  - Progress counter: "X of 5 competencies"                       │
├─────────────────────────────────────────────────────────────────┤
│  Section Tabs (existing, needs section routing)                   │
│  Dialogue | Vocabulary | Pronouns |                              │
│  Expressions | Grammar | Activities                              │
├─────────────────────────────────────────────────────────────────┤
│  Main Content (section-specific rendering):                       │
│                                                                   │
│  ┌─ Dialogue ────────────────────────────────────────────────┐   │
│  │  Scene tabs (Scene 1, Scene 2)                              │   │
│  │  Lines: Arabic (RTL) | English + Teacher Note              │   │
│  │  Each line: click → audio bar plays it                     │   │
│  │  "Play Scene" button → sequential playback                 │   │
│  │  Comparison card: key observation                          │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─ Vocabulary ──────────────────────────────────────────────┐   │
│  │  Category sections (Salutations, Nouns, ...)               │   │
│  │  Table: Arabic | English | Singular | Plural               │   │
│  │  Each word: click → audio bar plays it                     │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─ Pronouns ────────────────────────────────────────────────┐   │
│  │  Color-coded legend (♂ blue, ♀ pink, ⚉ green)             │   │
│  │  Grid cards: Arabic | English | Example                    │   │
│  │  Each card: click → audio bar plays it                     │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─ Expressions ─────────────────────────────────────────────┐   │
│  │  Grid cards: Arabic | English                              │   │
│  │  Each card: click → audio bar plays it                     │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─ Grammar ─────────────────────────────────────────────────┐   │
│  │  Topic cards: name + description + examples                │   │
│  │  Each example: Arabic | English pair                       │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─ Activities ──────────────────────────────────────────────┐   │
│  │  Activity cards: icon + title + type badge                 │   │
│  │  Each type needs interactive UI:                           │   │
│  │    listen-translate: dialogue reading + input              │   │
│  │    translate-to-english: Arabic → text input               │   │
│  │    translate-to-arabic: English → text input               │   │
│  │    introduce-characters: character form                    │   │
│  │    role-play: scenario + expected elements                 │   │
│  └───────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  StickyAudioBar (existing, needs data binding)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Section-by-Section Requirements

### A. Hero Section (enhance existing `LessonHero`)

- **Data source:** `LessonDefinition` → `title`, `arabicTitle`, `competencies?.length`, `sections[].scenes[].lines.length` (total lines), `sections[].scenes.length` (total scenes)
- **Props to wire:** `:arabicTitle="lesson.arabicTitle"`, `:estimatedTime="'~20 mins'"`, `:scenes="'2 Scenes • 10 Lines'"`, `:audioType="'AI-Generated Audio'"`
- **Status pill:** `isReady` is hardcoded `true` for now (no backend yet).
- **Component:** `LessonHero.vue` — already accepts all props, just needs wiring.

### B. Competency Checklist (NEW component)

- **Collapsible card** (toggle open/close with arrow rotation).
- **Data:** `lesson.competencies[]` → list of strings.
- **Interaction:** Clickable checkboxes. Checked state tracked in component (or composable).
- **Display:** "X of N competencies" counter.
- **Component:** `LessonCompetencies.vue` — props: `competencies: string[]`, `checked: number[]`, emits: `update:checked`.

### C. Dialogue Section (NEW component)

- **Scene switching:** Horizontal tabs for each scene (from `sections.dialogue.scenes[]`).
- **Line cards:** Split layout — left: Arabic (RTL, clickable for audio), right: English + Teacher Note (blue info box).
- **Active line:** Highlighted with left border accent + subtle background.
- **Play controls:**
  - Per-line play button (SVG icon) → triggers audio bar with that line's audio.
  - "Play Scene" button → sequential playback of all lines in current scene.
- **Comparison card:** Bottom card showing key differences between scenes (gender suffixes highlighted).
- **Component:** `LessonDialogue.vue` — props: `scenes: {label, gender, lines[]}[]`, emits: `playLine(index)`, `playScene()`.

### D. Vocabulary Section (NEW component)

- **Category grouping:** Each `categories[]` renders as a card with header.
- **Table layout:** Arabic (RTL) | English | Singular | Plural (conditional).
- **Audio:** Each row has a play button → audio bar.
- **Component:** `LessonVocabulary.vue` — props: `categories: {label, words[]}[]`.

### E. Pronouns Section (NEW component)

- **Color-coded legend:** Male (blue), Female (pink), Dual (green), Plural-M (amber), Plural-F (violet).
- **Grid cards:** 2-column grid. Each card: Arabic (RTL, large), English, Example (bordered bottom section).
- **Audio:** Each card clickable for audio.
- **Component:** `LessonPronouns.vue` — props: `pronouns: {arabic, english, example, category}[]`.

### F. Expressions Section (NEW component)

- **Grid cards:** 2-column grid. Each card: Arabic (RTL) + English.
- **Audio:** Each card clickable for audio.
- **Component:** `LessonExpressions.vue` — props: `expressions: {arabic, english}[]`.

### G. Grammar Section (NEW component)

- **Topic cards:** Each topic has a colored icon header (name), description paragraph, then examples list.
- **Example pairs:** Arabic (RTL) | English side-by-side.
- **Component:** `LessonGrammar.vue` — props: `topics: {name, description, examples[]}[]`.

### H. Activities Section (NEW component — most complex)

- **Activity cards:** Each activity renders as a card with type-specific icon, title, type badge, max attempts.
- **Interactive UI per type:**
  1. `listen-translate`: Shows dialogue text, text input for English translation, submit + check button.
  2. `translate-to-english`: Shows Arabic sentence, text input for English, submit + check.
  3. `translate-to-arabic`: Shows English sentence, text input for Arabic (with harakat), submit + check.
  4. `introduce-characters`: Character cards with form fields for Arabic sentences.
  5. `role-play`: Scenario text + checklist of expected elements (checkboxes).
- **State per activity:** `currentAttempt`, `isComplete`, `score`.
- **Component:** `LessonActivities.vue` — props: `activities: ActivityDefinition[]`, emits: `activityComplete(id, score)`.

### I. Sticky Audio Bar (WIRE existing component)

- **Current state:** Fully built, emits events.
- **Needs:** Data binding from lesson page:
  - `:active="audioBarVisible"`
  - `:textContent="currentLineText"`
  - `:isPlaying="audioModule.isPlaying"`
  - `:isPaused="audioModule.isPaused"`
  - `:currentTime="audioModule.currentTime"`
  - `:duration="audioModule.duration"`
  - `:shortcutsEnabled="true"` (keyboard shortcuts)
  - Event handlers: `@close`, `@toggle`, `@prevTrack`, `@nextTrack`, `@seek`, `@speedChange`, `@repeatChange`
- **Also needs:** `<audio ref="audioModule.audioRef" />` element in the page template (the composable returns `audioRef`).

---

## 4. Data Flow Architecture

```
LessonPage (route params)
  └→ getLessonById(level + '-' + lesson)
       → LessonDefinition
            ├→ title, arabicTitle, competencies
            ├→ sections[].content (dialogue, vocabulary, pronouns, expressions, grammar)
            └→ activities[]
```

**State management (within the page):**

- `activeSection: shallowRef('Dialogue')` — section tab selection (already exists).
- `currentSceneIndex: shallowRef(0)` — dialogue scene selection.
- `currentLineIndex: shallowRef(-1)` — active line index (for highlighting + audio).
- `checkedCompetencies: Ref<Set<number>>` — competency checklist state.
- `audioBarVisible: shallowRef(false)` — sticky bar visibility.
- `currentAudioLine: Ref<{arabic: string, index: number} | null>` — what the audio bar shows.

**Audio wiring:**

- `useAudioModule()` is already available.
- For dialogue lines: `audioModule.load(blob)` → `audioModule.play()`.
- The blob comes from the TTS backend (not yet implemented for lesson content).
- For now, audio can be mocked or use existing TTS API with the Arabic text.

---

## 5. Component Inventory (NEW components to create)

| Component | Purpose | Props | Emits |
|---|---|---|---|
| `LessonCompetencies` | Collapsible checklist | `competencies[]`, `checked[]` | `update:checked` |
| `LessonDialogue` | Scene tabs + line cards + play controls | `scenes[]` | `playLine(n)`, `playScene()` |
| `LessonVocabulary` | Category tables | `categories[]` | `playWord(index)` |
| `LessonPronouns` | Color-coded grid | `pronouns[]` | `playPronoun(index)` |
| `LessonExpressions` | Expression grid | `expressions[]` | `playExpression(index)` |
| `LessonGrammar` | Topic cards | `topics[]` | (none, informational) |
| `LessonActivities` | Activity cards + interactive UI | `activities[]` | `activityComplete(id, score)` |
| `LessonActivityRunner` | Dispatches by activity type | `activity: ActivityDefinition` | `submit(answer)`, `check()` |

---

## 6. Existing Components to Modify

| Component | Changes |
|---|---|
| `[lesson].vue` | Wire data to hero, add competency section, route section tabs to new components, wire audio bar. |
| `LessonHero.vue` | Already complete — just wire props from page. |
| `StickyAudioBar.vue` | Already complete — page just needs to bind data + event handlers. |
| `GlobalNavbar.vue` | Progress bar `progressWidth` hardcoded to `'0%'` — needs to accept lesson progress as prop. |

---

## 7. Key Design Decisions

1. **Section rendering:** Each section gets its own component (not one giant component). This matches the existing pattern of small, focused components.
2. **Audio integration:** The audio bar is already built. The lesson page just needs to wire `useAudioModule()` and call `load(blob)` when a user clicks a line/word. For development, use mock blobs.
3. **Activity interactivity:** Activities are the most complex — they need form state, validation, and scoring. Each activity type needs its own sub-component or a unified `LessonActivityRunner.vue` that dispatches by type.
4. **Progress tracking:** The progress bar in `GlobalNavbar` currently shows `0%`. It could be updated based on `checkedCompetencies.size / total`.
5. **Mobile:** The existing page has no mobile handling. The proto doesn't show mobile-specific layout. Consider stacking sections vertically on mobile (current tabs already wrap).

---

## 8. Implementation Order (suggested)

1. **Wire existing page** — connect `getLessonById` data to `LessonHero` props.
2. **Competency Checklist** — simple, no dependencies.
3. **Dialogue Section** — most complex content section, needs audio wiring.
4. **Vocabulary Section** — table rendering.
5. **Pronouns Section** — grid cards.
6. **Expressions Section** — grid cards.
7. **Grammar Section** — topic cards.
8. **Activities Section** — interactive forms (most work).
9. **Audio bar wiring** — connect all play actions to the sticky bar.
10. **Progress tracking** — update navbar progress bar.

---

## 9. Data Source Considerations

- **Current:** `curriculum.ts` is the single source of truth (static).
- **Proto:** `lesson-01.json` is identical in content to `curriculum.ts` data for lesson 1.
- **Future:** Backend API endpoints (`GET /api/lessons/:id`) can replace the static data via a composable.
- **Audio:** TTS backend (`POST /api/tts`) generates audio from Arabic text. For lesson content, each Arabic text string can be sent to TTS and the resulting blob cached.

---

## 10. Proto-Specific UI Details to Replicate

From the HTML proto:

### Line Cards

- `line-card` class with `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`, hover `translateX(-2px)`, active state with gradient background + 4px right border (RTL) or left border (LTR).
- **Active line:** `background: linear-gradient(135deg, rgba(20, 184, 164, 0.08), rgba(20, 184, 164, 0.03))`, `border-right: 4px solid #14b8a6` (RTL) or `border-left: 4px solid #14b8a6` (LTR).

### Speaker Badges

- Dark teal gradient (`#0f766e` → `#115e59`) for male, dark pink (`#be185d` → `#9d174d`) for female.

### Wave Animation

- 5 bars with staggered animation delays (0s, 0.1s, 0.2s, 0.3s, 0.4s).

### Tab Active State

- White bg, primary text, subtle shadow.

### Pronoun Color Coding

- Male (blue `#3b82f6`), Female (pink `#ec4899`), Dual (green `#10b981`), Plural-M (amber `#f59e0b`), Plural-F (violet `#8b5cf6`).

### Comparison Card

- Gold gradient background (`from-gold-50 to-amber-50`) with lightbulb icon.

### Play Buttons

- Scale on hover (`scale(1.1)`), press (`scale(0.95)`).

### Tooltips

- Via `data-tip` attribute with CSS `::after`.

### Progress Fill

- `transition: width 0.5s ease`.

### Section Card Animation

- `animation: fadeIn 0.4s ease` (opacity + translateY).

---

## 11. Audio Playback Logic (from proto)

The proto simulates audio playback with these behaviors:

| Action | Behavior |
|---|---|
| **Click a line** | Sets `currentLineIndex`, shows audio bar, plays that line |
| **Play Scene** | Sequential playback: plays each line, waits 800ms between lines |
| **Play/Pause** | Toggles playback state, updates wave animation |
| **Prev/Next** | Moves to adjacent line, resets progress |
| **Speed** | 0.75x, 1x, 1.25x — affects simulated duration |
| **Repeat** | Restarts current line |
| **Close bar** | Hides bar, stops playback, resets active line |

**Progress tracking:**
- Progress bar width = `completedLines / totalLines * 100`
- Completed lines = sum of all previous scenes' lines + current scene index + 1

---

## 12. Data Models (from `curriculum.ts`)

### `LessonDefinition`

```ts
interface LessonDefinition {
  id: string
  title: string
  arabicTitle: string
  description: string
  sections: SectionDefinition[]
  competencies?: string[]
  sequence?: number
  activities: ActivityDefinition[]
}
```

### `SectionDefinition`

```ts
interface SectionDefinition {
  type?: SectionType
  title?: string
  content: SectionContent
  _lessonId: string
  get items(): SectionItem[]
}
```

### `SectionContent` (union type)

```ts
type SectionContent =
  | { type: 'dialogue', scenes: { label: string, lines: DialogueLine[] }[] }
  | { type: 'vocabulary', categories: { label: string, words: VocabWord[] }[] }
  | { type: 'pronouns', pronouns: { arabic: string, english: string, example: string }[] }
  | { type: 'expressions', expressions: { arabic: string, english: string }[] }
  | { type: 'grammar', topics: { name: string, description: string, examples: { arabic: string, english: string }[] }[] }
```

### `ActivityDefinition`

```ts
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

### `ActivityContent` (union type — 7 variants)

```ts
type ActivityContent =
  | { type: 'listen-translate', dialogue: { [sceneKey: string]: { label: string, arabic: string, english_expected: string } } }
  | { type: 'translate-to-english', sentences: { arabic: string, english_expected: string }[] }
  | { type: 'translate-to-arabic', sentences: { english: string, arabic_expected: string }[] }
  | { type: 'introduce-characters', characters: { name: string, arabic: string, gender: string, sentences: { english: string, arabic_expected: string }[] }[] }
  | { type: 'role-play', scenario: string, expectedElements: string[] }
  | { type: 'fill-blank', prompt: string, answer: string, options?: string[] }
  | { type: 'matching', pairs: { source: string, target: string }[] }
```

### `ActivityType`

```ts
type ActivityType =
  | 'listen-translate'
  | 'role-play'
  | 'fill-blank'
  | 'matching'
  | 'translate-to-english'
  | 'translate-to-arabic'
  | 'introduce-characters'
```

---

## 13. Existing Page — What's Already There

From `[lesson].vue` (lines 1–197):

- Route params: `levelParam`, `lessonParam`
- Breadcrumbs: `Dashboard → Level {level} → Lesson {id}` (working)
- Section tabs: `sectionTabs` computed from `lesson.sections.map(s => s.name)` (working)
- `activeSection` state (working)
- `currentLessonData` computed (working)
- `currentSectionItems` computed (working)
- Redirect guard for missing level param (working)
- **Hero:** `LessonHero` rendered with hardcoded `:is-ready="true"` (props not wired)
- **Content:** Generic item list with `v-for` over `currentSectionItems` (not section-specific)

---

## 14. StickyAudioBar — Interface Contract

From `StickyAudioBar.vue`:

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `active` | `boolean` | `false` | Whether bar is visible |
| `textContent` | `string` | `'—'` | Arabic text displayed |
| `isPlaying` | `boolean` | `false` | Playback state |
| `isPaused` | `boolean` | `false` | Paused state |
| `currentTime` | `number` | `0` | Current playback position (seconds) |
| `duration` | `number` | `0` | Total duration (seconds) |
| `shortcutsEnabled` | `boolean` | `false` | Enable keyboard shortcuts |

### Emits

| Event | Payload | Description |
|---|---|---|
| `close` | — | Hide the bar |
| `toggle` | — | Play/pause toggle |
| `prevTrack` | — | Previous line |
| `nextTrack` | — | Next line |
| `seek` | `{ ratio: number }` | Seek to position |
| `speedChange` | `{ speed: number }` | Change playback speed |
| `repeatChange` | `{ enabled: boolean }` | Toggle repeat |

### Exposed (defineExpose)

- `handleKeydown` — keyboard handler for testing

---

## 15. useAudioModule — Interface Contract

From `useAudioModule.ts`:

### Returns

```ts
return {
  // State
  isPlaying, isPaused, currentTime, duration,
  audioUrl,

  // Template binding
  audioRef,

  // Actions
  load,
  play,
  pause,
  toggle,
  seek,
  download,

  // Safety net
  dispose
}
```

### `load(blob: Blob)`

- Creates object URL from blob, wires to `<audio>` element.

### `play()`

- Async: calls `nextTick()` then `audioEl.play()`.

### `pause()`

- Calls `audioEl.pause()`.

### `toggle()`

- Async: calls `nextTick()` then `audioEl.play()` or `pause()`.

### `seek(ratio: number)`

- Sets `audioEl.currentTime = ratio * duration`.

### `download(filename?: string)`

- Triggers browser download from audio URL.

### `dispose()`

- Revokes all object URLs, removes event listeners.

---

## 16. GlobalNavbar — Progress Bar

From `GlobalNavbar.vue`:

- `progressWidth` is hardcoded to `'0%'` (line 40).
- Needs to accept lesson progress as a computed prop from the lesson page.
- Progress = `completedLines / totalLines * 100` (from proto logic).

---

## 17. Implementation Checklist

### Phase 1: Wire Existing Page
- [ ] Connect `getLessonById` data to `LessonHero` props
- [ ] Wire `currentLessonData` to hero: `arabicTitle`, `estimatedTime`, `scenes`, `audioType`
- [ ] Wire `currentLessonData` to hero: `competencies?.length` for status pill

### Phase 2: Competency Checklist
- [ ] Create `LessonCompetencies.vue`
- [ ] Collapsible toggle with arrow rotation
- [ ] Checkboxes bound to `lesson.competencies[]`
- [ ] "X of N competencies" counter
- [ ] Track checked state in page (or composable)

### Phase 3: Dialogue Section
- [ ] Create `LessonDialogue.vue`
- [ ] Scene tabs (horizontal)
- [ ] Line cards: Arabic (RTL, clickable) | English + Teacher Note (blue box)
- [ ] Active line highlighting (gradient bg + border accent)
- [ ] Per-line play button → audio bar
- [ ] "Play Scene" button → sequential playback (800ms between lines)
- [ ] Comparison card (gold gradient, key observation)

### Phase 4: Vocabulary Section
- [ ] Create `LessonVocabulary.vue`
- [ ] Category cards with header
- [ ] Table: Arabic | English | Singular | Plural (conditional)
- [ ] Per-word audio button

### Phase 5: Pronouns Section
- [ ] Create `LessonPronouns.vue`
- [ ] Color-coded legend (male/female/dual/plural-m/plural-f)
- [ ] 2-column grid cards
- [ ] Per-card audio button

### Phase 6: Expressions Section
- [ ] Create `LessonExpressions.vue`
- [ ] 2-column grid cards
- [ ] Per-card audio button

### Phase 7: Grammar Section
- [ ] Create `LessonGrammar.vue`
- [ ] Topic cards with colored icon header
- [ ] Description + examples list
- [ ] Example pairs: Arabic | English

### Phase 8: Activities Section
- [ ] Create `LessonActivities.vue`
- [ ] Activity cards (icon, title, type badge, max attempts)
- [ ] Create `LessonActivityRunner.vue` (dispatches by type)
- [ ] Implement 5 activity types:
  - [ ] `listen-translate`: dialogue reading + text input
  - [ ] `translate-to-english`: Arabic → text input
  - [ ] `translate-to-arabic`: English → Arabic text input (with harakat)
  - [ ] `introduce-characters`: character form fields
  - [ ] `role-play`: scenario + expected elements checklist
- [ ] Track per-activity state: `currentAttempt`, `isComplete`, `score`

### Phase 9: Audio Bar Wiring
- [ ] Wire `StickyAudioBar` in page template
- [ ] Bind `useAudioModule()` state to bar props
- [ ] Connect all play actions (dialogue lines, vocabulary, pronouns, expressions) to `audioModule.load(blob)` + `audioModule.play()`
- [ ] Add `<audio ref="audioModule.audioRef" />` element
- [ ] Wire all event handlers: `@close`, `@toggle`, `@prevTrack`, `@nextTrack`, `@seek`, `@speedChange`, `@repeatChange`

### Phase 10: Progress Tracking
- [ ] Update `GlobalNavbar` progress bar from lesson page
- [ ] Progress = `completedLines / totalLines * 100`
- [ ] Track completed lines across scenes

---

## 18. Risks & Considerations

1. **Audio backend not ready:** TTS endpoint for lesson content may not exist yet. Plan for mock blobs during development.
2. **Activity validation:** Content-based validation (comparing user input to expected Arabic with harakat) is non-trivial. May need a normalization/comparison utility.
3. **State management:** Multiple interactive sections (competencies, dialogue, activities) each track state. Consider a composable for lesson state management.
4. **Mobile layout:** Proto shows desktop-first. Mobile stacking behavior needs design decisions.
5. **Performance:** Large dialogue sections with many lines could cause re-render issues. Consider virtualization if needed.
6. **RTL/LTR mixed content:** Each line card has RTL (Arabic) and LTR (English) sections. Ensure proper `dir` attributes.

---

## 19. Proto-to-Component Mapping

| Proto Element | Component | Notes |
|---|---|---|
| `renderCompetencies()` | `LessonCompetencies.vue` | Collapsible checklist |
| `renderDialogue()` | `LessonDialogue.vue` | Scene tabs + line cards |
| `renderDialogueLine()` | (inside `LessonDialogue.vue`) | Individual line card |
| `renderVocabulary()` | `LessonVocabulary.vue` | Category tables |
| `renderPronouns()` | `LessonPronouns.vue` | Color-coded grid |
| `renderExpressions()` | `LessonExpressions.vue` | Expression grid |
| `renderGrammar()` | `LessonGrammar.vue` | Topic cards |
| `renderActivities()` | `LessonActivities.vue` | Activity cards |
| `LessonActivityRunner.vue` | (NEW) | Dispatches by activity type |
| `StickyAudioBar` | (existing) | Wire data + events |
| `GlobalNavbar.progressWidth` | (existing) | Wire from page |
| `LessonHero` | (existing) | Wire props |
