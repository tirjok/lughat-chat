# Issue #8: feat: implement LessonGrammar component (topic cards, informational only)

## What to build

Create `LessonGrammar.vue` — renders grammar content from `SectionContent { type: 'grammar', topics: { name, description, examples: { arabic, english }[] }[] }`:

- **Topic cards**: Each topic has a colored icon header (name), description paragraph, then examples list
- **Example pairs**: Arabic (RTL) | English side-by-side
- **No audio binding**: Informational only (per ADR-008, grammar section does not emit play events)

Low complexity. No emits, no local state. Pure rendering.

## Acceptance criteria

- [ ] Component renders topic cards with colored icon header (name)
- [ ] Each topic shows description paragraph
- [ ] Each topic shows examples list with Arabic (RTL) | English pairs
- [ ] Arabic text renders RTL (`dir="rtl"`)
- [ ] Component does NOT emit any play/audio events (informational only)
- [ ] Component test covers topic rendering
- [ ] RTL layout correct

- #2 (wire LessonHero — page must render grammar section)

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API returns a valid response

## Workflow Reference

- WORKFLOW-lesson-details-page.md: STEP 3 (section navigation — grammar tab)
- ADR-008: Component map (LessonGrammar — low complexity, informational only)

## Test Cases Covered

- "switches active section on tab click" (grammar tab)
