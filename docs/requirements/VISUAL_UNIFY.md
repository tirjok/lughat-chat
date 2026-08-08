# Problem Statement

LughatChat has two distinct user flows — the TTS synthesis page (`/`) and the learning dashboard (`/dashboard`) — that present drastically different visual experiences. The home page uses a dark-mode "Premium Audio Studio" aesthetic (dark panels, glass effects, Double-Bezel buttons), while the dashboard pages use a light-mode layout with different container widths, card styles, typography, and tab navigation. This creates a jarring user experience when navigating between pages, breaking brand consistency and undermining the learning journey's cohesion.

The design prototype (`docs/proto/lesson-details.html`) defines the intended design language: a light-mode learning interface with `bg-stone-50` body, `max-w-7xl` containers, `rounded-2xl` hero banners with gradient fills, `rounded-xl` white cards with `border-stone-200`, pill-style tab navigation, and a full primary/gold color scale. The production code deviates from this prototype in nearly every visual dimension.

---

# Solution

Unify the `/` (home/TTS) and `/dashboard` pages under the design language established by `docs/proto/lesson-details.html`. This requires:

1. **Extending the UnoCSS design tokens** to match the full primary/gold scales defined in the proto (10 levels for primary, 7 for gold).
2. **Updating the `/` (home) page** to use the proto's light-mode design system instead of the dark studio theme — or alternatively, bringing the dashboard pages to match the home page's dark theme. The proto dictates a light-mode learning interface, so the recommendation is to align both pages to the proto's light design.
3. **Standardizing layout primitives** across all pages: container width (`max-w-7xl`), card radius (`rounded-xl`), card styling (`bg-white` + `border-stone-200` + `shadow-sm`), typography scale (`text-3xl md:text-4xl` for hero headings), and tab navigation style (pill container with `bg-stone-100`).
4. **Adding missing UI elements** from the proto: hero banners with gradient fills and decorative Arabic text, status pills, breadcrumb navigation with SVG chevron separators, and progress indicators.

---

# User Stories

1. As a returning learner, I want the dashboard to look and feel the same as the TTS home page, so that my navigation between learning and creating feels seamless and continuous.

2. As a new user landing on `/`, I want to see a hero banner with level badges, lesson information, and metadata (estimated time, scenes, audio type), so that I understand what this learning experience offers before I start.

3. As a user navigating from `/` to `/dashboard`, I want consistent container widths, card styles, and typography, so that the page transition doesn't feel like I've entered a different application.

4. As a user on a large desktop screen, I want content to use the full available width up to 1280px (`max-w-7xl`), so that information is not unnecessarily cramped on wide displays.

5. As a learner reviewing my progress, I want to see level cards styled as `rounded-xl` white cards with `border-stone-200` (matching the proto), so that the visual hierarchy is consistent with the lesson detail pages.

6. As a user switching between the "Dialogue," "Vocabulary," "Pronouns," "Expressions," "Grammar," and "Activities" tabs on a lesson page, I want to see pill-style tab navigation (white bg on active, stone bg on inactive, `bg-stone-100` container), so that the tab style matches the proto design and feels intentional.

7. As a learner, I want to see breadcrumb navigation with SVG chevron separators (`›`) and `hover:text-primary-700` links, so that I can easily navigate back through the learning hierarchy (Dashboard → Level → Lesson).

8. As a user who values accessibility, I want all interactive elements to use the full primary color scale (e.g., `hover:text-primary-700`, `bg-primary-50`, `border-primary-200`), so that color contrast and hover states are predictable and WCAG-compliant.

9. As a mobile user, I want the dashboard pages to use the same responsive breakpoints (`sm:414px`, `md:768px`, `lg:1024px`) and padding conventions (`px-4 sm:px-6 lg:px-8`) as the proto, so that mobile layouts feel as polished as desktop.

10. As a learner, I want to see a 4px progress bar under the navigation (visible on desktop), so that I can track my progress through the course curriculum.

11. As a user, I want the hero section on the dashboard to include a gradient banner (`from-primary-700 via-primary-800 to-primary-900`) with decorative Arabic text overlay at `opacity-10`, so that the learning experience feels premium and culturally resonant.

