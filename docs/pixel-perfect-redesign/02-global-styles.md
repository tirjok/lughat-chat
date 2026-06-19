# 02 — Global Styles: Fonts, Scrollbars, Caret Color, Animations

## Type

AFK

## What to build

Add the missing global styles from the prototype that affect the entire application. These are CSS rules that apply at the document level, not per-component.

### Scope

**Fonts**
- `uno.config.ts`: Fix `fontFamily` — currently `sans: ['Cairo']` (wrong). Must be:
  - `sans: ['Inter', 'sans-serif']` for UI text
  - `arabic: ['Cairo', 'sans-serif']` for Arabic text
- The prototype loads both fonts via Google Fonts: `Inter:wght@300;400;500;600;700` and `Cairo:wght@400;600;700`

**Custom Scrollbar**
- Add global `::-webkit-scrollbar` styling matching prototype:
  - `width: 8px; height: 8px`
  - Track: `background: #121212`
  - Thumb: `background: #2A2A2A; border-radius: 4px`
  - Thumb hover: `background: #3A3A3A`

**Textarea Caret Color**
- Add `textarea { caret-color: #FF512F }` — the orange caret is a signature visual detail of the prototype. Currently missing entirely.

**Placeholder Color**
- Add `::placeholder { color: #404040 }` (gray-700 equivalent) — the prototype specifies gray-700 for placeholder text.

**Keyframe Animation**
- Add `@keyframes pulse-glow` from prototype:
  ```css
  @keyframes pulse-glow {
    0%, 100% { opacity: 1; filter: brightness(1) }
    50% { opacity: 0.8; filter: brightness(1.5) }
  }
  ```
  Used by AI toolbar buttons (`group-hover:animate-pulse`).

## Acceptance criteria

- [ ] `uno.config.ts` has `fontFamily: { sans: ['Inter', 'sans-serif'], arabic: ['Cairo', 'sans-serif'] }`
- [ ] Google Fonts preload tags for Inter + Cairo present in `nuxt.config.ts` or HTML head
- [ ] Custom scrollbar matches prototype (8px, #2A2A2A thumb, #121212 track)
- [ ] `textarea { caret-color: #FF512F }` applied globally
- [ ] `::placeholder { color: #404040 }` applied globally
- [ ] `@keyframes pulse-glow` defined and usable via `animate-pulse-glow`

## Status

✅ **COMPLETE** — Custom scrollbar (8px, #2A2A2A thumb, #121212 track), textarea caret color (#FF512F), placeholder color (#404040), and @keyframes pulse-glow all present in `main.css`. Google Fonts preload for Inter + Cairo in `nuxt.config.ts`. Font mapping fixed in `uno.config.ts` (`Inter` for UI, `Cairo` for Arabic).

## Blocked by

- #01 (icon library — now complete)
