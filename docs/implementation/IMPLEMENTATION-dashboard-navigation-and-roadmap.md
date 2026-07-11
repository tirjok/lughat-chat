# Implementation Plan: Dashboard Navigation and Roadmap Display

**Source**: `docs/workflows/WORKFLOW-dashboard-navigation-and-roadmap.md` (v0.1)
**Date**: 2026-07-11
**Status**: Draft — Awaiting review

---

## Overview

This document breaks the **Dashboard Navigation and Roadmap Display** workflow into **6 implementation issues** (vertical slices). Each slice is a thin, end-to-end path through all layers (components, composables, routing, tests). They are ordered by dependency — blockers first — so that each subsequent slice can reference real issue identifiers once implemented.

This workflow is **frontend-only**. It consumes the `GET /api/lessons` endpoint defined by the **Lesson Browsing and Access** implementation plan (backend slices). No backend changes are required for this workflow.

---

## Reality Check (Current State vs. Spec)

| # | Finding | Severity | Reference |
|---|---------|----------|-------------|
| RC-021 | **No Dashboard page exists** — The current `app/pages/index.vue` IS a TTS Studio (700+ lines). It must be moved to `/playground` and replaced with a Dashboard page. | Critical | STEP 1 |
| RC-022 | **No navigation bar exists** — The current app has no top navigation bar component. | Critical | STEP 2 |
| RC-023 | **No roadmap sidebar exists** — The current app has no collapsible sidebar component. | Critical | STEP 3 |
| RC-024 | **No `/playground` route exists** — The current app is a single page at `/`. The TTS Studio must be moved there. | High | STEP 1 (Playground workflow) |
| RC-025 | **No `/lesson/:id` route exists** — There is no file-based routing for lessons. | High | STEP 5 (Lesson Browsing workflow) |
| RC-035 | **No Pinia installed** — The project uses pure composables. ADR-009 recommends Option C (Hybrid), but Pinia is not yet installed. For this workflow, composables are sufficient — no Pinia needed. | Low | ADR-009 (Option C) |
| RC-036 | **Existing TTS components must be preserved** — The current `index.vue` integrates 6 components (AudioPlayerPanel, WaveformCanvas, GenerateButton, SpeedSlider, VoiceSelector, ToastNotification). Moving it to `/playground` must preserve all functionality. | High | Existing codebase |

---

## Proposed Slices

### Slice 1: Create Playground Route (Move Current TTS Studio to `/playground`)

**Type**: AFK
**Blocked by**: None
**User stories**: "As a learner, I want to access the TTS Playground from the navigation bar"

**What to build**:

1. Create `app/pages/playground.vue` — copy the current `app/pages/index.vue` content (existing TTS Studio: two-panel layout, all 6 components, drag divider, mobile stacking).
2. Create `app/pages/index.vue` — a new Dashboard page (placeholder for now, full implementation in Slice 3).
3. Update Nuxt config (Nitro devProxy) if needed for the new route.
4. Ensure the existing TTS Studio functionality is preserved: text input, voice selector, speed slider, generate button, audio playback, waveform, toast notifications, mobile split-screen.

**Acceptance criteria**:
- [ ] `app/pages/playground.vue` exists and renders the existing TTS Studio (all 6 components functional)
- [ ] Navigating to `/playground` shows the TTS Studio (text input, voice selector, speed slider, Generate Speech button, audio player, waveform)
- [ ] Navigating to `/` does NOT show the TTS Studio (shows a placeholder or error state)
- [ ] Existing TTS Studio features preserved: voice selection, speed slider, generate speech, audio playback, waveform animation, toast notifications, mobile split-screen drag divider
- [ ] Frontend builds without errors (`pnpm build`)

**Integration verification**:
- [ ] Frontend dev server starts without errors (`pnpm dev`)
- [ ] Navigating to `/playground` in browser shows the TTS Studio
- [ ] All existing TTS Studio interactions work (type text, select voice, generate speech, play audio)

---

### Slice 2: Create Navigation Bar Component (`NavigationBar.vue`)

**Type**: AFK
**Blocked by**: None (can run in parallel with Slice 1)
**User stories**: "As a learner, I want a persistent navigation bar on all pages"

**What to build**:

New component: `app/components/NavigationBar.vue`

Structure:
```
┌─────────────────────────────────────────────────┐
│  ☰  LughatChat    Roadmap  |  Playground    🎧  │
└─────────────────────────────────────────────────┘
```

