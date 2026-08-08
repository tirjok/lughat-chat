# ISSUE-006: Create Lesson Page Shell (Dashboard Sub-Route)

**Spec Reference:** `docs/workflows/WORKFLOW-multi-page-spa-routing.md` (Step 1, Step 3; ADR-002)
**Dependencies:** ISSUE-005 (Level index page exists)
**Scope:** Frontend only (`frontend/app/pages/dashboard/level/[level]/[lesson].vue`)

---

## Problem

The dashboard needs the deepest hierarchical route: `/dashboard/level/{level}/{lesson}`. This route renders a specific lesson within a level.

## Acceptance Criteria

### AC-1: Page file exists at correct path
- `frontend/app/pages/dashboard/level/[level]/[lesson].vue` is created
- Nuxt 4 file-based routing maps it to `/dashboard/level/{level}/{lesson}`
- Dynamic segments `[level]` and `[lesson]` are captured as route params
- Navigating to `/dashboard/level/a1/1` renders this component with `level = 'a1'`, `lesson = '1'`

### AC-2: Lesson shell renders placeholder content
- Renders a basic lesson view (hero + tabs + content layout per ADR-002)
- Shows placeholder content (no backend integration yet — deferred per ADR-002)
- Displays the level and lesson parameters in the UI

### AC-3: Navigation from Level Index
- Clicking a lesson on `/dashboard/level/{level}` navigates to `/dashboard/level/{level}/{lesson}`
- GlobalNavbar "My Courses" link is highlighted as active

### AC-4: Does NOT import TTS-specific composables
- Does NOT import `useAudioModule`, `useTtsApi`, `useInputValidation`, or `usePanelToggle`
- Does NOT import `useVoices` (per RC-2 constraint)

### AC-5: 404 handling for invalid routes
- Navigating to `/dashboard/level/` (trailing slash, no level) redirects to `/dashboard` (workflow Step 1: `FAILURE(malformed_route)`)
- Navigating to `/nonexistent` renders Nuxt's default 404 page (workflow Step 1: `FAILURE(not_found)`)

## Test Cases Covered

| Spec Test | How Verified |
|---|---|
| TC-02: Happy path — navigate to Lesson page | `/dashboard/level/a1/1` renders, GlobalNavbar highlights "My Courses" |
| TC-07: Direct URL navigation | Typing `/dashboard/level/a1/1` renders the page |
| TC-10: Route not found (404) | Navigating to `/nonexistent` renders 404 page |

## ADR References

- **ADR-002** (Multi-Page SPA Routing): Defines `/dashboard/level/{level}/{lesson}` as the deepest nested dynamic route (D4)
- **RC-2**: Lesson pages should NOT import `useVoices`

## Files

- `frontend/app/pages/dashboard/level/[level]/[lesson].vue` (new)
- Component test: `frontend/tests/LessonPage.test.ts` (new)
