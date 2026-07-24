# Roadmap Page — Visual Audit & Redesign Plan

**Date:** 2026-07-23
**Scope:** `frontend/app/pages/index.vue` (Learning Roadmap Dashboard)
**Related:** `frontend/app/components/RoadmapSidebar.vue` (Collapsible Sidebar)

---

## Understanding the Application

LughatChat is an **Arabic language learning platform** with two distinct modes:

1. **Roadmap** (`/`) — A learning dashboard showing 30 lessons across CEFR levels (A1, A2, B1), sequenced and gated
2. **Playground** (`/playground`) — A TTS (text-to-speech) creative tool using Coqui XTTS-v2
3. **Lessons** (`/lessons/:id`) — Rich lesson content with dialogues, vocabulary, grammar, and interactive activities

The Roadmap is **curriculum**, not a creative tool. The current design applies the Playground's "Manuscript Dark" aesthetic (warm blacks, gold accents, mesh gradients, film grain) to the learning pages, creating a visual mismatch.

---

## Problems Identified

### P0: No visual progress on lesson cards
Cards show status icons (lock, check, spinner, arrow) but no progress bar. A user scanning the roadmap can't tell which lessons are *in progress* vs *available* without reading the icon.

### P0: Locked lessons are clickable
`<NuxtLink>` wraps locked lesson cards, making them navigate-able despite `opacity-40`. Users will click locked lessons and hit dead ends.

### P1: Level progress percentage is orphaned
The `{{ levelGroup.progress }}%` is a number with no visual context — no bar, no ring, no gradient fill.

### P1: Mobile sidebar has no backdrop
On mobile, the sidebar covers the full viewport but there's no overlay/backdrop to close it — users must tap the hamburger again.

### P2: Loading / error / empty states are bare text
No skeleton loaders, no retry button, no illustrated empty state.

### P3: Sidebar hover states too subtle
`hover:bg-studio-700/40` is barely perceptible on a dark background.

---

## Design Goals

1. **Progress is visible at a glance** — horizontal bars, not just icons
2. **Locked = truly locked** — no navigation, no visual ambiguity
3. **Accessible** — focus rings, semantic HTML, keyboard navigation
4. **Consistent states** — loading → skeleton, error → retry, empty → guidance
5. **Mobile sidebar works** — backdrop overlay, tap to close

## What We're NOT Changing

- The **data model** (`LessonSummary`, `LevelGroup`, `groupedLessons`)
- The **NavBar** component (used by all pages)
- The **Playground page** (its dark premium aesthetic is appropriate)
- The **lesson detail page** (`/lessons/:id`)
- The **sidebar content structure** (level headers, lesson titles, status icons)
- **RTL direction** — all content remains `dir="rtl"`
- **Existing test contracts** — all tests must pass

---

## Phases

| Phase | Status |
|-------|--------|
| Fix 1: Roadmap page — Hero header + stats | ✅ DONE |
| Fix 2: Lesson cards — Inner layout | 🔄 IN_PROGRESS |
| Fix 3: Loading, Error, and Empty States | ⏳ PENDING |
| Fix 4: Sidebar Hover States and Sequence Visibility | ⏳ PENDING |

## Implementation Plan

### Fix 1: Lesson Card Progress Bars and Clickable States
**File:** `frontend/app/pages/index.vue`

1. **Horizontal progress bar** — Add a thin `h-0.5` bar at the bottom of each `dashboard-lesson-card`. The bar fills proportionally to the lesson's completion state:
   - `completed` → full gold bar
   - `in_progress` → partial gold bar (we'd need a `progress` field on `LessonSummary`; for now, show a partial fill as a visual cue)
   - `available` / `locked` → empty (no bar)

2. **Disable locked cards** — Replace `<NuxtLink>` wrapping for locked lessons with a plain `<div>`. Locked cards should NOT navigate.

3. **Focus ring** — Add `focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-800` to lesson cards for keyboard accessibility.

### Fix 2: Sidebar Mobile Backdrop Overlay
**File:** `frontend/app/components/RoadmapSidebar.vue`

1. **Add backdrop** — When `isOpen` and `isMobile`, render a semi-transparent `bg-studio-900/80 backdrop-blur-2xl` overlay covering the full viewport behind the sidebar.

2. **Tap to close** — The backdrop div listens for `@click="close()"` so users can dismiss the sidebar by tapping outside it.

3. **Transition** — Use Vue `<Transition>` for fade in/out (matching the NavBar's mobile menu pattern).

### Fix 3: Loading, Error, and Empty States
**File:** `frontend/app/pages/index.vue`

1. **Skeleton loaders** — Replace bare "Loading lessons..." text with 3–4 card-shaped placeholders using `bg-studio-700/50 rounded-lg animate-pulse` with staggered animation delays.

2. **Error retry button** — Add a `<button class="text-gold text-xs underline">Retry</button>` that calls `fetchLessons()` (exposed by `useLessons`).

3. **Illustrated empty state** — Add a `ph-books` icon at `text-gold text-2xl` above "No lessons available" with a secondary line: "Check back when new lessons are unlocked."

### Fix 4: Sidebar Hover States and Sequence Visibility
**File:** `frontend/app/components/RoadmapSidebar.vue`

1. **Strengthen hover** — Change `hover:bg-studio-700/40` to `hover:bg-studio-700/60` for sidebar lesson items.

2. **Dim sequence numbers** — Change `text-ink-dim` to `text-ink-dim/40` for sidebar sequence numbers to reduce visual noise.

---

## Test Impact

| Test | Change Required? | Why |
|---|---|---|
| `index.test.ts` — "When locked lesson card clicked then no navigation" | **Yes** | Currently tests `opacity-40` class; we'll replace the `<NuxtLink>` wrapper entirely for locked cards. The test needs to verify the card is a plain `<div>` (not wrapped in a link). |
| `index.test.ts` — "When rendered then lesson cards exist" | No | `.dashboard-lesson-card` class remains. |
| `index.test.ts` — "When rendered then locked icon exists" | No | `opacity-40` class remains on locked cards (even if the wrapper changes). |
| `index.test.ts` — "When error then shows error message" | **Yes** | Error state now includes a retry button; the test text match still works but may need adjustment if we restructure the error block. |
| `index.test.ts` — "When no lessons then shows empty state" | **Yes** | Empty state gets an icon + extra text; the "No lessons available" text match may need updating. |
| `index.test.ts` — "When loading then shows loading message" | **Yes** | Loading state changes from text to skeleton cards; the "Loading" text match will break. |

---

## Order of Operations

Execute fixes 1 → 2 → 3 → 4 in order. Each fix is self-contained in one file, but Fix 3 depends on Fix 1's card structure (skeleton cards mirror the real card layout).

After all fixes: run `pnpm test` to verify all 22 test files pass.
