# GenerateButton Usability Fixes — Plan

## Summary

Fix critical visibility and accessibility issues in `GenerateButton.vue` that make the button nearly unusable in light mode when `disabled=false`. The dark text (`text-stone-800`) on the dark button background (`#1A1A1A`) produces near-zero contrast, rendering "Generate Speech" invisible. Additional issues: clicks fire when "disabled", no focus ring, no `aria-disabled`, and error state shows wrong text.

## Context

**File:** `frontend/app/components/GenerateButton.vue` (177 lines)

**Consumers:** `DesktopPanels.vue` (line 132), `MobileSplitScreen.vue` (line 187)
- Both pass `:disabled="!isValid || isGenerating || modelStatus === 'loading'"`
- Both wire `@click="emit('synthesize')"`

**State machine (current):**
- `isGenerating=false, modelStatus='ready', disabled=false` → "Generate Speech" (ready state)
- `isGenerating=true` OR `modelStatus !== 'ready'` → "Processing Model..." (loading state, `v-else`)

**Visual design system:** The button uses a "Double-Bezel" (Doppelrand) design — dark shell (`#1A1A1A`) with gold/teal accent ring on hover. All transitions use 700ms (excessively slow).

**Constraint:** This is a visual component inside `bg-stone-50` / `bg-stone-100` (light mode) containers. The dark button must have readable text in both light and dark modes.

## System Impact

- **One file changed:** `frontend/app/components/GenerateButton.vue`
- **No interface changes** to props or emits — fixes are internal (CSS, attributes)
- **No parent changes required** — fixes are self-contained in the component
- **Existing tests** for disabled behavior (lines 76–87 of GenerateButton.test.ts) assert that clicks fire when disabled; this test will need updating once the fix adds native `disabled` attribute

## Approach

### Primary Fix: Light-Mode Text Visibility (P0)
The root cause of the screenshot issue: `text-stone-800` (`#292524`) on `background: #1A1A1A` produces ~1.5:1 contrast — text is invisible.

**Fix:** Swap the ready-state text color to a light color in light mode:
- Ready state: `text-white` (not `text-stone-800`) on the dark button
- This matches the hover state (`group-hover:text-white`) and is consistent with the dark button design
- Dark mode already uses `dark:text-white` — no change needed

This is a one-line change on line 31.

### Secondary Fixes (P1):

**2.1. `aria-disabled` binding** (line 18)
- Add `:aria-disabled="disabled"` to the `<button>` so screen readers announce the state

**2.2. Native `disabled` attribute** (line 17)
- Add `:disabled="disabled"` to the `<button>` so the browser natively blocks interaction
- This prevents the parent's `@click="emit('synthesize')"` from firing when disabled
- Requires updating the test at GenerateButton.test.ts lines 76–87 (which asserts clicks fire when disabled — this is the bug, not the feature)

**2.3. Focus-visible indicator** (after line 94)
- Add `:focus-visible` rule with a gold ring matching the brand accent (`#f59e0b`)

**2.4. Error state text** (lines 44–59)
- Distinguish `modelStatus === 'error'` from loading/generating in the `v-else` branch
- Show "Try Again" or "Model Error" text when status is 'error'

### Tertiary Fixes (P2):

**3.1. `type="button"`** (line 17)
- Add to prevent accidental form submission

**3.2. `aria-busy`** (line 17)
- Bind `:aria-busy="isGenerating"` for screen readers

**3.3. Transition speed** (lines 72, 79, 84, 98, 112, 147)
- Reduce from 700ms to 200–300ms for transform, 300–400ms for box-shadow/background

## Changes

### `frontend/app/components/GenerateButton.vue`

| Line | Change |
|------|--------|
| 17 | Add `:disabled="disabled" type="button" :aria-disabled="disabled" :aria-busy="isGenerating"` |
| 31 | Change `text-stone-800` → `text-white` (light mode text now readable on dark background) |
| 44–59 | Add conditional: `v-if="modelStatus === 'error'"` shows error text; `v-else` remains loading |
| 72 | Reduce transform transition from 700ms to 250ms |
| 79 | Reduce box-shadow transition from 700ms to 300ms |
| 84 | Reduce hover box-shadow transition from 700ms to 300ms |
| 92–94 | Reduce :active transition from 700ms to 200ms |
| 112 | Reduce ::before background transition from 700ms to 300ms |
| 147 | Reduce ::after opacity transition from 700ms to 300ms |
| After 94 | Add `:focus-visible` rule with gold ring |

### `frontend/tests/components/GenerateButton.test.ts`

| Line | Change |
|------|--------|
| 15–19 | Update test: `btn.attributes('disabled')` should now be `'true'` when disabled prop is true |
| 19 | `btn.element.disabled` should now be `true` when disabled prop is true |
| 76–87 | Update test name to "does NOT emit click when disabled" and assert `emitted('click')` is `undefined` or empty |

### `frontend/.issues/CONTROL-DECK-001.md` (if exists, update reference)
- Update disabled state description from `opacity: 0.4 on #1A1A1A` to the new visual design

## Verification

1. **Visual check:** Open the app in light mode. The "Generate Speech" text should be clearly visible (white on dark button).
2. **Disabled check:** When `disabled=true`, the button should show `cursor: not-allowed`, appear grayed out, and NOT fire `emit('click')`.
3. **Accessibility check:** Use a screen reader — the button should announce "Generate Speech, button" (enabled) or "Generate Speech, button, disabled" (disabled).
4. **Focus check:** Tab to the button — a gold focus ring should appear.
5. **Error state:** When `modelStatus='error'`, the button should show an error message, not "Processing Model..."
6. **Tests:** Run `pnpm test` — all GenerateButton tests should pass.

**Commands:**
```bash
cd frontend && pnpm test -- GenerateButton
./run-tests.sh  # full stack verification
```
