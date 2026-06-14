# Issue 37: Responsive Tests & Reduced Motion

## What to build

Add comprehensive tests for all responsive UI changes across known device breakpoints (375px, 414px, 768px, 1024px). Add `prefers-reduced-motion` handling in global CSS for users with motion sensitivity.

After this is complete, all responsive changes are covered by automated tests, and users who prefer reduced motion get a quieter experience.

## Acceptance criteria

### Tests

- [ ] `tests/setup.component.ts` extended to mock `window.innerWidth`, `window.resizeTo`, and `window.matchMedia` for breakpoint simulation
- [ ] `PanelToggle.test.ts` component tests:
  - Renders with correct icon and `aria-label` when `activePanel` is `'control-deck'`
  - Renders with correct icon and `aria-label` when `activePanel` is `'canvas'`
  - Is hidden on desktop widths (≥768px)
  - Is visible on mobile/tablet widths (<768px)
- [ ] `usePanelToggle.test.ts` composable unit tests:
  - `isMobile` returns `true` at 375, 414, 767px
  - `isMobile` returns `false` at 768, 1024, 1920px
  - `togglePanel()` flips state between `'control-deck'` and `'canvas'`
  - Initial panel is `'control-deck'`
- [ ] `index.vue` page tests:
  - Shortcut hint is hidden below `sm:` (375px)
  - Shortcut hint is visible at `sm:` and above (414px+)
  - Root container allows scroll (not `overflow-hidden`)
- [ ] `AudioPlayerPanel.test.ts` updated:
  - Flex direction is `flex-col` on mobile widths (<768px)
  - Flex direction is `flex-row` on desktop widths (≥768px)
  - Touch targets are 44px+ on mobile
- [ ] `SpeedSlider.test.ts` new/updated:
  - Stepper buttons render on mobile widths (<768px)
  - Horizontal slider renders on desktop widths (≥768px)
- [ ] `VoiceSelector.test.ts` updated:
  - Dropdown portal renders when triggered
  - Voice options have minimum 48px height on mobile

### Reduced Motion

- [ ] `main.css` adds `@media (prefers-reduced-motion: reduce)` rule:
  - Spinners continue but at reduced speed (2x slower)
  - Pulse-glow animation is disabled
  - Panel slide transitions are reduced to 50ms (no opacity change)
  - No new animations introduced

## Blocked by

- Issue 31: Viewport, Breakpoints & Scroll Fix
- Issue 32: Panel Toggle System — Composable, Component & Animations
- Issue 33: Voice Selector — Floating-UI Dropdown
- Issue 34: Speed Slider — Mobile Stepper Buttons
- Issue 35: Audio Player Panel — Responsive Layout
- Issue 36: Waveform Canvas — DPR Awareness