- **Hamburger (☰)**: Toggles sidebar open/closed (emits `toggle` event or calls `useSidebar().toggle()`).
- **Logo/Brand**: "LughatChat" text (or icon + text).
- **Navigation links**: "Roadmap" (navigates to `/`), "Playground" (navigates to `/playground`).
- **TTS status indicator**: Reuses existing `ModelStatusIndicator` component — shows model loading/ready/error state.
- **RTL support**: For Arabic UI, hamburger is on the right, navigation links are on the left (RTL layout).

Behavior:
- Fixed position at top of viewport (full width).
- Visible on all pages (Dashboard, Lesson View, Playground).
- Compact on mobile (< 768px): reduce spacing, possibly hide text labels, show icons only.
- Uses Nuxt `useRoute()` and `useNavigation()` composable to highlight current page.

**Acceptance criteria**:
- [ ] `app/components/NavigationBar.vue` exists and renders correctly
- [ ] Hamburger button toggles sidebar (via composable or event)
- [ ] "Roadmap" link navigates to `/`
- [ ] "Playground" link navigates to `/playground`
- [ ] TTS status indicator shows model state (loading/ready/error)
- [ ] Current page is highlighted (active link styling)
- [ ] RTL layout works (hamburger on right, links on left for Arabic)
- [ ] Mobile layout is compact (< 768px)
- [ ] Navigation bar renders on all pages (Dashboard, Lesson View, Playground)

**Integration verification**:
- [ ] Frontend dev server starts without errors
- [ ] Navigation bar is visible on `/playground` (existing page)
- [ ] Clicking "Playground" link navigates correctly
- [ ] Clicking "Roadmap" link navigates to `/` (shows placeholder)

---

### Slice 3: Create Dashboard Page with Collapsible Sidebar Layout

**Type**: HITL (needs design review for layout)
**Blocked by**: Slices 1, 2 (needs Playground route and NavigationBar)
**User stories**: "As a learner, I want to see a roadmap of my learning journey when I land on the app"

**What to build**:

Replace `app/pages/index.vue` (currently a placeholder from Slice 1) with a full Dashboard page.

Layout structure:
```
┌─────────────────────────────────────────────────┐
│  NavigationBar (fixed, full width)              │
├─────────────────────────────────────────────────┤
│  ┌──────────────┐                               │
│  │ Sidebar      │  Main Content Area            │
│  │ (hidden by   │  (when sidebar is closed)     │
│  │  default)    │  3 level sections (A1, A2,    │
│  │              │     B1) with progress bars    │
│  │              │     and lesson cards          │
│  └──────────────┘                               │
└─────────────────────────────────────────────────┘
```

Desktop layout:
- NavBar at top (fixed position).
- Sidebar: 280px wide, hidden by default, slides in from left when hamburger is clicked.
- Main content: fills remaining width when sidebar is closed, shifts when sidebar is open.

Mobile layout (< 768px):
- NavBar compacts (smaller text, icon-only navigation).
- Sidebar: full-screen overlay when open (not a slide-in panel).

Composables needed:
- `useSidebar.ts` (new) — manages sidebar open/closed state, toggle, close, open, mobile detection.
- `useNavigation.ts` (new) — manages current page, current lesson ID (from URL), navigation helper.

**Acceptance criteria**:
- [ ] `app/pages/index.vue` renders as a Dashboard page (not the TTS Studio)
- [ ] Navigation bar is visible at the top on the Dashboard
- [ ] Sidebar is hidden by default (collapsed)
- [ ] Clicking hamburger opens the sidebar (slides in from left on desktop, full-screen on mobile)
- [ ] Clicking hamburger again closes the sidebar
- [ ] Main content area shows a placeholder when sidebar is closed
- [ ] Layout is responsive (desktop sidebar + mobile full-screen overlay)
- [ ] RTL layout works (sidebar slides from right for Arabic UI)

**Integration verification**:
- [ ] Frontend dev server starts without errors
- [ ] Navigating to `/` shows the Dashboard (not the TTS Studio)
- [ ] Navigation bar renders with all links
- [ ] Hamburger toggles sidebar open/closed
- [ ] Navigating to `/playground` shows the TTS Studio (from Slice 1)

---

### Slice 4: Implement Roadmap Display (Levels + Lesson Cards)

**Type**: AFK
**Blocked by**: Slice 3 (needs Dashboard page structure)
**User stories**: "As a learner, I want to see 30 lessons grouped by 3 CEFR levels with progress"

**What to build**:

