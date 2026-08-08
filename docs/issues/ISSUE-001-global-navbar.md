# ISSUE-001: Create GlobalNavbar Component with Route-Aware Active State and Progress Bar

**Spec Reference:** `docs/workflows/WORKFLOW-multi-page-spa-routing.md` (Steps 1, 5; ADR-001)
**Dependencies:** None (foundation issue — must be implemented first)
**Scope:** Frontend only (`frontend/app/components/GlobalNavbar.vue`)

---

## Problem

LughatChat has no navigation chrome. `app.vue` renders a bare `<NuxtPage />` with no navbar. The product is transitioning to a multi-page platform (TTS Studio + Dashboard + Lessons) and needs a shared top navigation bar.

## Acceptance Criteria

### AC-1: Component exists and renders on all pages
- `frontend/app/components/GlobalNavbar.vue` is created
- It renders on `/`, `/dashboard`, and `/dashboard/level/{level}/{lesson}` (once those pages exist)
- It does NOT render on 404 pages (Nuxt default 404 route)

### AC-2: Desktop layout — top bar (56px)
- Logo text "LughatChat" links to `/` via `<NuxtLink to="/">`
- Navigation links present: **Home** (to `/`), **Dashboard** (to `/dashboard`), **My Courses** (to `/dashboard`)
- Each link uses `<NuxtLink>` (not `navigateTo()`)
- Action buttons present: "Ask Instructor" and "Settings" (can be placeholders — icons only)
- User avatar placeholder rendered (circle div, no image)
- Top bar height is `h-14` (56px)

### AC-3: Desktop layout — progress bar (4px)
- Below top bar, a full-width progress bar (height `h-1` / 4px)
- Dynamic fill based on lesson progress (when on a lesson page)
- On non-lesson pages (`/` and `/dashboard`), progress bar shows 0% fill (or is hidden)

### AC-4: Route-aware active link highlighting
- When on `/`, the **Home** link is visually highlighted (active state)
- When on `/dashboard`, the **Dashboard** link is visually highlighted
- When on `/dashboard/level/{level}/{lesson}`, the **My Courses** link is visually highlighted
- Active state uses Nuxt's `useRoute()` composable to compare `route.path` with link targets
- Uses `<NuxtLink>`'s built-in `active-class` or manual class binding

### AC-5: Mobile layout (< 768px)
- Navbar collapses to a compact bar
- Logo + 2-3 key navigation icons visible
- Action buttons hidden inside a dropdown menu (triggered by icon button)
- Touch targets meet WCAG 44px minimum
- Height may increase to `h-16` (64px) on mobile for touch accessibility

### AC-6: Does NOT use `navigateTo()` for navigation
- All navigation uses `<NuxtLink>` — this ensures `onBeforeRouteLeave` guards fire consistently (ADR-001, Assumption A1)

---

## Test Cases Covered

| Spec Test | How Verified |
|---|---|
| TC-01: Happy path — navigate to Dashboard | Clicking "Dashboard" link highlights correctly; component renders on `/dashboard` |
| TC-02: Happy path — navigate to Lesson page | Clicking "My Courses" link highlights correctly; component renders on lesson pages |
| TC-07: Direct URL navigation | Navbar renders with correct active state on direct URL entry |

## ADR References

- **ADR-001** (Shared Layout with Global Navbar): Defines the component structure — top bar (56px) + progress bar (4px), mobile collapse behavior
- **ADR-002** (Multi-Page SPA Routing): Defines the three route groups that the navbar must navigate between

## Files

- `frontend/app/components/GlobalNavbar.vue` (new)
- Component test: `frontend/tests/GlobalNavbar.test.ts`
