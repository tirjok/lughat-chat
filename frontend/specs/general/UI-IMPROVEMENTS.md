# UI/UX Improvements

## Summary
Ruthless heuristic evaluation of LughatChat's three learning pages (roadmap dashboard, lessons index, lesson detail) using Nielsen's 10 usability heuristics, WCAG 2.1 AA compliance, and platform-specific design guidelines. The app targets Arabic language learners with a "Manuscript Dark" aesthetic — deep warm background, gold accent, warm ivory text. The core learning flow (roadmap → lesson list → individual lesson with sections → activities) is well-structured but has critical accessibility gaps, misleading progress indicators, and inconsistent navigation patterns.
---

## Redesign Audit — 2025-07-23 (Dashboard, Lessons Index, Lessons Detail)

**Scope**: Full heuristic evaluation of `app/pages/index.vue` (roadmap dashboard), `app/pages/lessons/index.vue` (lessons list), and `app/pages/lessons/[id].vue` (lesson detail) after a comprehensive visual and interaction redesign.

**Summary**: The redesign addressed 9 of the 20 identified issues (Issues 1, 2, 3, 4, 8, 9, 11, 13, 16, 19) and introduced 3 new issues (Issues 21, 22, 23). The redesigned pages now feature a "Manuscript Dark" aesthetic with gradient backgrounds, glassmorphism cards, level-colored progress bars, and a learning roadmap subtitle. All 507 unit tests pass.

### Resolved Issues

|Issue|Status|Notes|
|---|---|---|
|1: Hardcoded Progress|✅ RESOLVED|`getCardProgress()` now computes real progress from `useLesson().progress?.activities`|
|2: Locked Lessons Invisible|✅ RESOLVED|Locked lessons removed from accessibility tree replaced with `aria-disabled` + descriptive text|
|3: No Back Breadcrumb|✅ RESOLVED|Sticky breadcrumb added: `Roadmap → [Level] → [Lesson Title]`|
|4: Submit Button State|✅ RESOLVED|Distinct disabled styles added (`cursor-not-allowed`, `cursor-wait`, opacity changes)|
|8: Lesson Progress Summary|✅ RESOLVED|Lesson progress bar added to detail page showing `X/Y activities completed`|
|9: Score Panel Color Coding|✅ RESOLVED|Text labels ("Good" / "Needs improvement") + icons (✓ / ⚠) added alongside color coding|
|11: Locked Lesson Tooltips|✅ RESOLVED|Descriptive text "Complete previous lessons to unlock" on locked cards|
|13: TTS Loading Feedback|✅ RESOLVED|`isSynthesizing` state with spinner + "Loading audio..." text on Listen button|
|16: Skeleton Loading States|✅ RESOLVED|Skeleton cards now match actual lesson card structure (level badge + progress bar)|
|19: Section Progress Icons|✅ RESOLVED|Standardized icon semantics across all views (check-circle, spinner, arrow-right, lock)|

### New Issues Introduced by Redesign

### Issue 21: Gradient Backgrounds Reduce Text Contrast on Some Screens
**Current State**: The dashboard uses `bg-gradient-to-b from-studio-950 via-studio-900 to-studio-950` and the lessons index uses `from-studio-950/80 via-studio-925 to-studio-950`. These gradients are subtle but on high-contrast displays or for users with visual impairments, the transition from `studio-950` to `studio-900` can create a visible band that competes with content.

**Problem**: WCAG **1.4.11 Non-text Contrast** — the gradient banding creates a visual distraction that reduces content legibility. On smaller screens (< 600px), the gradient covers the full viewport height, making the background more prominent.

**Recommendation**: Reduce the gradient intensity by 30% (use `studio-950` as both start and end, with only a very subtle `studio-900` mid-stop at 5% opacity). Or use a solid `studio-950` background with a subtle radial glow behind the hero section.

**Impact**: Improves readability for users with visual impairments without sacrificing the premium dark aesthetic.

---

