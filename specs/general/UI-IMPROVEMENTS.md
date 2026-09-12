# UI/UX Improvements — Dashboard Page

## Summary

Review of the Dashboard page (`dashboard.vue`) conducted on 2026-08-16. The page is a curriculum overview with a hero section (overall progress ring + "Continue Learning" CTA) and a grid of CEFR-level cards. Visually, the gradient tile headers are attractive and the card layout is clean. However, the review identified critical accessibility gaps, misleading static content (hardcoded zeros), structural redundancy, and interaction design issues that undermine the user's ability to understand and act on their learning progress.

---

## Critical Issues

### Issue 1: Hardcoded `0` Values Make Progress Data Deceptive

**Current State**: Lines 8, 148, 150, 157 all use the literal `0` instead of any real completion data:
```html
const completedLessons = computed(() => 0)
<!-- Card body -->
<span>{{ 0 }} / {{ level.lessons.length }} lessons</span>
<span>{{ 0 >= level.lessons.length ? 'Completed' : 'In Progress' }}</span>
:style="{ width: level.lessons.length > 0 ? `${(0 / level.lessons.length) * 100}%` : '0%' }"
```

**Problem**: Every card shows "0 / N lessons" with a 0% progress bar and "In Progress" status — always, forever. The dashboard's primary purpose is to show learning progress, but the data is completely static. This creates a **misleading mental model**: users see a dashboard that looks functional but provides zero information. It's worse than no dashboard — it actively communicates "you've made no progress" even if progress tracking is wired up later.

**Recommendation**: Replace all `0` literals with a real completion-tracking composable (e.g., `useLessonProgress()`). Until that composable exists, show a clear "No progress data yet" state or a loading skeleton. Do not ship a progress dashboard with hardcoded zeros — users will assume the app is broken.

**Impact**: Restores trust in the dashboard as a functional progress tracker.

---

### Issue 2: "Continue Learning" Button Links to `/dashboard` (Itself)

**Current State**: Line 96:
```html
<NuxtLink to="/dashboard" class="...">
  Continue Learning
</NuxtLink>
```

**Problem**: The CTA links to the same page it's already on. This is a **dead link** — clicking it navigates to the current page, causing a full page reload with no user benefit. For a dashboard whose purpose is to guide users to lessons, having the primary action button do nothing is a severe usability failure.

**Recommendation**: The button should link to the first incomplete level, or the user's first "In Progress" lesson. If no progress exists yet, link to `/dashboard/level/A1` (the first level). The label "Continue Learning" implies forward motion — the destination must match.

**Impact**: The primary CTA becomes functional and drives lesson engagement.

---

### Issue 3: Progress Ring Has No Accessible Label

**Current State**: Lines 60-84 render an SVG circular progress indicator with a percentage number centered inside:
```html
<svg class="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
  <circle ... />
  <circle ... :stroke-dasharray="`${overallProgress * 0.974}, 100`" />
</svg>
<span class="absolute inset-0 ...">{{ overallProgress }}%</span>
```

**Problem**: The SVG has no `role`, no `aria-label`, no `aria-valuenow`, and no `aria-valuemax`. Screen readers will announce "SVG" with no context. The percentage text is inside a `<span>` with no ARIA linkage to the SVG. The visual progress is invisible to assistive technology users.

**Recommendation**: Add `role="img"` and `aria-label="Overall progress: {{ overallProgress }} percent"` to the SVG. The centered percentage text is sufficient as a visual label; it does not need a separate accessible label if the SVG itself is properly labeled.

**Impact**: Progress ring becomes accessible to screen reader users.

---

### Issue 4: Card Content Is Not Keyboard-Focusable, CTA Buttons Within Are

**Current State**: Each level card is a `<NuxtLink>` (line 110), which is correct — the entire card is clickable. However, the card body (lines 142-160) contains a progress bar that is purely decorative but visually communicates progress. There is no `aria-label` on the progress bar to indicate it is a visual progress indicator.

**Problem**: While the card-as-link pattern is correct, the progress bar inside has no semantic meaning. Keyboard users who tab to the link get the card's URL, but no information about what the card represents beyond its gradient header. The progress bar is a visual-only element with no `role="progressbar"` or `aria-label`, making it invisible to assistive technology.

**Recommendation**: Add `role="progressbar"` and `aria-label` to the progress bar `<div>` (line 154-158). Example: `aria-label="Progress: 0% — 0 of {{ level.lessons.length }} lessons completed"`.

**Impact**: Keyboard and screen reader users can understand each card's progress state without visual inspection.

---

### Issue 5: Arabic Watermark Text Is Visible and Distracting

