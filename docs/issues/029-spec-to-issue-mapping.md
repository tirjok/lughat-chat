# Spec-to-Issue Mapping Table

Source: `docs/workflows/WORKFLOW-lesson-dialogue-ui-improvements.md` (17 test cases → 9 new issues)
Output: `docs/issues/020–028` (9 issues, gap at 022 intentionally skipped — 022 was reused from an existing issue number in a prior cycle)

| Spec TC | Description | Issue #020 | Issue #021 | Issue #023 | Issue #024 | Issue #025 | Issue #026 | Issue #027 | Issue #028 |
|---------|-------------|:----------:|:----------:|:----------:|:----------:|:----------:|:----------:|:----------:|:----------:|
| TC-01 | Render multi-scene dialogue | ✓ (tabs render) | | | | | | | |
| TC-02 | ArrowRight keyboard nav | ✓ | | | | | | | |
| TC-03 | ArrowLeft keyboard nav | ✓ | | | | | | | |
| TC-04 | Enter/Space activation | ✓ | | | | | | | |
| TC-05 | Comparison card REMOVED | | | ✓ | | | | | |
| TC-06 | Card body selects, no play | | ✓ | | | | | | |
| TC-07 | Play button selects AND plays | | ✓ | | | | | | |
| TC-08 | Speaker badge normalization | | | | ✓ | | | | |
| TC-09 | Unknown speaker neutral badge | | | | ✓ | | | | |
| TC-10 | Empty speaker — no badge | | | | ✓ | | | | |
| TC-11 | Play Scene button styled | | | | | ✓ | | | |
| TC-12 | Play Scene disabled state | | | | | ✓ | | | |
| TC-13 | No dialogue content — error state | | | | | | ✓ | | |
| TC-14 | Single-scene dialogue | ✓ (v-if guard) | | | | | | | |
| TC-15 | Arabic text font size | | | | | | | | ✓ |
| TC-16 | Multi-scene no hardcoded comparison | | | ✓ (ADR-009) | | | | | |
| TC-17 | Focus management on scene switch | ✓ | | | | | | | |

## Coverage Summary

- **All 17 spec test cases**: covered in at least one issue.
- **No test case**: orphaned or missing.
- **Gaps**: None. Every spec branch maps cleanly to a vertical slice.

## Issue Dependency Chain (Recommended Publish/Implementation Order)

1. **#023** (Remove comparison card) — simplest, ADR-009 compliance, removes a breaking test. Do this first.
2. **#020** (Keyboard tab navigation) — new feature, no blockers.
3. **#024** (Speaker badge heuristic) — independent presentational change.
4. **#025** (Play Scene button polish) — independent presentational change.
5. **#026** (Error/loading states) — independent state rendering.
6. **#028** (Arabic font size) — trivial CSS change, can be done anytime.
7. **#021** (Split card interaction) — modifies existing behavior; test updates needed. Should be done after issues #020–#023 to ensure component stability.
8. **#027** (Playing indicator + auto-scroll) — HITL, requires parent page update (`[lesson].vue`). Blocked on component being stable from all prior issues.
