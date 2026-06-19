# 12 — Final Verification: Prototype Pixel Comparison

## Type

HITL (requires human sign-off)

## What to build

Side-by-side visual comparison of the prototype HTML (`lughat_chat_studio.html`) against the rendered Vue application. Verify every pixel, color, animation, font, icon, shadow, border, hover state, and breakpoint behavior matches the prototype exactly.

### Scope

**Static Visual Comparison**
- Open prototype HTML in browser side-by-side with the running Vue app
- Compare at every breakpoint: `xs` (375px), `sm` (414px), `md` (768px), `lg` (1024px), `xl` (1280px), `2xl` (1536px)
- Check: colors, spacing, font sizes, icon positions, shadow values, border radii, padding, margins

**Animation Comparison**
- Conic gradient border spin speed (4s)
- Slide-up animation timing (`500ms cubic-bezier(0.16, 1, 0.3, 1)`)
- Waveform animation (playing vs paused)
- Dropdown animation (`opacity-0 scale-95` → visible)
- Hover transitions (`scale(1.2)` on slider thumb, `scale(105)` on play button)
- Focus halo fade-in (`0.5s ease-in-out`)

**Interactive Comparison**
- Voice selector: open/close, voice selection, preview play
- Speed slider: drag, stepper buttons (mobile), gradient fill
- Generate button: hover, active, loading, disabled states
- Audio player: play/pause, download, close, slide animation
- Mobile panel toggle: FAB click, panel sliding
- Keyboard shortcut: `Ctrl + Enter` triggers generation

**Pixel-Perfect Checklist**

| Element | Verify |
|---------|--------|
| **Colors** | `#121212` (bg), `#1A1A1A` (panels), `#2A2A2A` (borders), `#FF512F` (orange), `#DD2476` (magenta), `#E0E0E0` (text) |
| **Fonts** | Inter for UI, Cairo for Arabic, exact sizes at each breakpoint |
| **Icons** | Every Phosphor icon matches prototype class and position |
| **Shadows** | `shadow-2xl: 0 35px 60px -15px rgba(0, 0, 0, 0.3)`, `shadow-[0_0_15px_rgba(221,36,118,0.4)]`, etc. |
| **Borders** | `border-studio-700` (#2A2A2A), `border-studio-600` (#3A3A3A), `border: 1px solid #333333` |
| **Spacing** | Padding/margins match prototype at every breakpoint |
| **Animations** | All timing functions, durations, and keyframes match prototype |
| **Responsive** | Layout switches correctly at each breakpoint |

### Deliverable

A screenshot comparison document (or live browser session) showing:
1. Prototype HTML (left) vs Vue app (right) at `md` (768px) — desktop
2. Prototype HTML (left) vs Vue app (right) at `xs` (375px) — mobile
3. Close-up comparisons of: voice selector, speed slider, generate button, audio player, waveform, focus halo

### Acceptance criteria

- [ ] All colors match prototype hex values exactly (verified with browser dev tools)
- [ ] All fonts render at correct sizes at every breakpoint
- [ ] All icons match prototype Phosphor classes
- [ ] All shadows match prototype values (verified with browser dev tools)
- [ ] All border radii match prototype values
- [ ] All padding/margins match prototype values (verified with browser dev tools)
- [ ] All animations match prototype timing (verified with browser dev tools)
- [ ] Responsive layout switches correctly at all 6 breakpoints
- [ ] No visual regressions introduced by icon library switch

## Blocked by

- #01 through #11 (all visual work must be complete)