**Current State**: Lines 122-127:
```html
<span class="absolute top-2 right-3 font-arabic text-white/30 text-2xl select-none" aria-hidden="true">
  {{ level.arabicTitle }}
</span>
```

**Problem**: The Arabic title watermark is at `text-white/30` (30% opacity) on top of a dark gradient background. At 30% opacity on dark gradients, the text is **too visible** — it reads as content rather than decoration. Users scanning the card will notice the Arabic title twice: once as the watermark (large, right-aligned) and once as the actual title (smaller, left-aligned below the badge). This creates visual confusion about which is the primary label.

**Recommendation**: Reduce opacity to `text-white/10` (10%) or remove the watermark entirely. If keeping it as a design element, make it significantly more subtle — it should be felt, not read. Alternatively, position it more decoratively (e.g., rotated, or as a background pattern) rather than as legible text.

**Impact**: Reduces visual clutter; the actual Arabic title becomes the clear primary label.

---

## High Priority Improvements

### Issue 6: Goal Text Is Redundant With Level Description

**Current State**: Lines 144-146:
```html
<p class="text-sm text-stone-600 dark:text-stone-300 mb-3 line-clamp-3">
  {{ level.goal }}
</p>
```

**Problem**: The `goal` field from curriculum data is a full paragraph (e.g., "Memorize ~500 Arabic root words, handle basic everyday interactions..."). Displaying this as a `line-clamp-3` card body text creates a wall of text that users will not read. The goal is educational content better suited for a detail view, not a summary card.

**Recommendation**: Replace `level.goal` with `level.keySkills` — render the first key skill as a short, scannable line (e.g., "Greet people and introduce oneself."). Key skills are concise, action-oriented, and give users a clear sense of what each level offers without overwhelming them.

**Impact**: Cards become scannable; users can quickly assess which level matches their needs.

---

### Issue 7: Status Label "In Progress" Is Always True (Misleading)

**Current State**: Lines 149-151:
```html
<span class="text-primary-600 dark:text-primary-400 font-medium text-xs uppercase tracking-wide">
  {{ 0 >= level.lessons.length ? 'Completed' : 'In Progress' }}
</span>
```

**Problem**: Since `0` is hardcoded, this always evaluates to "In Progress" (unless a level has zero lessons, which none do). The label is **permanently misleading** — it tells users every level is in progress, even if they've completed all lessons. When real progress data is wired up, this logic is correct, but until then it communicates false information.

**Recommendation**: When progress data is unavailable (the `0` state), render "Not Started" or omit the status label entirely. When real data exists, show "Completed" when `completed >= total` and "In Progress" otherwise. The conditional is correct; the input (`0`) is not.

**Impact**: Status labels accurately reflect the user's actual state.

---

### Issue 8: Card Grid Has Insufficient Spacing for Touch Targets

**Current State**: Line 109:
```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

**Problem**: `gap-4` (16px) is tight for touch targets on mobile devices. While the entire card is a `<NuxtLink>`, the visual separation between cards is minimal. On touch devices, users may tap between cards expecting a gap, or accidentally trigger adjacent cards. The `lg:grid-cols-3` layout on desktop also creates narrow cards that compress the gradient header and body text.

**Recommendation**: Increase to `gap-5` (20px) for better touch target isolation. On `lg`, consider `gap-6` (24px). Ensure minimum card width is `min-w-[280px]` to prevent excessive narrowing on wide screens with 3 columns.

**Impact**: Better touch target isolation; cards maintain readable proportions at all breakpoints.

---

### Issue 9: No Empty State or Onboarding Guidance

**Current State**: The dashboard renders all 6 CEFR levels as cards, each showing "0 / N lessons" with 0% progress. There is no guidance for new users about what to do next.

**Problem**: A new user landing on this dashboard sees six cards, all showing "In Progress" with 0% completion. There is no clear next step. The "Continue Learning" button (Issue 2) is broken. The hero section says "Track your progress" but there is no progress to track. This is a **cold start problem** — the dashboard has no onboarding state.

**Recommendation**: When `completedLessons === 0 && overallProgress === 0`, show an onboarding state: a prominent "Start with A1 — Foundation" card (visually elevated above others), and a hero message: "Ready to start? Begin with A1 — Foundation level." The first level card could have a visual indicator (e.g., a small "Start Here" badge) to guide new users.

**Impact**: New users get clear guidance on where to begin; reduces decision paralysis.

---

## Medium Priority Enhancements

### Issue 10: Progress Bar Uses Hardcoded 0 Width

**Current State**: Lines 154-158:
```html
<div class="w-full h-1.5 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
  <div class="h-full bg-primary-500 rounded-full transition-all duration-500"
       :style="{ width: level.lessons.length > 0 ? `${(0 / level.lessons.length) * 100}%` : '0%' }" />
