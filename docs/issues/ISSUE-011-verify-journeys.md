# ISSUE-011: Verify All 11 Existing Customer Journeys on /

**Spec Reference:** `docs/workflows/WORKFLOW-multi-page-spa-routing.md` (Prerequisites R-13; ADR-001, ADR-002)
**Dependencies:** ISSUE-003 (TTS Studio layout adapted), ISSUE-010 (StickyAudioBar migration complete)
**Scope:** Frontend — integration testing (`frontend/app/pages/index.vue` and all components)

---

## Problem

After adding the 60px navbar and migrating to StickyAudioBar, the TTS Studio (the primary landing page, D2) must remain fully functional. R-13 explicitly requires: "All 11 existing customer journeys on `/` remain functional."

## Acceptance Criteria

### AC-1: All 11 existing customer journeys verified
Each of the 11 existing journeys on `/` must work end-to-end:
1. Text input + voice selection + generate → audio plays in sticky bar
2. Audio playback controls (play, pause, seek, speed, volume)
3. Speed slider adjustment during playback
4. Voice selector change + re-generate
5. Text validation error messages
6. Health status indicator (loading → ready → error states)
7. Panel toggle (control-deck ↔ canvas) on desktop
8. Mobile stacked layout with draggable divider
9. Toast notifications (success, error, info)
10. Scroll reveal animations (fade-up on scroll)
11. Keyboard shortcuts (Ctrl/Cmd+Enter for synthesis)

### AC-2: No layout regression from navbar
- TTS Studio panels render correctly with `calc(100vh - 60px)`
- No content is hidden behind the navbar
- No overlap between navbar and TTS Studio controls
- Mobile layout adjusts correctly (`calc(100vh - 64px)` when navbar grows to `h-16`)

### AC-3: No regression from StickyAudioBar migration
- Synthesis workflow works end-to-end (text → generate → audio in sticky bar)
- All playback controls functional (play, pause, seek, speed, volume, download)
- Sticky bar slides up on synthesis completion, hides when closed
- No visual overlap between navbar and sticky bar (they occupy opposite viewport edges)

### AC-4: All existing tests pass
- `pnpm test` (Vitest unit tests) passes
- `npx vitest --config vitest.component.config.ts` (component tests) passes
- No existing tests modified, weakened, or deleted (AGENTS.md rule)

## Test Cases Covered

| Spec Test | How Verified |
|---|---|
| TC-13: Multiple rapid navigations | Layout is stable after rapid navigation (no overflow/scroll issues) |
| (All existing `/` journeys) | Each of the 11 journeys verified (see AC-1) |

## ADR References

- **ADR-001** (Shared Layout with Global Navbar): Assumption A10 — "All 11 existing customer journeys on `/` remain functional after layout changes (R-13)"
- **ADR-002** (Multi-Page SPA Routing): D2 — "TTS Studio stays at `/` — existing user journeys preserved, dashboard is secondary"

## Files

- Integration test file: `frontend/tests/integration/journeys.test.ts` (new)
- Existing tests must all pass (no modifications)
