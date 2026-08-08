# ISSUE-012: Test Cross-Page Navigation (Full Workflow)

**Spec Reference:** `docs/workflows/WORKFLOW-multi-page-spa-routing.md` (Full workflow: Steps 1–5; ADR-002)
**Dependencies:** All previous issues (001–011)
**Scope:** Frontend — integration testing (cross-page navigation)

---

## Problem

The multi-page SPA routing workflow covers the complete navigation lifecycle: route resolution → old page teardown → new page mount → composable initialization → navigation complete. This is the **integration test** that validates the entire system works together.

## Acceptance Criteria

### AC-1: Happy path navigation — Dashboard
- Click "Dashboard" in GlobalNavbar from `/`
- `/dashboard` renders with placeholder content
- GlobalNavbar highlights "Dashboard" as active
- Health poll starts (non-blocking per RC-1)
- No composable errors

### AC-2: Happy path navigation — Lesson page
- Click "My Courses" → select level → select lesson
- `/dashboard/level/a1/1` renders with placeholder content
- GlobalNavbar highlights "My Courses" as active
- Health poll starts (non-blocking)

### AC-3: Browser back/forward
- Press browser back button from `/dashboard` to `/`
- TTS Studio remounts correctly
- Health poll restarts
- Sticky bar is hidden (no active audio from dashboard)
- GlobalNavbar highlights "Home" as active

### AC-4: In-flight synthesis — "Clean & Leave"
- Navigate from `/` to `/dashboard` while `isGenerating === true`
- Cleanup dialog appears
- `audioModule.dispose()` called (object URLs revoked, listeners removed)
- `POST /api/cleanup` succeeds
- Navigation proceeds to `/dashboard`
- Sticky bar is hidden after cleanup

### AC-5: In-flight synthesis — "Stay"
- Navigate from `/` to `/dashboard` while `isGenerating === true`
- User clicks "Stay"
- Navigation is cancelled
- TTS Studio remains active
- Synthesis continues (or is restored if already disposed)

### AC-6: Backend unavailable during cleanup
- Navigate from `/` to `/dashboard` while `isGenerating === true`
- Backend returns 503
- Toast: "Backend unavailable — orphan files will be cleaned by scheduled job."
- Navigation proceeds to `/dashboard`

### AC-7: Direct URL navigation
- Type `/dashboard/level/a1/1` in address bar
- Page renders
- Health poll starts
- 404 if route file doesn't exist

### AC-8: Health poll failure on dashboard
- Navigate to `/dashboard` while backend is loading (120s)
- Dashboard renders (non-blocking)
- Health poll shows "loading" state
- Polls every 2s until terminal state

### AC-9: Voice load failure on dashboard
- Navigate to `/dashboard` while `/api/voices` returns 500
- `voices.value = []`, `error.value = message`
- No crash, page renders with no voice selector (dashboard doesn't use voices)

### AC-10: Route not found (404)
- Navigate to `/nonexistent`
- 404 page rendered (Nuxt default)
- No composable errors
- GlobalNavbar does NOT render on 404 (per AC-1 of ISSUE-001)

### AC-11: Composable error during mount
- A composable's `onMounted` throws
- Error caught, page skeleton rendered with error boundary
- Toast shown
- Page still accessible

### AC-12: SSR hydration mismatch
- Server-rendered HTML differs from client render
- Nuxt warns, falls back to client render
- Page may flash briefly (acceptable per spec)

### AC-13: Multiple rapid navigations
- Click "Dashboard" → immediately click "Home"
- Second navigation aborts first
- Only the last navigation completes (router handles queueing)

### AC-14: In-flight synthesis — cleanup network error
- Navigate from `/` while `isGenerating === true`
- Cleanup API call fails (network error)
- Orphan files may remain on disk
- Toast: "Cleanup failed — files will be cleaned by 24h TTL."
- Navigation proceeds

### AC-15: Active synthesis — no navigation
- Stay on `/`, synthesis completes
- Navigate away to `/dashboard`
- `isGenerating = false`, no cleanup dialog
- Direct navigation to `/dashboard`

## Test Cases Covered

| Spec Test | How Verified |
|---|---|
| TC-01 through TC-15 | All 15 test cases verified (see AC-1 through AC-15 above) |

## ADR References

- **ADR-002** (Multi-Page SPA Routing): The complete multi-page routing structure (D2, D3, D4)
- **RC-1**: Dashboard pages do NOT block on health (high severity — must be verified)
- **RC-2**: Dashboard/lesson pages do NOT import `useVoices` (low severity — verified)
- **RC-3**: Cleanup dialog must exist (critical — verified in ISSUE-008)
- **RC-5**: `routeRules` only prerenders `/` (confirmed correct)

## Files

- Integration test file: `frontend/tests/integration/cross-page-navigation.test.ts` (new)
- May require mock utilities in `frontend/tests/mocks.ts` (updated)