</div>
```

**Problem**: The progress bar is always 0% width. The `transition-all duration-500` is defined but never triggered because the width never changes. When real data is wired up, the transition will work — but until then, the bar is a static visual element that communicates nothing.

**Recommendation**: When progress is 0%, consider showing a subtle "empty" state (e.g., a dashed border instead of a solid bar, or a faint placeholder). This signals "progress tracking not yet active" rather than "0% complete."

**Impact**: Better visual distinction between "no data" and "0% progress."

---

### Issue 11: Lesson Count Display Is Redundant With Progress Bar

**Current State**: Lines 147-158 render both a text summary ("0 / N lessons") AND a progress bar (0% width) AND a status label ("In Progress"). That's three redundant progress indicators in one card.

**Problem**: Users don't need three separate widgets to communicate the same information. The text summary, progress bar, and status label all convey "no progress" — this is visual redundancy that wastes precious card real estate.

**Recommendation**: When progress is 0%, keep only the status label ("Not Started") and remove the progress bar. When real progress data exists, keep the progress bar + text summary (the bar gives a quick visual scan; the text gives the exact count). The status label can be removed when a progress bar is present (the bar is self-explanatory).

**Impact**: Cleaner cards with better information hierarchy.

---

### Issue 12: Level Badge and Title Are Too Small in Gradient Header

**Current State**: Lines 129-133:
```html
<span class="px-2.5 py-0.5 rounded-full text-white text-[10px] font-bold tracking-wider ring-1 ring-white/30">
  {{ level.code }}
</span>
<span class="text-white/90 text-xs font-medium">{{ level.title }}</span>
```

**Problem**: The CEFR code badge (`text-[10px]`) and level title (`text-xs`) are extremely small in the gradient header. The gradient header takes ~80px of vertical space (pt-5 + pb-4 + px-5 padding) but contains only 24px of actual content (badge + title). This is **inefficient use of space** — the header is disproportionately large for its content.

**Recommendation**: Reduce header padding to `pt-4 pb-3` (or `pt-3 pb-2`). Increase badge to `text-[11px]` and title to `text-sm`. The Arabic title below (line 135) is the primary card label and is `text-lg` — the header should not compete with it.

**Impact**: Better space efficiency; clearer visual hierarchy between header metadata and card body content.

---

### Issue 13: No Loading State for Curriculum Data

**Current State**: The curriculum data is imported directly from a TypeScript module (line 3). There is no loading state, no error handling, and no skeleton UI.

**Problem**: If the curriculum data were ever fetched from an API (as the comment on line 6-7 of `curriculum.ts` suggests), there would be a flash of empty cards. Even with static data, if the curriculum is large, there could be a brief render delay. No loading state means no graceful handling of this transition.

**Recommendation**: Add a skeleton loading state for the card grid (6 skeleton cards matching the card shape). This is a forward-looking improvement that prepares for API-based curriculum loading.

**Impact**: Graceful loading experience when curriculum is fetched from an API.

---

## Low Priority Suggestions

### Issue 14: Hero Section Subtitle Is Generic

**Current State**: Lines 52-54:
```html
<p class="text-sm text-stone-500 dark:text-stone-400 mt-2 max-w-md">
  Track your progress across CEFR levels. Complete lessons to advance through the curriculum.
</p>
```

**Problem**: The subtitle is generic and could apply to any learning platform. It doesn't mention Arabic, CEFR, or anything specific to Lughat's context. It reads like a placeholder.

**Recommendation**: Make it more specific: "Track your Arabic learning journey across CEFR levels — from A1 (Foundation) to C2 (Mastery)." This reinforces the app's purpose and gives users context about the curriculum structure.

**Impact**: Better onboarding context for first-time users.

---

### Issue 15: "Your Learning Journey" Label Is Redundant

**Current State**: Lines 46-48:
```html
<p class="text-xs font-semibold tracking-widest text-primary-600 dark:text-primary-400 uppercase mb-2">
  Your Learning Journey