In the Dashboard main content area (and sidebar when open): render the roadmap.

Data flow:
1. Dashboard page calls `GET /api/lessons` (defined by Lesson Browsing workflow) on mount.
2. Backend returns `[{ id, level, sequence, title, competency_count, section_count, status }]`.
3. Frontend groups lessons by level (A1, A2, B1).
4. For each level: render level header with progress percentage + progress bar.
5. For each lesson: render lesson card with:
   - Lesson number (e.g., "Lesson 1")
   - Title (e.g., "The Salutations — التحيّة الأولى")
   - Status icon: 🔒 (locked), → (available), ◉ (in_progress), ✓ (completed)

Composables needed:
- `useLessons.ts` (new) — fetches from `GET /api/lessons`, caches data, provides loading/error states, returns structured data (levels, lessons, progress).
- `useProgress.ts` (new) — calculates progress percentage per level (completed / total × 100).

**Acceptance criteria**:
- [ ] Dashboard calls `GET /api/lessons` on mount (when backend provides data)
- [ ] Lessons are grouped by 3 levels (A1, A2, B1)
- [ ] Each level shows a progress bar with percentage (e.g., "A1 (30%)")
- [ ] Each lesson card shows: lesson number, title, status icon
- [ ] Status icons are correct: 🔒 (locked), → (available), ◉ (in_progress), ✓ (completed)
- [ ] When no lesson data is available: show "No lessons available" placeholder
- [ ] When API fails: show error state with "Try Again" button
- [ ] Roadmap renders in both the main content area AND the sidebar (when open)
- [ ] Sidebar roadmap matches main content roadmap (same data, different layout)

**Integration verification**:
- [ ] Frontend dev server starts without errors
- [ ] Dashboard loads without errors even when backend is not running (shows error state gracefully)
- [ ] When backend `/api/lessons` returns data: roadmap renders correctly
- [ ] When backend returns empty array: "No lessons available" placeholder shows

---

### Slice 5: Implement Lesson Click Navigation (`/lesson/:id`)

**Type**: HITL (needs design review for lesson view placeholder)
**Blocked by**: Slices 3, 4 (needs Dashboard with clickable lessons)
**User stories**: "As a learner, I want to click a lesson and navigate to its view"

**What to build**:

1. Create `app/pages/lesson/[id].vue` — a placeholder "Lesson view coming soon" page (full lesson content is covered by the Lesson Browsing workflow).
2. Wire up click handlers on lesson cards (both sidebar and main content) to navigate via Nuxt file-based routing.
3. Handle edge cases:
   - Clicking a `locked` lesson card (should be non-clickable, but if JS bug allows): show toast "This lesson is locked. Complete previous lessons first." Stay on Dashboard.
   - Clicking an unavailable lesson (API returns 404): show toast "Lesson not found." Navigate back to Dashboard.
   - Clicking an `in_progress` or `completed` lesson: navigate to `/lesson/:id` (shows placeholder or full lesson view).
4. Handle missing route: if `/lesson/:id` route doesn't exist (before Slice 5 is complete), show toast "Lesson view not yet available." Stay on Dashboard.

**Acceptance criteria**:
- [ ] `app/pages/lesson/[id].vue` exists (placeholder or full implementation)
- [ ] Clicking an `available` lesson card navigates to `/lesson/:id`
- [ ] Clicking an `in_progress` lesson card navigates to `/lesson/:id`
- [ ] Clicking a `locked` lesson card shows toast: "This lesson is locked. Complete previous lessons first."
- [ ] Clicking a lesson that returns 404 from API shows toast: "Lesson not found."
- [ ] Navigation bar is visible on the Lesson View page
- [ ] "Back to Roadmap" link exists on Lesson View (navigates to `/`)

**Integration verification**:
- [ ] Frontend dev server starts without errors
- [ ] Clicking a lesson card navigates to `/lesson/1` (or appropriate ID)
- [ ] Locked lesson click shows appropriate toast
- [ ] Navigation bar is visible on Lesson View page

---

### Slice 6: Mobile Layout and RTL Polish

**Type**: HITL (needs design review for mobile patterns)
**Blocked by**: Slices 3, 4, 5 (needs all pages and layouts in place)
**User stories**: "As a learner, I want the dashboard to work well on mobile devices"

**What to build**:

Responsive adjustments across all pages (Dashboard, Lesson View, Playground):

Navigation bar (mobile < 768px):
- Compact layout: smaller text, icon-only navigation (Roadmap icon, Playground icon).
- Hamburger button remains visible and functional.
- TTS status indicator is compact (smaller icon).

