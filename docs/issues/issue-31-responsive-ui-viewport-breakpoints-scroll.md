# Issue 31: Viewport, Breakpoints & Scroll Fix

## What to build

Fix the foundational rendering issues that make the app unusable on mobile: add the viewport meta tag, extend UnoCSS breakpoints for phone-specific sizes, and fix the root scroll behavior so content can overflow instead of being clamped to the viewport.

After this is complete, the app renders at the correct scale on phones, has phone-specific breakpoints for responsive styling, and allows scrolling — all without changing any component logic.

## Acceptance criteria

- [x] `nuxt.config.ts` adds `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` to `app.head`
- [x] `uno.config.ts` extends breakpoints: `xs: 375px`, `sm: 414px` added via `extendTheme` (merges with presetWind3 defaults)
- [x] `index.vue` replaces `overflow-hidden` on root container with a scrollable container (allows textarea overflow)
- [x] `index.vue` sets `h-screen` → `h-dvh` (dynamic viewport height) or equivalent for mobile browser chrome
- [x] `main.css` adds safe-area-inset padding: `env(safe-area-inset-top)` on body/header, `env(safe-area-inset-bottom)` on generate button area
- [x] On mobile (<768px): `aside` gets `overflow-y-auto` for scrollable controls
- [x] On mobile (<768px): `main` gets `overflow-y-auto` for scrollable text input
- [x] Desktop (≥768px): existing two-panel layout is unchanged
- [x] Keyboard shortcut hint is hidden on mobile with `hidden sm:flex` (visible from 414px+)
- [x] `tests/setup.component.ts` extended to mock `window.innerWidth`, `window.resizeTo`, and `window.matchMedia`

## Blocked by

None - can start immediately

## Status

✅ **Complete** — All acceptance criteria met. All 249 tests pass, lint clean, typecheck clean.
