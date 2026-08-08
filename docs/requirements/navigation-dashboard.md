# Requirements Document: Navigation & Dashboard

> **Generated:** 2026-08-03
> **Source:** `docs/adr/OPEN-QUESTIONS.md` (grilling session outcomes) + `docs/proto/lesson-details.html` (prototype)
> **Status:** Ready for implementation planning

---

## 1. Vision

LughatChat evolves from a **single-page TTS Studio** into a **multi-page Language Learning Platform**. The existing TTS Studio becomes one tool inside a larger ecosystem with:

- **Dashboard** (`/dashboard`) — course overview, progress tracking
- **Dashboard sub-routes** (`/dashboard/level/{level}` and `/dashboard/level/{level}/{lesson}`) — structured learning content with TTS integration
- **TTS Studio** (`/`) — stays at root, unchanged functionality, adapted layout

---

## 2. Decisions (Confirmed)

| ID | Decision | Rationale |
|---|---|---|
| D1 | App identity: "Language Learning Platform" (not "TTS app") | User direction — TTS becomes a tool inside the platform |
| D2 | TTS Studio stays at `/` | Existing user journeys preserved, dashboard is secondary |
| D3 | Dashboard at `/dashboard` | New Nuxt page file |
| D4 | Lesson pages at `/dashboard/level/{level}` and `/dashboard/level/{level}/{lesson}` (e.g., `/dashboard/level/a1/1`) | Dynamic Nuxt route |
| D5 | Shared layout with navbar in `app.vue` | Consistent navigation across all pages |
| D6 | Full theme rebrand (dark → light, green → teal/gold) | Prototype direction |
| D7 | Page title pattern: `LughatChat - [page-name]` | Nuxt 4 standard (`useHead`/`useSeoMeta` per-page merging) |
| D8 | Backend SQLite for lesson progress | Single anonymous user, local Docker app |
| D9 | Lesson content stored as JSON files | Structured: sections, activities, competencies |
| D10 | Single anonymous user — no authentication | Local Docker-based application |
| D11 | Panels shrink to `calc(100vh - navbar_height)` | TTS Studio adapts to shared navbar; mobile-aware |
| D12 | Confirm dialog before cleaning orphan files on navigation | User confirmed |

---

## 3. Scope

### 3.1 In Scope (This Phase)

1. **Shared Navbar Component** — built from prototype, adapted to UnoCSS
2. **Layout Restructuring** — `app.vue` wraps `<NuxtPage />` with navbar
3. **TTS Studio Layout Adaptation** — panels shrink, mobile handled
4. **Full Theme Rebrand** — colors, fonts, background, shadows
5. **Dashboard Page** (`/dashboard`) — basic shell (content deferred)
6. **Lesson Page Shell** (`/dashboard/level/[level]/[lesson].vue`) — basic shell (content deferred)
7. **Per-Page SEO Titles** — `useHead`/`useSeoMeta` per page

### 3.2 Deferred (Future Phases)

- **OQ-5**: Lesson JSON file location and API design
- **OQ-6**: Lesson page rendering (section types, activity types)
- **OQ-7**: Customer journey updates (REGISTRY.md)
- **OQ-8**: SQLite schema design (levels, lessons, progress tables)
- **OQ-9**: New backend API endpoints

---

## 4. Requirements

### R-1: Shared Navbar Component

**Component:** `app/components/GlobalNavbar.vue`

#### 4.1.1 Top Bar (h-14 / 56px)

- **Left:** Logo icon (book/education) + "LughatChat" text — links to `/` (TTS Studio)
- **Right:** Action buttons (Ask Instructor, Settings), user avatar placeholder
- **Styling:** `bg-white dark:bg-stone-900`, `border-b border-stone-200 dark:border-stone-700`, `shadow-sm`

#### 4.1.2 Progress Bar (h-1 / 4px)

- Below top bar, full-width
- Track: `bg-stone-100 dark:bg-stone-700`
- Fill: `bg-gradient-to-r from-primary-500 to-primary-600` (dynamic width based on lesson progress)

#### 4.1.3 Navigation Links

| Link | Route | Label |
|---|---|---|
| Home | `/` | TTS Studio (default landing) |
| Dashboard | `/dashboard` | Dashboard |
| Lessons | `/dashboard/level/{level}` | My Courses (dashboard sub-route) |

#### 4.1.4 Active State

