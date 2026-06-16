# PRD: Responsive Layout — Mobile-First Two-Panel Architecture

## Problem Statement

The application renders unusably on mobile and tablet devices. The two-panel layout uses a horizontal flex (`flex h-screen`) on all screen sizes, meaning on phones the Control Deck and Canvas sit side-by-side — each panel takes 100% of the viewport width, pushing the Canvas completely off-screen to the right. Users cannot access the text editor on any device narrower than 768px.

Additionally, there is no mobile header, the audio player spans the full width on desktop (covering the Control Deck), the panel toggle FAB is non-functional because both panels are always laid out horizontally, the shortcut hint shows at 414px (too early), toast notifications are not centered on mobile, and the color palette for borders (`studio-700`) differs from the reference design. The existing responsive changes (issues 31–37) address component-level details but do not fix the core layout — making all other responsive work moot.

## Solution

Restructure the two-panel layout to switch between a **column layout on mobile** (stacked panels, 40dvh Control Deck + remaining Canvas) and a **row layout on desktop** (side-by-side panels). Add a mobile header with logo and status indicator. Constrain the audio player width on desktop to leave space for the Control Deck. Fix the shortcut hint breakpoint, toast mobile positioning, and color palette to match the reference design exactly.

After this is complete, the application is fully usable on phones, tablets, and desktops with a consistent design language across all breakpoints — matching the reference prototype's layout, spacing, colors, and visual hierarchy, while preserving the existing technology stack (UnoCSS instead of Tailwind CSS, Lucide Icons instead of Phosphor Icons).

### Prototype Reference

The reference prototype at `frontend/docs/new-design/lughat_chat_studio.html` defines the exact responsive layout. Every responsive decision below is derived from that prototype's HTML structure and CSS classes.

## User Stories

