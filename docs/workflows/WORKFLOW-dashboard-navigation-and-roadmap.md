# WORKFLOW: Dashboard Navigation and Roadmap Display
**Version**: 0.1
**Date**: 2026-07-10
**Author**: Workflow Architect
**Status**: Draft
**Implements**: PRD — "As a learner, I want to see a roadmap of my learning journey (A1 → A2 → B1) so that I know where I am"

---

## Overview
When the learner lands on the Dashboard (`/`), they see a **roadmap** of all 30 lessons across 3 CEFR levels (A1, A2, B1). Each level shows a progress percentage, each lesson shows a status icon (🔒 / → / ◉ / ✓), and clickable lessons navigate to the Lesson View (`/lesson/:id`). A **collapsible sidebar** (roadmap) can be toggled via a hamburger button. A **top navigation bar** is visible on all pages with: hamburger, Home, Roadmap, Playground, and TTS status indicator.

This workflow covers the **UI/UX of the Dashboard** — how the roadmap is rendered, how navigation works, and how the sidebar behaves. It does NOT cover the API calls (that's the Lesson Browsing workflow) or the lesson content (that's the Lesson Content Serving workflow).

---

## Actors
| Actor | Role in this workflow |
|---|---|
| Learner (Customer) | Opens Dashboard, interacts with roadmap, navigates between pages |
| Frontend (Nuxt SPA) | Renders Dashboard page, navigation bar, collapsible sidebar |
| Nginx (reverse proxy) | Serves SPA files, routes `/` to Dashboard page |

---

## Prerequisites
- Dashboard page exists at `app/pages/index.vue` (Dashboard variant — different from current TTS Studio)
- Navigation bar component exists (`app/components/NavigationBar.vue`)
- Roadmap sidebar component exists (`app/components/LessonSidebar.vue`)
- Lesson data is available via `GET /api/lessons` (Lesson Browsing workflow)

---

## Trigger
**Primary**: User navigates to `/` (Dashboard page) in the browser.
**Secondary**: User clicks "Home" or "Roadmap" in the navigation bar.

---

## Workflow Tree

### STEP 1: Dashboard Page Renders (Frontend)
**Actor**: Frontend (Dashboard page — `app/pages/index.vue`)
**Action**: Render the Dashboard layout:
  1. Top navigation bar (fixed, full width).
  2. Collapsible roadmap sidebar (hidden by default, shown when hamburger is clicked).
  3. Main content area: roadmap display (3 levels, 30 lessons).
  4. Progress summary per level (percentage bar).

**Timeout**: N/A (synchronous render, < 200ms)
**Input**: Lesson data from `GET /api/lessons` (passed as props or via composable).
**Output on SUCCESS**: Dashboard fully rendered → GO TO STEP 2
**Output on FAILURE**:
  - `FAILURE(missing_components)`: Navigation bar or sidebar component doesn't exist → Dashboard renders without those elements (degraded UI).
  - `FAILURE(no_lesson_data)`: API returns empty or fails → Dashboard shows "No lessons available" placeholder.

**Observable states during this step**:
  - Customer sees: Dashboard with top navigation bar, roadmap sidebar (collapsed), main content showing 30 lesson cards grouped by 3 levels. Progress bars per level.
  - Operator sees: Nginx serves `index.html`, frontend renders Dashboard.
  - Database: No changes (read-only).
  - Logs: (no logs from frontend render).

---

### STEP 2: User Interacts with Navigation Bar
**Actor**: User (Customer)
**Action**: User clicks one of the navigation bar items:
  1. **Hamburger (☰)**: Toggles the roadmap sidebar (open ↔ closed).
  2. **Home**: Navigates to `/` (Dashboard) — no-op if already on Dashboard.
  3. **Roadmap**: Navigates to `/` (Dashboard) — no-op if already on Dashboard.
  4. **Playground**: Navigates to `/playground` — moves to the TTS Studio page.

**Timeout**: N/A (client-side navigation, < 100ms)
**Input**: `{ action: "toggle_sidebar" | "go_home" | "go_roadmap" | "go_playground" }`
**Output on SUCCESS**: Sidebar toggles or page navigates → GO TO STEP 3
**Output on FAILURE**:
  - `FAILURE(roadside_not_implemented)`: `/playground` route doesn't exist → Show toast: "Playground not yet available." → Stay on Dashboard.
  - `FAILURE(navigation_fails)`: Nuxt routing fails (route not configured) → Show toast: "Navigation not yet available." → Stay on current page.

