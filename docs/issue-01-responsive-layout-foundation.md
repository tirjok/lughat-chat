# Issue 1: Foundation — Restructure Two-Panel Layout (Column ↔ Row)

## What to build

Restructure the two-panel layout to switch between a column layout on mobile (stacked panels, 45dvh Control Deck + remaining Canvas) and a row layout on desktop (side-by-side panels). Body is locked (`overflow-hidden`), each panel scrolls internally. Safe area insets applied.

> **Note on Control Deck height**: The PRD text says 40dvh, but the actual reference prototype HTML (`frontend/docs/new-design/lughat_chat_studio.html`) uses `h-[45dvh]`. Since the PRD states "the reference prototype defines the exact responsive layout," 45dvh from the prototype takes precedence over the 40dvh mentioned in the PRD text.

## Acceptance criteria

### Body container
- [ ] Body uses `flex flex-col md:flex-row h-dvh w-full overflow-hidden` (was `flex h-screen w-screen`)
  - Reference prototype: `flex flex-col md:flex-row h-[100dvh] w-full text-studio-text antialiased bg-studio-900 overflow-hidden relative`
  - UnoCSS `h-dvh` replaces `h-[100dvh]` (works in jsdom tests)

### Control Deck (`<aside>`)
- [ ] Width: `w-full md:w-[35%] lg:w-[30%] xl:w-[25%]` (current: `md:w-[30%] lg:w-[25%]` — missing `xl` breakpoint, wrong `md` value)
  - Widths must add to 100% with Canvas: 35+65, 30+70, 25+75
- [ ] Height: `h-[45dvh]` on mobile (from reference prototype), `md:h-full` on desktop (was `h-full` — no 45dvh split)
- [ ] Border: `border-t` on mobile (horizontal divider), `md:border-t-0 md:border-r` on desktop (vertical divider between panels)
- [ ] Shadow: `shadow-[0_-10px_30px_rgba(0,0,0,0.4)]` on mobile (floating above Canvas — matches PRD User Story 25), `md:shadow-2xl` on desktop
- [ ] Order: `order-2 md:order-1` (swaps on mobile — Canvas above Control Deck)
- [ ] **Reference prototype also includes**: `shrink-0` (prevents Control Deck from shrinking below 45dvh on small viewports), `transition-all duration-300` (smooth panel transitions)
- [ ] Current code: `w-full md:w-[30%] lg:w-[25%] bg-studio-800 border-r border-studio-700 flex flex-col h-full z-20 shadow-2xl md:overflow-y-auto` — needs all of the above

### Canvas (`<main>`)
- [ ] Order: `order-1 md:order-2` (swaps on mobile — Canvas above Control Deck)
- [ ] Overflow: `overflow-hidden` on mobile (was `overflow-y-auto` — currently scrolls body instead of containing), `md:overflow-hidden` on desktop (existing)
- [ ] Width: `flex-1` (fills remaining space after Control Deck) — or explicitly `md:w-[65%] lg:w-[70%] xl:w-[75%]` (current: `md:w-[70%] lg:w-[75%]`, missing `xl`)
  - Reference prototype uses `flex-1` (relative to Control Deck width)
- [ ] **Border**: `md:border-l` (vertical divider on desktop — the reference prototype applies the border to the Canvas, not the Control Deck)
- [ ] **Padding**: Canvas header needs responsive padding `p-4 md:p-6 lg:p-8 pb-2 md:pb-4` (current: `p-6 pb-4` — no responsive padding)
- [ ] Current code: `w-full md:w-[70%] lg:w-[75%] bg-studio-900 relative flex flex-col h-full overflow-y-auto md:overflow-hidden` — needs all of the above

### Safe area insets
- [ ] Mobile header (new, Issue 2): `padding-top: env(safe-area-inset-top)` (applied to the new mobile header, NOT the body — known overflow issue on this project)
- [ ] Canvas: `padding-bottom: env(safe-area-inset-bottom)` (already in current code — preserved)

### Desktop header (Control Deck inner `<header>`)
- [ ] Hidden on mobile via `hidden md:flex` (PRD: "The desktop header remains unchanged and is hidden on mobile")
  - Reference prototype: `<div class="hidden md:flex p-6 border-b border-studio-700 justify-between items-center bg-gradient-to-b from-[#1f1f1f] to-transparent shrink-0">`
  - Current code has no responsive visibility class — always visible, causing duplicate headers on mobile

### Mobile textarea font (from reference prototype)
- [ ] Reference prototype uses: `text-2xl md:text-4xl lg:text-5xl leading-relaxed md:leading-[1.6]`
  - Mobile: `text-2xl` (smaller than current `text-3xl` — fits in reduced Canvas space when Control Deck takes 45dvh)
  - Desktop: `md:text-4xl lg:text-5xl` (not `text-5xl` at md — the prototype has a `lg:text-5xl` breakpoint)
  - Line height: `leading-relaxed` universally, `md:leading-[1.6]` on desktop (the prototype adds `md:leading-[1.6]` for desktop readability)
  - Current code: `text-3xl md:text-5xl leading-relaxed` — needs updating to match prototype

### Audio player (for Issue 5 reference)
- [ ] Reference prototype audio player uses: `fixed bottom-0 right-0 w-full md:w-[65%] lg:w-[70%] xl:w-[75%] bg-studio-800 border-t md:border-l border-studio-700 p-4 md:p-6 flex flex-col gap-3 md:gap-4 hidden-slide transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] z-50 shadow-[0_-15px_40px_rgba(0,0,0,0.6)]`
  - Key values for Issue 5: `ease-[cubic-bezier(0.16,1,0.3,1)]` (easing), `shadow-[0_-15px_40px_rgba(0,0,0,0.6)]` (shadow), `border-t md:border-l` (borders)

### Toast container (for Issue 6 reference)
- [ ] Reference prototype: `fixed top-20 md:top-4 left-4 right-4 md:left-auto md:w-80 z-50 flex flex-col gap-2 pointer-events-none`
  - Key value for Issue 6: `pointer-events-none` on container (click-through to panels below)

### Test updates
- [ ] All existing tests updated (`index.test.ts`: `h-screen` → `h-dvh`, `overflow-y-auto` → `overflow-hidden`, `flex h-screen w-screen` → `flex flex-col md:flex-row`)
- [ ] Tests asserting `aside/main` order updated (Control Deck `order-2 md:order-1`, Canvas `order-1 md:order-2`)
- [ ] Tests asserting `md:w-[30%]` → `md:w-[35%]`, `md:w-[70%]` → `md:w-[65%]`, missing `xl:w-[25%]` / `xl:w-[75%]`
- [ ] Tests asserting `h-full` → `h-[45dvh]` on mobile (Control Deck)
- [ ] Tests asserting `overflow-y-auto` → `overflow-hidden` on body (Canvas)
- [ ] `./run-tests.sh` passes (lint + typecheck + tests)

## Blocked by

None — can start immediately.