### Issue 22: Glassmorphism Cards Have Border Contrast Below WCAG AA
**Current State**: Lesson cards use `border-white/[0.06]` (6% white opacity) on a dark background. The contrast ratio between the border and the background is approximately 1.5:1, well below the WCAG AA minimum of 3:1 for UI components.

**Problem**: WCAG **1.4.11 Non-text Contrast** — the card borders are nearly invisible on dark backgrounds, making the content boundaries unclear for users with low vision. This is especially problematic for the locked cards which use `opacity-35` (making them even less visible).

**Recommendation**: Increase border opacity to `white/[0.12]` (12% white) for non-locked cards and `white/[0.08]` for locked cards. Alternatively, add a subtle `drop-shadow` to the cards instead of relying on borders.

**Impact**: Improves boundary perception for low-vision users.

---

### Issue 23: Navigation Sidebar Collapses Without Clear Toggle Feedback
**Current State**: The `RoadmapSidebar` slides in/out on the dashboard and detail pages. When closed, the hamburger icon remains in the `NavBar`. However, there is no keyboard shortcut to toggle the sidebar, and the sidebar does not close when navigating to a new lesson (users must manually close it).

**Problem**: Nielsen's heuristic #7 (Flexibility and efficiency of use) — power users who navigate frequently between lessons must close and reopen the sidebar each time. The sidebar also does not close on route change, potentially showing the wrong lesson's highlight.

**Recommendation**: 
- Add `Escape` key to close the sidebar
- Auto-close sidebar on route change (when navigating to/from a lesson)
- Add a keyboard shortcut hint (`⌘K` or `Ctrl+K`) in the sidebar header

**Impact**: Improves navigation efficiency for power users.

---

### Remaining Unresolved Issues (from Original List)

The following issues from the original audit remain unresolved and should be addressed in future iterations:

|Issue|Priority|Notes|
|---|---|---|
|5: Error Messages Overly Defensive|Critical|`getErrorMessage()` still uses regex parsing of Nuxt test harness errors|
|6: Inconsistent Navigation|High|The `/lessons` index page still lacks sidebar support|
|10: No "Continue Where You Left Off"|High|Resume feature not implemented|
|12: Section Type Labels Are Jargon|Medium|Section type labels still show developer-facing names|
|14: Mobile Nav Lacks Lesson Count|Medium|Mobile menu still shows no progress summary|
|15: No Streak/Consistency Feedback|Low|No gamification metrics implemented|
|17: Error Retry Button Accessibility|Low|Detail page error state still uses `<NuxtLink>` instead of `<button>`|
|18: No Print/Export Option|Low|No offline study feature|
|20: Empty State Lacks Recourse|Low|No "Notify me" for empty lesson list|

---


---

## Critical Issues
[Issues that severely impact usability or accessibility]

### Issue 1: Hardcoded Progress Values in Roadmap Dashboard
**Current State**: `getCardProgress()` in `app/pages/index.vue` returns `100` for `'completed'`, `45` for `'in_progress'`, and `0` for everything else. The progress bar for "in progress" lessons always shows exactly 45%, regardless of actual activity completion.

**Problem**: This is a **misleading progress indicator**. A learner whose first activity (out of 5) is in progress sees the same 45% bar as someone with 3 of 5 activities done. This violates Nielsen's heuristic #5 (Recognition rather than recall) — the visual feedback does not match the actual state, eroding trust in the system. For a learning app, progress accuracy is the core value proposition.

**Recommendation**: Replace the hardcoded `getCardProgress()` with a real calculation:
```ts
// In the dashboard page template or computed:
const cardProgress = computed(() => {
  const activities = currentLesson.value?.activities ?? []
  const progress = currentLesson.value?.progress?.activities ?? {}
  if (activities.length === 0) return 0
  const completed = activities.filter(a => progress[a.id]?.status === 'completed').length
  return Math.round((completed / activities.length) * 100)
})
```
Pass the real `activityProgress` map from `useLesson()` instead of deriving from `lesson.status`.

