# Issue 6: Toast Mobile Positioning + Shortcut Hint Fix

## What to build

Toast container adapts position based on screen width, matching the reference prototype's exact styling. Shortcut hint breakpoint fixed from `hidden sm:flex` to `hidden md:flex` (was showing at 414px, too early).

Reference prototype toast container:
```html
<div id="toast-container" class="fixed top-20 md:top-4 left-4 right-4 md:left-auto md:w-80 z-50 flex flex-col gap-2 pointer-events-none"></div>
```

Current code: `<div class="fixed top-4 right-4 z-50 flex flex-col gap-2">` — no mobile centering, no `pointer-events-none`, no `md:w-80`.

Reference prototype shortcut hint:
```html
<div class="hidden md:flex absolute bottom-6 right-8 text-gray-600 text-sm font-medium items-center gap-2 bg-studio-800/80 backdrop-blur px-4 py-2 rounded-lg border border-studio-700/50">
```

Current code: `<div class="absolute bottom-6 right-8 text-gray-600 text-sm font-medium flex items-center gap-2 bg-studio-800/90 backdrop-blur px-4 py-2 rounded-lg border border-studio-700 hidden sm:flex">` — wrong breakpoint (`sm:flex` instead of `md:flex`), wrong backdrop opacity (`/90` instead of `/80`), wrong border opacity (`border-studio-700` instead of `border-studio-700/50`).

## Acceptance criteria

### Toast container
- [ ] Mobile: `top-20 left-4 right-4` (centered horizontally at top, full width with 4px margins)
- [ ] Desktop: `top-4 left-auto md:w-80` (top-right corner, max width 20rem)
- [ ] **Reference prototype adds**: `pointer-events-none` on container (click-through to panels below — individual toasts have `pointer-events-auto`)
- [ ] `z-50` preserved (above all panels)
- [ ] `flex flex-col gap-2` preserved

### Shortcut hint
- [ ] Changed from `hidden sm:flex` to `hidden md:flex` (hidden below 768px, matches reference prototype)
- [ ] Backdrop opacity: `bg-studio-800/80` (reference prototype) instead of `bg-studio-800/90` (current)
- [ ] Border: `border-studio-700/50` (reference prototype, semi-transparent) instead of `border-studio-700` (current, solid)
- [ ] Position: `absolute bottom-6 right-8` (preserved from current)

### Test updates
- [ ] Toast tests updated (`ToastNotification.test.ts`: `top-4 right-4` → `top-20 left-4 right-4 md:left-auto md:w-80`)
- [ ] Shortcut hint tests updated (`index.test.ts`: `hidden sm:flex` → `hidden md:flex`)
- [ ] Shortcut hint source checks updated (`hidden sm:flex` → `hidden md:flex`, `bg-studio-800/90` → `bg-studio-800/80`, `border-studio-700` → `border-studio-700/50`)

## Blocked by

- Issue 1 (layout foundation: toast positioning is viewport-level and must coexist with the two-panel layout)