1. As a mobile user, I want to see both the Control Deck and the text editor stacked vertically so that I can access both without the canvas being pushed off-screen
2. As a mobile user, the Control Deck should take 40dvh (40% of dynamic viewport height) so that the text editor remains visible below it
3. As a mobile user, I want a header bar at the top showing the app logo and model status so that I know what app I'm using and whether the TTS model is ready
4. As a mobile user, I want to toggle between the Control Deck and the Canvas using the floating action button so that I can focus on one panel at a time
5. As a tablet user (768px–1024px), I want to see both panels side-by-side so that I can adjust voice settings while reading my text
6. As a desktop user, I want the audio player to not cover the Control Deck so that I can still see and interact with voice settings while the player is open
7. As a desktop user, I want the audio player to be narrower than full width so that the Control Deck remains partially visible and accessible
8. As a user on any device, I want the layout to adapt smoothly without layout shifts or content jumping when resizing the browser
9. As a mobile user, I want the Control Deck to scroll independently of the Canvas so that adjusting voice settings doesn't scroll my text
10. As a mobile user, I want the Canvas to scroll independently so that I can reach the bottom of long text inputs
11. As a user on a device with notch/safe-area (iPhone, modern Android), I want the layout to respect safe area insets so that content is not hidden behind hardware features
12. As a mobile user, I want the keyboard shortcut hint to be hidden so that it doesn't waste screen space on narrow devices
13. As a tablet user, I want the panel toggle FAB to be visible and accessible in the bottom-right corner so that I can switch between panels without scrolling
14. As a desktop user, I want the panel toggle FAB to be hidden so that it doesn't clutter the interface
15. As a user resizing the browser, I want the layout to switch between stacked and side-by-side at 768px without content clipping or overflow
16. As a mobile user, I want the Control Deck panel to slide away when the Canvas is active, and vice versa, so that I can focus on one panel at a time on small screens
17. As a mobile user, I want the Canvas panel to slide away when the Control Deck is active, so that I have more room for voice settings
18. As a user, I want the canvas header to show a mobile-specific layout (stacked label + character count + clear button) on narrow screens, so that all controls remain accessible without horizontal scrolling
19. As a mobile user, I want toast notifications to be centered horizontally at the top of the screen, so that they are visible regardless of panel position
20. As a desktop user, I want toast notifications to appear in the top-right corner, matching the existing desktop behavior
21. As a user, I want the border color (`studio-700`) to match the reference design (#2A2A2A) so that the visual design is consistent across all panels
22. As a desktop user, I want the keyboard shortcut hint (`Ctrl + Enter`) to only appear at 768px and above, so that it does not waste screen space on tablets
23. As a user, I want the audio player panel to match the Canvas width on desktop (65%/70%/75% at respective breakpoints), so that the Control Deck remains visible alongside the player
24. As a mobile user, I want the audio player to be full width when visible, so that it has maximum usability on small screens
25. As a user, I want the Control Deck to have a drop shadow above it on mobile (`shadow-[0_-10px_30px_rgba(0,0,0,0.4)]`), so that it visually appears as a floating panel above the Canvas

## Implementation Decisions

### Layout Architecture

The layout switches between two modes based on screen width:

- **Mobile (<768px)**: Column layout. Control Deck takes 40dvh (40% of dynamic viewport height) at the top, Canvas takes the remaining space below. Both panels scroll internally. A mobile header sits above both panels. The panel toggle FAB allows switching between panels (only one visible at a time). Panels slide away when not active.
- **Desktop (≥768px)**: Row layout. Both panels visible side-by-side. Control Deck takes 30% (35% on wider screens), Canvas takes the remainder. No panel toggle FAB.

### Key Layout Properties

| Element | Mobile (<768px) | Desktop (≥768px) |
|---------|-----------------|------------------|
| **Body/container** | `flex flex-col h-dvh` | `flex flex-col md:flex-row h-dvh` |
| **Control Deck width** | `w-full` | `md:w-[35%] lg:w-[30%] xl:w-[25%]` |
| **Control Deck height** | `h-[40dvh]` | `md:h-full` |
| **Control Deck border** | `border-t` (horizontal divider) | `md:border-t-0 md:border-r` (vertical divider) |
| **Control Deck shadow** | `shadow-[0_-10px_30px_rgba(0,0,0,0.4)]` (drop shadow above) | `md:shadow-2xl` (standard drop shadow) |
| **Control Deck order** | `order-2` (below Canvas) | `md:order-1` (above Canvas in row) |
| **Canvas width** | `w-full` | `md:w-[65%] lg:w-[70%] xl:w-[75%]` |
| **Canvas height** | implicit (flows after Control Deck) | `md:flex-1` (fills remaining space) |
| **Canvas border** | none (Control Deck provides `border-t`) | `md:border-l` (vertical divider) |
| **Canvas order** | `order-1` (above Control Deck) | `md:order-2` (below Control Deck in row) |
| **Body overflow** | `overflow-hidden` (internal scrolling only) | `overflow-hidden` (internal scrolling only) |
| **Safe area** | `env(safe-area-inset-top)` on header | `env(safe-area-inset-top)` on header, `env(safe-area-inset-bottom)` on Canvas |

### Gap Analysis — Current Code vs Reference Design

The following gaps were identified between the current implementation and the reference prototype at `frontend/docs/new-design/lughat_chat_studio.html`:

#### Critical Gaps (Layout Broken on Mobile)

| # | Gap | Reference | Current | Impact |
|---|---|---|---|---|
| 1 | **Body container layout** | `flex flex-col md:flex-row h-dvh` | `flex h-screen w-screen` | Horizontal on ALL screens — canvas pushed off-screen on mobile |
| 2 | **Body overflow** | `overflow-hidden` | `overflow-y-auto` | Body scrolls, panels don't constrain. Layout fix requires body to be locked; each panel scrolls internally. |
| 3 | **Control Deck mobile height** | `h-[40dvh]` (mobile) / `md:h-full` (desktop) | `h-full` | No 40dvh split on mobile |
| 4 | **Control Deck mobile border** | `border-t md:border-t-0 md:border-r` | `border-r` | No horizontal divider on mobile |
| 5 | **Control Deck ordering** | `order-2 md:order-1` | (none) | Panels never swap on mobile |
| 6 | **Control Deck mobile shadow** | `shadow-[0_-10px_30px_rgba(0,0,0,0.4)]` | `shadow-2xl` | No "floating above" shadow on mobile |
| 7 | **Canvas ordering** | `order-1 md:order-2` | (none) | Canvas never moves above control deck on mobile |
| 8 | **Canvas overflow** | `overflow-hidden` (mobile) | `overflow-y-auto md:overflow-hidden` | Mobile canvas scrolls body instead of containing |
| 9 | **Canvas width** | `md:w-[65%] lg:w-[70%] xl:w-[75%]` | `md:w-[70%] lg:w-[75%]` | Missing `xl` breakpoint, percentages off |
| 10 | **Audio player responsive width** | `md:w-[65%] lg:w-[70%] xl:w-[75%]` | `w-full md:right-0` (no width) | Player covers entire Control Deck on desktop |

#### Missing Components

| # | Gap | Reference | Current |
|---|---|---|---|
| 11 | **Mobile header** | `<header class="md:hidden ...">` with logo + status | **MISSING** — no mobile header element |
| 12 | **Canvas mobile header variant** | Mobile-specific header row (stacked label + count + clear) | **MISSING** — only desktop header exists |

#### Minor Mismatches

| # | Gap | Reference | Current |
|---|---|---|---|
| 13 | **Shortcut hint breakpoint** | `hidden md:flex` | `hidden sm:flex` (shows at 414px — too early) |
| 14 | **Toast mobile positioning** | `top-20 left-4 right-4 md:left-auto md:w-80` | `top-4 right-4` (no mobile centering) |
| 15 | **Color palette** | `studio-700: #2A2A2A` | `studio-700: #525252` (border color mismatch) |

### Component-Level Requirements

#### `index.vue` — Layout Direction Fix
- Change body container from `flex h-screen w-screen` to `flex flex-col md:flex-row h-dvh w-full overflow-hidden`
  - Use UnoCSS `h-dvh` (dynamic viewport height shortcut) — equivalent to `h-[100dvh]`, works in jsdom
  - Change from `overflow-y-auto` to `overflow-hidden` — body locked, each panel scrolls internally
- Add `h-[40dvh]` on mobile for Control Deck (removed on desktop via `md:h-full`)
- Add `border-t` on mobile (removed on desktop via `md:border-t-0 md:border-r`)
- Add `shadow-[0_-10px_30px_rgba(0,0,0,0.4)]` on mobile (replaced by `md:shadow-2xl` on desktop)
- Add `order-2` on mobile (changed to `md:order-1` on desktop) for Control Deck
- Add `order-1` on mobile (changed to `md:order-2` on desktop) for Canvas
- Add `overflow-hidden` on mobile (changed to `md:overflow-hidden` on desktop) for Canvas
- Add `md:w-[65%] lg:w-[70%] xl:w-[75%]` for Canvas (currently `md:w-[70%] lg:w-[75%]`)
- Add mobile header `<header class="md:hidden ...">` with logo + status indicator
- Add Canvas mobile header variant (stacked label + count + clear button)
- Fix shortcut hint from `hidden sm:flex` to `hidden md:flex`
- Add panel sliding transitions (slide-away when not active, matching prototype's `hidden-slide` / `visible-slide` classes)

#### `AudioPlayerPanel.vue` — Responsive Width
- Add `md:w-[65%] lg:w-[70%] xl:w-[75%]` to match Canvas proportions
- On mobile (<768px): remain full width (existing behavior)
- Remove `border-left` and `border-right` on desktop (player is now positioned within Canvas, not full viewport)

#### `ToastNotification.vue` — Mobile Positioning
- Change from `top-4 right-4` to `top-20 md:top-4 left-4 right-4 md:left-auto md:w-80`
- On mobile: centered horizontally at top (`left-4 right-4`)
- On desktop: top-right corner (`left-auto md:w-80`)

#### `uno.config.ts` — Color Palette Fix
- Change `studio-700` from `#525252` to `#2A2A2A` to match reference design

### Existing Seam Usage

- **`usePanelToggle`** (existing composable) — returns `activePanel`, `isMobile`, `togglePanel()` — already handles panel state
- **`PanelToggle`** (existing component) — FAB visible on mobile, hidden on desktop — already exists
- **`ModelStatusIndicator`** (existing component) — reused in mobile header — already exists
- **`VoiceSelector`**, **`GenerateButton`** (existing components) — no changes needed
- **`SpeedSlider`** — keep existing custom implementation (stepper buttons + pointer events) for usability; update gradient-fill styling to match prototype's gradient track (CSS variable approach, not JS calc)
- **`AudioPlayerPanel`** (existing component) — responsive width constraints only
- **`WaveformCanvas`** (existing component) — no changes needed (already implements heatmap color interpolation)
- **`FocusHaloCanvas`** (existing component) — no changes needed
- **`useToast`** (existing composable) — no changes needed
- **`usePanelToggle` breakpoint** (`BREAKPOINT_MOBILE = 768`) — matches the CSS `md:` breakpoint

### Mobile Header

A new `<header>` element renders **only below 768px** (`md:hidden`):
- Contains the app logo (waves icon + "LughatChat" with "Chat" in magenta #DD2476)
- Contains the model status indicator (same as desktop)
- Positioned at `px-4 py-3`, with `bg-studio-800`, `border-b border-studio-700`, `shrink-0`, `z-30`, `shadow-md`
- Respects `safe-area-inset-top` padding
- On desktop (≥768px): completely hidden (`md:hidden`)

The desktop header (with `text-2xl` title) remains unchanged and is hidden on mobile via `hidden md:flex` on the Control Deck's inner header section.

### Audio Player Desktop Width

The AudioPlayerPanel currently spans full width on desktop (covering the Control Deck). It should be constrained to match the Canvas width:
- `md:w-[65%] lg:w-[70%] xl:w-[75%]` (matching Canvas proportions from prototype)
- Positioned relative to the Canvas panel, not the full viewport

### Toast Notification Positioning

The toast container adapts its position based on screen width:
- **Mobile**: `top-20 left-4 right-4 md:left-auto md:w-80 z-50` — centered horizontally at top
- **Desktop**: `top-4 left-auto md:w-80` — top-right corner

### Panel Toggle Integration

The existing `usePanelToggle` composable and `PanelToggle` FAB are already in place. The layout fix makes them functional — currently the FAB toggles between panels that are both off-screen on mobile because the layout is horizontal.

### Existing Seam Usage

- **`usePanelToggle`** (existing composable) — returns `activePanel`, `isMobile`, `togglePanel()`
- **`PanelToggle`** (existing component) — FAB visible on mobile, hidden on desktop
- **`ModelStatusIndicator`** (existing component) — reused in mobile header
- **`VoiceSelector`**, **`GenerateButton`** (existing components) — no changes needed
- **`SpeedSlider`** — keep existing custom implementation (stepper buttons + pointer events) for usability; update gradient-fill styling to match prototype's gradient track (CSS variable approach, not JS calc)
- **`AudioPlayerPanel`** (existing component) — responsive width constraints only
- **`WaveformCanvas`** (existing component) — no changes needed (already implements heatmap color interpolation)
- **`FocusHaloCanvas`** (existing component) — no changes needed
- **`useToast`** (existing composable) — no changes needed
- **`usePanelToggle` breakpoint** (`BREAKPOINT_MOBILE = 768`) — matches the CSS `md:` breakpoint

### Canvas Header — Mobile Variant

The prototype shows a **mobile-specific header row** in the Canvas panel:
- On mobile: "Editor Canvas" label + character count + clear button are stacked vertically
- On desktop: "Editor Canvas" label is on the left, character count + clear button on the right
- This requires a mobile variant of the canvas header section in `index.vue`

### Shortcut Hint

The keyboard shortcut hint is hidden on mobile (`hidden md:flex` in the prototype) — currently it shows `hidden sm:flex` which is too early (414px). Fix breakpoint from `sm:flex` to `md:flex`.

## Testing Decisions

### What Makes A Good Test

Tests should verify **external layout behavior** at specific breakpoints, not implementation details. Use the existing `setBreakpoint()` helper from `tests/setup.component.ts` to simulate viewport widths.

### Modules to Test

1. **`index.vue` page tests** (component test with `@vue/test-utils` mount):
   - At 375px: layout is `flex-col`, Control Deck is 40dvh, Canvas is below it, mobile header is visible, panel toggle FAB is visible, shortcut hint is hidden
   - At 414px: same as 375px
   - At 767px: same as 375px (below breakpoint)
   - At 768px: layout is `flex-row`, both panels visible side-by-side, Control Deck is 35% width, Canvas is 65% width, mobile header is hidden, panel toggle FAB is hidden, shortcut hint is visible
   - At 1024px: same as 768px but Control Deck is 30% width, Canvas is 70% width
   - At 1280px: same as 768px but Control Deck is 25% width, Canvas is 75% width, AudioPlayerPanel matches Canvas width

2. **`AudioPlayerPanel.test.ts`** (component test):
   - At 768px+: player width matches Canvas width (65%/70%/75% at respective breakpoints)
   - At 767px: player is full width (existing behavior)
   - Desktop: player does not cover Control Deck (width is constrained, not `w-full`)

3. **`PanelToggle.test.ts`** (existing, update):
   - At 767px: FAB is visible, icon and label correct
   - At 768px: FAB is hidden
   - Layout fix makes the FAB functional (toggling actually switches visible panels)

4. **`usePanelToggle.test.ts`** (existing, update):
   - `isMobile` returns `true` at 375, 414, 767px
   - `isMobile` returns `false` at 768, 1024, 1920px

5. **`ToastNotification.test.ts`** (new/add):
   - At 375px: toast is centered horizontally (`left-4 right-4`), positioned at `top-20`
   - At 768px+: toast is in top-right corner (`left-auto`, `md:w-80`), positioned at `top-4`

6. **`uno.config.ts`** (structural test):
   - `studio-700` resolves to `#2A2A2A` (not `#525252`)

### Prior Art

- `tests/setup.component.ts` already has `setBreakpoint()` helper for simulating viewport widths
- `tests/VoiceSelector.test.ts` uses `mount()` from `@vue/test-utils` with component test setup
- `tests/AudioPlayerPanel.test.ts` has 300 tests covering responsive layout (mobile stacked vs desktop horizontal)
- `tests/SpeedSlider.test.ts` has responsive tests (stepper vs slider)
- Existing 10-12 frontend test failures related to layout refactor (index.test.ts, indexTwoPanel.test.ts) assert on specific CSS classes (`h-dvh`, `overflow-y-auto`, `h-screen`), color values (`#121212`, `rgb` codes), and DOM structure (aside/main order) — these will need updating to match the new classes/values
- **Test files that will break and need updating:**
  - `tests/index.test.ts` — asserts on `h-screen`, `overflow-y-auto`, `h-dvh`, `flex h-screen w-screen`
  - `tests/indexTwoPanel.test.ts` — asserts on `aside/main` order, CSS classes
  - `tests/AudioPlayerPanel.test.ts` — 300 tests cover responsive layout (mobile stacked vs desktop horizontal)
  - `tests/PanelToggle.test.ts` — FAB visibility tests
  - `tests/usePanelToggle.test.ts` — `isMobile` breakpoint tests
  - `tests/ToastNotification.test.ts` — toast positioning tests
  - `tests/SpeedSlider.test.ts` — responsive tests (stepper vs slider)
  - `tests/VoiceSelector.test.ts` — component tests that may assert on CSS classes
  - Any test asserting `studio-700: #525252` will fail (color change to `#2A2A2A`)

## Out of Scope

- **AI Smart Tools Toolbar** — covered by a separate PRD (prd-ai-smart-tools-toolbar.md)
- **New components** — only existing components are modified; no new components are introduced
- **`AudioPlayer.vue`** — marked for deletion (dead code, ~300 lines, unused by any component). Remove during this PRD to reduce technical debt.
- **Backend changes** — no API or backend modifications
- **Performance optimization** — no animation/frame-rate changes; existing transitions are preserved
- **Accessibility beyond WCAG touch targets** — existing ARIA attributes, keyboard shortcuts, and screen reader support are preserved unchanged
- **New breakpoints** — the existing `xs: 375px`, `sm: 414px`, `md: 768px` breakpoints from `uno.config.ts` are sufficient

## Further Notes

### Why This Is Different from Issues 31-37

Issues 31-37 cover individual component-level responsive changes (viewport meta, panel toggle FAB, speed stepper, audio player stacking, waveform DPR). However, **none of them address the core layout**: the two-panel `flex h-screen` container is horizontal on all screen sizes, making the layout fundamentally broken on mobile.

The layout fix is the **foundation** that all other responsive changes depend on. Without it, the panel toggle FAB toggles between two panels that are both off-screen.

### Technology Stack — Preserved from Current Application

The reference prototype at `frontend/docs/new-design/lughat_chat_studio.html` uses **Tailwind CSS** and **Phosphor Icons**. The current application uses **UnoCSS** and **Lucide Icons**. **These must be preserved** — the reference design is a visual guide only, not a technology specification.

- **CSS**: UnoCSS (with `presetWind3`) replaces Tailwind CSS. UnoCSS compiles Tailwind-compatible utility classes at build time. All UnoCSS classes used in the current codebase (`md:w-[35%]`, `flex`, `flex-col`, `border`, `rounded`, `p-6`, etc.) are compatible with `presetWind3`. The reference prototype's Tailwind classes serve as the class-name reference; we implement them using UnoCSS-compatible syntax.
- **Icons**: Lucide Icons (via `@iconify-json/lucide`) replaces Phosphor Icons. The reference prototype's Phosphor icon names (e.g., `ph-waves`, `ph-play`, `ph-trash`) must be mapped to their Lucide equivalents (e.g., `i-lucide-audio-waveform`, `i-lucide-play`, `i-lucide-trash`). Icon names are already mapped in the current codebase.
- **Google Fonts**: Both use Inter + Cairo. Preserved via UnoCSS `presetWebFonts`.
- **Color palette**: The `studio` and `sunrise` colors from the reference design are already defined in `uno.config.ts`. The change needed is correcting `studio-700` from `#525252` to `#2A2A2A` (affects 40+ locations — all borders, buttons, backgrounds).
- **`.hide-scrollbar`**: A new CSS utility class is added to `<style>` blocks (or `index.vue`) for horizontal toolbars. Prevents scrollbar visibility while maintaining scroll functionality. Needed for future AI toolbar implementation.
- **`h-dvh`**: UnoCSS shortcut for `100dvh` (dynamic viewport height). Used instead of explicit `h-[100dvh]` for jsdom test compatibility.

### Existing Issues Status

- **Issue 31** (Viewport, Breakpoints & Scroll): Marked "Complete" but the layout is still `flex h-screen` (horizontal). The acceptance criteria mention scroll fixes but not the layout direction.
- **Issue 32** (Panel Toggle): Has the composable and FAB, but the FAB is non-functional because the layout is broken.
- **Issue 35** (Audio Player): Has responsive stacking but the player spans full width on desktop, covering the Control Deck.
- **Issues 33, 34, 36, 37**: Component-level responsive changes that are independent of the layout fix.

### Minimal Changes Required

The fix touches primarily:

1. **`index.vue`** — Layout direction (`flex-col md:flex-row`), body `overflow-hidden`, Control Deck height (40dvh)/border/shadow/order, Canvas height/border/order/overflow/width, mobile header (Lucide icons), Canvas mobile header variant, shortcut hint breakpoint, panel sliding transitions, audio player responsive width, `.hide-scrollbar` CSS utility
2. **`AudioPlayerPanel.vue`** — Desktop width constraint (`md:w-[65%] lg:w-[70%] xl:w-[75%]`), remove full-width borders on desktop
3. **`ToastNotification.vue`** — Mobile positioning (`top-20 left-4 right-4 md:left-auto md:w-80`)
4. **`SpeedSlider.vue`** — Update gradient-fill styling to match prototype (CSS variable approach, not JS calc); keep stepper buttons for usability
5. **`uno.config.ts`** — Color palette fix (`studio-700: #2A2A2A`)
6. **`AudioPlayer.vue`** — Mark for deletion (dead code, ~300 lines, unused)

All other components (VoiceSelector, GenerateButton, PanelToggle, ModelStatusIndicator, FocusHaloCanvas, WaveformCanvas) require **zero changes**.

### Icon Mapping Reference (Reference → Current)

| Reference (Phosphor) | Current (Lucide) | Used In |
|---|---|---|
| `ph-waves` | `i-lucide-audio-waveform` | Logo, VoiceSelector |
| `ph-waveform` | `i-lucide-audio-waveform` | VoiceSelector |
| `ph-user-sound` | `i-lucide-headphones` | VoiceSelector label |
| `ph-play` / `ph-pause` | `i-lucide-play` / `i-lucide-pause` | AudioPlayerPanel, GenerateButton |
| `ph-play-circle` | `i-lucide-play` | GenerateButton |
| `ph-gauge` | `i-lucide-gauge` | SpeedSlider |
| `ph-sliders-horizontal` | `i-lucide-sliders-horizontal` | PanelToggle, OutputSettings |
| `ph-keyboard` | `i-lucide-terminal` | Canvas header |
| `ph-trash` | `i-lucide-trash` | Clear button |
| `ph-download-simple` | `i-lucide-download` | AudioPlayerPanel |
| `ph-x` | `i-lucide-x` | Close button |
| `ph-music-notes` | `i-lucide-music` | AudioPlayerPanel |
| `ph-caret-down` | `i-lucide-chevron-down` | VoiceSelector |
| `ph-warning-circle` | `i-lucide-alert-circle` | Toast error |
| `ph-check-circle` | `i-lucide-check-circle` | Toast success |
| `ph-badge-info` | `i-lucide-badge-info` | Toast info |
| `ph-volume-x` | (not used) | — |
| `✨` emoji | `✨` emoji | AI tools (preserved as-is) |

## Risks and Challenges

This section documents the concrete challenges identified when comparing the reference prototype (`frontend/docs/new-design/lughat_chat_studio.html`) against the current application codebase.

### 1. UnoCSS → Tailwind Class Parity

The reference prototype uses raw Tailwind CSS (loaded via CDN). The current application uses UnoCSS with `presetWind3`. Most Tailwind utility classes map 1:1 to UnoCSS, but there are known gotchas:

- **`100dvh`** — UnoCSS handles it, but jsdom tests may struggle (there's a known memory about CSS attribute selectors with brackets failing in jsdom)
- **`shadow-[0_-10px_30px_rgba(0,0,0,0.4)]`** — arbitrary values with `rgba()` in UnoCSS may behave differently than Tailwind's JIT
- **`bg-studio-800`** — custom theme colors already defined in `uno.config.ts`, but `studio-700` is the wrong value (`#525252` vs `#2A2A2A`)
- **`ease-[cubic-bezier(0.16,1,0.3,1)]`** — arbitrary easing values in UnoCSS may not resolve the same way as Tailwind's `ease-[cubic-bezier(...)]`

**Risk:** A class that renders perfectly in the prototype's browser may render slightly differently in UnoCSS's compiled output, causing pixel-level mismatches.

### 2. Speed Slider — Gradient-Fill Styling (Decision: Keep Custom Implementation)

The reference prototype uses a native `<input type="range">` styled with CSS (webkit slider thumb, gradient track via CSS variable). The current `SpeedSlider.vue` uses a **custom pointer-event implementation** (div-based track, thumb, filled track) with stepper buttons on mobile.

**Decision:** Keep the existing custom implementation (stepper buttons + pointer events) for usability. Update the gradient-fill styling to match the prototype's approach (CSS variable for track fill, not JS `trackPercent` calc). This preserves functional requirements (stepper buttons) while matching visual fidelity.

**Challenge:** The reference's slider has a gradient fill that tracks the thumb position via a CSS variable (`--fill`). The current slider calculates `trackPercent` in JS and sets width. Need to adapt the current pointer-event implementation to use the prototype's gradient-fill approach.

### 3. Panel Sliding Transitions — No Existing CSS

The reference prototype has `.hidden-slide` and `.visible-slide` CSS classes with `transform: translateY()` and `opacity` transitions. The current codebase has **no equivalent** — the `PanelToggle` FAB exists but panels don't slide because the layout is always horizontal.

The current `index.vue` references `panel-slide-enter` and `panel-slide-leave` classes in the template, but these CSS rules **do not exist anywhere** in the codebase. This needs to be created from scratch, matching the prototype's `translateY(150%)` → `translateY(0)` animation with the same cubic-bezier easing.

**Challenge:** Getting the slide animation to work correctly on mobile while not breaking desktop layout requires careful use of CSS transforms (which affect stacking context) and ensuring `pointer-events` are correctly toggled.

### 4. Mobile Header — Brand New Component

There is **no mobile header** in the current application. The reference prototype has a complete `<header>` element with:
- Logo (waves icon + "LughatChat" with magenta "Chat")
- Status indicator (green dot + "Ready")
- Specific styling (`px-4 py-3`, `bg-studio-800`, `border-b`, `shadow-md`, `z-30`)

This needs to be built from scratch as a new `<header>` element inside `index.vue` (or as a component). It must be `md:hidden` and respect `safe-area-inset-top`.

**Decision:** Mobile header confirmed as designed. Uses `i-lucide-audio-waveform` (mapped from Phosphor's `ph-waves`), reuses `ModelStatusIndicator` component. Height ~44px (`px-4 py-3`).

**Challenge:** Mobile headers have historically caused layout overflow issues on this project (there's a memory about `env(safe-area-inset-top)` on body causing mobile header to push content below the fold). Must apply safe area padding only to the header element, not the body.

### 5. Canvas Mobile Header Variant — Stacked Layout (Decision: Confirmed)

The reference prototype shows a **mobile-specific header row** inside the Canvas panel where "Editor Canvas", character count, and clear button stack vertically. The current code has only a **desktop header** (horizontal row).

**Decision:** Stacked mobile canvas header confirmed. On mobile: label + count + clear button stacked vertically. On desktop: horizontal row (existing).

**Challenge:** This requires restructuring the canvas header section to conditionally render different layouts based on breakpoint — a new DOM structure on top of existing components.

### 6. Toast Animation System — Positioning (Decision: Confirmed)

The reference prototype implements toasts with a **slide-in-from-right** animation (`translate-x-full` → `translate-x-0`), while the current `ToastNotification.vue` uses a **slide-in-from-right** animation via `toast-slide` transitions (`translateX(100%)` → `translateX(0)`). The visual approach is similar, but:

- The reference positions toasts at `top-20` on mobile (centered, `left-4 right-4`), currently the app has `top-4 right-4` (top-right corner only)
- The reference uses `pointer-events-none` on the container with `pointer-events-auto` on individual toasts; the current app doesn't explicitly manage pointer events

**Decision:** Toast positioning confirmed — viewport-level (always visible regardless of panel state). Mobile: `top-20 left-4 right-4` (centered). Desktop: `top-4 left-auto md:w-80` (top-right).

**Challenge:** Changing toast positioning from top-right to center-on-mobile requires updating both the template and any tests that assert on toast position.

### 7. Custom CSS — Missing Rules to Add

The reference prototype has extensive custom `<style>` blocks that don't exist in the current application:

| Custom CSS | Status in Current App |
|---|---|
| `::-webkit-scrollbar` (dark theme) | ✅ Already in `index.vue` |
| `input[type=range]` custom styling | ❌ Not used (SpeedSlider is custom) |
| `.slider-track` gradient fill | ⚠️ Partial (SpeedSlider uses JS calc) — update to CSS variable |
| `.canvas-halo` radial gradient | ✅ Already in `FocusHaloCanvas.vue` |
| `.btn-glow-border` spinning conic gradient | ✅ Already in `GenerateButton.vue` |
| `.loader` spinner | ✅ Already in `GenerateButton.vue` |
| `.hidden-slide` / `.visible-slide` | ❌ **Missing entirely** |
| `textarea { caret-color: #FF512F }` | ✅ Inline style in `index.vue` |
| `.hide-scrollbar` | ❌ **Missing** — add now (needed for future AI toolbar) |

**Challenge:** The `hidden-slide` / `.visible-slide` classes are critical for the panel sliding feature but don't exist at all. They need to be added to `index.vue`'s `<style>` block. The `.hide-scrollbar` utility must also be added.

### 8. `usePanelToggle` — Sliding Integration

The current `usePanelToggle` composable returns `activePanel`, `isMobile`, and `togglePanel()`. For the sliding panels to work, `index.vue` references `panel-slide-enter` / `panel-slide-leave` classes conditionally, but these CSS rules don't exist.

**Decision:** Panel sliding direction (up/down, `translateY(150%)`) confirmed. Matches prototype's approach.

**Challenge:** The composable may need to expose additional state (e.g., `isTransitioning`) to prevent interactions during slide animations, and the CSS transitions need to be written to match the prototype's timing.

### 9. `studio-700` Color Change — Global Impact (Decision: Follow Prototype)

The current `uno.config.ts` defines `studio-700: '#525252'` (a mid-gray), but the reference prototype uses `#2A2A2A` for borders and inactive elements. Changing this to `#2A2A2A` will affect **every component** that uses `border-studio-700` or `bg-studio-700` — 40+ locations.

**Decision:** Follow the reference prototype exactly. `#2A2A2A` is the correct value.

**Challenge:** This is a **global color change** that could have unintended visual side effects on components that were designed around the current mid-gray value. Requires careful review of all usages. On a `#1A1A1A` background, `#2A2A2A` borders have very low contrast — they'll be subtle but visible, matching the prototype's "premium" aesthetic.

### 10. Icon Visual Differences (Phosphor → Lucide)

While the icon mapping is straightforward, Lucide and Phosphor icons have different visual characteristics:
- **Stroke width**: Phosphor icons tend to be slightly bolder; Lucide icons are thinner
- **Proportions**: Some icons have different aspect ratios (e.g., `ph-waves` vs `i-lucide-audio-waveform`)
- **Roundness**: Terminal icon (`ph-keyboard` → `i-lucide-terminal`) looks quite different

**Decision:** Icon mapping already exists in the codebase. No changes needed — Lucide icons are already mapped and used.

**Challenge:** The visual "feel" of the app will shift when swapping icon families. The reference prototype's design language is optimized for Phosphor's aesthetic; Lucide may look slightly off in places where the reference design assumed Phosphor's proportions.

### Summary

| Challenge | Severity | Effort | Decision |
|---|---|---|---|
| UnoCSS class parity | Medium | Low — most map 1:1 | Use `h-dvh` shortcut |
| Speed slider styling | Medium | Medium — gradient-fill update | Keep custom impl, update styling |
| Panel sliding CSS (missing) | **High** | Medium — new CSS to write | Confirmed (up/down, `translateY(150%)`) |
| Mobile header (new) | **High** | Low — straightforward | Confirmed |
| Canvas mobile header (new) | **High** | Low — new DOM structure | Confirmed (stacked) |
| Toast repositioning | Low | Low — class change | Confirmed (viewport-level) |
| Custom CSS porting | Medium | Low — most already exist | Add `.hide-scrollbar` |
| `usePanelToggle` updates | Medium | Low — may need extra state | Sliding confirmed |
| `studio-700` global color | **High** | Low change, high risk | Follow prototype (`#2A2A2A`) |
| Icon visual differences | Low | Negligible — mapping exists | No changes needed |
| `AudioPlayer.vue` dead code | Low | Low — delete 300 lines | Mark for deletion |
| Mobile font size | Low | Low — adjust value | Middle ground (between `text-2xl` and `text-3xl`) |
| Line height | Low | Low — adjust value | `leading-relaxed` universally (best for Arabic) |

**Highest-risk items:** (3) missing panel sliding CSS, (4) new mobile header (safe-area history), (9) `studio-700` global color change.

### Additional Decisions from Review

| Decision | Value | Rationale |
|---|---|---|
| Mobile Control Deck height | `40dvh` (not 45dvh) | More space for textarea on mobile |
| Mobile textarea font | Middle ground (between `text-2xl` and `text-3xl`) | Readable for Arabic, fits in reduced Canvas space |
| Line height | `leading-relaxed` universally | Best for Arabic with diacritics (harakat) |
| `.hide-scrollbar` | Add to CSS | Prevents scrollbar on horizontal toolbars (needed for AI toolbar) |
| `AudioPlayer.vue` | Mark for deletion | Dead code (~300 lines, unused) |
| Speed slider | Keep custom impl + update styling | Usability (stepper buttons) + visual fidelity (gradient fill) |
| Panel sliding | Up/down (`translateY(150%)`) | Matches prototype, correct direction for stacked mobile layout |
| Toast positioning | Viewport-level (always visible) | Always visible regardless of panel state |
| Canvas mobile header | Stacked (label + count + clear) | Matches prototype, accessible on narrow screens |
| Mobile header | Confirmed as designed | Logo + status indicator, ~44px height |
| Audio player (desktop) | Constrained to Canvas width | Follows prototype, Control Deck stays visible |
| Shortcut hint | Hidden on mobile (`hidden md:flex`) | No Ctrl key on mobile, saves screen space |
| `studio-700` | `#2A2A2A` (exact prototype match) | 40+ locations — global color change |
| `h-dvh` | UnoCSS shortcut (not `h-[100dvh]`) | Works in jsdom tests |