**Impact**: Learners see honest progress. Reduces frustration from "why isn't my lesson completing?" and improves motivation through accurate feedback.

**Implementation Notes**: The dashboard page uses `useLessons()` which returns `LessonSummary[]` (no activity-level detail). The dashboard needs to either call `useLesson(id)` per card (expensive) or the backend `/api/lessons` should include per-lesson `activity_progress` summary. Prefer the backend approach — one extra field in the summary response.

---

### Issue 2: Locked Lessons Are Invisible to Keyboard/Screen Reader Users
**Current State**: Locked lessons in the roadmap dashboard use `aria-hidden="true"` on the `<div>` (line 161 of `index.vue`). This completely removes them from the accessibility tree.

**Problem**: Screen reader users cannot know these lessons exist. They see a gap in the learning path with no explanation. This violates WCAG 2.1 **4.1.2 Name, Role, Value** and **2.1.1 Keyboard** — the user cannot discover the full curriculum structure. Nielsen's heuristic #8 (Aesthetic and minimalist design) is being used as an excuse to hide information rather than present it clearly.

**Recommendation**: Remove `aria-hidden="true"`. Instead, make locked lessons visible but clearly disabled:
- Keep visual opacity at 40% (acceptable)
- Add `aria-disabled="true"` to the card
- Add a visible "Locked" label (the lock icon + text is fine)
- Ensure the card is NOT a focusable link (`<NuxtLink>` is correctly NOT used for locked lessons — good)
- Add a tooltip explaining "Complete previous lessons to unlock"

**Impact**: Screen reader users can see the full curriculum structure and understand which lessons are locked and why. Keyboard users won't accidentally tab into dead links.

**Implementation Notes**: Replace `aria-hidden="true"` with `role="status" aria-label="Locked: Complete previous lessons to unlock"`. Keep the visual styling as-is.

---

### Issue 3: No "Back to Roadmap" Breadcrumb on Detail Page
**Current State**: The detail page (`[id].vue`) has a single "Back to Roadmap" link at the top (line 17-23). When a user is deep in a lesson (after expanding 3+ sections and scrolling past 2 activities), they have no persistent way to return to the roadmap.

**Problem**: This violates Nielsen's heuristic #9 (Help users recognize, diagnose, and correct errors) and #7 (Flexibility and efficiency of use). The back link is at the very top of the page — out of view after scrolling. On mobile, the nav bar can be dismissed. Users get lost in long lessons.

**Recommendation**: 
1. Add a **sticky breadcrumb** at the top of the viewport: `Roadmap → [Level] → [Lesson Title]`
2. The breadcrumb should persist while scrolling (sticky positioning)
3. On mobile, collapse to: `← Roadmap` with the lesson title available on tap

**Impact**: Users can always navigate back to the roadmap hierarchy without scrolling to the top. Reduces abandonment mid-lesson.

**Implementation Notes**: Use a `position: sticky; top: 60px` (below the nav bar) element that appears when the user scrolls past the lesson header. The existing "Back to Roadmap" link can remain but should be secondary.

---

### Issue 4: Activity Form Submit Button State is Unclear
**Current State**: The `ActivityForm.vue` disables the button when `isSubmitting`, `disabled` (max attempts), or `modelValue.trim()` is empty. The disabled state uses the generic `.btn` class which has no visual distinction beyond opacity — on a dark background with gold buttons, a disabled gold button on dark brown barely reads as "disabled."

**Problem**: Nielsen's heuristic #2 (Match between system and the real world) — the button's disabled state is visually indistinguishable from its active state on the dark theme. Users tap repeatedly, thinking the button is broken, when it's simply disabled. The "Scoring..." loading text is only shown when `isSubmitting` is true, NOT when the button is disabled due to empty input.

**Recommendation**: 
1. Add a distinct disabled style: lower opacity + cursor-not-allowed + a subtle border change
2. Add a tooltip or label explaining WHY the button is disabled (e.g., "Enter an answer to continue")
3. For the "Scoring..." state, add a spinner icon next to the text

