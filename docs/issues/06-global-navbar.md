# Issue: Unify GlobalNavbar Across All Pages

**PRD Reference:** VISUAL_UNIFY.md — User Story #14, Implementation: "GlobalNavbar consistency"

**Type:** Component Update

**Estimated Effort:** 2-3 hours

---

## Problem

The `GlobalNavbar` currently renders correctly on dashboard pages but has inconsistencies:

1. **Logo treatment:** On the home page (`DesktopPanels.vue`), the logo uses `ph-fill ph-waves text-primary-500` with `text-gold-500` for "Chat" — but on the dashboard navbar it uses `text-primary-500` for both parts ("LughatChat" in primary, not gold).
2. **Nav link active states:** Active/inactive states use `primary-600` and `primary-50` which may not be available with the current 2-level token set.
3. **Progress bar:** The 4px progress bar under the navbar renders correctly but may need width calculation improvements.
4. **Avatar:** Dashboard uses a `bg-stone-300` placeholder; the proto shows a gold gradient avatar.
5. **Logo icon:** Dashboard navbar uses `ph-waves` (outline) vs home page's `ph-fill ph-waves` (filled).

---

## Acceptance Criteria

1. **Logo consistency:** The GlobalNavbar renders the same logo treatment on all pages:
   - Icon: `ph-fill ph-waves text-primary-500` (filled waves icon)
   - "Lughat" in `text-stone-800` (light) / `text-stone-200` (dark)
   - "Chat" in `text-primary-500` (matching proto's gold treatment → update to `text-gold-500` if proto specifies gold)
2. **Nav link active states:** Active links use `text-primary-600 bg-primary-50` (requires extended tokens); inactive links use `text-stone-600 hover:text-stone-800`.
3. **Progress bar:** The 4px progress bar renders correctly on all pages with `bg-gradient-to-r from-primary-500 to-primary-600`.
4. **Route awareness:** The navbar correctly highlights the active route (`/`, `/dashboard`, `/dashboard/level/*`).
5. **Mobile navbar:** Mobile view (≤768px) renders the same logo, nav icons, and action buttons consistently.
6. **No visual regression on `/`:** The home page dark theme continues to show the navbar correctly (dark text on dark bg is fixed by the navbar's `dark:` variants).
7. `./run-tests.sh` passes.

---

## Proto Reference

From `docs/proto/lesson-details.html` lines 177-207:

```html
<nav class="bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-14">
      <!-- Logo: gradient icon background, text -->
      <!-- Nav links with hover:text-primary-700 -->
      <!-- Gold gradient avatar -->
    </div>
    <!-- Progress bar: h-1 bg-stone-100 -->
  </div>
</nav>
```

---

## Files Changed

- `frontend/app/components/GlobalNavbar.vue` (logo, nav links, progress bar)
- Potentially `frontend/app/components/DesktopPanels.vue` (if it has its own logo that should be removed)

---

## Dependencies

Requires: Issue #1 (extended tokens). Blocks: None (can be done in parallel).

---

## Tests

- **Logo rendering:** Verify GlobalNavbar renders logo with correct icon and text styling.
- **Nav links:** Verify active link has `text-primary-600 bg-primary-50`, inactive has `text-stone-600`.
- **Progress bar:** Verify 4px progress bar renders with `bg-gradient-to-r from-primary-500 to-primary-600`.
- **Route awareness:** Verify correct nav link is highlighted for `/`, `/dashboard`, and `/dashboard/level/*`.
- **Mobile:** Verify mobile navbar renders correctly at ≤768px.
