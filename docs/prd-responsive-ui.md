# PRD: Lughat Chat — Responsive UI Overhaul

## Problem Statement

Lughat Chat's Control Deck and Canvas are designed for desktop monitors only. On mobile devices (phones and tablets), the UI is unusable: content overflows off-screen, touch interactions conflict with page scrolling, the audio player blocks the text input, and there is no way to navigate between the Control Deck (voice selection, speed slider, generate button) and the Canvas (text input area). Users who want to generate speech on their phone cannot — the app is effectively desktop-only.

## Solution

Make the entire Lughat Chat frontend responsive across all viewport sizes (320px–1920px+) by:

1. Adding a viewport meta tag and fixing the root scroll behavior so mobile browsers render correctly
2. Introducing a panel toggle system on small screens (mobile/tablet) so users can switch between the Control Deck and Canvas, rather than seeing both stacked vertically
3. Adapting all components (voice selector dropdown, speed slider, audio player panel, character counter) to work with touch input and narrow viewports
4. Adding safe-area-inset padding for notched phones (iPhone notch, Android navigation bar)
5. Ensuring all touch targets meet WCAG minimums (44×44px) on mobile
6. Hiding desktop-only elements (keyboard shortcut hint) on touch devices

The existing two-panel layout (`aside` = Control Deck, `main` = Canvas) is preserved on desktop. On mobile/tablet, the panels become a single-column view with a toggle mechanism.

## User Stories

1. As a mobile user, I want the page to render at the correct scale on my phone so that text and buttons are readable without pinching or zooming
2. As a mobile user, I want to scroll the text input area when my Arabic text is longer than the screen so that I can see and edit all of it
3. As a mobile user, I want to toggle between the Control Deck and the Canvas so that I can access voice settings without them blocking my text input
4. As a mobile user, I want the Control Deck to appear full-screen on my phone so that all controls are easy to see and tap
5. As a mobile user, I want the Canvas (text input) to appear full-screen on my phone so that I have maximum space for writing Arabic text
6. As a mobile user, I want a visible toggle button (hamburger or back arrow) so that I know how to switch between panels
7. As a mobile user, I want the voice selector dropdown to stay within the visible screen area so that I can see and tap all available voices
8. As a mobile user, I want to scroll the page without accidentally triggering the speed slider so that my scrolling isn't hijacked
9. As a mobile user, I want the audio player to stack vertically (play button above waveform) so that the waveform has enough width to be visible
10. As a mobile user, I want the character counter and clear button to fit on my narrow screen so that I can see my text length limit
11. As a mobile user, I want all buttons to be at least 44×44px so that I can tap them reliably with my finger
12. As a mobile user, I want the page to respect my phone's notch and home indicator so that content isn't hidden behind hardware features
13. As a tablet user, I want the layout to adapt to landscape orientation so that horizontal space is used efficiently
14. As a tablet user in portrait, I want the same panel toggle behavior as mobile so that the experience is consistent
15. As a desktop user, I want the existing two-panel layout to remain unchanged so that my workflow isn't disrupted
16. As a desktop user, I want the keyboard shortcut hint (Ctrl+Enter) to remain visible so that I know about the shortcut
17. As a mobile user, I want the keyboard shortcut hint to be hidden so that it doesn't waste my limited screen space
18. As a user with motion sensitivity, I want animations (spinners, pulse-glow) to be reduced or disabled so that they don't cause discomfort
19. As a mobile user, I want the waveform canvas to look sharp on my high-DPI screen so that it doesn't appear blurry
20. As a user switching between portrait and landscape on my tablet, I want the layout to reflow smoothly without content jumping or clipping
21. As a mobile user, I want the audio player to be dismissible so that it doesn't permanently block my text input
22. As a mobile user, I want the generate button to be easily reachable with my thumb so that I can trigger synthesis without scrolling
23. As a user on any device, I want the app to pass basic accessibility checks (touch targets, contrast, focus order) so that it works for more people
24. As a QA tester, I want to verify responsive behavior across known device breakpoints so that regressions are caught early

