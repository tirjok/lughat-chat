# Issue #018: feat: show loading/unavailable status hint when audio is disabled in lessons

## What's wrong

When a user opens a lesson page, all dialogue lines (and other content section lines) appear grayed out (opacity 40%) and non-interactive for 10–30 seconds while the TTS backend loads. There is no message explaining why — the user sees dead, gray content with no feedback and no way to know the app is actively working.

## What I expected

Per Issue #017 (pre-gate health check spec), the UI should display:
- A hint reading "Model is loading — audio unavailable" when the backend status is `'loading'`
- A persistent notice reading "TTS unavailable — check backend status" when the status is `'error'`
- The hint/notice should appear within the dialogue section (and other content sections) and disappear once the backend becomes ready.

## Steps to reproduce

1. Start the Docker containers with a fresh backend (or stop the backend so the health check fails)
2. Navigate to any lesson page (e.g. `/dashboard/level/A1/lesson/1`)
3. Observe that all dialogue lines are visually disabled (gray, no cursor) but no status message is displayed
4. Wait ~15 seconds for the health poll to return `'ready'` — lines should re-enable automatically (currently they do, but no message ever appeared)

## Blocked by

None — can start immediately. Depends on existing `useBackendHealth()` composable and the `isAudioDisabled` prop flow from `[lesson].vue`.

## Additional context

### How the existing wiring works (for implementation reference)

- `useBackendHealth()` starts with `status = 'loading'` and polls `/health` every 2 seconds
- `[lesson].vue` line 16: `isAudioDisabled = computed(() => healthPoll.status.value !== 'ready')`
- `LessonDialogue` receives `isAudioDisabled` and gates play buttons (lines 157, 179) and line card styling (lines 125-126: `opacity-40 cursor-not-allowed`)
- Other content components (`LessonVocabulary`, `LessonPronouns`, `LessonExpressions`) follow the same pattern — all gate on `isAudioDisabled`

### What was missed

The Issue #017 spec had these acceptance criteria that were never implemented:
- "Disabled affordances show 'Model is loading' hint (tooltip or inline)"
- "Disabled affordances show 'TTS unavailable' notice when status is 'error'"

The pre-gate test suite (`lesson-pre-gate.test.ts`) tests the disabled/enabled state but does not test for the presence of a status message.

### Design guidance

The status hint should be rendered at the top of each content section that gates audio (or once at the page level). Consider:
- Using the parent page's `healthPoll.status` directly (rather than just the boolean `isAudioDisabled`) so the hint can distinguish `'loading'` from `'error'`
- Rendering the hint above the line cards, styled consistently with the existing UI (stone/pink/teal palette, dark-mode aware)
- Disappearing the hint once `status` transitions to `'ready'` (no explicit dispose needed — reactive)
- The hint is not needed on pages that don't gate audio (e.g. the studio dashboard)
