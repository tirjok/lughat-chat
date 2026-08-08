# ADR-001: Shared Layout with Global Navbar

**Status:** Accepted
**Date:** 2026-08-03
**Context:** `docs/requirements/navigation-dashboard.md` (D5, R-1, R-3)

---

## Context

LughatChat currently operates as a single-page application with one route (`/`). The root component (`app.vue`) renders a bare `<NuxtPage />` with no chrome — the TTS Studio occupies the full viewport (`100vh`), and all UI elements (audio player, waveform, controls) live inside the single page component (`app/pages/index.vue`, 751 lines).

The product is evolving into a multi-page Language Learning Platform with three surface areas:

- TTS Studio at `/` (existing, primary landing)
- Dashboard at `/dashboard` (new)
- Lesson pages at `/level/{level}/{lesson_id}` (new)

Each page has different layout needs: the TTS Studio uses a two-panel layout, the dashboard uses a card grid, and lesson pages use a hero + tabs + content layout. Yet all share the same navigation needs: a global top bar with logo, navigation links, action buttons, and a per-lesson progress indicator.

## Decision

`app.vue` wraps `<NuxtPage />` inside a layout that includes a `<GlobalNavbar />` component:

```vue
<template>
  <div class="min-h-screen bg-stone-50 dark:bg-stone-900">
    <GlobalNavbar />
    <NuxtPage />
  </div>
</template>
```

The navbar is a **shared component** (`app/components/GlobalNavbar.vue`) that renders:

1. **Top bar** (`h-14` / 56px): Logo + "LughatChat" (links to `/`), action buttons (Ask Instructor, Settings), user avatar placeholder.
2. **Progress bar** (`h-1` / 4px): Below top bar, full-width, dynamic fill based on lesson progress.

On mobile (`< 768px`), the navbar collapses to a compact bar with logo + 2-3 key nav icons, action buttons in a dropdown, and potentially increased height (`h-16`) for WCAG 44px touch targets.

The existing TTS Studio page (`app/pages/index.vue`) adapts its panels to `calc(100vh - 60px)` to account for the navbar height.

## Consequences

### What becomes easier

- **Consistent navigation across all pages** — users never lose access to TTS Studio, Dashboard, or navigation links regardless of where they are.
- **Single source of truth for navigation** — adding a new page (e.g., `/settings`) requires updating only `GlobalNavbar.vue`, not every page.
- **Per-lesson progress visibility** — the progress bar persists across page navigation, giving users a constant visual cue of their learning state.
- **SEO title inheritance** — root `app.vue` sets the base title (`LughatChat`), per-page `useSeoMeta` appends (`TTS Studio`, `Dashboard`), producing consistent `LughatChat - [page]` titles.

### What becomes harder

- **TTS Studio layout regression** — panels lose ~60px of vertical space (56px top bar + 4px progress). On desktop, this is a `calc(100vh - 60px)` adjustment. On mobile, the navbar may grow to `h-16` (64px) plus safe-area insets, squeezing waveform display area further. This is a **permanent vertical space tax** on the existing primary product.
- **Every page must adapt its layout** — the TTS Studio's two panels currently fill `100vh` with `overflow: hidden` on the body. This must change to `overflow: visible` with a flex column wrapper, requiring CSS rewrites across `index.vue`, `AudioPlayerPanel.vue`, `WaveformCanvas.vue`, and potentially all components that reference viewport dimensions.
- **Mobile navbar complexity compounds existing mobile UX issues** — the current mobile layout (stacked panels with draggable divider) must now also handle a responsive navbar (collapsible icons, overflow dropdown). This doubles the mobile layout surface area and increases the risk of broken touch targets, overlapping elements, or inaccessible navigation on small screens.
- **GlobalNavbar must be aware of every page's state** — the active link highlighting requires route-aware logic (`useRoute` / `useNuxtApp`). The progress bar requires lesson-level state that may not exist on `/` or `/dashboard`. This couples the navbar to page-specific state, creating a hidden dependency chain.
- **Back button / browser navigation must be tested** — SPA navigation preserves history, but the navbar's active state must update on browser back/forward. This requires careful handling of Nuxt's router events.
- **Testing surface expands** — the existing test suite targets a single page. Adding a shared navbar means new component tests for `GlobalNavbar.vue`, new integration tests for cross-page navigation, and updated visual tests for the adapted TTS Studio layout.