**Observable states during this step**:
  - Customer sees: Sidebar slides in/out when hamburger is clicked. Page changes when navigation bar items are clicked.
  - Operator sees: (nothing — client-side).
  - Database: No changes.
  - Logs: (no logs from frontend navigation).

---

### STEP 3: Sidebar Displays Roadmap (When Open)
**Actor**: Frontend (Roadmap sidebar — `app/components/LessonSidebar.vue`)
**Action**: When the sidebar is open (hamburger clicked), display the full roadmap:
  1. Group lessons by level (A1, A2, B1).
  2. For each level: show level name, progress percentage, progress bar.
  3. For each lesson: show lesson number, title, status icon (🔒 / → / ◉ / ✓).
  4. Clickable lessons (available, in_progress) — clicking navigates to `/lesson/:id`.
  5. Non-clickable lessons (locked) — grayed out, no navigation.

**Timeout**: N/A (synchronous render, < 100ms)
**Input**: Lesson data (from `GET /api/lessons`).
**Output on SUCCESS**: Sidebar fully rendered with roadmap → GO TO STEP 4
**Output on FAILURE**:
  - `FAILURE(no_data)`: No lesson data → Sidebar shows "No lessons available."
  - `FAILURE(malformed_data)`: Lesson data has unexpected structure → Sidebar shows "Failed to render roadmap."

**Observable states during this step**:
  - Customer sees: Sidebar slides in from left (or right for RTL), showing 30 lesson cards grouped by 3 levels. Progress bars per level. Status icons per lesson.
  - Operator sees: (nothing — client-side).
  - Database: No changes.
  - Logs: No logs.

---

### STEP 4: Main Content Displays Roadmap (When Sidebar Is Closed)
**Actor**: Frontend (Dashboard page — main content area)
**Action**: When the sidebar is closed (default state), display the roadmap in the main content area:
  1. Show 3 level sections (A1, A2, B1), each with a progress bar and lesson cards.
  2. Each lesson card is clickable (if available/in_progress) or grayed out (if locked).
  3. Clicking a lesson card navigates to `/lesson/:id`.

**Timeout**: N/A (synchronous render, < 200ms)
**Input**: Lesson data (from `GET /api/lessons`).
**Output on SUCCESS**: Main content fully rendered with roadmap → GO TO STEP 5
**Output on FAILURE**:
  - `FAILURE(no_data)`: No lesson data → Main content shows "No lessons available."
  - `FAILURE(malformed_data)`: Lesson data has unexpected structure → Main content shows "Failed to render roadmap."

**Observable states during this step**:
  - Customer sees: Main content showing 30 lesson cards grouped by 3 levels. Progress bars per level. Status icons per lesson. Clickable cards for available/in-progress lessons.
  - Operator sees: (nothing — client-side).
  - Database: No changes.
  - Logs: No logs.

---

### STEP 5: User Clicks a Lesson (Navigation)
**Actor**: User (Customer)
**Action**: User clicks on a lesson card (either in the sidebar or in the main content). Frontend navigates to `/lesson/:id` (Nuxt file-based routing).
**Timeout**: N/A (client-side navigation, < 100ms)
**Input**: `{ lessonId: number }` (from clicked lesson card)
**Output on SUCCESS**: Navigate to `/lesson/:id` → GO TO STEP 6 (Lesson Browsing and Access workflow)
**Output on FAILURE**:
  - `FAILURE(click_locked_lesson)`: User clicks a `locked` lesson card (should be non-clickable, but if JS bug allows) → Show toast: "This lesson is locked. Complete previous lessons first." → Stay on Dashboard.
  - `FAILURE(navigation_route_missing)`: `/lesson/:id` route doesn't exist → Show toast: "Lesson view not yet available." → Stay on Dashboard.

**Observable states during this step**:
  - Customer sees: Dashboard fades out, Lesson View page loads (or stays on Dashboard with error toast).
  - Operator sees: Nginx logs `GET /lesson/1` (or appropriate lesson ID).
  - Database: No changes (navigation only).
  - Logs: (no logs from frontend navigation).

---

