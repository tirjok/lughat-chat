# Issue 8: `.hide-scrollbar` CSS Utility

## What to build

Add the `.hide-scrollbar` CSS utility class to `index.vue` `<style>` block. This prevents scrollbar visibility on horizontal toolbars while maintaining scroll functionality. Needed for future AI toolbar implementation (per PRD Custom CSS section: "`.hide-scrollbar` — Missing — add now (needed for future AI toolbar)").

### Reference Prototype HTML (exact CSS):
```css
.hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
.hide-scrollbar::-webkit-scrollbar {
    display: none;
}
```

Note: Prototype uses `-ms-overflow-style: none` (not `-moz-scrollbars-none`). This works for Firefox too.

## Acceptance criteria

- [ ] `.hide-scrollbar` class added to `index.vue` `<style>` block (matching prototype exactly)
- [ ] Hides scrollbars (`-ms-overflow-style: none`, `scrollbar-width: none`)
- [ ] WebKit browsers: `-webkit-scrollbar { display: none }`
- [ ] Scroll functionality is preserved (content still scrolls, just no scrollbar visible)
- [ ] Class is available for use in future components (AI toolbar — prototype has `overflow-x-auto hide-scrollbar` on AI toolbar buttons)
- [ ] No visual regressions on existing components

## Blocked by

None — can start immediately (independent of layout changes).
