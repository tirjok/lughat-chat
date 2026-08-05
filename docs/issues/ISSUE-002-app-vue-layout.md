# ISSUE-002: Update app.vue Layout to Wrap NuxtPage with GlobalNavbar

**Spec Reference:** `docs/workflows/WORKFLOW-multi-page-spa-routing.md` (Prerequisites; ADR-001)
**Dependencies:** ISSUE-001 (GlobalNavbar must exist)
**Scope:** Frontend only (`frontend/app/app.vue`)

---

## Problem

Current `app.vue` renders a bare `<NuxtPage />` with no chrome:

```vue
<div>
  <NuxtPage />
</div>
```

The multi-page platform needs a shared layout wrapper that includes the `GlobalNavbar` on every page.

## Acceptance Criteria

### AC-1: Layout restructuring
- `app.vue` wraps `<NuxtPage />` inside a layout that includes `<GlobalNavbar />`:
  ```vue
  <template>
    <div class="min-h-screen bg-stone-50 dark:bg-stone-900">
      <GlobalNavbar />
      <NuxtPage />
    </div>
  </template>
  ```
- Uses UnoCSS utility classes for background (`bg-stone-50` light / `bg-stone-900` dark)
- `GlobalNavbar` renders above `<NuxtPage />` (not inside it)

### AC-2: SEO title inheritance
- Root `app.vue` sets base title via `useSeoMeta` or `useHead`
- Per-page `useSeoMeta` appends to base title (e.g., "LughatChat - Dashboard")
- Produces consistent `LughatChat - [page]` titles across all pages

### AC-3: No regression on existing `/` page
- TTS Studio renders identically (modulo navbar chrome) after this change
- All existing functionality on `/` is preserved
- No new composables imported that were not already used

## Test Cases Covered

| Spec Test | How Verified |
|---|---|
| (Implicit in all TCs) | Every page renders with navbar present |

## ADR References

- **ADR-001** (Shared Layout with Global Navbar): Defines the exact wrapper structure — `app.vue` wraps `<NuxtPage />` with `<GlobalNavbar />`

## Files

- `frontend/app/app.vue` (modified)
