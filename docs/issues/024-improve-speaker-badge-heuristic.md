# Issue #024: feat: improve speaker badge heuristic in LessonDialogue

## What's wrong

`LessonDialogue.vue` has a hardcoded list of 12 male speaker names (`isMaleSpeaker()` at line 62). This list is incomplete — future lessons will contain speaker names like "Abdullah", "Omar", "Zayd" that are not on the list. These names currently get classified as female (pink gradient) because they fail the 12-name match. The hardcoded list is brittle: adding every new name requires code changes.

## What to build

Replace the hardcoded 12-name `isMaleSpeaker()` list with a heuristic-based approach:

- Add `malePatterns?: string[]` as an optional prop from the parent (e.g., curriculum can provide patterns: `['Muhammad', 'Ali', 'Ibrahim', 'Musa']`).
- If the prop is absent, use a heuristic fallback: check if the speaker name starts with a capitalized letter matching known male patterns; if the name matches no pattern, default to a **neutral stone gradient** (`from-stone-500 to-stone-700`) instead of incorrectly defaulting to female (pink).
- Speaker names are displayed as-is from curriculum data (capitalization preserved).

## Acceptance criteria

- [ ] The `malePatterns?: string[]` prop is added to the component's props interface
- [ ] Names matching `malePatterns` get the teal gradient
- [ ] Names not matching any pattern get a neutral stone gradient (not pink)
- [ ] Known male names (Muhammad, Ali, Ibrahim, Musa) still get teal
- [ ] Known female names (Khadija, Aisha) still get pink
- [ ] Unknown names (e.g., "Abdullah") get neutral stone (not incorrectly pink)
- [ ] Empty speaker (`speaker: ''`) still renders no badge (unchanged behavior)
- [ ] Speaker name text is capitalized (existing `line.speaker` display capitalization preserved)
- [ ] Test added: speaker badge for unknown speaker gets neutral gradient
- [ ] Test added: speaker badge normalization (capitalization)

## Blocked by

None - can start immediately

## Integration Verification

- [ ] Existing speaker badge tests (teal for male, pink for female) still pass
- [ ] The lesson page passes `malePatterns` or the heuristic fallback works

## Workflow Reference

- WORKFLOW-lesson-dialogue-ui-improvements.md: STEP 6 (Speaker gradient logic and badge display)

## Test Cases Covered

- TC-08: Speaker badge normalization
- TC-09: Unknown speaker gets neutral badge
- TC-10: Empty speaker — no badge
