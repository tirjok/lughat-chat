# Issue 33: Voice Selector — Floating-UI Dropdown

## What to build

Replace the current Teleport-based manual positioning of the VoiceSelector dropdown with `@floating-ui/vue` for robust, responsive positioning. The dropdown should stay within the visible viewport on narrow screens, flip direction when near edges, and manage focus trapping and outside-click dismissal automatically.

After this is complete, the voice selector dropdown works reliably on phones, tablets, and desktops without overflowing off-screen.

## Acceptance criteria

- [ ] `@floating-ui/vue` package installed and added to `package.json`
- [ ] `VoiceSelector.vue` uses `@floating-ui/vue`'s `useFloating` composable:
  - Handles viewport bounds — dropdown repositions when near edges
  - Flips direction (top/bottom) when near viewport edges
  - Manages focus trapping within the dropdown menu
  - Handles outside-click dismissal (no manual `mousedown` listener needed)
- [ ] Dropdown menu constrained with `max-width: calc(100vw - 32px)` to prevent overflow on narrow screens
- [ ] Each voice option has minimum 48px height for touch targets
- [ ] Existing functionality preserved: voice selection, preview toast, color coding (orange/magenta)
- [ ] Dropdown renders as a portal (teleported to body) — no layout shift in the Control Deck
- [ ] Touch-friendly: tap to select a voice closes the dropdown

## Blocked by

- Issue 31: Viewport, Breakpoints & Scroll Fix