</p>
```

**Problem**: This label sits above "Dashboard" and adds no information. "Dashboard" is the page title; "Your Learning Journey" is a decorative subtitle that users will ignore. It takes vertical space that could be used for the progress ring (currently pushed to the side by `md:flex-row`).

**Recommendation**: Remove "Your Learning Journey" or replace it with actionable metadata: "6 Levels · {{ totalLessons }} Lessons · {{ completedLessons }} Completed". This turns a decorative label into useful information.

**Impact**: More useful information in the hero section; cleaner hierarchy.

---

### Issue 16: No Dark Mode Contrast Verification for Gradient Headers

**Current State**: The gradient headers use dark gradient colors (e.g., `#0f766e → #134e4a` for teal). In dark mode, the white text (`text-white`) on these dark gradients may have insufficient contrast for some users, especially on lower-quality displays.

**Problem**: The gradient `#134e4a` (teal-900) on a dark background (`bg-stone-950`) has the same dark tone as the page background, making the card header blend into the background in dark mode. The white text is readable, but the card boundary is hard to perceive.

**Recommendation**: Add a subtle `ring-1 ring-stone-700 dark:ring-stone-600` to the card container (line 114) to define the card boundary in dark mode. The `card` class may already provide this — verify. If not, add it.

**Impact**: Better card boundary perception in dark mode.

---

## Positive Observations

1. **Gradient tile headers are visually distinctive**: Each CEFR level has a unique gradient (teal, emerald, cyan, sky, indigo, violet), creating an immediate visual distinction between levels. This is a strong design choice.

2. **Card-as-link pattern is correct**: Using `<NuxtLink>` as the card wrapper (line 110) means the entire card is clickable, not just a small button. This is excellent for both mouse and touch interaction.

3. **Progress ring in hero section is a nice touch**: The circular SVG progress indicator with centered percentage is a compact, visually appealing way to show overall progress. The `-rotate-90` rotation to start from the top is the correct SVG approach.

4. **Arabic watermark in cards is a creative design element**: Even though it's too visible (Issue 5), the concept of embedding Arabic text as a decorative watermark adds cultural flavor and visual interest.

5. **Dark mode support is present**: `dark:bg-stone-950`, `dark:text-*` variants throughout show that dark mode was considered from the start.

6. **Responsive grid layout is sensible**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` provides appropriate column counts across breakpoints.

7. **Cubic-bezier easing on cards is a nice polish**: `ease-[cubic-bezier(0.32,0.72,0,1)]` gives cards a satisfying, non-linear hover animation.

8. **Curriculum data is well-structured**: The `curriculum.ts` data source is comprehensive with `keySkills`, `description`, `arabicTitle`, `goal`, and `lessonRange` fields — providing rich data for future dashboard enhancements.

---

## Priority Matrix

| Priority | Issues | Estimated Effort |
|----------|--------|------------------|
| Critical | 1, 2, 3, 4, 5 | Medium (data wiring is largest) |
| High | 6, 7, 8, 9 | Low-Medium |
| Medium | 10, 11, 12, 13 | Low |
| Low | 14, 15, 16 | Low |

---

## Notes on Relationship to Existing Reviews


---

# UI/UX Improvements — Lesson Dialogue Component (`LessonDialogue.vue`)

## Summary


---

## Critical Issues

### Issue 1: Scene Tabs Lack Keyboard Navigation (Tab Order, Arrows, Enter/Space)

**Current State**: Scene tabs are `<button>` elements inside a `role="tablist"` with `role="tab"` on each, and `:aria-selected` bindings. However, there are NO `tabindex` attributes, NO `@keydown` handlers for arrow keys, and NO `aria-activedescendant` linkage.

Lines 76-97 of `LessonDialogue.vue`:
```html
<div class="flex gap-2 overflow-x-auto pb-2" data-testid="scene-tabs" role="tablist">
  <button v-for="(label, index) in sceneLabels" :key="index" :data-testid="`scene-tab`" :class="[…]" :role="`tab`" :aria-selected="index === currentSceneIndex" @click="selectScene(index)">
    {{ label }}
  </button>
