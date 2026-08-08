# ISSUE-005: Create Level Index Page Shell (Dashboard Sub-Route)

**Spec Reference:** `docs/workflows/WORKFLOW-multi-page-spa-routing.md` (Step 1, Step 3; ADR-002)
**Dependencies:** ISSUE-004 (Dashboard page shell exists)
**Scope:** Frontend only (`frontend/app/pages/dashboard/level/[level]/index.vue`)

---

## Problem

The dashboard needs hierarchical sub-routes for levels. `/dashboard/level/{level}` is a new route that filters content by learning level (A1, A2, B1, B2, etc.).

## Acceptance Criteria

### AC-1: Page file exists at correct path
- `frontend/app/pages/dashboard/level/[level]/index.vue` is created
- Nuxt 4 file-based routing maps it to `/dashboard/level/{level}`
- Dynamic segment `[level]` is captured as a route param
- Navigating to `/dashboard/level/a1` renders this component with `level = 'a1'`

### AC-2: Level shell renders placeholder content
- Renders a basic level view (content list structure per ADR-002)
- Shows placeholder content (no backend integration yet — deferred per ADR-002)
- Displays the level parameter in the UI (e.g., "Level A1")

### AC-3: Navigation from Dashboard
- Clicking a level card on `/dashboard` navigates to `/dashboard/level/{level}`
- GlobalNavbar "My Courses" link is highlighted as active

### AC-4: Does NOT import TTS-specific composables
- Does NOT import `useAudioModule`, `useTtsApi`, `useInputValidation`, or `usePanelToggle`
- Does NOT import `useVoices` (per RC-2 constraint)

## Test Cases Covered

| Spec Test | How Verified |
|---|---|
| TC-02: Happy path — navigate to Lesson page | `/dashboard/level/a1` renders, GlobalNavbar highlights "My Courses" |
| TC-07: Direct URL navigation | Typing `/dashboard/level/a1` renders the page |

## ADR References

- **ADR-002** (Multi-Page SPA Routing): Defines `/dashboard/level/{level}` as a nested dynamic route (D4)
- **RC-2**: Level pages should NOT import `useVoices`

## Files

- `frontend/app/pages/dashboard/level/[level]/index.vue` (new)
- Component test: `frontend/tests/LevelIndex.test.ts` (new)
