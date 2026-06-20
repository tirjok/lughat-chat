# 08 — FocusHaloCanvas: Fix Visibility Logic

## Type

Done

## What to build

Fix the FocusHaloCanvas to match the prototype's visibility logic exactly. The existing component has inverted logic: it hides the halo when content is empty, but the prototype shows the halo on **focus** (regardless of content) and hides it on **blur** only when content is empty.

### Prototype reference

`frontend/docs/new-design/lughat_chat_studio.html` — Focus Halo Effect (lines ~130–145).

### Scope

**Prototype Behavior**
```javascript
arabicInput.addEventListener('focus', () => focusHalo.classList.add('active'));
arabicInput.addEventListener('blur', () => {
  if (arabicInput.value.trim() === '') focusHalo.classList.remove('active');
});
```

**Current (Incorrect) Logic**
- On focus: calls `updateHalo()` which checks if `textarea.value.trim() === ''` and hides if empty
- On blur: same check — hides if empty
- **Problem**: Halo never shows when textarea is focused but empty — prototype shows it on focus regardless

**Prototype Styling**
```css
.canvas-halo {
  position: absolute;
  bottom: -50px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 100px;
  background: radial-gradient(ellipse at center, rgba(255, 81, 47, 0.15) 0%, rgba(221, 36, 118, 0.05) 50%, transparent 70%);
  filter: blur(20px);
  opacity: 0;
  transition: opacity 0.5s ease-in-out;
  pointer-events: none;
}
.canvas-halo.active {
  opacity: 1;
}
```

**Current Styling**
- Matches prototype exactly — no changes needed to CSS
- `position: absolute; bottom: -50px; left: 50%; transform: translateX(-50%)`
- `width: 60%; height: 100px`
- `radial-gradient(ellipse at center, rgba(255, 81, 47, 0.15) 0%, rgba(221, 36, 118, 0.05) 50%, transparent 70%)`
- `filter: blur(20px)`
- `transition: opacity 0.5s ease-in-out`

### Changes needed

**Logic fix**
1. On `focus`: always add `active` class (regardless of content)
2. On `blur`: only remove `active` class if `textarea.value.trim() === ''`
3. Use the `focused` prop from parent instead of DOM queries

**Current issues vs prototype**
- `updateHalo()` checks `textarea.value.trim() === ''` on focus and hides — prototype shows on focus
- On blur, hides when empty — prototype hides when empty — this part is correct
- The component uses `document.querySelector('textarea[dir="rtl"]')` to find the textarea — fragile, should be more robust

## Acceptance criteria

- [ ] Halo shows (opacity: 1) when textarea receives focus, regardless of content
- [ ] Halo hides (opacity: 0) when textarea loses focus AND content is empty
- [ ] Halo stays visible when textarea loses focus but content is non-empty
- [ ] CSS matches prototype exactly: gradient stops, blur, positioning, sizing
- [ ] `transition: opacity 0.5s ease-in-out` on halo element

## Blocked by

None — resolved by fixing focus/blur logic and using the `focused` prop.
