# 09 — PanelToggle & MobileStatusIndicator: Correct Icons

## Type

AFK

## What to build

Replace the Lucide icons in PanelToggle and MobileStatusIndicator with Phosphor equivalents matching the prototype. Both components are functionally correct but use the wrong icon library.

### Prototype reference

`frontend/docs/new-design/lughat_chat_studio.html` — Mobile Header (lines ~105–120), Panel Toggle FAB (not explicitly in prototype, but follows same icon style).

### Scope

**PanelToggle**
- Current icons:
  - When `activePanel === 'canvas'`: `i-lucide-sliders-horizontal text-xl`
  - When `activePanel === 'control-deck'`: `i-lucide-terminal text-xl`
- Prototype equivalents (Phosphor):
  - Sliders: `ph ph-sliders-horizontal`
  - Terminal: `ph ph-terminal`
- FAB styling: `fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-studio-700 border border-studio-600 text-white shadow-lg hover:bg-studio-600 active:scale-95 transition-all md:hidden`
  - **Current**: matches prototype — no changes needed
- Label text: `activePanel === 'canvas' ? 'Voice settings' : 'Text editor'`
  - **Current**: matches prototype — no changes needed

**MobileStatusIndicator**
- This component is already pixel-perfect — it uses no icons, only colored dots and text
- `w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse` (ready state)
- `w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316] animate-pulse` (loading state)
- `w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]` (error state)
- **Current**: matches prototype — no changes needed
- **Status**: ✅ Already correct — no action needed

### Current issues vs prototype
- PanelToggle uses Lucide icons — must switch to Phosphor
- MobileStatusIndicator is already correct — no changes needed

## Acceptance criteria

- [ ] PanelToggle uses `ph ph-sliders-horizontal` when on canvas panel
- [ ] PanelToggle uses `ph ph-terminal` when on control-deck panel
- [ ] FAB styling matches prototype: `bg-studio-700 border-studio-600`, `shadow-lg`, `active:scale-95`
- [ ] PanelToggle hidden on desktop (`md:hidden`)
- [ ] MobileStatusIndicator verified pixel-perfect (no changes needed)

## Blocked by

- #01 (icon library — Phosphor icons)