## Implementation Decisions

### Layout Architecture
- The existing two-panel layout (`aside` + `main`) is preserved on desktop (≥768px / `md:` breakpoint)
- On mobile/tablet (<768px), the layout switches to a single-panel mode with a toggle system
- A new `usePanelToggle` composable manages the active panel state (`'control-deck' | 'canvas'`) on small screens
- On desktop, the composable is a no-op (both panels always visible)

### Breakpoint Strategy
- Extend UnoCSS theme breakpoints to include phone-specific sizes:
  - `xs`: 375px (small phones like iPhone SE)
  - `sm`: 414px (large phones like iPhone 14 Pro Max)
  - `md`: 768px (existing — tablets portrait, boundary for panel toggle)
  - `lg`, `xl`, `2xl`: unchanged from presetWind3 defaults
- The panel toggle activates below `md:` (768px), covering both phones and tablets in portrait

### Panel Toggle Component
- A new `PanelToggle` component renders as a **floating action button (FAB)** in the bottom-right corner on mobile/tablet
- When in Canvas mode, the toggle shows a "back to controls" icon (`lucide:sliders-horizontal` with label "Voice settings")
- When in Control Deck mode, the toggle shows a "to editor" icon (`lucide:terminal` with label "Text editor")
- The toggle is hidden on desktop (visible only below `md:` / 768px)
- Panel transitions use a **slide-up animation** (CSS `transform: translateY`) — the outgoing panel slides upward and fades out (150ms, `ease-out`), the incoming panel slides up from the bottom (150ms, `ease-out`)
- **Focus management:** When a panel switches, `nextTick()` is used followed by `$focus()` on the first interactive element in the new panel (consistent with ADR-001 pattern). A live region (`role="status"`) announces the panel change to screen readers.
- **Accessibility:** The FAB has `aria-label` that swaps based on active panel. Each panel is wrapped in `role="region"` with `aria-labelledby` pointing to the panel name. The toggle button itself has `min-w-[48px] min-h-[48px]` for WCAG compliance.

