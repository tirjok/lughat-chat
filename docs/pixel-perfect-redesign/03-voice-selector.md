# 03 — VoiceSelector: Pixel-Perfect Dropdown

## Type

AFK

## What to build

Match the VoiceSelector component to the prototype's dropdown behavior and styling exactly. The existing component is functional but visually diverges in several details.

### Prototype reference

`frontend/docs/new-design/lughat_chat_studio.html` — Voice Selection section (lines ~160–250).

### Scope

**Trigger Button**
- `bg-studio-900 border border-studio-700 hover:border-sunrise-orange/50 rounded-xl p-4`
- Gradient overlay on hover: `absolute inset-0 bg-gradient-to-r from-sunrise-orange/5 to-transparent opacity-0 group-hover:opacity-100`
- `shadow-inner` on trigger — currently missing
- Selected voice icon: `text-2xl` with `drop-shadow-[0_0_8px_${shadowColor}]` (shadow color depends on voice: orange for Aisha, magenta for Tariq)

**Dropdown Menu**
- `fixed z-50 bg-studio-800 border border-studio-700 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)]`
- Animation: `opacity-0 scale-95 pointer-events-none` → visible (currently uses `opacity-0 scale-95` but needs `Teleport to body` + `fixed` positioning)
- `max-h-[280px] overflow-y-auto p-2 flex flex-col gap-1`
- Chevron rotation: `rotate-180` when open

**Voice Options**
- `p-3 rounded-lg flex items-center justify-between`
- Selected voice: `bg-[#2a1a1a] border border-studio-600/50`
- Hover state: `hover:bg-studio-700/70`
- Icon circle: `w-10 h-10 rounded-full bg-studio-900 border border-studio-700`
  - Selected: `border-sunrise-orange`
  - Hover: color-coded border (orange for Aisha, magenta for Tariq)
- Preview play button: `w-8 h-8 rounded-full bg-studio-900 border border-studio-700 opacity-0 group-hover:opacity-100 hover:scale-110`
  - Color-coded hover text/border (orange/magenta)

**Current issues vs prototype**
- Missing `shadow-inner` on trigger button
- Missing gradient overlay (`from-sunrise-orange/5`)
- Selected voice styling: needs `bg-[#2a1a1a]` + `border-studio-600/50` (currently uses different classes)
- Voice option hover: color-coding (orange vs magenta) is partially implemented but inconsistent
- Missing `Teleport to body` — dropdown may overflow viewport

## Acceptance criteria

- [ ] Trigger button has `shadow-inner` + gradient overlay on hover
- [ ] Dropdown menu uses `Teleport to body` with `fixed` positioning matching prototype
- [ ] Dropdown animation: `opacity-0 scale-95` → visible with `transition-all duration-200 origin-top`
- [ ] Chevron rotates `rotate-180` when dropdown open
- [ ] Selected voice: `bg-[#2a1a1a] border border-studio-600/50`
- [ ] Hover state: `hover:bg-studio-700/70`
- [ ] Icon circle: color-coded border on hover (orange for Aisha, magenta for Tariq)
- [ ] Preview play button: `opacity-0 group-hover:opacity-100 hover:scale-110` with color-coded hover

## Status

✅ **COMPLETE** — VoiceSelector matches prototype exactly:
- Trigger button: `shadow-inner` + gradient overlay (`from-sunrise-orange/5`) on hover ✅
- Dropdown: `Teleport to body` with `fixed` positioning + `v-show` animation ✅
- Animation: `opacity-0 scale-95 pointer-events-none transition-all duration-200 origin-top` → visible ✅
- Chevron rotates `rotate-180` when open ✅
- Selected voice: `bg-[#2a1a1a] border border-studio-600/50` ✅
- Hover state: `hover:bg-studio-700/70` ✅
- Icon circle: color-coded border (orange for Aisha, magenta for Tariq) ✅
- Preview play button: `opacity-0 group-hover:opacity-100 hover:scale-110` with color-coded hover ✅
- Data attributes: `data-voice`, `data-name`, `data-tag`, `data-color` on voice options ✅

## Blocked by

- #01 (icon library — now complete)
- #02 (global styles — now complete)