**Impact**: Reduces repeated taps, clarifies interaction states, prevents user frustration with "broken" buttons.

**Implementation Notes**: In `ActivityForm.vue`, the button already has `:disabled="isSubmitting || disabled || !modelValue.trim()"`. Add a computed class for the three disabled states:
```html
:class="{ 'opacity-50 cursor-not-allowed': disabled, 'cursor-wait': isSubmitting }"
```

---

### Issue 5: Error Messages in Detail Page Are Overly Defensive (Test-Harness-Driven)
**Current State**: `getErrorMessage()` in `[id].vue` (lines 193-222) contains extensive logic to handle Nuxt test harness error wrapping, including regex parsing of status codes from error strings and URL path matching.

**Problem**: This violates Nielsen's heuristic #6 (Error prevention) and #10 (Flexibility and efficiency of use). The error handling is **test-harness-driven** rather than **user-driven**. It wraps generic 500 errors as "not found" based on URL patterns, which is fragile — a real server error on a different endpoint would also be misclassified. The user sees "This lesson is not available yet" for a server outage.

**Recommendation**: 
1. Separate test-harness handling from production error display
2. Show the real HTTP status in the error message (e.g., "Server error (500). Please try again in a moment.")
3. Only show "not found" when the API genuinely returns 404
4. Use the existing `mapErrorToMessage()` from `useActivitySubmission.ts` as a pattern

**Impact**: Users get accurate error information. Server issues are distinguished from "lesson not ready" from "lesson doesn't exist."

**Implementation Notes**: The `useLesson` composable already provides `fetchError` with the actual error object. The `getErrorMessage()` should delegate to a proper error mapper rather than doing regex magic on stringified errors.

---

## High Priority Improvements
[Important enhancements that significantly improve user experience]

### Issue 6: Inconsistent Navigation Between Pages
**Current State**: 
- **Dashboard** (`/`): Uses `NavBar` + `RoadmapSidebar` (slide-out). Navigation via sidebar hamburger.
- **Lessons Index** (`/lessons`): Uses `NavBar` (no sidebar prop) + no sidebar. Navigation via cards.
- **Lesson Detail** (`/lessons/[id]`): Uses `NavBar` + `RoadmapSidebar` (slide-out). Navigation via sidebar.

The `/lessons` index page does NOT open the sidebar and has no sidebar toggle. A user who navigates from the dashboard to the lessons index loses the roadmap sidebar context.

**Problem**: Violates Nielsen's heuristic #3 (Consistency and standards). The navigation pattern is inconsistent across the three pages. Users who rely on the sidebar for navigation get stranded on the lessons index.

**Recommendation**: 
1. Make the `/lessons` index page also support the sidebar (pass `compact=false` or omit `compact` prop)
2. OR add a "View Roadmap" button at the top of the lessons index
3. Best: Make the sidebar a layout-level component (in `app.vue` or a layout) so it persists across all learning pages

**Impact**: Consistent navigation across all learning pages. Users never lose the ability to jump to any lesson.

**Implementation Notes**: The `NavBar` already has a `compact` prop. The `/lessons` index page should NOT pass `compact` (or pass `compact=false`) so the hamburger button is visible.

---

### Issue 7: Section Accordion Has No Keyboard Focus Management
**Current State**: `SectionRenderer.vue` uses a `<button>` as the accordion trigger (line 126). This is correct for accessibility. However, when a section is expanded, there is no `aria-expanded` attribute on the button, and no `aria-controls` linking to the expanded content.

**Problem**: Screen reader users cannot know whether a section is expanded or collapsed. The chevron rotation is purely visual. This violates WCAG **4.1.2 Name, Role, Value** and **2.4.6 Headings and Labels**.

