# Issue: Update Status Indicators for Light-Mode Dashboard

**PRD Reference:** VISUAL_UNIFY.md — User Story #13, Implementation: "Status indicator light-mode variant"

**Type:** Component Update

**Estimated Effort:** 1-2 hours

---

## Problem

Both `ModelStatusIndicator.vue` (desktop) and `MobileStatusIndicator.vue` (mobile) are designed for a **dark studio theme**:

```html
<!-- Current (dark-mode) -->
<div class="flex items-center gap-2 rounded-full ring-1 ring-white/[0.06] px-2.5 py-1 bg-white/[0.02]">
  <div class="flex items-center gap-2 rounded-full bg-stone-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] px-3 py-1.5">
    <!-- Orange/green/red dots with glow shadows -->
    <!-- "Loading..." / "Ready" / "Error" text in gray-300 -->
  </div>
</div>
```

On the dashboard's `bg-stone-50` background, this pill is nearly invisible (white-on-white with subtle rings) and the text is unreadable (`text-gray-300` on light background).

The PRD calls for a light-mode variant that uses appropriate colors on a light background.

---

## Acceptance Criteria

1. **ModelStatusIndicator** gets a light-mode variant:
   - Outer shell: `bg-stone-100 ring-stone-200` (instead of `bg-white/[0.02] ring-white/[0.06]`)
   - Inner core: `bg-white` (instead of `bg-stone-900`), with `border-stone-200`
   - Status dots: Same colors (orange/green/red) but without glow shadows (or with subtle shadows appropriate for light bg)
   - Text: `text-stone-700` (instead of `text-gray-300`)
2. **MobileStatusIndicator** gets the same light-mode treatment (scaled down).
3. **Dark-mode unchanged:** When used on the dark home page (`DesktopPanels.vue`, `MobileSplitScreen.vue`), the indicator retains its current dark styling.
4. **No visual regression on `/`:** The home page's dark studio theme continues to show the dark-mode indicator correctly.
5. `./run-tests.sh` passes.

---

## Implementation Options

**Option A (preferred):** Add a `light` prop (`boolean`) to both components. When `light` is true, render light-mode classes. Dashboard pages pass `:light="true"`.

**Option B:** Create separate `LightModeModelStatusIndicator.vue` and `LightModeMobileStatusIndicator.vue` components.

**Option C:** Use CSS `@media (prefers-color-scheme: light)` — not recommended because the dashboard is always light regardless of system preference.

---

## Files Changed

- `frontend/app/components/ModelStatusIndicator.vue`
- `frontend/app/components/MobileStatusIndicator.vue`
- `frontend/app/pages/dashboard.vue` (pass `light` prop)

---

## Dependencies

Requires: Issue #1 (extended tokens for `stone-100`, `stone-200`).

---

## Tests
## Proto Reference

From `docs/proto/lesson-details.html`:

- **Status pill (ready):** `px-3 py-1 bg-green-400/90 rounded-full text-green-900 text-xs font-semibold flex items-center gap-1.5` with `w-1.5 h-1.5 bg-green-700 rounded-full` dot (line 233-235)
- **Level pill:** `px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-semibold tracking-wide` (line 231)
- **Lesson badge:** `px-3 py-1 bg-gold-400/90 rounded-full text-primary-900 text-xs font-semibold tracking-wide` (line 232)

---


- **Light mode:** Verify indicator renders with `bg-stone-100`, `bg-white`, `text-stone-700` when `light` prop is true.
- **Dark mode:** Verify indicator renders with `bg-stone-900`, `text-gray-300` when `light` prop is false (default).
- **Dashboard page:** Verify `ModelStatusIndicator` on `/dashboard` renders with light-mode styling.