</div>
```

**Problem**: The ARIA roles are declared but the behavioral contract of ARIA tabs is NOT fulfilled. Per ARIA Authoring Practices for tabs, keyboard users MUST be able to navigate between tabs with Left/Right arrow keys, activate with Enter/Space, and have the active tab tracked with `aria-activedescendant` on the tablist. Without these, keyboard users can only reach tabs via sequential tab-order (which works if buttons are naturally focusable — they are `<button>` elements — but the visual active state and content do NOT update with keyboard navigation since `selectScene(index)` is wired only to `@click`). Arrow key navigation is completely missing. This violates WCAG 2.1 **2.1.1 Keyboard** (Level A) and **4.1.2 Name, Role, Value** (Level A).

**Recommendation**: 
1. Add `@keydown.arrow.left` / `@keydown.arrow.right` handlers on the `tablist` container to cycle `currentSceneIndex`.
2. Add `tabindex="0"` to the active tab and `tabindex="-1"` to inactive tabs.
3. Add `aria-activedescendant` on the `tablist` bound to the active tab's element ID.
4. Keep `@click` for mouse users (both paths converge).

Example keyboard handler:
```ts
function handleTabKeydown(event: KeyboardEvent): void {
  const key = event.key
  if (key === 'ArrowRight' || key === 'ArrowLeft') {
    event.preventDefault()
    const dir = key === 'ArrowRight' ? 1 : -1
    const nextIndex = (currentSceneIndex.value + dir + sceneLabels.value.length) % sceneLabels.value.length
    selectScene(nextIndex)
  }
}
```

**Impact**: Keyboard and screen reader users get full tab navigation matching the WAI-ARIA tab pattern. Current state: keyboard-only users can reach tabs but content never updates — a partial-focus trap.

---

### Issue 2: Play Buttons Are Inside Clickable Cards — Conflicting Interaction Model

**Current State**: Lines 120-170 render a line card `<div>` with `@click="currentLineIndex = lineIndex; playLine(lineIndex)"` that contains an inner `<button>` with `@click.stop="playLine(lineIndex)"`.

**Problem**: The `.stop` modifier prevents event bubbling to the outer card, but clicking the card AND clicking the play button both trigger `playLine(index)`. This is **redundant interaction** that confuses users. More critically, clicking the card to select (set `currentLineIndex`) AND simultaneously play audio is a **conflicting interaction model**: sometimes the user wants to just review a line without playing audio, but clicking the card always triggers playback.

**Recommendation**: Split the two interactions:
1. **Clicking the card body** (non-button area) should only select/activate the line — set `currentLineIndex` without emitting `playLine`.
2. **Clicking the play button** should emit `playLine` — unchanged.
3. Visually highlight the active line (existing behavior) without triggering audio.

**Impact**: Users gain the ability to review lines without triggering audio — essential for a language learning context where learners may want to read/translate before committing to audio.

---

### Issue 3: Comparison Card Is Hardcoded — It Will Be Out of Date When Curriculum Changes

**Current State**: Lines 184-204 render a comparison card with hard-coded text about gender suffixes, verb conjugation, and welcome phrases — all specific to the A1-01 lesson's dialogue between Muhammad↔Ali and Khadija↔Aisha. Uses `!text-base` (inline `!important` override) — a design smell.

**Problem**: This card is **tied to a specific lesson's content**. When the curriculum expands (more lessons with multi-scene dialogues), this card will render identical content regardless of which lesson's dialogue is being viewed. It will show Muhammad/Ali comparison text when the user is viewing an A2 or B1 dialogue — **pedagogically misleading**. The card also has `v-if="dialogueContent.scenes.length > 1"` — so it appears for ANY multi-scene dialogue, but its content is lesson-specific. This is a **data/content mismatch bug** waiting to be discovered.

**Recommendation**: 
1. **Remove the hardcoded comparison card** entirely. It's lesson-specific content baked into a reusable component.
2. If comparison content is needed, make it part of the curriculum data model: extend `DialogueLine` with optional `comparison_notes: string[]` or add a `comparison` field to `DialogueScene`.
3. The component should be **purely presentational** — it renders whatever the data gives it. Hardcoding lesson-specific pedagogy here breaks reusability.

**Impact**: Prevents the card from showing irrelevant comparison content for non-A1-01 dialogues. The component becomes correctly reusable across all lessons.

---

### Issue 4: Empty Speaker Field Produces No Speaker Badge — Inconsistent Layout Between Single- and Multi-Scene Dialogues

**Current State**: Lines 107-117:
```html
<div v-if="line.speaker" class="flex items-center gap-2">
  <span :data-testid="`speaker-badge-${lineIndex}`" :class="`inline-block px-2 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-br ${getSpeakerGradient(line.speaker)}`">
    {{ line.speaker }}
  </span>