- Current page highlighted with `text-primary-700` (light) / `text-primary-400` (dark)
- Uses Nuxt `<NuxtLink>` with active class detection

### R-2: Mobile Navbar

**Breakpoint:** `< 768px` (matches existing `md` breakpoint)

- **Desktop:** Full horizontal navbar (R-1)
- **Mobile:** Collapses to compact bar:
  - Logo + 2-3 key nav icons (Home, Dashboard, Lessons)
  - Action buttons (Ask Instructor, Settings) move to a dropdown/overflow menu
  - Progress bar collapses (hidden on mobile, or shown as small dot indicator)
  - Height may increase to `h-16` (64px) to accommodate touch targets (WCAG 44px minimum)

### R-3: Layout Restructuring

#### 3.3.1 `app.vue`

**Before:**
```vue
<script setup lang="ts">
useHead({ meta: [...] })
useSeoMeta({ title: 'Lughat Chat - Premium Audio Studio', description: '...' })
</script>
<template>
  <div>
    <NuxtPage />
  </div>
</template>
```

**After:**
```vue
<script setup lang="ts">
useHead({ meta: [...], link: [...] })
// Root title — pages append/override per-page
useSeoMeta({ title: 'LughatChat', description: '...' })
</script>
<template>
  <div class="min-h-screen bg-stone-50 dark:bg-stone-900">
    <GlobalNavbar />
    <NuxtPage />
  </div>
</template>
```

#### 3.3.2 TTS Studio (`index.vue`) Adaptation

**Before:** `100vh` full viewport, `overflow: hidden` on body, two panels fill all space.

**After:**
- Outer wrapper: `calc(100vh - 60px)` (navbar height = 56px top bar + 4px progress)
- Body: `overflow: visible` (already the case)
- Panels: `height: calc(100vh - 60px)` or `flex: 1` within a flex column
- Mobile: stacked panels with `height: calc(100vh - 60px - safe-area-adjustments)`

**Key CSS change:**
```css
/* Before */
html, body { overflow: hidden; }
[data-panel="canvas"], [data-panel="control-deck"] { height: 100vh; }

/* After */
html, body { overflow: visible; }
.tts-container { height: calc(100vh - 60px); }
@media (max-width: 767px) {
  .tts-container { height: calc(100vh - 64px - env(safe-area-inset-top) - env(safe-area-inset-bottom)); }
}
```

### R-4: Full Theme Rebrand

#### 4.4.1 Color Palette (UnoCSS Mapping)

| Token | Light Mode | Dark Mode | Current (to remove) |
|---|---|---|---|
| `primary-50` | `#f0fdfa` | `#134e4a` | — |
| `primary-100` | `#ccfbf1` | `#115e59` | — |
| `primary-200` | `#99f6e4` | `#0f766e` | — |
| `primary-300` | `#5eead4` | — | — |
| `primary-400` | `#2dd4bf` | — | — |
| `primary-500` | `#14b8a6` | — | — |
| `primary-600` | `#0d9488` | — | — |
| `primary-700` | `#0f766e` | — | — |
| `primary-800` | `#115e59` | — | — |
| `primary-900` | `#134e4a` | — | — |
| `gold-400` | `#fbbf24` | — | — |
| `gold-500` | `#f59e0b` | — | — |
| `gold-600` | `#d97706` | — | — |
| `stone-50` | `#fafaf9` | `#1c1917` | `#fafaf9` (light only, already Tailwind) |
| `studio-900` | **REMOVED** | **REMOVED** | `#121212` (dark primary) |
| `studio-800` | **REMOVED** | **REMOVED** | `#1A1A1A` |
| `studio-700` | **REMOVED** | **REMOVED** | `#333333` |
| `sunrise-orange` | **REMOVED** | **REMOVED** | `#FF512F` |
| `sunrise-magenta` | **REMOVED** | **REMOVED** | `#DD2476` |

**Migration notes:**
- All `bg-studio-900` → `bg-white` (light) / `bg-stone-900` (dark)
- All `text-sunrise-orange` → `text-primary-600` (or `text-primary-500`)
- All `text-sunrise-magenta` → `text-gold-500` (or `text-primary-400`)
- Gradient `#FF512F → #DD2476` → `#14b8a6 → #0f766e` (teal gradient)
- Gradient `#0d9488 → #115e59` (dark teal for hero/backgrounds)

#### 4.4.2 Background

**Before:** Dark fixed background with radial gradient orbs (orange/magenta/purple) + film grain.

