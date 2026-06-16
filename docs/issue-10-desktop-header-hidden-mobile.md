# Issue 10: Desktop Header Hidden on Mobile

## What to build

The Control Deck's inner `<header>` (with `text-2xl` title "LughatChat" + "Premium Audio Studio" subtitle + `ModelStatusIndicator`) is currently always visible. Per the PRD: "The desktop header (with `text-2xl` title) remains unchanged and is hidden on mobile via `hidden md:flex` on the Control Deck's inner header section."

This header is replaced by the new mobile header (Issue 2) below 768px. Without this fix, both the new mobile header AND the old desktop header would be visible on mobile, adding ~88px of redundant header space.

## Acceptance criteria

- [ ] Control Deck inner `<header>` gets `hidden md:flex` class (currently has no responsive visibility class)
- [ ] On mobile (<768px): desktop header is hidden (CSS `display: none` via `hidden` class)
- [ ] On desktop (≥768px): desktop header is visible (flex layout, `md:flex` removes `hidden`)
- [ ] Content of the desktop header unchanged (logo, subtitle "Premium Audio Studio", ModelStatusIndicator)
- [ ] No new components created (inline class addition in `index.vue`)
- [ ] Mobile header (Issue 2) renders as the only header on mobile (no duplicate headers)

## Blocked by

- Issue 1 (layout foundation: Control Deck must exist in column mode for mobile header to be positioned correctly)
- Issue 2 (mobile header must exist before desktop header can be hidden on mobile)
