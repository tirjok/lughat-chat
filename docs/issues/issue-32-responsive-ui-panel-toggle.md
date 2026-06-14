# Issue 32: Panel Toggle System — Composable, Component & Animations

## What to build

Add a panel toggle system for mobile/tablet screens. On desktop, both panels (Control Deck + Canvas) remain visible as before. On mobile/tablet (<768px), users switch between seeing the Control Deck or the Canvas via a floating action button (FAB) in the bottom-right corner.

After this is complete, a mobile user can toggle between voice settings and text input, with smooth slide-up animations, proper focus management, and screen reader announcements.

## Acceptance criteria

- [ ] `usePanelToggle.ts` composable created:
  - Returns `activePanel` (`'control-deck' | 'canvas'`), `togglePanel()`, and computed `isMobile` (based on window width < 768px)
  - On desktop (≥768px), `isMobile` is always `false` and both panels are always visible (no-op)
  - Handles focus management via `await nextTick()` + `$focus()` on the first interactive element in the switched panel
- [ ] `PanelToggle.vue` component created:
  - Renders as a FAB (bottom-right corner) visible only below `md:` (768px)
  - When in Canvas mode: shows `lucide:sliders-horizontal` icon with label "Voice settings"
  - When in Control Deck mode: shows `lucide:terminal` icon with label "Text editor"
  - Has `aria-label` that swaps based on active panel
  - Has `min-w-[48px] min-h-[48px]` touch target (WCAG compliant)
  - Hidden on desktop (`hidden md:block` → actually visible only below md)
- [ ] Panel transitions use slide-up animation (CSS `transform: translateY`):
  - Outgoing panel slides upward and fades out (150ms, `ease-out`)
  - Incoming panel slides up from the bottom (150ms, `ease-out`)
  - Defined in `main.css` as `@keyframes slide-up` and `@keyframes fade-out`
- [ ] Live region (`role="status"`) announces panel changes to screen readers
- [ ] Each panel wrapped in `role="region"` with `aria-labelledby` pointing to the panel name
- [ ] `index.vue` integrates `usePanelToggle`: wraps panels, conditionally shows/hides based on `activePanel`
- [ ] Initial panel state is `'control-deck'` (voice settings visible first)

## Blocked by

- Issue 31: Viewport, Breakpoints & Scroll Fix