**After:** Light mode background:
- Base: `bg-stone-50` (light) / `bg-stone-900` (dark)
- Subtle gradient orbs: teal tones instead of orange/magenta
- Film grain: reduced or removed (light mode, lower opacity)

#### 4.4.3 Shadows

**Before:** `--shadow-ambient: 0 8px 32px rgba(0,0,0,0.25)` (dark-optimized)

**After:** Light mode shadows (softer, less contrast):
```css
--shadow-ambient: 0 4px 24px rgba(0, 0, 0, 0.08);
--shadow-soft: 0 2px 12px rgba(0, 0, 0, 0.06);
--shadow-elevated: 0 12px 36px rgba(0, 0, 0, 0.12);
```

### R-5: Font Changes

#### 5.5.1 Current → New

| Current | New | Purpose |
|---|---|---|
| `Plus Jakarta Sans` (300-700) | `Inter` (via Tailwind/UnoCSS default) | Latin UI text |
| `Noto Sans Arabic` (400-700) | `Amiri` (via Google Fonts or self-hosted) | Arabic text |
| `Cairo` (400, 600) | Keep as fallback | Arabic fallback |

#### 5.5.2 Implementation

**Option A (CDN — simpler, requires network):**
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/inter@latest/index.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/amiri@latest/index.css">
```

**Option B (Self-hosted — 100% offline, matches current practice):**
- Download woff2 files for Inter (400, 500, 600, 700) and Amiri (400, 700)
- Place in `frontend/app/assets/fonts/` (or `public/fonts/`)
- Add `@font-face` declarations to `main.css` (matching existing pattern)

**Recommendation:** Option B (self-hosted) to maintain 100% offline capability.

#### 5.5.3 UnoCSS Config Update

```ts
// uno.config.ts
theme: {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],  // was: Plus Jakarta Sans
    arabic: ['Amiri', 'serif']  // was: Noto Sans Arabic, Cairo
  },
  colors: {
    primary: { /* 50-900 teal scale */ },
    gold: { /* 400-600 gold scale */ }
    // REMOVE: studio, sunrise
  }
}
```

### R-6: Per-Page SEO Titles

#### 6.6.1 Pattern

Root (`app.vue`): `useSeoMeta({ title: 'LughatChat' })`
Per-page: `useSeoMeta({ title: 'TTS Studio' })` → renders as `LughatChat - TTS Studio`

Nuxt 4 merges root + page-level titles with ` - ` separator.

#### 6.6.2 Per-Page Titles

| Page | Route | Title |
|---|---|---|
| TTS Studio | `/` | `TTS Studio` |
| Dashboard | `/dashboard` | `Dashboard` |
| Dashboard by Level | `/dashboard/level/{level}` | `Dashboard — Level {level}` |
| Lesson | `/dashboard/level/{level}/{lesson}` | `{lesson title}` (e.g., `The Salutations`) |

### R-7: Orphan File Cleanup on Navigation

**Requirement:** When user navigates away from TTS Studio (`/`) with an in-flight synthesis:

1. Show confirmation dialog: "A synthesis is in progress. Clean up the generated files when you leave?"
2. Options: "Clean & Leave" / "Stay"
3. If "Clean & Leave": abort the fetch, trigger `/api/cleanup` for orphan files
4. If "Stay": remain on page, synthesis continues

**Implementation:**
- Intercept `onBeforeRouteLeave` (Nuxt) or `window:beforeunload`
- Check `isGenerating.value` or `audioModule.isStreaming`
- Show modal if active synthesis detected
- Call `audioModule.dispose()` + cleanup API

### R-8: Dashboard Page Shell

**Route:** `/dashboard`
**File:** `app/pages/dashboard.vue`

**Content (deferred, but shell required):**
- Header: "Your Learning Journey"
- Course/level cards grid (A1, A2, B1, B2...)
- Progress indicators per course
- "Continue Learning" CTA → navigates to last active lesson

**Design direction (from prototype):**
- `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` content width
- White cards with `rounded-2xl`, `shadow-sm`, `border border-stone-200`
- Teal gradient accents
- Gold badges for lesson numbers

### R-9: Lesson Page Shell

**Route:** `/dashboard/level/{level}/{lesson}`
**File:** `app/pages/dashboard/level/[level]/[lesson].vue` (dynamic route)

**Content (deferred, but shell required):**
- Breadcrumbs: Dashboard → Level {level} → Lesson {id}
- Hero section: lesson title (English + Arabic), level badge, status, metadata
- Section tabs: Dialogue, Vocabulary, Pronouns, Expressions, Grammar, Activities
- Main content area (rendered per-section type)
- Sticky audio bar (fixed bottom, from prototype)

**Design direction (from prototype):**
- `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` content width
- Hero: `bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900` with Arabic text overlay
- Tabs: `bg-stone-100 rounded-xl p-1.5 flex flex-wrap gap-1`
- Audio bar: `fixed bottom-0`, slide-up animation, play controls, progress, speed

### R-10: Audio Player Bar (Sticky Bottom)

**Component:** `app/components/StickyAudioBar.vue` (new)

From prototype (lines 319-369), adapted to UnoCSS:

- **Fixed bottom**, slides up when active (`transform translate-y-full` → `translate-y-0`)
- **Controls:** prev line, play/pause (primary-600 rounded-full), next line
- **Current line display:** Arabic text (RTL), wave animation during playback
- **Progress bar:** `bg-stone-200` track, `bg-primary-500` fill
- **Speed controls:** 0.75x, 1x, 1.25x (pill toggle)
- **Repeat button, close button**

**Integration:**
- Replaces current `AudioPlayerPanel` on TTS Studio page (or wraps it)
- Reusable across Dashboard and Lesson pages
- Dark mode: `bg-white` → `bg-stone-800`, `text-stone-800` → `text-stone-200`, `border-stone-200` → `border-stone-700`

### R-11: Existing Component Updates

Components that reference removed theme tokens (`studio-*`, `sunrise-*`):

| Component | Changes Required |
|---|---|
| `AudioPlayerPanel.vue` | `bg-studio-900` → `bg-stone-800` (dark) / `bg-white` (light) |
| `WaveformCanvas.vue` | Gradient colors `#FF512F → #DD2476` → `#14b8a6 → #0f766e` |
| `SpeedSlider.vue` | Gradient `#DD2476, #FF512F` → `#14b8a6, #0f766e` |
| `GenerateButton.vue` | `text-sunrise-orange` → `text-primary-500` |
| `VoiceSelector.vue` | `text-sunrise-orange` → `text-primary-600`, `text-sunrise-magenta` → `text-gold-500` |
| `ModelStatusIndicator.vue` | `bg-studio-900` → `bg-stone-800` (dark) / `bg-white` (light) |
| `MobileStatusIndicator.vue` | `bg-studio-900` → `bg-stone-800` (dark) / `bg-white` (light) |
| `ToastNotification.vue` | `bg-studio-800` → `bg-stone-800` (dark) / `bg-white` (light) |
| `FocusHaloCanvas.vue` | Gradient `#FF512F, #DD2476` → `#14b8a6, #0f766e` |
| `index.vue` (TTS Studio) | All theme tokens updated, layout adapted |

