# Issue #4: feat: implement LessonDialogue component (scene tabs + line cards + audio binding)

## What to build

Create `LessonDialogue.vue` — the highest-complexity content section. It renders dialogue content from `SectionContent { type: 'dialogue', scenes: { label, lines: DialogueLine[] }[] }`:

- **Scene tabs**: Horizontal tabs for each scene (derived from `scenes[].label`)
- **Line cards**: Each line shows speaker badge (dark teal gradient for male, dark pink for female), Arabic text (RTL, clickable for audio), English translation, teacher note (blue info box)
- **Active line highlighting**: Gradient background + 4px right border (RTL) for the currently playing line
- **Per-line play button**: SVG icon that emits `playLine(index)` with the line's Arabic text
- **"Play Scene" button**: Sequential playback of all lines in the current scene (800ms gap between lines, per Assumption A2)
- **Comparison card**: Bottom card showing key differences between scenes (gender suffixes highlighted)

The component manages local state: `currentSceneIndex`, `currentLineIndex`. It emits `playLine(index)` with Arabic text for TTS.

## Acceptance criteria

- [ ] Component renders scene tabs derived from `scenes[].label`
- [ ] Switching scenes updates the active scene tab and line list
- [ ] Each line card shows speaker badge with correct color (male=female gradient)
- [ ] Arabic text renders RTL (`dir="rtl"`) with Cairo font
- [ ] Clicking a line card's play button emits `playLine(index)` with Arabic text
- [ ] Active line has gradient background + 4px right border (RTL)
- [ ] "Play Scene" button emits `playScene()` event
- [ ] Comparison card renders at bottom with scene differences
- [ ] Component test covers scene switching, line play, and active highlighting
- [ ] RTL layout correct

## Blocked by

- #3 (implement LessonCompetencies — page must render dialogue section)

## Integration Verification

- [ ] The real service starts without errors in logs
- [ ] The health/status endpoint returns success (not error)
- [ ] The public API returns a valid response

## Workflow Reference

- WORKFLOW-lesson-details-page.md: STEP 3 (section navigation — dialogue tab), STEP 4 (tap line → audio), STEP 5 (play/pause/seek/prev/next for dialogue lines)
- ADR-008: Component map (LessonDialogue — high complexity)

## Test Cases Covered

- "switches active section on tab click" (dialogue tab)
- "tap plays audio after 200" (dialogue line)
- "play/pause toggle updates state" (dialogue playback)
- "seek updates currentTime" (dialogue seek)
- "prev/next triggers TTS for adjacent line" (dialogue navigation)
