# 04 — SpeedSlider: Custom Thumb Styling

## Type

AFK

## What to build

Match the SpeedSlider's native range input styling to the prototype's exact CSS. The existing component has gradient fill logic (correct) but the thumb and track styling diverge from the prototype.

### Prototype reference

`frontend/docs/new-design/lughat_chat_studio.html` — Speed Control section (lines ~252–270).

### Scope

**Native Range Input Styling**
- `input[type=range] { -webkit-appearance: none; width: 100%; background: transparent }`
- Thumb:
  - `height: 16px; width: 16px; border-radius: 50%`
  - `background: #FF512F`
  - `box-shadow: 0 0 10px rgba(255, 81, 47, 0.8)`
  - `margin-top: -6px` (centers thumb on track)
  - `transition: transform 0.1s`
  - Hover: `transform: scale(1.2)`
- Track:
  - `width: 100%; height: 4px; cursor: pointer`
  - `background: #2A2A2A; border-radius: 2px`

**Gradient Fill (already implemented)**
- JS sets `background: linear-gradient(to right, #DD2476, #FF512F ${percentage}%, #2A2A2A ${percentage}%, #2A2A2A 100%)`
- This is correct — no changes needed

**Wrapper**
- `pt-2 pb-4` — present
- `absolute` markers at bottom: `text-[10px] text-gray-500 font-mono mt-2` — present

**Speed Label**
- `text-xs font-mono text-sunrise-orange bg-studio-900 px-2 py-1 rounded border border-studio-700` — present

**Current issues vs prototype**
- Thumb `box-shadow` may not be visible if `margin-top: -6px` is not applied correctly
- Firefox `::-moz-range-thumb` styling needs verification
- The `margin-top: -6px` centers the 16px thumb on the 4px track — verify this is correct

## Acceptance criteria

- [ ] Thumb is 16px circular, orange `#FF512F`, with `box-shadow: 0 0 10px rgba(255, 81, 47, 0.8)`
- [ ] Thumb `margin-top: -6px` centers it on the 4px track
- [ ] Hover: `transform: scale(1.2)`
- [ ] Track is 4px high, `#2A2A2A` background, `border-radius: 2px`
- [ ] Gradient fill (JS) updates correctly on slider change
- [ ] Firefox thumb styling matches WebKit
- [ ] `pt-2 pb-4` wrapper + `absolute` markers present

## Blocked by

- #01 (icon library — Phosphor icon for label)
- #02 (global styles)