### Viewport and Scroll Fixes
- Add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` to `nuxt.config.ts` → `app.head`
- Replace `overflow: hidden` on root with a scrollable container that allows the textarea to overflow naturally
- The Control Deck `aside` gets `overflow-y-auto` for scrollable controls on small screens
- The Canvas `main` gets `overflow-y-auto` for scrollable text input on small screens

### Safe Area Insets
- Add `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`, etc. to body padding
- The Control Deck header accounts for `safe-area-inset-top` (notch area)
- The Generate button area accounts for `safe-area-inset-bottom` (home indicator on iPhones)

### Touch Target Sizing
- All interactive buttons on mobile are minimum 44×44px (UnoCSS: `min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto`)
- The clear button, close button, and download button in the audio player are enlarged on mobile

### Audio Player Panel
- On mobile (<768px): stacks vertically — play button on top, waveform below, duration inline
- On desktop (≥768px): existing horizontal layout preserved — play button | waveform | duration
- The slide-up transition is adjusted so the player doesn't cover the entire textarea on mobile

### Voice Selector Dropdown
- On narrow screens, the dropdown menu uses `max-width: calc(100vw - 32px)` to prevent overflow
- Uses **`@floating-ui/vue`** (portal-based popover) for robust positioning — handles viewport bounds, flips direction when near edges, and manages focus trapping and outside-click dismissal automatically
- Touch-friendly: each voice option has minimum 48px height

### Speed Slider
- On mobile (<768px): replaced with **stepper-style +/- buttons** flanking the speed value (e.g., `0.8`, `-`, `+`, `1.4`) — no slider on mobile, avoiding the `touch-action` conflict entirely
- On desktop (≥768px): existing horizontal slider preserved with `touch-action: pan-y` for touchpad users
- The speed value display is enlarged on mobile (`text-lg` → `text-xl`) for readability

### Waveform Canvas
- Canvas rendering respects `window.devicePixelRatio` for sharp display on Retina/HD screens
- The canvas is resized on window resize (already implemented, but DPR handling is added)

### Keyboard Shortcut Hint
- Hidden on mobile with `hidden sm:flex` (visible only from 414px and up)
- On mobile, the hint is replaced by an optional swipe gesture hint (out of scope for v1)

### Reduced Motion
- Add `@media (prefers-reduced-motion: reduce)` in global CSS to disable or slow down animations
- Spinners continue but at reduced speed; pulse-glow is disabled

### Testing Viewport Simulation
- Component tests use Vitest's jsdom environment with viewport resizing via `window.resizeTo()`
- Tests verify panel toggle behavior, dropdown positioning, and touch target sizes at different breakpoints
- **Additional test targets:**
  - `PanelToggle` component: renders with correct icon and `aria-label` for each active panel state; hidden on desktop widths
  - `usePanelToggle` composable: `isMobile` returns correct boolean at 375, 414, 768, 1024px; `togglePanel()` flips state; initial panel is `'control-deck'`
  - `index.vue` page: shortcut hint is hidden below `sm:`, visible at `sm:` and above; root container allows scroll
  - `AudioPlayerPanel` component: flex direction is `flex-col` on mobile widths, `flex-row` on desktop
  - `SpeedSlider` component: stepper buttons render on mobile widths, slider renders on desktop widths
  - `VoiceSelector` component: dropdown portal renders when triggered; voice options have min 48px height on mobile

### UnoCSS Configuration Changes
- Add custom breakpoints (`xs`, `sm`) via `extendTheme` in `uno.config.ts`
- Add responsive shortcuts for mobile-specific patterns (e.g., `mobile-card`, `touch-target`)
- No changes to existing desktop shortcuts

### Composables Added
1. **`usePanelToggle.ts`** — Manages active panel state on mobile/tablet; returns `activePanel`, `togglePanel()`, and a computed `isMobile` (based on window width). Handles focus management via `nextTick()` + `$focus()` on panel switch.
2. **`useSafeArea.ts`** — Returns CSS variable values for safe-area-inset; used in template style bindings

### Composables Modified
1. **`useAudioPlayer.ts`** — No interface changes; internal canvas resize logic updated for DPR
2. **`useInputValidation.ts`** — No changes (pure validation logic, viewport-independent)
3. **`useHealthPoll.ts`** — No changes (network-only, viewport-independent)
4. **`useTimeDisplay.ts`** — No changes (pure formatting, viewport-independent)
5. **`useTtsApi.ts`** — No changes (network-only, viewport-independent)
6. **`useVoices.ts`** — No changes (data-only, viewport-independent)

### Components Modified
1. **`index.vue`** — Root layout: viewport meta, scroll behavior, panel toggle integration, shortcut hint visibility
2. **`VoiceSelector.vue`** — Dropdown positioning via `useDropdownPosition`, touch-friendly option heights
3. **`SpeedSlider.vue`** — Touch action fixes, enlarged thumb on mobile
4. **`AudioPlayerPanel.vue`** — Responsive flex layout (column on mobile, row on desktop)
5. **`WaveformCanvas.vue`** — DPR-aware canvas sizing

### Components Added
1. **`PanelToggle.vue`** — Floating action button (FAB) for switching between Control Deck and Canvas on mobile/tablet. Renders with swap icon/label, ARIA labels, and 48px touch target. Hidden on desktop.

## Testing Decisions

### What makes a good test
- Test external, observable behavior: panel toggle state changes, dropdown visibility, touch target dimensions in rendered output
- Use jsdom with `window.innerWidth` manipulation to simulate different viewport sizes
- Test responsive class application: verify that elements have correct breakpoint-prefixed classes at different widths
- No need to test CSS rendering visually — tests verify class presence and DOM structure

### Modules to test
1. **`usePanelToggle` composable** — Unit tests: `isMobile` returns correct boolean at different widths; `togglePanel()` flips state; initial panel is `'control-deck'`
2. **`useDropdownPosition` composable** — Unit tests: returns correct position when trigger is centered; flips to top-aligned when near bottom of viewport
3. **`PanelToggle` component** — Component tests: renders toggle button; icon changes based on active panel; hidden on desktop widths
4. **`AudioPlayerPanel` component** — Component tests: flex direction is column on mobile widths, row on desktop; play button is visible and clickable
5. **`index.vue` page** — Component tests: shortcut hint is hidden on mobile widths; root container allows scroll

### Prior art
- Existing `tests/` directory has component tests for `ModelStatusIndicator`, composable unit tests, and setup files that mock Nuxt auto-imports
- The `vitest.component.config.ts` already mocks URL APIs and fetch — extend it for viewport simulation
- The `tests/setup.component.ts` file mocks `URL.createObjectURL` and `URL.revokeObjectURL` — add `window.innerWidth` / `window.resizeTo` mocks

### Test Viewport Breakpoints
Tests should verify behavior at these widths:
- `375px` — Small phone (iPhone SE), panel toggle active, shortcut hint hidden
- `414px` — Large phone (iPhone 14 Pro Max), panel toggle active, shortcut hint visible
- `768px` — Tablet portrait (boundary), panel toggle inactive, two-panel layout
- `1024px` — Laptop, desktop layout

## Out of Scope

- **Light mode / dark mode toggle** — The app is fixed dark theme; light mode is a separate feature
- **PWA / installability** — No service worker, manifest.json, or offline-first capabilities
- **Native mobile app** — This is a responsive web app, not a React Native / Flutter app
- **Voice preview playback** — The "preview voice" button in the dropdown is a placeholder (toast notification only)
- **Swipe gestures** — No swipe-to-switch-panels gesture; the toggle button is the primary interaction
- **Landscape-specific tablet layout** — Tablets in landscape keep the desktop two-panel layout (no special treatment)
- **Dynamic font scaling** — Arabic text size stays at `text-3xl` on mobile, `text-5xl` on desktop; no fluid typography
- **Accessibility audit** — WCAG AA compliance testing (contrast ratios, screen reader labels) is out of scope for this PRD
- **Backend changes** — No API modifications; all changes are frontend-only

## Further Notes

### Relationship to Existing PRD
This PRD extends the original Lughat Chat PRD (`docs/PRD.md`) which focused on core TTS functionality. The original PRD did not address responsive design — the app was built with a desktop-first assumption. This overhaul makes the existing UI accessible on mobile without changing any backend behavior or API contracts.

### Relationship to ADR-001
ADR-001 addresses audio playback timing with Vue refs in transitions. This PRD extends that pattern: `usePanelToggle` also uses `await nextTick()` for focus management when switching panels, and panel transitions (`slide-up`, `fade-out`) are defined in global CSS following the same animation layering approach.

### UnoCSS-Specific Notes
- `presetWind3` provides responsive variants via breakpoint prefixes (`sm:`, `md:`, etc.)
- Custom breakpoints are added via `extendTheme` in `uno.config.ts` — this merges with defaults rather than replacing them
- The existing shortcuts (`btn`, `card`, etc.) are desktop-oriented; new mobile-specific shortcuts will be added without modifying existing ones
- Custom animations are added via `presetWind3`'s `layers` system for panel slide transitions (`@keyframes slide-up`, `@keyframes fade-out`)

### Migration Path
- No breaking changes to existing components' props or emits
- The `usePanelToggle` composable is opt-in: the page component integrates it, but other components remain unchanged
- Desktop users see zero difference — all responsive changes are gated below `md:` (768px)
- The viewport meta tag addition is the only change that affects all users (including desktop), and it has no negative impact

### Testing in Docker
- The existing `run-tests.sh` script runs frontend tests via `pnpm test` (Vitest)
- Component tests run in jsdom, which simulates different viewport sizes via `window.innerWidth` manipulation
- No Docker changes needed — responsive UI is purely a frontend concern
- **New test setup additions:** `tests/setup.component.ts` extended to mock `window.innerWidth`, `window.resizeTo`, and `window.matchMedia` for breakpoint simulation
