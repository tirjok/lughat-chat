## Type

AFK

## What to build

Rewrite the existing single-page card layout into a two-panel studio interface with a fixed dark theme. The layout consists of a left sidebar (aside, ~30% width on desktop, ~25% on lg+) and a right content area (main, ~70% on desktop, ~75% on lg+).

Build a new `Header` component that displays:
- Waves icon (mapped from Lucide `volume-2`)
- Title "LughatChat" with "Chat" rendered in magenta (#DD2476)
- Subtitle "Premium Audio Studio"
- Model loading status indicator (reuse existing `ModelStatusIndicator` component)

Move the keyboard shortcut hint from the header into a floating hint at the bottom-right of the canvas area, styled with dark panel background and keyboard key badges.

Wire all existing composables into the new layout: `useAudioPlayer`, `useTtsApi`, `useHealthPoll`, `useVoices`, `useInputValidation`, `useTimeDisplay`, `useToast`.

## Acceptance criteria

- [ ] Page layout is two-panel (aside + main) with correct width proportions on desktop and lg+ breakpoints
- [ ] Header component renders: waves icon, "LughatChat" title with "Chat" in magenta, subtitle text
- [ ] Model status indicator is positioned in the header (right side, two-column layout)
- [ ] Keyboard shortcut hint appears at bottom-right of canvas with styled `<kbd>` badges
- [ ] Ctrl+Enter from anywhere on the page triggers `handleSynthesize()`
- [ ] All existing composables are wired into the page — no business logic changes
- [ ] All `dark:` variant classes removed (fixed dark theme only)
- [ ] Charcoal background (#121212) applied to page
- [ ] Tests: Header renders correctly, keyboard shortcut triggers synthesis, layout structure verified

## Blocked by

None - can start immediately
