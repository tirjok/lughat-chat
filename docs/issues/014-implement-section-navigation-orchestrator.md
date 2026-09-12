# Issue #14: feat: implement section navigation orchestrator (tab click + arrow keys)

## What to build

Implement the page-level section navigation logic in `[lesson].vue`. The page orchestrator must:
- Track `activeSection: shallowRef<string | undefined>('Dialogue')` (defaults to first section)
- Handle tab click: `activeSection = tabName`
- Handle `ArrowLeft`/`ArrowRight` keydown (page-level handler): clamp at ends (no wrap, per Assumption A8)
- `<section v-if>` swap: mount target component, unmount previous
- Focus management: set focus on next tick after `v-if` swap (guard per Finding F8)
- Rapid tab mashing: last write wins on single `activeSection` ref; only active tab mounted, no doubled listeners
- Section component cleanup: unmounting a section component must remove its own listeners/timers (component-level `onUnmounted`)

## Acceptance criteria

- [ ] `activeSection` shallowRef defaults to first section ("Dialogue")
- [ ] Tab click updates `activeSection` and re-renders matching section
- [ ] `ArrowLeft`/`ArrowRight` keydown navigates sections (clamped at ends, no wrap)
- [ ] `<section v-if>` swap mounts target, unmounts previous
- [ ] Focus set on next tick after `v-if` swap (guard)
- [ ] Rapid tab mashing: last write wins, exactly one section mounted, no doubled listeners
- [ ] Section component `onUnmounted` removes own listeners/timers
- [ ] Component test covers tab click, arrow keys, rapid mashing
- [ ] RTL layout correct

## Blocked by

- #13 (implement page-leave cleanup — navigation requires all 6 content sections to exist)

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API returns a valid response

## Workflow Reference

- WORKFLOW-lesson-details-page.md: STEP 3 (Section navigation — tab click, arrow keys, focus management, rapid mashing)
- ADR-008: Page Orchestrator Pattern (page owns `activeSection` + `section v-if`; one component per section type)

## Test Cases Covered

- "switches active section on tab click" (all 6 sections)
- "navigates sections with ArrowLeft/ArrowRight"
- "last tab write wins on rapid mashing"
- "renders fallback card for unknown section type"
- "sets focus on next tick after v-if swap"
