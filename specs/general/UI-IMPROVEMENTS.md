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

This dashboard review is independent of the Index Page review (already in this document). The dashboard is a separate page (`/dashboard`) with different components and UX concerns. The existing index page issues (RTL, voice selector, generate button, etc.) do not overlap with dashboard-specific issues.