### R-12: CSS Global Updates

**`main.css` changes:**

1. **Body background:** Remove dark gradient orbs, add light mode subtle teal orbs
2. **Scrollbars:** `#121212` track → `#fafaf9` (light) / `#1c1917` (dark); thumb colors adjusted
3. **Textarea caret:** `#FF512F` → `#14b8a6` (primary-500)
4. **Placeholder color:** `#404040` → `#78716c` (stone-500)
5. **Film grain:** opacity reduced from 0.025 to 0.01 (light mode)
6. **Dark mode:** preserve existing dark theme overrides (`.dark:` variants)

### R-13: Existing Functionality Preservation

**Must NOT change (behaviorally):**

- TTS synthesis flow (text input → voice select → speed → generate → play)
- Audio playback controls (play, pause, seek, speed)
- Voice discovery from `speaker_wavs/`
- Model health polling (`/health` endpoint)
- Audio history (`/api/history`)
- Cleanup endpoint (`/api/cleanup`)
- Mobile panel divider (drag to resize canvas/control deck ratio)
- Scroll-reveal animations (IntersectionObserver fade-up)
- Accessibility: ARIA labels, keyboard shortcuts (Ctrl/Cmd+Enter), screen reader announcements
- All 11 existing customer journeys on `/`

---

## 5. File Inventory

### New Files

| File | Purpose |
|---|---|
| `app/components/GlobalNavbar.vue` | Shared navigation bar (top bar + progress) |
| `app/components/StickyAudioBar.vue` | Sticky bottom audio player (from prototype) |
| `app/pages/dashboard.vue` | Dashboard page shell |
| `app/pages/dashboard/level/[level]/[lesson].vue` | Lesson page shell (dynamic route) |

