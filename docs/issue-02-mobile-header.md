# Issue 2: Mobile Header — Logo + Status Bar

## What to build

A new `<header>` element renders only below 768px (`md:hidden`) containing the app logo (waves icon + "LughatChat" with magenta "Chat") and a **mobile-specific inline status indicator** (not the existing `ModelStatusIndicator` component — the prototype uses a simpler, smaller inline indicator). Styled per prototype.

> **Note on ModelStatusIndicator**: The prototype's mobile header does NOT reuse the existing `ModelStatusIndicator` component. It uses a completely different, simpler inline status indicator (smaller dot, smaller text, hardcoded "Ready"). The existing component is the desktop version. See comparison below.

### Reference Prototype HTML (exact):
```html
<header class="md:hidden flex justify-between items-center px-4 py-3 bg-studio-800 border-b border-studio-700 shrink-0 z-30 shadow-md">
    <div class="flex items-center gap-2">
        <i class="ph-fill ph-waves text-sunrise-orange text-xl"></i>
        <h1 class="text-lg font-bold text-white tracking-tight">Lughat<span class="text-sunrise-magenta">Chat</span></h1>
    </div>
    <div class="flex items-center gap-1.5 bg-studio-900 px-2.5 py-1 rounded-full border border-studio-700">
        <div class="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse"></div>
        <span class="text-[10px] font-medium text-gray-300">Ready</span>
    </div>
</header>
```

### Status Indicator Comparison (Prototype vs Current Component):

| Property | Prototype Mobile | Current ModelStatusIndicator (Desktop) |
|---|---|---|
| Dot size | `w-1.5 h-1.5` (6px) | `w-2 h-2` (8px) |
| Padding | `px-2.5 py-1` | `px-3 py-1.5` |
| Gap | `gap-1.5` | `gap-2` |
| Text size | `text-[10px]` (10px) | `text-xs` (12px) |
| Reactive states | Hardcoded "Ready" | loading/ready/error |
| Shadow | `shadow-[0_0_8px_#22c55e]` | `shadow-[0_0_8px_#22c55e]` (same) |

**Decision**: Create a mobile-specific inline status indicator matching the prototype's smaller, simpler design. Do NOT reuse the desktop `ModelStatusIndicator` component — it's too large for the mobile header. The mobile status can be simplified (always shows "Ready" or reuse the reactive component with mobile-specific styling overrides).

## Acceptance criteria

### Header container
- [ ] New `<header>` element with `md:hidden` class renders below 768px, hidden on desktop
- [ ] Header uses `flex justify-between items-center` (prototype has this — distributes logo and status across full width)
- [ ] Styled: `px-4 py-3`, `bg-studio-800`, `border-b border-studio-700`, `shrink-0`, `z-30`, `shadow-md` (all match prototype)

### Logo section
- [ ] Contains `i-lucide-audio-waveform` icon with `text-xl` (20px, matching prototype — current desktop header uses `text-2xl`)
- [ ] Logo text: `text-lg font-bold text-white tracking-tight` (18px, matching prototype — current desktop header uses `text-2xl`)
- [ ] "Chat" uses `text-sunrise-magenta` (UnoCSS variable, matching prototype — not hardcoded `#DD2476`)
- [ ] **No subtitle** on mobile (prototype has no "Premium Audio Studio" subtitle — only desktop header has it)

### Status indicator (mobile-specific, inline)
- [ ] Mobile status: `w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse` (smaller dot, matching prototype)
- [ ] Mobile status text: `text-[10px] font-medium text-gray-300` (10px, matching prototype)
- [ ] Mobile status container: `gap-1.5 bg-studio-900 px-2.5 py-1 rounded-full border border-studio-700` (smaller padding, matching prototype)
- [ ] Option A: Create a mobile-specific inline status indicator (matching prototype exactly, hardcoded "Ready")
- [ ] Option B: Reuse `ModelStatusIndicator` but override with mobile-specific styles (`w-1.5 h-1.5`, `text-[10px]`, `px-2.5 py-1`, `gap-1.5`) — preserves reactive states but needs style overrides
- [ ] **Decision**: Prefer Option A (matching prototype) for simplicity, or Option B if reactive states (loading/error) are needed on mobile

### Safe area
- [ ] Safe area inset padding applied (`env(safe-area-inset-top)`) — **PRD addition, not in prototype** (prototype doesn't have this)
- [ ] Mobile header does not cause layout overflow (known prior issue with safe area on body — apply to header element only, not body)
- [ ] No new components created (header is inline in `index.vue`)

## Blocked by

- Issue 1 (layout foundation must exist before header can be positioned correctly)