</div>
```
Curriculum data has lines with `speaker: ''` (empty string) — see `curriculum.ts` lines 514, 527, 627, 640, 721, 734, 831, 844, 941, 954, 1051, 1155. When `speaker` is empty, the `v-if="line.speaker"` evaluates to `false` (empty string is falsy), so **no speaker badge renders**.

**Problem**: For single-scene dialogues (empty label, `speaker: ''`), there's no speaker identity at all — the learner has no visual cue about who is speaking. In multi-scene dialogues, the speaker badge appears with gradient colors. The **inconsistency between single-scene (no identity) and multi-scene (identity + color coding)** is confusing.

**Recommendation**: 
1. For single-scene dialogues where `speaker` is empty, consider rendering a **neutral placeholder** (e.g., "Narrator" or the dialogue title) if the curriculum data specifies it, OR make it explicit in the component that unspoken lines are narrator text.
2. Alternatively, add a `speaker` field to the curriculum data model that is **required** (not optional empty string) for dialogues that have speakers.

**Impact**: Eliminates layout inconsistency between single- and multi-scene dialogues; gives learners consistent identity cues.

---

### Issue 5: Play Scene Button Has No Icon and No Visual Distinction from a Body Button

**Current State**: Lines 174-182:
```html
<button v-if="currentScene.lines.length > 0" data-testid="play-scene" :disabled="_props.isAudioDisabled" @click="playScene">
  Play Scene
</button>
```

**Problem**: The "Play Scene" button has **no icon**, no distinct styling (no classes at all — just raw text), and sits at the same indentation as the line cards. It reads as an afterthought — visually it blends into the text flow rather than standing out as an actionable control. Compare this to the individual play buttons which are 32×32px circles with a play icon and primary-600 background. When `isAudioDisabled` is true, the button is `disabled` — but there's no tooltip, no `aria-describedby`, and no visible hint about why it's disabled.

**Recommendation**: 
1. Add a play icon (the same SVG as the line buttons) + a rounded background + primary colors to make it visually consistent with the line play buttons.
2. Position it as a full-width or right-aligned action button below all line cards.
3. When disabled, show a subtle visual cue (e.g., a `title` attribute: "Audio is currently disabled").


---

## High Priority Improvements

### Issue 6: Current Line Highlighting Lacks Visual Progression — Too Subtle

**Current State**: Lines 122-130:
```html
:class="[
  'rounded-xl border p-4 md:p-5 transition-all cursor-pointer',
  _props.isAudioDisabled ? 'opacity-40 cursor-not-allowed'
    : [lineIndex === currentLineIndex ? 'bg-gradient-to-l from-primary-100 to-primary-50 border-primary-300 dark:from-primary-900/40 dark:to-primary-800/30 dark:border-primary-600'
      : 'bg-white border-stone-200 dark:bg-stone-900 dark:border-stone-700']
]"
```

**Problem**: The active line gradient (`from-primary-100 to-primary-50` light, `dark:from-primary-900/40` at 40% opacity dark) is a **low-contrast visual state** — very light against white, and faint in dark mode. Users may not notice which line is "active." There is also **no auto-scroll** when a line becomes active — if the dialogue has many lines, the active line might be off-screen.

**Recommendation**: 
1. Increase contrast: use a more saturated gradient (`from-primary-200 to-primary-100` light, `dark:from-primary-800/60 dark:to-primary-700/40` dark) or add a left accent bar (`border-l-4 border-primary-500`).
2. When `currentLineIndex` changes, scroll the active line card into view using `scrollIntoView({ behavior: 'smooth', block: 'center' })`.

**Impact**: Users immediately perceive which line is active — critical for following along during audio playback.

---

### Issue 7: Speaker Gradient Logic Is Fragile — Name Matching vs. Curricular Gender Data

**Current State**: Lines 61-64:
```ts
function isMaleSpeaker(speaker: string): boolean {
  const maleNames = ['muhammad', 'ali', 'abraham', 'ibrahim', 'musa', 'moses', 'isa', 'umar', 'uthman', 'abu', 'ibn']
  return maleNames.some(name => speaker.toLowerCase().includes(name))
}
```

**Problem**: Uses **string matching** to determine gender. Fragile: "Abu" can be a prefix (e.g., "Abu Bakr") and matches inside any string containing "abu." Names not in the 12-name list (e.g., "Abdullah") default to "female" (pink) — incorrect for unknown male names. The list is manually maintained and will drift from curriculum.

**Recommendation**: 
1. Add a `gender: 'male' | 'female'` field to `DialogueLine` in the curriculum data model.
2. If not possible, accept a `maleSpeakerPatterns: string[]` prop so curriculum data can override per-lesson.
3. Add a **fallback neutral gradient** (e.g., `from-stone-600 to-stone-800`) for unmatched names — rather than defaulting to "female" (pink).

**Impact**: Speaker color-coding is robust to new names and doesn't make incorrect gender assumptions.

---

### Issue 8: Missing Audio Feedback State — No "Currently Playing" Indicator

**Current State**: The component emits `playLine(index)` and `playScene()` but has **no concept of playing state**. The `isAudioDisabled` prop controls whether buttons are disabled, but there's no `isPlaying` state or `@playing` event from the parent.

**Problem**: When audio is playing, the user has **no visual indication** of which line is currently being read by the TTS engine. The active line highlight (Issue 6) is too subtle. There's no animation, no icon state change, no word-by-word highlight within the Arabic text. For a language learning app focused on listening comprehension, this is a **critical gap**.

**Recommendation**: 
1. Add an `@playing` event from the parent with `{ index: number, wordIndex?: number }` to track playback position.
2. Show a **pulsing animation** on the currently playing line (e.g., a subtle border pulse or background shimmer).
3. Optionally highlight individual words within the Arabic text as they are being spoken (word-level sync).

**Impact**: Learners can visually follow along with audio playback — essential for listening comprehension exercises.

---

### Issue 9: No Error State or Loading State for Dialogue Content

**Current State**: Lines 32-38:
```ts
const dialogueContent = computed<EmptyDialogue>(() => {
  const content = _props.section.content
  if (!content || content.type !== 'dialogue') {
    return { scenes: [] }
  }
  return content as EmptyDialogue
})
```

**Problem**: When content is not a dialogue type, the component silently renders **nothing** (empty scenes array). There's no error state, no "No dialogue content" message, and no loading skeleton. This is a **silent failure mode** — if the curriculum data ever has a bug or the section type changes, the component just disappears.

**Recommendation**: Add an empty state:
```html
<div v-if="dialogueContent.scenes.length === 0" class="text-center py-8 text-stone-400">
  <p>No dialogue content for this lesson.</p>
