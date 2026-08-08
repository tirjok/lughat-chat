# Issue: Convert Dashboard Tabs to Pill-Style Navigation

**PRD Reference:** VISUAL_UNIFY.md — Solution #3 (tab navigation), User Story #6, Implementation: "Tab navigation standardization"

**Type:** Component Update

**Estimated Effort:** 2-3 hours

---

## Problem

The lesson page (`[lesson].vue`) renders section tabs with an **underline-style** design:

```html
<div class="flex flex-wrap gap-2 border-b border-stone-200">
  <button class="px-4 py-2 text-sm font-medium border-b-2 transition-colors">
    <!-- Active: border-primary-500 text-primary-600 -->
    <!-- Inactive: border-transparent text-stone-500 -->
  </button>
</div>
```

The design proto specifies **pill-style** tabs: a `bg-stone-100 rounded-xl p-1.5 flex flex-wrap gap-1` container with individual `rounded-lg` buttons, where the active tab has `bg-white text-primary-700 box-shadow`.

---

## Acceptance Criteria

1. **Tab container:** Changed from `border-b` style to `bg-stone-100 rounded-xl p-1.5 flex flex-wrap gap-1`.
2. **Tab buttons:** Each tab is an individual `rounded-lg` button with:
   - **Inactive:** `text-stone-600 hover:text-stone-800` (no background change)
   - **Active:** `bg-white text-primary-700 shadow-sm` (matches proto `.tab-active` class)
3. **Responsive:** Tabs wrap properly on mobile (`flex-wrap` + `min-w` per tab).
4. **Functionality preserved:** Clicking a tab updates `activeSection` and the content panel updates accordingly.
5. **ARIA:** `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls` are preserved.
6. `./run-tests.sh` passes.

---

## Proto Reference

From `docs/proto/lesson-details.html` lines 286-311:

```html
<div class="bg-stone-100 rounded-xl p-1.5 flex flex-wrap gap-1">
  <button class="tab-btn tab-active flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-medium ...">
    <!-- Active: bg-white text-primary-700 box-shadow (via .tab-active) -->
    <!-- Inactive: text-stone-600 hover:text-stone-800 -->
  </button>
</div>
```

---

## Files Changed

- `frontend/app/pages/dashboard/level/[level]/[lesson].vue` (tab section only — template rewrite)

---

## Dependencies

Blocks: None (can be done in parallel with other dashboard-only changes).

---

## Tests

- **Tab rendering:** Verify the tab container has `bg-stone-100 rounded-xl p-1.5`.
- **Active tab:** Verify the active tab has `bg-white text-primary-700`.
- **Inactive tab:** Verify inactive tabs have `text-stone-600`.
- **Interaction:** Verify clicking a tab updates the active section and content panel.
