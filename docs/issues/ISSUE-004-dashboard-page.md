# ISSUE-004: Create Dashboard Page Shell

**Spec Reference:** `docs/workflows/WORKFLOW-multi-page-spa-routing.md` (Step 1, Step 3; ADR-002)
**Dependencies:** ISSUE-001 (GlobalNavbar exists), ISSUE-002 (app.vue layout)
**Scope:** Frontend only (`frontend/app/pages/dashboard.vue`)

---

## Problem

The application has only one route (`/`). The dashboard page at `/dashboard` is a new route group that serves as the entry point to the learning platform. It needs a page shell.

## Acceptance Criteria

### AC-1: Page file exists at correct path
- `frontend/app/pages/dashboard.vue` is created
- Nuxt 4 file-based routing maps it to `/dashboard`
- Navigating to `/dashboard` renders this component

### AC-2: Dashboard shell renders placeholder content
- Renders a basic dashboard layout (card grid structure per ADR-002)
- Shows placeholder content (no backend integration yet — deferred per ADR-002)
- Does NOT import `useAudioModule`, `useTtsApi`, `useInputValidation`, or `usePanelToggle` (ADR-002 constraint: dashboard doesn't use TTS-specific composables)
- Does NOT import `useVoices` (ADR-002 constraint: dashboard doesn't need voices — fetching `/api/voices` on every mount is wasteful per RC-2)

### AC-3: GlobalNavbar renders correctly
- GlobalNavbar is visible (inherited from app.vue layout)
- "Dashboard" link in GlobalNavbar is highlighted as active
- "My Courses" link navigates to `/dashboard`

### AC-4: Health poll behavior
- If `useHealthPoll` is imported (cross-page state concern per workflow Step 4), it starts polling `/health` on mount
- Dashboard renders regardless of health status (non-blocking per RC-1)
- Health poll shows "loading" state while backend is starting (120s model load)

## Test Cases Covered

| Spec Test | How Verified |
|---|---|
| TC-01: Happy path — navigate to Dashboard | `/dashboard` renders, GlobalNavbar highlights "Dashboard" |
| TC-08: Health poll failure on dashboard | Dashboard renders during 120s model load, health poll shows "loading" |
| TC-09: Voice load failure on dashboard | Page renders without crash if `/api/voices` fails (dashboard doesn't use voices) |
| TC-11: Composable error during mount | If a composable throws, page still accessible (error boundary) |

## ADR References

- **ADR-002** (Multi-Page SPA Routing): Defines `/dashboard` as a flat Nuxt page file (D3), dashboard is secondary to TTS Studio (D2)
- **RC-1**: Dashboard pages should NOT block on health (health poll is non-blocking)
- **RC-2**: Dashboard/lesson pages should NOT import `useVoices` (wasteful API calls)

## Files

- `frontend/app/pages/dashboard.vue` (new)
- Component test: `frontend/tests/Dashboard.test.ts` (new)
