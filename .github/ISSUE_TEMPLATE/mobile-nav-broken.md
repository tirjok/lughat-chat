# Title: Mobile navigation bar is broken — nav links show no icons, layout does not account for navbar height

## What happened

On mobile devices, the top navigation bar does not display any navigation icons. The Home, Dashboard, and My Courses links render as empty clickable areas with no visual indicator (no icons, no labels). Additionally, the page content layout does not correctly account for the navbar's height, causing the navigation bar to overlap or squeeze the canvas area.

## What I expected

The navigation bar should display recognizable icons for each navigation item (Home, Dashboard, My Courses) on mobile, matching the visual style of the desktop navigation. The page canvas (TTS Studio, Dashboard, or Lesson content) should render below the navbar without overlap, with the correct available height.

## Steps to reproduce

1. Open the app on a mobile device or resize the browser to below 768px width.
2. Observe the top navigation bar — the three navigation links (Home, Dashboard, My Courses) appear as empty rectangular areas with no icons or labels.
3. Try tapping the navigation areas — they navigate, but there is no visual feedback showing which page is active or what each link does.
4. Observe that the page content (canvas/editor) appears to be cropped or overlapped by the navigation bar.

## Additional context

The GlobalNavbar component renders a mobile-specific navigation section (visible below `md:` breakpoint) that contains `NuxtLink` elements for Home, Dashboard, and My Courses. These links are missing their icon content — the Phosphor icon spans are not rendered inside the link buttons, leaving them as empty touch targets.

The mobile layout uses `h-[calc(100vh-64px-env(...))]` for the canvas area, but this offset does not correctly account for the navbar's actual rendered height (the `h-14` top bar plus the 4px progress bar = ~60px, but the mobile section uses `h-16` which is 64px, and there may be additional spacing from the floating pill header).

The fix should:
- Add appropriate Phosphor icons to each mobile nav link (matching the desktop icons where they exist, e.g. `ph-house` for Home, `ph-squares-four` for Dashboard, `ph-book-open` for My Courses).
- Ensure the page canvas correctly accounts for the full navbar height on mobile, preventing overlap or content clipping.
- Maintain consistent navigation behavior across all pages (TTS Studio, Dashboard, Lesson pages).