</div>
```

**Impact**: Transparent failure mode — users and developers know when dialogue content is missing.

---

## Medium Priority Enhancements

### Issue 10: Speaker Badges Inherit Raw Name Case — Inconsistent Display

**Current State**: Line 115: `{{ line.speaker }}`

**Problem**: Speaker names render with whatever case the curriculum data specifies. "Muhammad" (capitalized) vs "ali" (lowercase) vs empty strings. The badge text is **unnormalized** — it shows raw data values. If the curriculum ever uses "ali" (lowercase), it will render as "ali" on a bold white badge, which looks broken.

**Recommendation**: Normalize speaker names for display: `line.speaker.charAt(0).toUpperCase() + line.speaker.slice(1)` or a composable `useSpeakerName(speaker)` that handles normalization.

**Impact**: Speaker names display consistently regardless of curriculum data casing.

---

### Issue 11: Teacher Notes Render Inline Without Distinction from Translation

**Current State**: Lines 146-151:
```html
<p v-if="line.notes" class="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg px-3 py-1.5 inline-block">
  {{ line.notes }}
</p>
```

**Problem**: Teacher notes render as a small blue chip/label **below** the English translation text, making them look like an afterthought. Notes are pedagogically valuable (e.g., "Formal Islamic greeting") but are visually buried. If notes contain Arabic text (mixed-direction), the blue chip may not render correctly (no Unicode BIDI handling).

**Recommendation**: 
1. Move notes to **above** the English translation, or put them in a collapsible "Tip" section.
2. When notes contain mixed Arabic/English, wrap the Arabic portion in a `<span dir="rtl">`.

**Impact**: Pedagogical notes become more discoverable and readable.

---

### Issue 12: Scene Tab Labels Are Overly Long — Break Layout on Narrow Viewports

**Current State**: Line 96: `{{ label }}` — scene labels like "Scene 1: Muhammad ↔ Ali (Male-to-Male)" and "Scene 2: Khadija ↔ Aisha (Female-to-Female)".

**Problem**: Long text strings with `whitespace-nowrap` on tab buttons. On mobile, tabs overflow (`.overflow-x-auto`), requiring horizontal scroll. The parenthetical "(Male-to-Male)" is redundant since speaker badges inside the scene already communicate this.

**Recommendation**: 
1. Shorten labels to just "Scene 1" / "Scene 2" — remove the speaker description from tab labels.
2. Keep the speaker description in the scene tab's `title` attribute or in a tooltip.
3. Alternatively, render just the speaker pair: "Muhammad ↔ Ali" / "Khadija ↔ Aisha".

**Impact**: Tabs are narrower and fit on mobile viewports without horizontal scroll.

---

### Issue 13: Line Cards Lack Word-Level Click/Highlight for Vocabulary Study

**Current State**: Lines 132-138:
```html
<p dir="rtl" class="font-arabic text-lg md:text-xl text-stone-800 dark:text-stone-100 mb-2">
  {{ line.arabic }}
