# Title: Navbar does not highlight the current page — 'Home' is always active

## Status

**FIXED** — Resolved 2026-08-09 via route plugin + reactive `app.vue`.

## What happened

The top navigation bar highlights 'Home' as the active link regardless of which page you are on. Neither 'Dashboard' nor 'My Courses' ever show as active. On the TTS Studio (home) page, 'Home' is correctly highlighted — but navigating to /dashboard or any lesson page does not update the active state.

## What I expected

The navbar should visually indicate which page is currently active:
- On / (TTS Studio): 'Home' highlighted
- On /dashboard: 'Dashboard' highlighted
- On /dashboard/level/{level}/{lesson_id}: 'My Courses' highlighted (and possibly 'Dashboard' too)

## Steps to reproduce

1. Open the app and navigate to / — observe that 'Home' is highlighted (this part works).
2. Click 'Dashboard' in the navbar to go to /dashboard — observe that 'Home' remains highlighted and 'Dashboard' does not.
3. Navigate to any lesson page (e.g. /dashboard/level/a1/1) — observe that 'Home' still remains highlighted and 'My Courses' does not activate.

## Additional context

### Root cause

`app.vue` read the current path from the Nuxt app instance (`useNuxtApp().route.path`) during component setup. This captured a **snapshot** of the route at mount time — which was always `'/'` since GlobalNavbar renders once in `app.vue` (outside `<router-view>`). The `currentPath` was never reactive, so `isActive('/')` always returned true and all other route checks always returned false.

### Fix applied

**Two files changed:**

1. **`app/plugins/route.ts`** — New plugin that calls `useRoute()` (available in plugin context) and exposes it via `nuxtApp.provide('route', route)`. This makes the reactive route available to all components.

2. **`app/app.vue`** — Replaced the snapshot-based `useNuxtApp().route.path` with `tryUseNuxtApp().$route` (injected from the plugin). Falls back to `useRoute()` when no plugin is available (e.g. in tests). The `currentPath` is now a `computed(() => route.path)` that updates on every navigation.

When the user navigates, `app.vue` re-renders with the updated reactive `currentPath`, which flows as a prop to `GlobalNavbar`, updating all active-state highlights.

Additionally, the mobile navigation was redesigned with a hamburger menu, proper Phosphor icons, and a floating glass pill layout (high-end-visual-design).
