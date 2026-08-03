# ADR-002: Multi-Page SPA Routing Structure

**Status:** Accepted
**Date:** 2026-08-03
**Context:** `docs/requirements/navigation-dashboard.md` (D2, D3, D4, R-8, R-9)

---

## Context

LughatChat currently uses **file-based routing** with a single page: `app/pages/index.vue` maps to `/`. The entire application — TTS Studio with all 11 customer journeys — lives in one 751-line page file with 8 composables and 9 components. There are no other routes.

- **Dashboard** at `/dashboard` → `app/pages/dashboard.vue`
- **Dashboard sub-routes** at `/dashboard/level/{level}` and `/dashboard/level/{level}/{lesson}` → `app/pages/dashboard/level/[level]/index.vue` and `app/pages/dashboard/level/[level]/[lesson].vue`
- **TTS Studio** stays at `/` (unchanged functionality, adapted layout)

This shifts the application from a single-page TTS Studio to a multi-page Language Learning Platform. The existing routing model (one file, one route) must accommodate hierarchical, parameterized routes alongside the existing root route.

## Decision

The application uses **Nuxt 4 file-based routing** to define three route groups:

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/pages/index.vue` | TTS Studio (existing, primary landing) |
| `/dashboard` | `app/pages/dashboard.vue` | Dashboard page shell (new) |
| `/dashboard/level/{level}` | `app/pages/dashboard/level/[level]/index.vue` | Dashboard filtered by level (new) |
| `/dashboard/level/{level}/{lesson}` | `app/pages/dashboard/level/[level]/[lesson].vue` | Specific lesson within a level (new, dynamic) |

The routing structure is:

```
app/pages/
├── index.vue                    → /
├── dashboard.vue                → /dashboard
└── dashboard/
    └── level/
        ├── [level]/
        │   ├── index.vue        → /dashboard/level/{level}
        │   └── [lesson].vue     → /dashboard/level/{level}/{lesson}
```

Key constraints:

- **D2:** TTS Studio stays at `/` — existing user journeys preserved, dashboard is secondary.
- **D3:** Dashboard at `/dashboard` — a flat Nuxt page file.
- **D4:** Dashboard sub-routes at `/dashboard/level/{level}` and `/dashboard/level/{level}/{lesson}` — nested dynamic routes under the dashboard, matching the hierarchical nature of language learning (level → lesson).
- **Deferred:** Backend SQLite for lesson progress (OQ-8), lesson JSON content (OQ-5), and new API endpoints (OQ-9) are out of scope for this phase. The page shells render placeholder content.

## Consequences

### What becomes easier

- **Adding new pages is a single file** — no router configuration, no route registration. Creating `app/pages/settings.vue` automatically creates a `/settings` route. This reduces friction for future feature additions.
- **SEO-friendly URLs** — `/dashboard`, `/dashboard/level/a1`, and `/dashboard/level/a1/1` are human-readable, bookmarkable, and indexable by search engines (when content is added). This supports future organic discovery of learning content.
- **Hierarchical dashboard routing** — `/dashboard/level/{level}/{lesson}` naturally encodes the curriculum structure (A1 → A2 → B1 → B2). Future lesson content can be filtered, searched, or linked using this structure.
- **Backward compatibility** — existing `/` users experience no change. The TTS Studio remains the default landing page, preserving all 11 existing customer journeys.

### What becomes harder

- **`nuxt.config.ts` `routeRules` must be updated** — the existing config prerenders only `/` (`'/': { prerender: true }`). New pages may need prerender rules (`/dashboard`, `/dashboard/level/**`) or must be excluded from prerendering (since lesson content is dynamic). This requires a tradeoff: prerendered pages load faster but can't show live progress; dynamic pages are slower to load but show real data.
- **Nginx SPA fallback must handle new routes** — the production Nginx config currently falls back `/` to `index.html`. With new routes (`/dashboard`, `/dashboard/level/a1`, `/dashboard/level/a1/1`), the SPA fallback must match all new routes: `try_files $uri $uri/ /index.html`. Failure to update this results in 404s on direct navigation or browser refresh at any dashboard sub-route.
- **Test suite must cover multiple pages** — the existing test suite targets `index.vue` exclusively. Adding `dashboard.vue`, `[level]/index.vue`, and `[lesson].vue` means new test files, new component tests, and potentially integration tests for cross-page navigation. The current single-page test assumptions (e.g., `onMounted` health polling on a single page) may not hold for multi-page navigation.
- **Route-level state management** — with multiple pages, composables that were scoped to a single page (e.g., `useHealthPoll`, `useAudioModule`) must be evaluated for cross-page persistence. If a user starts a synthesis on `/` and navigates to `/dashboard/level/a1/1`, does the audio continue? Does the health poll persist? These are implicit coupling concerns that the single-page model hid.
- **Nuxt 4 route groups and layout conflicts** — if future phases introduce layout-specific pages (e.g., a lesson page with a different sidebar), Nuxt 4's per-page layout system must be coordinated with the global `app.vue` layout. A page-level layout file (`app/pages/dashboard/level/[level]/[lesson].vue` with `definePageMeta({ layout: 'lesson' })`) would conflict with the global `GlobalNavbar` wrapper in `app.vue` unless explicitly handled.
- **Navigation guards and route leave** — the existing TTS Studio has an orphan file cleanup flow that fires on page leave (`onBeforeRouteLeave`). With multiple pages, this guard must distinguish between intra-platform navigation (where cleanup should fire) and external navigation (where it shouldn't). This adds conditional logic to an already complex component.