12. As a user, I want status badges (level pill, lesson badge, ready indicator) rendered as `rounded-full` pills with appropriate background colors, so that I can quickly scan lesson status at a glance.

13. As a learner, I want the "Model Status" indicator on the dashboard to use the light-mode color palette (green dot on light bg, not dark-mode glass), so that it is readable and doesn't look broken on the light dashboard.

14. As a user, I want the GlobalNavbar to render consistently across all pages with the same logo treatment, navigation links, and progress bar, so that the top-level navigation feels like a single unified application.

15. As a developer maintaining the design system, I want the UnoCSS config to define the full `primary.50–900` and `gold.50–600` scales (matching the proto), so that all pages can use the complete tonal range without hardcoding hex values.

16. As a learner, I want lesson cards on the dashboard to use `rounded-xl` (not `rounded-lg`), `bg-white`, and `border-stone-200` (matching the proto), so that the card system is visually consistent across all pages.

17. As a user, I want hero headings to use `text-3xl md:text-4xl` (matching the proto) instead of `text-2xl md:text-3xl`, so that the page hierarchy matches the prototype's visual weight.

18. As a user, I want the app shell (`app.vue`) to provide a consistent page-level background (`bg-stone-50`), so that there are no white flash or mismatched edges when navigating between pages.

19. As a learner, I want the shadow system (`--shadow-soft`, `--shadow-elevated`) defined in `main.css` to be applied consistently across cards, dialogs, and floating elements, so that elevation hierarchy is meaningful and predictable.

20. As a learner, I want the font families to match the proto (Inter for Latin UI text, Amiri for Arabic text), so that the typography feels aligned with the design prototype and learning material.

---

# Implementation Decisions

- **Design language authority:** `docs/proto/lesson-details.html` is the single source of truth for the learning experience design. All page-level styling decisions reference it.

- **Unified light-mode:** The recommendation is to align both `/` and `/dashboard` to the proto's light-mode design. The dark studio theme on `/` was a separate design context (audio production) that should be reconciled with the learning interface, not treated as a parallel theme.

- **UnoCSS token extension:** The `uno.config.ts` theme must be extended from the current 2-level `primary` (500, 600) and 1-level `gold` (500) to match the proto's full scales: `primary.50–900` (10 levels) and `gold.50–600` (7 levels).

- **Card system standardization:** The `card` UnoCSS shortcut (`rounded-lg border p-4 shadow-sm bg-white dark:bg-gray-800`) must be updated to `rounded-xl bg-white border border-stone-200 shadow-sm` to match the proto. The `dark:bg-gray-800` variant should be removed or replaced with a proto-consistent dark mode card style.

- **Container width standardization:** All pages must use `max-w-7xl` (1280px) consistently. The dashboard's current `max-w-6xl` (1056px) is too narrow relative to the proto.

- **Typography scale standardization:** Hero headings across all pages should use `text-3xl md:text-4xl` (proto standard). Subheadings should use `text-sm` with `text-stone-500` (proto standard).

- **Tab navigation standardization:** The dashboard lesson page's underline-style tabs must be replaced with the proto's pill-style tabs: `bg-stone-100 rounded-xl p-1.5 flex flex-wrap gap-1` container with individual `rounded-lg` buttons, where the active tab has `bg-white text-primary-700 box-shadow`.

- **Hero banner component:** A new `LessonHero` component should be created (or the dashboard header restructured) to render the proto's hero: `bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden` with `bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900` inner banner, decorative Arabic text overlay, status pills, and metadata.

- **Status indicator light-mode variant:** The `ModelStatusIndicator` component needs a light-mode variant (or a separate `LightModeStatusIndicator`) that uses appropriate colors on a light background (the current dark-mode glass pill with `ring-white/[0.06]` and `bg-stone-900` inner core is unreadable on `bg-stone-50`).

- **GlobalNavbar consistency:** The GlobalNavbar must render identically across all pages. The current implementation already uses conditional rendering based on route, but the logo treatment, nav link active states, and progress bar must be consistent.

- **App shell background:** The `app.vue` layout shell must set a page-level `bg-stone-50` background so that there are no white flash or edge mismatches between pages.