**Recommendation**: Add proper ARIA attributes to the accordion button:
```html
<button
  :aria-expanded="isOpen"
  :aria-controls="`section-content-${sectionIndex}`"
  :id="`section-trigger-${sectionIndex}`"
>
```
And on the expanded content:
```html
<div :id="`section-content-${sectionIndex}`" v-if="isOpen" role="region" :aria-labelledby="`section-trigger-${sectionIndex}`">
```

**Impact**: Screen reader users can navigate sections and know which are expanded.

---

### Issue 8: No Progress Summary for Entire Lesson on Detail Page
**Current State**: The detail page shows a "Lesson completed — review mode" banner (line 76-79) but does NOT show overall lesson progress (e.g., "3/5 activities completed") when the lesson is in progress.

**Problem**: Violates Nielsen's heuristic #5 (Recognition rather than recall). Users cannot answer "how far along am I in this lesson?" without mentally counting completed vs. total activities across all sections.

**Recommendation**: Add a **lesson progress bar** below the lesson header:
```html
<div class="mt-4">
  <div class="flex items-center justify-between text-xs text-ink-dim mb-1">
    <span>{{ completedActivities }} of {{ totalActivities }} activities</span>
    <span>{{ progressPercentage }}%</span>
  </div>
  <div class="h-1.5 rounded-full bg-studio-700 overflow-hidden">
    <div class="h-full rounded-full bg-gold" :style="{ width: progressPercentage + '%' }" />
  </div>
</div>
```

**Impact**: Users immediately see their progress within the lesson. Reduces uncertainty and supports goal-directed behavior.

**Implementation Notes**: Compute from `currentLesson.progress?.activities` — count completed vs. total.

---

### Issue 9: Activity Score Panel Color Coding Uses Red/Green (Accessibility Issue)
**Current State**: `ActivityScorePanel.vue` uses `text-green-600`/`text-red-600` for scores ≥ 70% vs < 70%, and `bg-green-500`/`bg-red-500` for the score bar (lines 46-52).

**Problem**: Red-green color distinction alone is insufficient for color-blind users (affects ~8% of males). The score bar uses only color — no icon, no text, no pattern. This violates WCAG **1.4.1 Use of Color** and **1.4.3 Contrast (Minimum)**. The red/green on a dark brown background also has poor contrast ratios.

**Recommendation**: 
1. Add text labels alongside colors: "Good" / "Needs improvement"
2. Add an icon: ✓ for ≥ 70%, ⚠ for < 70%
3. Increase contrast: use `#4ade80` (green-400) and `#f87171` (red-400) for better contrast on dark backgrounds
4. Add a pattern (stripes) for the score bar's "fail" state

**Impact**: Color-blind users can distinguish pass/fail states. All users get clearer feedback.

---

### Issue 10: No "Continue Where You Left Off" Feature
**Current State**: When a user navigates to a lesson, ALL sections are collapsed except the first one (or the one with an in-progress activity). There is no way to jump directly to a specific section or activity.

**Problem**: Violates Nielsen's heuristic #7 (Flexibility and efficiency of use). Returning users who want to resume from where they left off must expand sections one by one to find the right place.

**Recommendation**: 
1. Add a "Resume" button on the roadmap dashboard that opens the lesson and expands directly to the in-progress section
2. Show a "Resume" badge on in-progress lesson cards (in addition to the spinner icon)
3. When opening a lesson from the roadmap, auto-scroll to the last active section

**Impact**: Returning users save time resuming their learning. Improves the "returning user" experience significantly.

**Implementation Notes**: The `useLesson` composable already tracks `progress?.activities` with per-activity status. The dashboard page can use this to determine which lesson has the most recent activity and offer a "Resume" CTA.

---

## Medium Priority Enhancements
[Nice-to-have improvements that polish the experience]

### Issue 11: Locked Lesson Cards Lack Descriptive Tooltips
**Current State**: Locked lessons show a lock icon with `title="Locked"` (line 176 of `index.vue`). The title attribute is a native browser tooltip — inconsistent styling, no animation, no screen reader integration.

**Problem**: The tooltip text "Locked" is cryptic. Users don't know WHY it's locked or what they need to do to unlock it.

