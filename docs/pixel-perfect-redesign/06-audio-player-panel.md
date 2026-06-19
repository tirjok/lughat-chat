# 06 — AudioPlayerPanel: Icon & Button Styling

## Type

AFK

## What to build

Match the AudioPlayerPanel's iconography, button styling, and animations to the prototype. The existing component is functional but missing several icons and has incorrect styling on some elements.

### Prototype reference

`frontend/docs/new-design/lughat_chat_studio.html` — Audio Player Panel (lines ~365–420).

### Scope

**Header Section**
- Icon circle: `w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-sunrise-orange to-sunrise-magenta flex items-center justify-center shadow-lg shrink-0`
  - **Current**: matches prototype — no changes needed
- Icon inside circle: `ph-fill ph-music-notes text-white text-sm md:text-base`
  - **TODO**: Add icon (currently missing) — replace with Phosphor `ph-fill ph-music-notes`
- Voice label: `text-[10px] md:text-xs text-gray-400 truncate`
  - Shows: `Selected Voice • SpeedValue.toFixed(1) x Speed`
  - **Current**: matches prototype — no changes needed

**Action Buttons (right side)**
- Download button: `w-8 h-8 md:w-10 md:h-10 rounded-full bg-studio-900 border border-studio-700 flex items-center justify-center hover:text-white text-gray-400`
  - **TODO**: Add icon (currently missing) — Phosphor `ph ph-download-simple`
- Close button: same styling as download
  - Hover: `hover:text-red-400`
  - **TODO**: Add icon (currently missing) — Phosphor `ph ph-x`

**Waveform Container**
- `w-full bg-studio-900 rounded-lg border border-studio-700 p-2 md:p-4 flex items-center gap-2 md:gap-4`
  - **Current**: matches prototype — no changes needed

**Play/Pause Button**
- `w-10 h-10 md:w-12 md:h-12 rounded-full bg-sunrise-magenta text-white flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_15px_rgba(221,36,118,0.4)] flex-shrink-0`
  - **Current**: matches prototype — no changes needed
- Icon: `ph-fill ph-play text-lg md:text-xl ml-1` (when not playing)
- Icon: `ph-fill ph-pause text-lg md:text-xl` (when playing)
  - **TODO**: Replace Lucide icons with Phosphor after #01

**Time Display**
- `text-[10px] md:text-xs font-mono text-gray-400 flex-shrink-0 w-8 md:w-10 text-right`
  - **Current**: matches prototype — no changes needed

**Slide Animation**
- `transition: transform 500ms cubic-bezier(0.16, 1, 0.3, 1), opacity 500ms cubic-bezier(0.16, 1, 0.3, 1)`
- `hidden-slide`: `transform: translateY(150%); opacity: 0; pointer-events: none`
- `visible-slide`: `transform: translateY(0); opacity: 1; pointer-events: auto`
  - **Current**: matches prototype — no changes needed

**Responsive Sizing**
- Panel: `w-full md:w-[65%] lg:w-[70%] xl:w-[75%]`
  - **Current**: matches prototype — no changes needed

### Current issues vs prototype
- Missing icons: music-notes (header), download, close, play/pause
- Missing `ml-1` on play icon (prototype has it for visual centering)
- Verify `shadow-lg` on gradient icon circle (prototype has it)

## Acceptance criteria

- [ ] Header icon circle: `bg-gradient-to-br from-sunrise-orange to-sunrise-magenta` with `shadow-lg`
- [ ] Music notes icon (`ph-fill ph-music-notes`) added to header
- [ ] Download button has Phosphor `ph ph-download-simple` icon
- [ ] Close button has Phosphor `ph ph-x` icon with `hover:text-red-400`
- [ ] Play/pause button: `bg-sunrise-magenta`, `shadow-[0_0_15px_rgba(221,36,118,0.4)]`, `hover:scale-105`
- [ ] Play icon has `ml-1` for visual centering
- [ ] Slide animation: `500ms cubic-bezier(0.16, 1, 0.3, 1)`
- [ ] Responsive panel width: `md:w-[65%] lg:w-[70%] xl:w-[75%]`

## Blocked by

- #01 (icon library — Phosphor icons)
