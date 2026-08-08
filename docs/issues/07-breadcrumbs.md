# Issue: Add Breadcrumb Navigation with SVG Chevron Separators

**PRD Reference:** VISUAL_UNIFY.md — User Story #7, Implementation: "Breadcrumb navigation with SVG chevron separators"

**Type:** Component Update

**Estimated Effort:** 1-2 hours

---

## Problem

The lesson detail page (`[lesson].vue`) already has breadcrumb navigation, but it uses plain text `›` separators (`text-stone-400`) instead of SVG chevron separators as defined in the proto. The proto specifies:

```html
<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
</svg>
```

Additionally, the current breadcrumbs use `hover:underline` instead of `hover:text-primary-700` for the hover state.

The dashboard index page and dashboard page don't have breadcrumbs at all.

---

## Acceptance Criteria

1. **SVG chevron separators:** Replace the `›` text separator with an SVG chevron (`M9 5l7 7-7 7`) — `w-4 h-4`, `text-stone-400`.
2. **Breadcrumb links:** Use `text-primary-600 hover:text-primary-700` (not `hover:underline`) for clickable breadcrumb items.
3. **Current page:** The last breadcrumb (current page) renders as `text-stone-500` (non-clickable).
4. **Container:** Breadcrumbs use the page's `max-w-7xl` container (currently `max-w-6xl`).
5. **Dashboard pages:** Add breadcrumbs to the dashboard index page (`dashboard.vue`) and level index page (`[level]/index.vue`) where appropriate (Dashboard → Level → Lesson hierarchy).
6. **Responsive:** Breadcrumbs wrap gracefully on mobile.
7. `./run-tests.sh` passes.

---

## Proto Reference

From `docs/proto/lesson-details.html` lines 211-218:

```html
<nav class="flex items-center gap-2 text-sm text-stone-500">
  <a href="#" class="hover:text-primary-700 transition">Dashboard</a>
  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
  </svg>
  <a href="#" class="hover:text-primary-700 transition">Level A1</a>
  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
  </svg>
  <span class="text-stone-800 font-medium">Lesson 1</span>
</nav>
```

---

## Files Changed

- `frontend/app/pages/dashboard/level/[level]/[lesson].vue` (breadcrumb section)
- `frontend/app/pages/dashboard.vue` (add breadcrumbs)
- `frontend/app/pages/dashboard/level/[level]/index.vue` (add breadcrumbs)

---

## Dependencies

Requires: Issue #1 (extended tokens), Issue #2 (container width).

---

## Tests

- **SVG chevrons:** Verify breadcrumb separators render SVG chevron paths (not text `›`).
- **Link styling:** Verify breadcrumb links have `text-primary-600 hover:text-primary-700`.
- **Current page:** Verify the last breadcrumb item is non-clickable with `text-stone-500`.
- **Dashboard pages:** Verify breadcrumbs appear on dashboard index and level index pages.