Dashboard (mobile):
- Sidebar: full-screen overlay when open (takes entire viewport, covers main content).
- Sidebar close button visible in overlay.
- Main content: full width when sidebar is closed (no shift).
- Lesson cards: single column layout on mobile (not the 2-3 column grid used on desktop).
- Progress bars: full width on mobile.

Lesson View (mobile):
- Full-width content (no sidebar overlap).
- Compact navigation bar.

RTL adjustments (all pages):
- Hamburger button: on the right side for Arabic UI (left side for English UI).
- Sidebar: slides from right for Arabic UI (slides from left for English UI).
- Navigation links: right-to-left order for Arabic UI.
- Text alignment: right-aligned for Arabic text, left-aligned for English text.
- Progress bars: right-to-left fill direction for Arabic UI.

**Acceptance criteria**:
- [ ] Navigation bar is compact on mobile (< 768px)
- [ ] Sidebar takes full screen when open on mobile (not a slide-in panel)
- [ ] Lesson cards are single-column on mobile
- [ ] Hamburger button position is correct (right for Arabic, left for English)
- [ ] Sidebar slides from correct side (right for Arabic, left for English)
- [ ] All pages (Dashboard, Lesson View, Playground) are responsive
- [ ] Touch targets are large enough on mobile (≥ 44px)

**Integration verification**:
- [ ] Frontend dev server starts without errors
- [ ] Browser DevTools responsive mode (< 768px) shows correct layouts
- [ ] RTL layout (simulated by changing browser language to ar) renders correctly
- [ ] Touch interactions work on mobile (tap, swipe, drag)

---

## Dependency Graph

```
Slice 1 (Playground route) ──────────────────────────────┐
                                                         │
Slice 2 (NavigationBar) ─────────────────────────────────┤
                                                         │
Slice 3 (Dashboard page + layout) ◄──────────────────────┘
         │
         ▼
Slice 4 (Roadmap display + useLessons)
         │
         ▼
Slice 5 (Lesson click navigation)
         │
         ▼
Slice 6 (Mobile + RTL polish)
```

**Parallelizable**: Slices 1 and 2 can be implemented in parallel (no cross-dependencies).

---

## External Dependencies

| Dependency | Source | Status | Notes |
|-----------|--------|--------|-------|
| `GET /api/lessons` | Lesson Browsing workflow (backend) | **Not yet implemented** | Returns lesson list with status. This workflow consumes it. |
| `GET /api/lessons/:id` | Lesson Browsing workflow (backend) | **Not yet implemented** | Returns single lesson data. Used by Slice 5. |
| `ModelStatusIndicator` | Existing component | **Available** | Reused in NavigationBar. |
| `useToast` | Existing composable | **Available** | Used for error toasts. |
| Phosphor Icons | CDN (already loaded) | **Available** | Used for navigation icons (ph ph-house, ph ph-list, ph ph-megaphone). |

---

## Test Coverage Plan

Tests should be created in `frontend/tests/` (following project convention):

| Slice | Test File | What to Test |
|-------|-----------|-------------|
| 1 | `playgroundRoute.test.ts` | Playground page exists, renders TTS Studio, `/` does not show TTS Studio |
| 2 | `NavigationBar.test.ts` | Renders correctly, hamburger toggles, links navigate, RTL layout, mobile compact |
| 3 | `DashboardPage.test.ts` | Dashboard renders, sidebar hidden by default, hamburger opens/closes sidebar, responsive layout |
| 4 | `RoadmapDisplay.test.ts` | Groups by level, shows progress bars, status icons correct, handles no-data/error states |
| 5 | `LessonNavigation.test.ts` | Clicks navigate correctly, locked lessons show toast, 404 handling, missing route handling |
| 6 | `MobileLayout.test.ts` | Responsive breakpoints, full-screen sidebar on mobile, RTL layout, touch targets |

---

## Open Questions

- Should the roadmap sidebar show more detail (competency scores, activity counts) or just status icons? (Workflow open question — out of scope for this implementation.)
- Should there be a "Continue Learning" button that jumps to the first `in_progress` lesson? (Workflow open question — could be a future enhancement.)
- Should the progress bar show decimal precision (e.g., "33.3%") or rounded (e.g., "33%")? (Workflow open question — could be a future enhancement.)
- Should locked lessons show any preview (title only, no content)? (Workflow open question — out of scope for this implementation.)