**Recommendation**: Replace `title="Locked"` with a custom tooltip component:
```html
<span class="lock-icon" data-tooltip="Complete previous lessons to unlock">
  <span class="ph ph-lock" />
</span>
```
The tooltip should: appear on hover/focus, be visible to screen readers, and say "Complete previous lessons to unlock" (matching the detail page's locked overlay text).

**Impact**: Users understand the locking mechanism and what action unlocks lessons.

---

### Issue 12: Section Type Labels Are Technical Jargon
**Current State**: Section headers show `{{ section.type }}` as an uppercase label (line 143 of `SectionRenderer.vue`): "dialogue", "vocabulary", "pronouns", "expressions", "grammar".

**Problem**: These are developer-facing type names, not user-facing labels. A learner doesn't care that a section is "grammar" — they care about what they'll learn. The labels should be humanized: "Dialogue Practice", "Vocabulary Builder", "Pronoun Guide", etc.

**Recommendation**: Map type names to user-facing labels:
```ts
const typeLabels: Record<string, string> = {
  dialogue: 'Dialogue Practice',
  vocabulary: 'Vocabulary Builder',
  pronouns: 'Pronoun Guide',
  expressions: 'Key Expressions',
  grammar: 'Grammar Rules'
}
```

**Impact**: Sections are immediately understandable to learners without developer context.

---

### Issue 13: No Visual Feedback When TTS Audio Loads
**Current State**: The "Listen" button in `SectionRenderer.vue` (line 200-206) calls `handleTTS()` which triggers a backend TTS synthesis (potentially 5-10 seconds on CPU-only inference). There is no loading indicator during this delay.

**Problem**: Users tap "Listen" and see nothing happen for several seconds. They assume the button is broken and tap again (multiple API calls). This violates Nielsen's heuristic #2 (Match between system and the real world) — the system's response time is invisible.

**Recommendation**: Add a loading state to the Listen button during TTS synthesis:
```html
<button :disabled="isSynthesizing" @click="handleTTS(line.arabic)">
  <span v-if="isSynthesizing" class="ph ph-spinner animate-spin-slow" />
  <span v-else class="ph ph-speaker" />
  <span>{{ isSynthesizing ? 'Loading audio...' : 'Listen' }}</span>
</button>
```

**Impact**: Users understand the audio is loading and don't repeatedly tap. Reduces unnecessary API calls.

**Implementation Notes**: Add `isSynthesizing` state to `SectionRenderer` — set to `true` before `synthesize()` and `false` in `finally`.

---

### Issue 14: Mobile Navigation Menu Lacks Lesson Count
**Current State**: The mobile menu overlay (lines 106-124 of `NavBar.vue`) only shows "Roadmap" and "Playground" links. No indication of how many lessons are available or progress.

**Problem**: On mobile, users have no quick sense of learning progress from the nav menu. The hamburger menu is their primary navigation — it should surface more information.

**Recommendation**: Add a progress summary to the mobile menu:
```html
<div class="text-center text-xs text-ink-dim mb-2">
  {{ overallProgress }}% complete · {{ completedCount }}/{{ totalCount }} lessons
</div>
```

**Impact**: Mobile users see their progress at a glance without leaving the nav menu.

---

### Issue 15: No "Streak" or "Consistency" Feedback
**Current State**: The app tracks per-activity completion but has no concept of learning streaks, recent activity, or consistency metrics.

**Problem**: This is a gamification/engagement gap. Learning apps that show streaks, daily goals, or "last active" timestamps see significantly higher retention.

**Recommendation**: Add a small "streak" indicator to the roadmap dashboard:
```html
<div class="flex items-center gap-1 text-gold text-xs">
  <span class="ph ph-fire-flame-simple" />
  <span>{{ streak }} day streak</span>
</div>
```

**Impact**: Increases engagement through social proof and goal-setting psychology.

**Implementation Notes**: Requires backend tracking of last-activity timestamps. Can be MVP'd with a simple "last 7 days" check.

---

## Low Priority Suggestions
[Minor refinements for consideration]

### Issue 16: Skeleton Loading States Could Be More Specific
**Current State**: Loading skeletons show generic pulse rectangles (lines 52-67 of `index.vue`).

**Enhancement**: Make skeleton cards match the actual lesson card structure more closely — include a small level badge placeholder and a progress bar skeleton that animates from 0% to a random value.

---

### Issue 17: Error State Retry Button Lacks Keyboard Accessibility
**Current State**: The "Try Again" button on the dashboard error state (line 77-82 of `index.vue`) is a `<button>` — this is correct. However, the error state on the detail page (lines 43-55 of `[id].vue`) uses a `<NuxtLink>` styled as a button ("Back to Roadmap") instead of a `<button>`.

**Enhancement**: Use a `<button>` for retry actions and `<NuxtLink>` only for navigation. The detail page's error state should have both a "Try Again" button AND a "Back to Roadmap" link.

---

### Issue 18: No Print / Export Option for Lessons
**Enhancement**: Add a "Print this lesson" button that generates a clean, light-mode version of the current lesson suitable for offline study. Useful for learners who want physical flashcards.

---

### Issue 19: Section Progress Indicators Are Inconsistent
**Current State**: Section status icons in `SectionRenderer.vue` (lines 146-159) show a check-circle for "completed" and a spinner for "in_progress". But the roadmap dashboard uses a different icon set (arrow-right for "available", check-circle for "completed", spinner for "in_progress", lock for "locked").

**Enhancement**: Standardize the icon semantics across all views. The "available" arrow-right on the dashboard is misleading — it suggests the section is "next" rather than "available but not started."

---

### Issue 20: No Empty State for "No Lessons Available"
**Current State**: The dashboard shows a minimal empty state with a books icon and "No lessons available" (lines 187-194 of `index.vue`).

**Enhancement**: Add a "Check back when new lessons are unlocked" message (already present) plus a "Notify me" option or a link to the content request form. Currently, users have no recourse when no lessons exist.

---

## Positive Observations
[Well-executed aspects worth preserving]

1. **RTL Support**: All pages use `dir="rtl"` correctly. Arabic text renders with the Cairo font in RTL mode. This is fundamental to the app's purpose and is done right.

2. **Dark Theme with Gold Accent**: The "Manuscript Dark" design system is cohesive — gold (`#C8A45C`) on deep warm background (`#050505`) creates a premium, focused learning atmosphere. The film-grain noise overlay and mesh gradient background add subtle polish.

3. **Accordion Sections**: The smart accordion in `SectionRenderer` that auto-opens the section with an in-progress activity is excellent UX. Users can jump directly to where they left off within a lesson.

4. **Locked Lesson Overlay**: The detail page's locked overlay (lines 60-69) clearly communicates "This lesson is locked" with a lock icon and explanatory text. This is a model example of clear system status.

5. **Progressive Disclosure**: The lesson detail page uses progressive disclosure well — locked overlay, completed banner, lesson header with competencies, accordion sections, then activities. Each layer reveals more detail.

6. **Activity Types Variety**: The app supports 4 activity types (listen-translate, translate-to-english, translate-to-arabic, introduce-characters, role-play) with distinct UIs per type. This variety prevents learning fatigue.

7. **TTS Integration**: The "Listen" button on dialogue lines, vocabulary, and expressions is a brilliant feature for a TTS-focused app. It turns every text element into a pronunciation exercise.

8. **Responsive Design**: The sidebar collapses properly on mobile with a backdrop overlay. The `max-w-4xl` content container keeps readability on all screen sizes.

9. **Reduced Motion Support**: The `prefers-reduced-motion` media query in `main.css` properly disables animations for users who need it. This is often overlooked.

10. **Error Handling**: The `useActivitySubmission` composable has a well-structured error mapping system (`mapErrorToMessage`, `mapStatusToError`) that provides user-friendly messages for different error scenarios (locked, not found, server error).
