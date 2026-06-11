## Type

AFK

## What to build

Wire all previously built components into the complete page flow and apply the final design polish. This slice connects the two-panel layout (Slice 1), ArabicTextarea (Slice 2), VoiceSelector (Slice 3), SpeedSlider (Slice 4), GenerateButton (Slice 5), and AudioPlayerPanel (Slice 6) into a fully functional end-to-end experience.

Apply the "Sunrise Surge" fixed dark theme color palette throughout:
- Background: charcoal #121212
- Panels: #1A1A1A
- Borders: #2A2A2A
- Text: #E0E0E0 (primary), #a0aec0 (secondary)
- Sunrise orange: #FF512F
- Sunrise magenta: #DD2476
- Green (status): #22c55e
- Red (errors): red-500

Apply typography: Inter font for UI labels/headers/buttons, Cairo font for Arabic text content (matching the existing design file).

Define custom animations and styles:
- `pulse-glow` (2s cubic-bezier infinite) — for focus effects
- `spin-slow` (4s linear infinite) — for conic gradient border
- Custom scrollbar: 8px width, #2A2A2A thumb, #121212 track
- Border radius: 12px (cards), 8px (inputs/buttons), rounded-full (status dots, buttons)

Remove all `dark:` variant classes from CSS (fixed dark theme eliminates ~40% of CSS complexity).

## Acceptance criteria

- [ ] All 6 components wired into complete page flow in `index.vue`
- [ ] Full user flow works end-to-end: enter text → select voice → adjust speed → generate → verify player with waveform → play → download → collapse
- [ ] "Sunrise Surge" color palette applied throughout (charcoal, magenta, orange, panel colors)
- [ ] Inter font applied to UI labels, Cairo font applied to Arabic text content
- [ ] Custom animations defined: `pulse-glow` (2s), `spin-slow` (4s)
- [ ] Custom scrollbar styling applied (8px width, #2A2A2A thumb)
- [ ] Border radius scale applied (12px cards, 8px inputs/buttons, rounded-full status dots)
- [ ] All `dark:` variant classes removed from CSS
- [ ] No light mode support (fixed dark theme)
- [ ] RTL/LTR hybrid works correctly (page layout LTR, Arabic textarea content RTL)
- [ ] Tests: full page renders correctly, all components wired, dark mode classes removed, full page flow integration test

## Blocked by

- #01-two-panel-layout-header-keyboard-shortcut (Slice 1)
- #02-arabic-textarea-full-size-canvas-focus-halo (Slice 2)
- #03-voice-selector-custom-dropdown-3-presets (Slice 3)
- #04-speed-slider-gradient-track-live-value (Slice 4)
- #05-generate-button-conic-gradient-state-swap (Slice 5)
- #06-audio-player-panel-slide-up-canvas-waveform (Slice 6)
- #07-backend-extend-voices-api-3-presets (Slice 7)
