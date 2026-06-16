# Issue 4: Canvas Mobile Header Variant (Stacked Layout)

## What to build

A mobile-specific header row inside the Canvas panel. On mobile: "Editor Canvas" label + character count + clear button are in a **horizontal row** (label on left, count/clear on right, full-width). On desktop: horizontal row (existing behavior preserved).

> **Note on "stacked vertically"**: The PRD text says "stacked vertically" but the actual prototype HTML uses `flex justify-between items-center` — a horizontal row (label + count/clear side by side). The prototype does NOT stack them vertically. The mobile header is a full-width horizontal row, not a vertical stack.

### Reference Prototype HTML (mobile Canvas header):
```html
<div class="flex justify-between items-center w-full md:w-auto md:hidden">
    <h2 class="text-gray-400 font-medium text-sm flex items-center gap-2">
        <i class="ph ph-keyboard text-lg"></i> Editor Canvas
    </h2>
    <div class="flex items-center gap-3 text-sm text-gray-500">
        <span id="char-count-mobile" class="font-mono text-xs">0 / 3000</span>
        <button class="clear-text-btn hover:text-white transition-colors p-1" title="Clear Canvas">
            <i class="ph ph-trash text-lg"></i>
        </button>
    </div>
</div>
```

### Full Prototype Canvas Header Structure:
- **Mobile**: `<div class="flex justify-between items-center w-full md:w-auto md:hidden">` (label + count/clear in a horizontal row, full-width)
- **Desktop**: Two sections:
  1. `<div class="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 w-full md:w-auto">` (label + AI toolbar)
  2. `<div class="hidden md:flex items-center gap-4 text-sm text-gray-500 shrink-0">` (char count/clear — separate row below)
- **Current code**: Single horizontal row for both mobile and desktop (no mobile variant)

## Acceptance criteria

### Mobile Canvas header (new)
- [ ] Mobile-specific header: `<div class="flex justify-between items-center w-full md:w-auto md:hidden">` (horizontal row, not stacked — matches prototype)
- [ ] Label: `text-gray-400 font-medium text-sm flex items-center gap-2` (matches prototype)
- [ ] Character count: `font-mono text-xs` (matches prototype — current code uses `text-sm`)
- [ ] Clear button: `hover:text-white transition-colors p-1` (matches prototype — current code has `rounded-full w-8 h-8 flex items-center justify-center`)
- [ ] **Responsive padding**: Canvas header section uses `p-4 md:p-6 lg:p-8 pb-2 md:pb-4` (matches prototype — current code has `p-6 pb-4`)

### Desktop Canvas header (existing, updated)
- [ ] Desktop char count/clear: `hidden md:flex items-center gap-4 text-sm text-gray-500 shrink-0` (matches prototype — currently part of the single row)
- [ ] Desktop label: `hidden md:flex text-gray-400 font-medium text-sm items-center gap-2` (matches prototype — currently always visible)
- [ ] Clear button: `hover:text-white transition-colors p-1` (matches prototype — current code has `rounded-full w-8 h-8`)
- [ ] Character count: `font-mono` (matches prototype — current code uses `text-sm`)

### Functional
- [ ] Clear button and character count maintain existing functionality
- [ ] No horizontal scrolling on narrow screens (375px)

## Blocked by

- Issue 1 (layout foundation: Canvas panel must exist in column mode for mobile header to be positioned correctly)