## ABORT_CLEANUP: Navigation Failure Recovery
**Triggered by**: Any failure in STEP 2, STEP 3, STEP 4, or STEP 5 that prevents navigation or rendering.
**Actions** (in order):
  1. Frontend shows appropriate error toast.
  2. Frontend stays on the current page (Dashboard).
  3. Frontend resets any loading states (spinners, skeletons).

**What customer sees**: Error toast at top-center (red). Dashboard remains visible.

**What operator sees**: (nothing — client-side error handling).

---

## Reality Checker Findings
| # | Finding | Severity | Spec section | Resolution |
|---|---|---|---|-------------|
| RC-1 | **No Dashboard page exists** — The current `app/pages/index.vue` is a TTS Studio, not a Dashboard. | **Critical** | STEP 1 | A new Dashboard page must be created (or the current one must be refactored). |
| RC-2 | **No navigation bar exists** — The current app has no top navigation bar. | **Critical** | STEP 2 | A new `NavigationBar` component must be created. |
| RC-3 | **No roadmap sidebar exists** — The current app has no collapsible sidebar. | **Critical** | STEP 3 | A new `LessonSidebar` component must be created. |
| RC-4 | **No `/playground` route exists** — The current app is a single page at `/`. | **High** | STEP 2 | The `/playground` route must be created (move current TTS Studio there). |
| RC-5 | **No `/lesson/:id` route exists** — There is no file-based routing for lessons. | **High** | STEP 5 | A new `app/pages/lesson/[id].vue` page must be created. |

---

## Test Cases
| Test | Trigger | Expected behavior |
|---|---|---|
| TC-01: Dashboard renders with data | Dashboard loads with 30 lessons | Shows 30 lesson cards grouped by 3 levels, progress bars, status icons |
| TC-02: Dashboard renders with no data | No lesson data from API | Shows "No lessons available" placeholder |
| TC-03: Sidebar toggles open | User clicks hamburger | Sidebar slides in from left, showing full roadmap |
| TC-04: Sidebar toggles closed | User clicks hamburger (again) | Sidebar slides out, main content shows roadmap |
| TC-05: Sidebar shows progress | 3 of 10 A1 lessons completed | A1 shows "30%" progress bar, A2 and B1 show "0%" |
| TC-06: Click available lesson in sidebar | User clicks a → lesson in sidebar | Navigate to `/lesson/:id` |
| TC-07: Click locked lesson in sidebar | User clicks a 🔒 lesson in sidebar | Toast: "This lesson is locked." → Stay on Dashboard |
| TC-08: Click available lesson in main content | User clicks a → lesson in main content | Navigate to `/lesson/:id` |
| TC-09: Click locked lesson in main content | User clicks a 🔒 lesson in main content | Toast: "This lesson is locked." → Stay on Dashboard |
| TC-10: Navigate to Playground | User clicks "Playground" in navigation bar | Navigate to `/playground` (or show toast if not implemented) |
| TC-11: Navigate to Home from Dashboard | User clicks "Home" while on Dashboard | No-op (already on Dashboard) |
| TC-12: Mobile layout | Viewport < 768px | Navigation bar is compact, sidebar takes full screen when open |

---

## Assumptions
| # | Assumption | Where verified | Risk if wrong |
|---|---|---|---|
| A1 | Dashboard layout: top nav bar + collapsible sidebar + main content (3-column hybrid) | ADR-009 (Option A) | High — if layout changes, this workflow changes |
| A2 | Sidebar is hidden by default (collapsed), shown when hamburger is clicked | ADR-009 (PRD) | Low — confirmed by PRD |
| A3 | Navigation bar is visible on all pages (Dashboard, Lesson View, Playground) | ADR-009 (PRD) | Low — confirmed by PRD |
| A4 | RTL support: hamburger on right, sidebar slides from right for Arabic UI | ADR-009 (PRD) | Medium — if RTL is not implemented, navigation direction changes |
| A5 | Mobile layout: sidebar takes full screen when open (not a slide-in panel) | ADR-009 (responsive design) | Medium — if mobile uses a different pattern, this workflow changes |

---

## Open Questions
- Should the roadmap sidebar show more detail (competency scores, activity counts) or just status icons?
- Should there be a "Continue Learning" button that jumps to the first `in_progress` lesson?
- Should the progress bar show decimal precision (e.g., "33.3%") or rounded (e.g., "33%")?
- Should locked lessons show any preview (title only, no content)?
