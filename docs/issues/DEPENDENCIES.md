# VISUAL_UNIFY — Issue Dependency Map

This document defines the implementation order for the 8 issues derived from `VISUAL_UNIFY.md`.
Issues are numbered 01–08 and grouped into phases.

---

## Phase 1: Foundation (must complete first)

These issues establish the design tokens and base layout primitives that every other issue depends on.

| # | Issue | Depends On | Est. Effort |
|---|---|---|---|
| 1 | [Extend UnoCSS tokens](01-unocss-tokens.md) | — | 1-2h |
| 2 | [Standardize layout primitives](02-layout-primitives.md) | #1 | 2-3h |

**Sequential order:** #1 → #2

---

## Phase 2: Dashboard Components (parallelizable after Phase 1)

These issues touch the dashboard pages and can be done in parallel once the tokens and layout primitives are in place.

| # | Issue | Depends On | Est. Effort |
|---|---|---|---|
| 3 | [Pill-style tabs](03-pill-tabs.md) | #1 | 2-3h |
| 4 | [LessonHero component](04-lesson-hero.md) | #1 | 3-4h |
| 5 | [Status indicators (light-mode)](05-status-indicators.md) | #1 | 1-2h |
| 6 | [GlobalNavbar unification](06-global-navbar.md) | #1 | 2-3h |
| 7 | [Breadcrumb navigation](07-breadcrumbs.md) | #1, #2 | 1-2h |

**Parallel execution:** #3, #4, #5, #6, #7 (all after #1, #7 also needs #2)

---

## Phase 3: Decision (independent of all others)

| # | Issue | Depends On | Est. Effort |
|---|---|---|---|
| 8 | [Font family evaluation](08-font-families.md) | #1 (tokens for reference) | 1-2h |

**Independent:** #8 can be done at any time (it's a decision, not an implementation).

---

## Total Effort

- **Sequential (all phases):** ~13-19 hours
- **Parallel (Phases 2 + 3):** ~7-11 hours (Phases 1 + 2+3 + 3)
- **Minimum critical path:** ~5-8 hours (Phase 1 + longest Phase 2 issue)

---

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Home page (`/`) dark theme breaks | Isolate changes to dashboard pages only; run full `./run-tests.sh` after each issue |
| UnoCSS token naming conflicts | Proto tokens are well-defined; verify no existing hardcoded hex values reference the extended scale |
| LessonHero props don't match existing data model | The dashboard is placeholder content; props can be extended later when backend integration arrives |
| Font decision stalls other work | Font decision (Issue #8) is independent; all other issues can proceed with current fonts |

---

## Implementation Notes

- Each issue is a **vertical slice**: it touches config + components + tests and delivers observable value.
- Tests should follow the repo's existing patterns: Vitest component tests in `frontend/tests/components/`.
- No backend changes, no new API routes, no new pages — visual updates only.
- The dark-mode studio theme on `/` is **out of scope** for visual changes (per PRD §Out of Scope).
