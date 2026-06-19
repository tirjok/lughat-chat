# 05 — GenerateButton: Conic Border Animation

## Type

AFK

## What to build

Verify and fix the GenerateButton to match the prototype's animated conic-gradient border exactly. The existing component is close but has subtle differences.

### Prototype reference

`frontend/docs/new-design/lughat_chat_studio.html` — Generate Button (lines ~305–320).

### Scope

**Conic Gradient Border (`::before`)**
- `position: absolute; top: -50%; left: -50%; width: 200%; height: 200%`
- `background: conic-gradient(from 0deg, transparent 0%, transparent 70%, #DD2476 85%, #FF512F 100%)`
- `animation: spin 4s linear infinite`
- `z-index: -2`
- **Current**: matches prototype — no changes needed

**Inner Fill (`::after`)**
- `position: absolute; inset: 2px; background: #1A1A1A; border-radius: 0.7rem`
- `z-index: -1`
- `transition: background 0.3s ease`
- Hover: `background: #1f1f1f`
- **Current**: matches prototype — no changes needed

**Button Base**
- `background: #1A1A1A; border-radius: 0.75rem; overflow: hidden; z-index: 1`
- `transition: all 0.3s ease`
- `width: 100%; min-height: 3.5rem`
- `padding: 0.875rem 1.5rem` (=`py-3.5 md:py-4`)
- `border: 1px solid #333333`
- **Current**: matches prototype — no changes needed

**Active State**
- `transform: scale(0.98)` on `:active`
- **Current**: matches prototype — no changes needed

**Disabled State**
- `opacity: 0.4; cursor: not-allowed`
- `animation-duration: 6s` on `::before`
- **Current**: matches prototype — no changes needed

**Loading State**
- Spinner: `border: 3px solid rgba(255, 81, 47, 0.3); border-top: 3px solid #FF512F; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite`
- Text: `font-medium text-sunrise-orange animate-pulse text-sm md:text-base`
- **Current**: matches prototype — no changes needed

**Ready State**
- Icon: `i-lucide-play-circle text-xl text-sunrise-magenta group-hover:text-sunrise-orange`
- Text: `font-bold text-white tracking-wide text-sm md:text-base`
- **TODO**: Replace Lucide icon with Phosphor (`ph-fill ph-play-circle`) after #01

### Current issues vs prototype
- Content wrapper needs `relative z-10 flex items-center justify-center gap-2 w-full` (prototype has explicit wrapper div)
- Loading state wrapper: `relative z-10 hidden flex items-center justify-center gap-3 w-full` (prototype uses `hidden` class to toggle)
- Verify `py-3.5 md:py-4` maps to `0.875rem 1.5rem` (existing uses explicit pixel values — correct)

## Acceptance criteria

- [ ] Conic gradient border (`::before`) matches prototype: transparent 0–70%, magenta 85%, orange 100%, 4s spin
- [ ] Inner fill (`::after`) is `inset: 2px`, `#1A1A1A`, `border-radius: 0.7rem`
- [ ] Button base: `min-height: 3.5rem`, `padding: 0.875rem 1.5rem`, `border: 1px solid #333333`
- [ ] Active state: `scale(0.98)`
- [ ] Disabled state: `opacity: 0.4`, animation slows to 6s
- [ ] Loading spinner: 24px, 3px border, orange top, 1s spin
- [ ] Loading text: "Processing Model..." (already correct)
- [ ] Ready state icon replaced with Phosphor after #01

## Blocked by

- #01 (icon library — Phosphor icon for ready state)