### Modified Files

| File | Changes |
|---|---|
| `app/app.vue` | Add `<GlobalNavbar />`, update SEO, add layout wrapper |
| `app/pages/index.vue` | Layout: `100vh` → `calc(100vh - 60px)`, theme tokens, orphan cleanup |
| `app/components/AudioPlayerPanel.vue` | Theme tokens (studio → stone/primary) |
| `app/components/WaveformCanvas.vue` | Gradient colors |
| `app/components/SpeedSlider.vue` | Gradient colors |
| `app/components/GenerateButton.vue` | Text color tokens |
| `app/components/VoiceSelector.vue` | Color tokens |
| `app/components/ModelStatusIndicator.vue` | Background tokens |
| `app/components/MobileStatusIndicator.vue` | Background tokens |
| `app/components/ToastNotification.vue` | Background tokens |
| `app/components/FocusHaloCanvas.vue` | Gradient colors |
| `uno.config.ts` | Replace `studio`/`sunrise` with `primary`/`gold`, update fonts |
| `app/assets/css/main.css` | Fonts, background, scrollbars, caret, dark variants |
| `nuxt.config.ts` | Add Inter + Amiri font links (if CDN option) or update font paths |

### Deferred (Not in Scope)

- Backend SQLite schema and endpoints (OQ-8, OQ-9)
- Lesson JSON content structure (OQ-5)
- Lesson page interaction model (OQ-6)
- REGISTRY.md customer journey updates (OQ-7)

---

## 6. Acceptance Criteria

- [ ] Navbar renders consistently across `/`, `/dashboard`, `/dashboard/level/{level}`, `/dashboard/level/{level}/{lesson}`
- [ ] TTS Studio at `/` functions identically (synthesis, playback, voice selection, mobile divider)
- [ ] Panels shrink to `calc(100vh - 60px)` on desktop
- [ ] Mobile navbar collapses appropriately (< 768px) with touch targets ≥ 44px
- [ ] All theme tokens migrated: no `studio-*` or `sunrise-*` references remain
- [ ] Fonts: Inter (Latin) + Amiri (Arabic) working (CDN or self-hosted)
- [ ] Per-page titles render: "LughatChat - TTS Studio", "LughatChat - Dashboard", etc.
- [ ] Orphan cleanup confirmation dialog appears when navigating away from active synthesis
- [ ] Dashboard page accessible at `/dashboard` (shell with placeholder content)
- [ ] Lesson page accessible at `/dashboard/level/a1/1` (shell with placeholder content)
- [ ] Dark mode preserved for all pages (`.dark:` variants)
- [ ] `./run-tests.sh` passes (backend tests, lint, typecheck, frontend tests)
- [ ] Zero existing tests modified, weakened, or deleted
- [ ] No new dependencies without explicit approval

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Navbar eats TTS Studio vertical space | Users lose waveform display area | Careful padding; mobile-first testing |
| Theme tokens scattered across 10+ components | Incomplete migration, visual inconsistency | Global find/replace + visual regression check |
| Font self-hosting increases bundle size | Slower initial load | Preload font faces, use subset (400, 500, 600, 700) |
| Mobile navbar complexity compounds existing mobile UX | Confusing on small screens | Prototype mobile nav separately before implementation |
| Orphan cleanup race condition | Files accumulate | Confirm dialog + immediate cleanup on abort |
| Existing audio player panel conflicts with new sticky bar | Duplicate audio controls | Migrate `AudioPlayerPanel` functionality into `StickyAudioBar` |

---

## 8. Implementation Order (Suggested)

1. **Theme tokens** — update `uno.config.ts`, `main.css`, all components (foundation)
2. **Fonts** — add Inter + Amiri (CDN or self-hosted)
3. **GlobalNavbar** — build component, wire into `app.vue`
4. **TTS Studio layout** — adapt `index.vue` to `calc(100vh - 60px)`
5. **StickyAudioBar** — build from prototype, integrate into TTS Studio
6. **Dashboard page** — shell page with placeholder content
7. **Lesson page** — shell page with placeholder content
8. **SEO titles** — per-page `useHead`/`useSeoMeta`
9. **Orphan cleanup** — confirmation dialog + abort flow
10. **Mobile navbar** — responsive collapse
11. **Testing** — run full test suite, visual check all pages
