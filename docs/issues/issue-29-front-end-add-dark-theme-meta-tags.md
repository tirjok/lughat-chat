## What to build

Add dark theme support meta tags to app.vue so that mobile browsers render the page correctly with proper background colors and form controls in dark mode.

## Acceptance criteria

- [ ] `<meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)">` added to `<head>`
- [ ] `<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">` added to `<head>`
- [ ] `<html>` element has `color-scheme: dark light` (or appropriate value)
- [ ] Viewport meta includes `viewport-fit=cover` for safe-area-inset support on notched devices
- [ ] No visual changes to the page itself

## Blocked by

None - can start immediately
