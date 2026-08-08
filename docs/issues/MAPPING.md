# Spec-to-Issue Mapping Table

**Source:** `docs/workflows/WORKFLOW-multi-page-spa-routing.md` (Test Cases, TC-01 through TC-15)
**Date:** 2026-08-04

## Mapping: Spec Branch → Issue ID

| Spec Test Case | Issue ID | Issue Title | Status |
|---|---|---|---|
| **TC-01**: Happy path — navigate to Dashboard | ISSUE-001 (AC-4), ISSUE-004 (AC-3), ISSUE-012 (AC-1) | GlobalNavbar component | Covered |
| **TC-02**: Happy path — navigate to Lesson page | ISSUE-001 (AC-4), ISSUE-005 (AC-3), ISSUE-006 (AC-3), ISSUE-012 (AC-2) | Level index + Lesson pages | Covered |
| **TC-03**: Happy path — browser back/forward | ISSUE-012 (AC-3) | Cross-page navigation | Covered |
| **TC-04**: In-flight synthesis — "Clean & Leave" | ISSUE-008 (AC-4), ISSUE-012 (AC-4) | Cleanup guard | Covered |
| **TC-05**: In-flight synthesis — "Stay" | ISSUE-008 (AC-5), ISSUE-012 (AC-5) | Cleanup guard | Covered |
| **TC-06**: Backend unavailable during cleanup | ISSUE-008 (AC-6), ISSUE-012 (AC-6) | Cleanup guard | Covered |
| **TC-07**: Direct URL navigation | ISSUE-001 (AC-4), ISSUE-006 (AC-5), ISSUE-012 (AC-7) | Navbar + Lesson page | Covered |
| **TC-08**: Health poll failure on dashboard | ISSUE-004 (AC-4), ISSUE-012 (AC-8) | Dashboard page | Covered |
| **TC-09**: Voice load failure on dashboard | ISSUE-004 (AC-4), ISSUE-012 (AC-9) | Dashboard page | Covered |
| **TC-10**: Route not found (404) | ISSUE-001 (AC-1), ISSUE-006 (AC-5), ISSUE-012 (AC-10) | Navbar + Lesson page | Covered |
| **TC-11**: Composable error during mount | ISSUE-004 (AC-4), ISSUE-012 (AC-11) | Dashboard page | Covered |
| **TC-12**: SSR hydration mismatch | ISSUE-012 (AC-12) | Cross-page navigation | Covered |
| **TC-13**: Multiple rapid navigations | ISSUE-003 (AC-2), ISSUE-012 (AC-13) | Layout adaptation | Covered |
| **TC-14**: In-flight synthesis — cleanup network error | ISSUE-008 (AC-6), ISSUE-012 (AC-14) | Cleanup guard | Covered |
| **TC-15**: Active synthesis — no navigation | ISSUE-008 (AC-1), ISSUE-010 (AC-3), ISSUE-012 (AC-15) | Cleanup guard + Migration | Covered |

## Spec Branches NOT Resistant to Vertical Slicing

All 15 test cases from the workflow spec map cleanly to independent issues. No spec branch required blocking or spec redesign.

## Spec Branches That Required Design Decisions

| Finding | Resolution | Issue |
|---|---|---|
| RC-3: `index.vue` has no `onBeforeRouteLeave` guard (Critical) | R-7 explicitly in scope — ISSUE-008 implements it | ISSUE-008 |
| RC-7: `GlobalNavbar` does not exist yet (High) | New file per requirements — ISSUE-001 creates it | ISSUE-001 |
| RC-1: Dashboard pages should NOT block on health (High) | Health poll is non-blocking — dashboard renders regardless | ISSUE-004 |
| RC-2: Dashboard/lesson pages should NOT import `useVoices` (Low) | Explicit constraint: new pages don't import `useVoices` | ISSUE-004, ISSUE-005, ISSUE-006 |
| RC-8: `StickyAudioBar` (R-10) is deferred | Split into two issues: creation (ISSUE-009) + migration (ISSUE-010) | ISSUE-009, ISSUE-010 |

## Dependency Graph (Issue Order)

```
ISSUE-001 (GlobalNavbar)          ─┐
ISSUE-002 (app.vue layout)       ──┤
ISSUE-003 (TTS layout)           ──┤
ISSUE-004 (Dashboard page)       ──┼── ISSUE-012 (Cross-page navigation) ← LAST
ISSUE-005 (Level index)          ──┤
ISSUE-006 (Lesson page)          ──┤
ISSUE-007 (routeRules)           ──┤
ISSUE-008 (Cleanup guard)        ──┤
ISSUE-009 (StickyAudioBar)       ──┤
ISSUE-010 (Migrate to sticky)    ──┤
ISSUE-013 (Health poll singleton)   ──┤
ISSUE-014 (Theme token migration)    ──┤
ISSUE-011 (Verify journeys)          ──┘
```

**Parallelizable groups:**
- **Foundation**: ISSUE-001, ISSUE-002, ISSUE-003 (sequential — each depends on previous)
- **Routing**: ISSUE-004, ISSUE-005, ISSUE-006 (sequential within group, but ISSUE-007 is independent)
- **Audio**: ISSUE-009 (standalone — can be built in parallel with Foundation)
- **Cleanup**: ISSUE-008 (depends on Foundation)
- **Singleton**: ISSUE-013 (depends on ISSUE-001, ISSUE-003 — GlobalNavbar + index.vue must exist)
- **Theme**: ISSUE-014, ISSUE-015 (sequential — tokens must be defined before CSS can reference them; both depend on ISSUE-007)
- **Final verification**: ISSUE-011, ISSUE-012 (sequential — both depend on all previous)

## Files Produced

| File | Description |
|---|---|
| `docs/issues/ISSUE-001-global-navbar.md` | GlobalNavbar component |
| `docs/issues/ISSUE-002-app-vue-layout.md` | app.vue layout restructuring |
| `docs/issues/ISSUE-003-adapt-tts-layout.md` | TTS Studio layout adaptation |
| `docs/issues/ISSUE-004-dashboard-page.md` | Dashboard page shell |
| `docs/issues/ISSUE-005-level-index-page.md` | Level index page shell |
| `docs/issues/ISSUE-006-lesson-page.md` | Lesson page shell |
| `docs/issues/ISSUE-007-route-rules.md` | routeRules configuration |
| `docs/issues/ISSUE-008-cleanup-guard.md` | Cleanup dialog (R-7) |
| `docs/issues/ISSUE-009-sticky-audio-bar.md` | StickyAudioBar component |
| `docs/issues/ISSUE-010-migrate-to-sticky-bar.md` | Migrate to StickyAudioBar |
| `docs/issues/ISSUE-011-verify-journeys.md` | Verify 11 customer journeys |
| `docs/issues/ISSUE-012-cross-page-navigation.md` | Cross-page navigation integration |
| `docs/issues/ISSUE-013-health-poll-singleton.md` | Refactor useHealthPoll to singleton |
| `docs/issues/ISSUE-014-theme-token-migration.md` | Migrate tokens across 9+ components |
| `docs/issues/ISSUE-015-full-theme-rebrand-css.md` | Full light/dark theme CSS rebrand |