- **Font family alignment:** The `uno.config.ts` font families (`Plus Jakarta Sans` + `Noto Sans Arabic`) should be evaluated against the proto's choice (`Inter` + `Amiri`). If the production fonts are intentional (self-hosted, offline), they should be documented in an ADR. If not, they should be updated to match the proto.

- **Shadow system application:** The CSS custom properties (`--shadow-ambient`, `--shadow-soft`, `--shadow-elevated`) defined in `main.css` should be applied to cards, dialogs, and floating elements throughout the application.

---

# Testing Decisions

- **Visual regression testing:** Component snapshots for `Dashboard.vue`, `index.vue`, `GlobalNavbar.vue`, `ModelStatusIndicator.vue`, and the new `LessonHero` component should be created using the existing Vitest component test setup (`vitest.component.config.ts`).

- **UnoCSS token verification:** Unit tests should verify that the extended `primary` and `gold` scales are correctly defined in `uno.config.ts` and resolve to the expected hex values matching the proto.

- **Layout consistency tests:** Tests should verify that all pages use `max-w-7xl` containers, `rounded-xl` cards, and `text-3xl md:text-4xl` hero headings.

- **Tab navigation tests:** Tests should verify that the pill-style tab container renders with `bg-stone-100 rounded-xl p-1.5` and that active tabs have `bg-white text-primary-700` styling.

- **Hero banner tests:** Tests should verify that the hero banner renders with the correct gradient (`from-primary-700 via-primary-800 to-primary-900`), decorative Arabic text overlay, and status pill badges.

- **Status indicator tests:** Tests should verify that the light-mode status indicator renders correctly on `bg-stone-50` (readable colors, appropriate contrast).

- **Existing seam preference:** Tests should leverage the existing `@nuxt/test-utils/module` integration (auto-imports, Nuxt test environment, `setup.ts` mocks) rather than creating new test infrastructure.

- **No tautological mocks:** Tests should assert observable DOM structure and class names, not mock return values.

---

# Out of Scope

- **Backend API changes:** This PRD only addresses frontend visual consistency. No backend endpoints, data models, or API contracts are modified.

- **Dark mode implementation:** While the dashboard pages currently have `dark:` class variants, implementing a functional dark mode toggle is explicitly out of scope. Dark mode classes may be updated to match the proto's dark palette, but no toggle mechanism is included.

- **Audio synthesis changes:** The TTS functionality on `/` (text input, voice selection, speed control, audio playback) is not modified. Only the visual styling of the surrounding pages is addressed.

- **Mobile-specific re-layout:** The mobile split-screen layout on `/` (MobileSplitScreen component) is not restructured. Only the visual styling (colors, radii, typography) of shared components is updated.

- **Font file changes:** Whether to switch from `Plus Jakarta Sans`/`Noto Sans Arabic` to `Inter`/`Amiri` is a decision to be made during implementation, not prescribed here. The proto defines the fonts, but production may have valid reasons for self-hosted alternatives.

- **New page creation:** No new pages are created. Existing pages (`/`, `/dashboard`, `/dashboard/level/[level]/[lesson]`) are the only targets for visual updates.

---

# Further Notes

- **Proto as single source of truth:** The `docs/proto/lesson-details.html` file should be treated as the canonical reference for all learning experience UI decisions. Future design changes should update this file first, then propagate to production code.

- **Existing components to modify (no new components created):** `DesktopPanels.vue`, `MobileSplitScreen.vue`, `GlobalNavbar.vue`, `ModelStatusIndicator.vue`, `dashboard.vue`, `dashboard/level/index.vue`, `dashboard/level/[level]/[lesson].vue`, `uno.config.ts`, `main.css`, `app.vue`.

- **Potential new component:** `LessonHero.vue` — renders the proto's hero banner with gradient fill, decorative Arabic text, status pills, and metadata. This would be reusable across dashboard pages.

- **Seam selection:** The highest seam for testing is the UnoCSS token layer (config file) and the page-level template layer (`.vue` files). No new composables, API routes, or database schemas are affected.

- **Risk assessment:** The biggest risk is breaking the existing TTS functionality on `/` if the dark-mode studio theme is intentionally designed. A migration strategy (feature flag or gradual rollout) should be discussed before implementation begins.
