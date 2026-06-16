# Issue 3: Panel Sliding Transitions (Mobile Only)

## What to build

CSS slide animations for mobile panel switching. When panel toggle is used, the inactive panel slides away (`translateY(150%)` with `opacity` fade) and the active panel slides into view. Matches prototype's `hidden-slide` / `visible-slide` classes.

### Reference Prototype CSS (exact):
```css
.hidden-slide {
    transform: translateY(150%);
    opacity: 0;
    pointer-events: none;
}
.visible-slide {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
}
```

**Note**: The prototype's slide classes are **static state classes** (no `transition` property). The transition/easing is applied on the element itself: `transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]`. The Vue transition system (`panel-slide-enter` / `panel-slide-leave`) needs to apply the transition properties.

## Acceptance criteria

- [ ] `.hidden-slide` class: `transform: translateY(150%)` + `opacity: 0` + `pointer-events: none` (matches prototype exactly)
- [ ] `.visible-slide` class: `transform: translateY(0)` + `opacity: 1` + `pointer-events: auto` (matches prototype exactly)
- [ ] **Transition properties** applied via Vue transition system (`panel-slide-enter-active` / `panel-slide-leave-active`): `transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]` (from prototype's audio player element)
- [ ] CSS added to `index.vue` `<style>` block (previously nonexistent — `panel-slide-enter` and `panel-slide-leave` are referenced in `index.vue` template but have no CSS rules)
- [ ] `panel-slide-enter` and `panel-slide-leave` CSS classes now functional (previously referenced in template but undefined)
- [ ] Panel sliding only applies on mobile (`isMobile` from `usePanelToggle`)
- [ ] Desktop layout (≥768px) unaffected — both panels always visible side-by-side, no sliding
- [ ] `pointer-events` correctly toggled during transitions (no stale interaction on sliding panel)
- [ ] `usePanelToggle` composable may expose `isTransitioning` state (if needed to block interactions during animation)

## Blocked by

- Issue 1 (layout foundation: panels must be stacked vertically for sliding to make sense)
