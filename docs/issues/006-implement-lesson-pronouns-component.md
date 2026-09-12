# Issue #6: feat: implement LessonPronouns component (color-coded grid)

## What to build

Create `LessonPronouns.vue` — renders pronoun content from `SectionContent { type: 'pronouns', pronouns: { arabic, english, example }[] }`:

- **Color-coded legend**: Male (blue `#3b82f6`), Female (pink `#ec4899`), Dual (green `#10b981`), Plural-M (amber `#f59e0b`), Plural-F (violet `#8b5cf6`)
- **2-column grid**: Each card shows Arabic (RTL, large), English, Example (bordered bottom section)
- **Per-card audio**: Each card is clickable for audio, emitting `playPronoun(index)` with the pronoun's Arabic text

The component manages no cross-component state. It emits `playPronoun(index)` with Arabic text for TTS.

## Acceptance criteria

- [ ] Component renders color-coded legend with correct hex colors
- [ ] Renders pronouns in a 2-column CSS grid
- [ ] Each card shows Arabic (RTL, large), English, Example
- [ ] Arabic text renders RTL (`dir="rtl"`)
- [ ] Each card is clickable and emits `playPronoun(index)` with Arabic text
- [ ] Component test covers grid rendering and pronoun play emission
- [ ] RTL layout correct

- #2 (wire LessonHero — page must render pronouns section)

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API returns a valid response

## Workflow Reference

- WORKFLOW-lesson-details-page.md: STEP 3 (section navigation — pronouns tab), STEP 4 (tap pronoun → audio)
- ADR-008: Component map (LessonPronouns — medium complexity)

## Test Cases Covered

- "switches active section on tab click" (pronouns tab)
- "tap plays audio after 200" (pronoun card)