</p>
```

**Problem**: Arabic text is a single `<p>` element. In a language learning app, learners want to **tap individual words** to see definitions, harakat (vowel marks), or root forms. The entire sentence as one block makes this impossible.

**Recommendation**: 
1. Split the Arabic text into individual words and render each as a `<span>` with hover state (highlight on hover, show meaning in a tooltip or popover).
2. Consider a "Word Study Mode" toggle that splits text into clickable words.

**Impact**: Enables interactive vocabulary learning within dialogue context — a key feature for Arabic language apps.

---

### Issue 14: No Skip/Forward Controls — Learner Cannot Navigate Forward Through Dialogue

**Current State**: The component only supports playing the current line. There is no "Next line" or "Previous line" button.

**Problem**: Once audio is playing, if a user wants to skip to the next line, they must wait for the current audio to finish, or manually click the next line's play button. There's no **forward/skip button** (like a media player's next-track control).

**Recommendation**: Add "Previous Line" and "Next Line" buttons (keyboard-accessible, possibly as arrow-key shortcuts) that navigate between lines without triggering audio.

**Impact**: Learners have fine-grained control over navigation within a dialogue scene.

---

## Low Priority Suggestions

### Issue 15: Speaker Gradient Colors Have Insufficient Contrast in Dark Mode

**Current State**: Male: `from-teal-700 to-teal-900`, Female: `from-pink-700 to-pink-900`.

**Problem**: In dark mode, `teal-900` (#134e4a) and `pink-900` (#831843) are very dark colors that blend with the `bg-stone-950` page background. The white text has good contrast, but the badge itself may be hard to distinguish from the background in dark mode.

**Recommendation**: Use slightly lighter gradients for dark mode: `teal-600 → teal-800` and `pink-600 → pink-800`, or add a subtle ring/shadow to make badges pop.

**Impact**: Better badge visibility in dark mode.

---

### Issue 16: No Bookmarking or "Save This Line" Feature

**Current State**: Users can play lines and scenes but cannot mark a line as "favorite" or "needs review."

**Problem**: In a language learning context, learners will encounter lines they want to revisit later. There's no mechanism to save or bookmark specific lines for review.

**Recommendation**: Add a "bookmark" icon on each line card that emits a `bookmark` event. The parent can persist bookmarked line indices.

**Impact**: Learners can build a personal "review" list from dialogues.

---

### Issue 17: Font Size for Arabic Text Could Be Larger on Large Screens

**Current State**: `class="font-arabic text-lg md:text-xl"`

**Problem**: `text-lg` (18px) on mobile, `text-xl` (20px) on desktop. For an Arabic language learning app, the Arabic text is the **primary content** and could benefit from larger sizes, especially for early learners (A1/A2).

**Recommendation**: Increase to `text-xl md:text-2xl`.

**Impact**: Better readability for Arabic text, especially for early-level learners.

---

## Positive Observations

1. **Scene tab UI is clean and familiar**: The tab-based navigation for dialogue scenes mirrors a common UI pattern that users understand immediately.

2. **Speaker badge color-coding is intuitive**: Male/female gradient distinction (teal/pink) provides an instant visual cue about speaker identity — helpful for lessons teaching gender-specific Arabic forms.

3. **RTL Arabic rendering is correct**: `dir="rtl"` on Arabic text paragraphs with `font-arabic` (Cairo font) is properly applied, ensuring correct text direction and font rendering.

4. **Dark mode support is comprehensive**: All UI elements have `dark:` variants — the component was built with dark mode from the start.

5. **Teacher notes are a nice pedagogical touch**: Inline notes like "Formal Islamic greeting" provide cultural and linguistic context within the dialogue.

6. **Comparison card concept is excellent**: The idea of comparing gender forms between scenes (male vs. female) is pedagogically valuable — it just needs to be data-driven rather than hardcoded (Issue 3).

7. **Existing test coverage is solid**: The 241-line test file covers scene tabs, scene switching, speaker badges, Arabic RTL, play line/scene emits, and active line highlighting — a good foundation.

---

## Priority Matrix

| Priority | Issues | Estimated Effort |
|----------|--------|------------------|
| Critical | 1, 2, 3, 4, 5 | Medium (keyboard nav + interaction split are largest) |
| High | 6, 7, 8, 9 | Low-Medium (state management + curriculum data wiring) |
| Medium | 10, 11, 12, 13, 14 | Low (UI polish + new features) |
| Low | 15, 16, 17 | Low (minor visual tweaks) |

---

## Notes on Relationship to Existing Reviews

This review is independent of the Dashboard Page review (existing in this document). The LessonDialogue component is a child component used within the lesson page (`/dashboard/level/[level]/[lesson].vue`). Its issues are component-level UX/interaction problems, distinct from the dashboard-level data wiring issues previously documented.
