# VISUAL UNIFY — Comprehensive Implementation Prompt

> **Source:** `docs/issues/01–08` + `docs/issues/DEPENDENCIES.md`
> **Proto Reference:** `docs/proto/lesson-details.html` (full design spec)
> **Type:** Multi-issue implementation plan with dependency graph, acceptance criteria, and exact implementation spec
> **Estimated Total:** 7–11 hours (parallel) / 13–19 hours (sequential)

---

## 0. Scope & Constraints

- **Frontend-only.** Zero backend changes. Zero new API routes. Zero new pages.
- **Visual updates only** — behavioral logic, API contracts, and routing remain unchanged.
- **Dashboard pages only** — the home page (`/`) dark studio theme is **out of scope**. It must not regress.
- **Dark-mode studio theme** on `/` is explicitly excluded (per PRD §Out of Scope).
- **No new dependencies.** All changes use existing UnoCSS, Vue 3, and Nuxt 4.
- **Tests:** Vitest component tests in `frontend/tests/components/`. Follow existing patterns.
- **Every issue runs `./run-tests.sh` before completion.**

---

## 1. Dependency Graph & Execution Order

```
Phase 1 (sequential, 2–5h):
  #1 UnoCSS tokens  ──┐
                      ├──► Phase 2 (parallel, 5–12h)
  #2 Layout primitives ─┘

Phase 2 (parallel after #1, #2):
  #3 Pill tabs        (needs #1)
  #4 LessonHero       (needs #1)
  #5 Status indicators (needs #1)
  #6 GlobalNavbar     (needs #1)
  #7 Breadcrumbs      (needs #1, #2)

Phase 3 (independent, 1–2h):
  #8 Font families    (decision only, needs #1 for token reference)
```

**Critical path (minimum):** #1 → #2 → #7 (longest Phase 2) = ~5–8h
**Full parallel:** #1 + #2 → [#3, #4, #5, #6, #7] + #8 = ~7–11h

---

## 2. Issue #1 — Extend UnoCSS Design Tokens

**File:** `frontend/uno.config.ts` (tokens only — no other edits)

### Problem
Current config defines only `primary.500`, `primary.600` and `gold.500`. The proto requires full tonal scales for hover states, backgrounds, borders, and status indicators.

### Implementation

Update the `colors.primary` and `colors.gold` blocks in `uno.config.ts` theme to match the proto **exactly**:

```ts
colors: {
  stone: { /* unchanged — already complete 50–950 */ },
  primary: {
    50:  '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',  // existing — MUST NOT change
    600: '#0d9488',  // existing — MUST NOT change
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },
  gold: {
    50:  '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',  // existing — MUST NOT change
    600: '#d97706',
  }
}
```

**New tokens added:**
- `primary`: 50, 100, 200, 300, 400, 700, 800, 900 (8 new levels)
- `gold`: 50, 100, 200, 300, 400, 600 (6 new levels)

### Acceptance Criteria
1. All 8 new `primary` levels and 6 new `gold` levels present with exact proto hex values.
2. Existing `primary.500`, `primary.600`, `gold.500` unchanged.
3. `./run-tests.sh` passes (lint + typecheck + all tests).
4. No other files modified.

### Tests
- **Unit test:** Verify `uno.config.ts` exports the expected hex values for all extended tokens.
- **Component test:** A component using `bg-primary-50`, `text-primary-700`, `border-primary-200`, `bg-gold-400` renders with the correct computed styles.

---

## 3. Issue #2 — Standardize Layout Primitives

**Files:**
- `frontend/uno.config.ts` (card shortcut update)
- `frontend/app/app.vue` (add `bg-stone-50`)
- `frontend/app/pages/dashboard.vue` (container width, heading size)
- `frontend/app/pages/dashboard/level/[level]/index.vue` (container width, heading size)
- `frontend/app/pages/dashboard/level/[level]/[lesson].vue` (container width, card usage)

### Problem
Three different layout conventions exist: `max-w-6xl` (1056px) vs proto's `max-w-7xl` (1280px), `rounded-lg` vs proto's `rounded-xl`, no app shell background, no shadow system.

### Implementation

#### 3a. Card Shortcut (`uno.config.ts`)
Change from:
```ts
'card': 'rounded-lg border p-4 shadow-sm bg-white dark:bg-gray-800'
```
To:
```ts
'card': 'rounded-xl bg-white border border-stone-200 shadow-sm'
```
**Remove** `dark:bg-gray-800` (dashboard is always light; dark theme on `/` doesn't use the card class).

#### 3b. App Shell (`app.vue`)
Add `bg-stone-50` to the root container:
```html
<div class="min-h-screen bg-stone-50 dark:bg-stone-950">
```

#### 3c. Dashboard Pages — Container Width
Change all `max-w-6xl` → `max-w-7xl` on:
- `dashboard.vue`: lines 8, 32
- `[level]/index.vue`: lines 8, 34
- `[lesson].vue`: lines 79, 115, 143, 171

#### 3d. Dashboard Pages — Heading Size
Change all `text-2xl md:text-3xl` → `text-3xl md:text-4xl` on page titles:
- `dashboard.vue`: line 11
- `[level]/index.vue`: line 12
- `[lesson].vue`: line 119

#### 3e. Shadow System (`main.css`)
Add CSS custom properties (if not present) and apply to cards/floating elements:
```css
:root {
  --shadow-soft: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-elevated: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04);
}
```

### Acceptance Criteria
1. All dashboard pages use `max-w-7xl` (not `max-w-6xl`).
2. `card` shortcut = `rounded-xl bg-white border border-stone-200 shadow-sm`.
3. Dashboard pages use `text-3xl md:text-4xl` for page titles.
4. `app.vue` root div has `bg-stone-50`.
5. Shadow system CSS custom properties defined and applied.
6. **Home page unaffected** — TTS home page (`index.vue`, `DesktopPanels.vue`, `MobileSplitScreen.vue`) retains dark studio theme.
7. `./run-tests.sh` passes.

### Proto Reference
- Body: `bg-stone-50 min-h-screen`
- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Hero heading: `text-3xl md:text-4xl font-bold text-white`
- Card: `bg-white rounded-xl shadow-sm border border-stone-200`
- Navbar: `bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm`

### Tests
- **Layout consistency test:** Verify all dashboard pages render with `max-w-7xl` containers.
- **Card shortcut test:** Verify the `card` class resolves to `rounded-xl bg-white border border-stone-200 shadow-sm`.
- **App shell test:** Verify `app.vue` root div has `bg-stone-50`.

---

## 4. Issue #3 — Convert Dashboard Tabs to Pill-Style Navigation

**File:** `frontend/app/pages/dashboard/level/[level]/[lesson].vue` (tab section only)

### Problem
Current tabs use underline-style (`border-b-2`) design. Proto specifies pill-style: `bg-stone-100 rounded-xl p-1.5 flex flex-wrap gap-1` container with individual `rounded-lg` buttons.

### Implementation

Replace the tab section template (lines 139–166):

**From (current):**
```html
<div class="flex flex-wrap gap-2 border-b border-stone-200 dark:border-stone-700" role="tablist">
  <button class="px-4 py-2 text-sm font-medium border-b-2 transition-colors" ...>
```

**To (proto):**
```html
<div class="bg-stone-100 rounded-xl p-1.5 flex flex-wrap gap-1" role="tablist">
  <button
    v-for="tab in sectionTabs"
    :id="`tab-${tab}`"
    :key="tab"
    role="tab"
    :aria-selected="activeSection === tab"
    :aria-controls="`panel-${tab}`"
    :class="[
      'flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2',
      activeSection === tab
        ? 'bg-white text-primary-700 shadow-sm'
        : 'text-stone-600 hover:text-stone-800'
    ]"
    @click="activeSection = tab"
  >
    {{ tab }}
  </button>
</div>
```

Key changes:
- Container: `bg-stone-100 rounded-xl p-1.5 flex flex-wrap gap-1` (pill container)
- Active tab: `bg-white text-primary-700 shadow-sm` (white pill with text)
- Inactive tab: `text-stone-600 hover:text-stone-800` (plain text, no background)
- Add `flex-1 min-w-[120px]` for responsive wrapping
- Add `items-center justify-center gap-2` for icon alignment (future-proof)

### Acceptance Criteria
1. Tab container = `bg-stone-100 rounded-xl p-1.5 flex flex-wrap gap-1`.
2. Active tab = `bg-white text-primary-700 shadow-sm`.
3. Inactive tab = `text-stone-600 hover:text-stone-800`.
4. Responsive: tabs wrap properly (`flex-wrap` + `min-w-[120px]`).
5. ARIA: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls` preserved.
6. Functionality: clicking a tab updates `activeSection` and content panel.
7. `./run-tests.sh` passes.

### Tests
- **Tab rendering:** Verify tab container has `bg-stone-100 rounded-xl p-1.5`.
- **Active tab:** Verify active tab has `bg-white text-primary-700`.
- **Inactive tab:** Verify inactive tabs have `text-stone-600`.
- **Interaction:** Verify clicking a tab updates the active section and content panel.

---

## 5. Issue #4 — Create LessonHero Component

**Files:**
- `frontend/app/components/LessonHero.vue` (new)
- `frontend/app/pages/dashboard/level/[level]/[lesson].vue` (replace hero section with `<LessonHero>`)

### Problem
Dashboard lesson page has a simple heading + subheading hero. Proto specifies a rich hero banner with gradient, decorative Arabic text, status pills, and metadata.

### Implementation

#### 5a. New Component: `LessonHero.vue`

```vue
<script setup lang="ts">
interface Props {
  level: string
  lessonNumber: string | number
  title: string
  arabicTitle?: string
  estimatedTime?: string
  scenes?: string
  audioType?: string
  isReady?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  arabicTitle: '',
  estimatedTime: '',
  scenes: '',
  audioType: '',
  isReady: true
})
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
    <div class="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 px-8 py-10 relative overflow-hidden">
      <!-- Decorative Arabic text overlay -->
      <div class="absolute inset-0 opacity-10" aria-hidden="true">
        <div class="absolute top-4 right-8 font-arabic text-7xl text-white">
          {{ arabicTitle || 'السَّلَامُ عَلَيْكُمْ' }}
        </div>
        <div class="absolute bottom-4 left-8 font-arabic text-5xl text-white">
          مَرْحَبًا
        </div>
      </div>

      <!-- Content (relative z-10) -->
      <div class="relative z-10">
        <!-- Status pills row -->
        <div class="flex items-center gap-3 mb-3">
          <span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-semibold tracking-wide">
            LEVEL {{ level }}
          </span>
          <span class="px-3 py-1 bg-gold-400/90 rounded-full text-primary-900 text-xs font-semibold tracking-wide">
            LESSON {{ lessonNumber }}
          </span>
          <span
            v-if="isReady"
            class="px-3 py-1 bg-green-400/90 rounded-full text-green-900 text-xs font-semibold flex items-center gap-1.5"
          >
            <span class="w-1.5 h-1.5 bg-green-700 rounded-full" />
            Ready
          </span>
        </div>

        <!-- Title -->
        <h1 class="text-3xl md:text-4xl font-bold text-white mb-2">
          {{ title }}
        </h1>
        <p v-if="arabicTitle" class="font-arabic text-2xl text-primary-100 mb-4" dir="rtl">
          {{ arabicTitle }}
        </p>

        <!-- Metadata row -->
        <div v-if="estimatedTime || scenes || audioType" class="flex flex-wrap items-center gap-4 text-primary-100 text-sm">
          <span v-if="estimatedTime" class="flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {{ estimatedTime }}
          </span>
          <span v-if="scenes" class="flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
            </svg>
            {{ scenes }}
          </span>
          <span v-if="audioType" class="flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
            </svg>
            {{ audioType }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
```

#### 5b. Usage in `[lesson].vue`
Replace the existing hero section (lines 110–136) with:
```html
<LessonHero
  :level="currentLevel"
  :lesson-number="currentLesson"
  title="Lesson {{ currentLesson }}"
  :is-ready="true"
/>
```

### Props Interface
```ts
interface Props {
  level: string
  lessonNumber: string | number
  title: string
  arabicTitle?: string
  estimatedTime?: string
  scenes?: string
  audioType?: string
  isReady?: boolean
}
```

### Acceptance Criteria
1. `LessonHero.vue` created in `app/components/`.
2. Outer card: `bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden`.
3. Gradient banner: `bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900`.
4. Decorative Arabic text overlay at `opacity-10` (top-right + bottom-left).
5. Status pills render correctly (level pill, lesson badge, ready indicator).
6. Metadata row with icons (estimated time, scenes, audio type).
7. Props interface matches spec above.
8. Responsive: scales on mobile (padding reduction, text size adjustment).
9. Reusable: importable by both dashboard index and lesson detail pages.
10. `./run-tests.sh` passes.

### Tests
- **Hero rendering:** Verify `LessonHero` renders with `rounded-2xl`, `bg-white`, `border-stone-200`.
- **Gradient:** Verify inner banner has `from-primary-700 via-primary-800 to-primary-900`.
- **Arabic overlay:** Verify decorative Arabic text elements exist with `opacity-10`.
- **Status pills:** Verify level pill, lesson badge, and ready indicator render correctly.
- **Props:** Verify all props are reflected in the rendered output.

---

## 6. Issue #5 — Update Status Indicators for Light-Mode Dashboard

**Files:**
- `frontend/app/components/ModelStatusIndicator.vue`
- `frontend/app/components/MobileStatusIndicator.vue`
- `frontend/app/pages/dashboard.vue` (pass `light` prop)

### Problem
Both indicators are designed for dark studio theme: `bg-white/[0.02]`, `bg-stone-900`, `text-gray-300` — nearly invisible on dashboard's `bg-stone-50` background.

### Implementation

#### 5a. Add `light` prop to both components

**ModelStatusIndicator.vue** — Add prop:
```ts
const props = defineProps<{ light?: boolean }>()
```

Conditional class rendering:
```html
<!-- Outer shell -->
<div :class="props.light
  ? 'bg-stone-100 ring-stone-200'
  : 'bg-white/[0.02] ring-white/[0.06]'"
  class="flex items-center gap-2 rounded-full ring-1 px-2.5 py-1">
```

```html
<!-- Inner core -->
<div :class="props.light
  ? 'bg-white border-stone-200'
  : 'bg-stone-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]'"
  class="flex items-center gap-2 rounded-full px-3 py-1.5 border">
```

```html
<!-- Status text -->
<span :class="props.light
  ? 'text-stone-700'
  : 'text-gray-300'"
  class="text-xs font-medium">
```

**Status dots (light mode) — remove glow shadows:**
```html
<!-- Loading: orange dot -->
<span :class="props.light ? '' : 'shadow-[0_0_8px_#f97316]'" class="w-2 h-2 rounded-full bg-orange-500" />

<!-- Ready: green dot -->
<span :class="props.light ? '' : 'shadow-[0_0_8px_#22c55e]'" class="w-2 h-2 rounded-full bg-green-500" />

<!-- Error: red dot -->
<span :class="props.light ? '' : 'shadow-[0_0_8px_#ef4444]'" class="w-2 h-2 rounded-full bg-red-500" />
```

Apply the same pattern to **MobileStatusIndicator.vue** (same classes, scaled down: `px-2 py-0.5`, `px-2.5 py-1`, `w-1.5 h-1.5`, `text-[10px]`).

#### 5b. Dashboard page usage
```html
<ModelStatusIndicator :light="true" />
```

### Acceptance Criteria
1. Both components accept a `light` prop (boolean, default `false`).
2. When `light=true`: outer = `bg-stone-100 ring-stone-200`, inner = `bg-white border-stone-200`, text = `text-stone-700`.
3. When `light=false` (default): dark-mode styling preserved (current behavior).
4. Glow shadows removed on light mode dots.
5. Dashboard page passes `:light="true"`.
6. **No visual regression on `/`** — home page dark theme continues to show dark-mode indicator.
7. `./run-tests.sh` passes.

### Tests
- **Light mode:** Verify indicator renders with `bg-stone-100`, `bg-white`, `text-stone-700` when `light` prop is true.
- **Dark mode:** Verify indicator renders with `bg-stone-900`, `text-gray-300` when `light` prop is false (default).
- **Dashboard page:** Verify `ModelStatusIndicator` on `/dashboard` renders with light-mode styling.

---

## 7. Issue #6 — Unify GlobalNavbar Across All Pages

**Files:**
- `frontend/app/components/GlobalNavbar.vue` (primary changes)
- Potentially `frontend/app/components/DesktopPanels.vue` (if it has its own logo)

### Problem
Logo treatment inconsistent between home and dashboard pages. Nav link states use tokens not yet available. Progress bar is static. No route awareness for dashboard sub-pages.

### Implementation

#### 6a. Logo Consistency
```html
<!-- Icon: filled waves (already correct) -->
<span class="ph-fill ph-waves text-primary-500 text-xl" />
<!-- "Lughat" in stone-800 (already correct) -->
<span class="text-lg font-bold text-stone-800 dark:text-stone-200 tracking-tight">Lughat</span>
<!-- "Chat" — change from primary-500 to gold-500 (matches proto gold treatment) -->
<span class="text-gold-500">Chat</span>
```

#### 6b. Nav Link Active States (uses extended tokens from #1)
```html
<!-- Active link -->
:class="isActive(path)
  ? 'text-primary-600 bg-primary-50'
  : 'text-stone-600 hover:text-stone-800'"
```
Change all three nav links (Home, Dashboard, My Courses) to use `text-primary-600 bg-primary-50` for active state.

#### 6c. Progress Bar (already correct — no changes needed)
The 4px progress bar with `bg-gradient-to-r from-primary-500 to-primary-600` is already proto-accurate.

#### 6d. Avatar (proto: gold gradient)
```html
<!-- Change from -->
<div class="w-8 h-8 rounded-full bg-stone-300 dark:bg-stone-600 ..." />
<!-- To (desktop) -->
<div class="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white font-semibold text-sm">
  S
</div>
```

#### 6e. Route Awareness (already partially implemented — verify)
The `isActive` helper and `isLessonRoute` computed already handle route highlighting. Verify:
- `/` → Home active
- `/dashboard` → Dashboard + My Courses active
- `/dashboard/level/*` → My Courses active

### Acceptance Criteria
1. **Logo:** `ph-fill ph-waves text-primary-500` + `text-stone-800` ("Lughat") + `text-gold-500` ("Chat").
2. **Nav links:** Active = `text-primary-600 bg-primary-50`; inactive = `text-stone-600 hover:text-stone-800`.
3. **Progress bar:** 4px, `bg-gradient-to-r from-primary-500 to-primary-600` (already correct).
4. **Route awareness:** Correct highlighting for `/`, `/dashboard`, `/dashboard/level/*`.
5. **Mobile:** Same logo, nav icons, and action buttons at ≤768px.
6. **Avatar:** Gold gradient `bg-gradient-to-br from-gold-400 to-gold-600`.
7. **No visual regression on `/`:** Dark theme navbar works correctly.
8. `./run-tests.sh` passes.

### Tests
- **Logo rendering:** Verify GlobalNavbar renders logo with `ph-fill ph-waves text-primary-500` and `text-gold-500`.
- **Nav links:** Verify active link has `text-primary-600 bg-primary-50`, inactive has `text-stone-600`.
- **Progress bar:** Verify 4px bar renders with `bg-gradient-to-r from-primary-500 to-primary-600`.
- **Route awareness:** Verify correct nav link highlighted for `/`, `/dashboard`, `/dashboard/level/*`.
- **Mobile:** Verify mobile navbar renders correctly at ≤768px.

---

## 8. Issue #7 — Breadcrumb Navigation with SVG Chevron Separators

**Files:**
- `frontend/app/pages/dashboard/level/[level]/[lesson].vue` (breadcrumb section)
- `frontend/app/pages/dashboard.vue` (add breadcrumbs)
- `frontend/app/pages/dashboard/level/[level]/index.vue` (add breadcrumbs)

### Problem
Current breadcrumbs use plain text `›` separators (`text-stone-400`). Proto specifies SVG chevron separators (`M9 5l7 7-7 7`). Also, dashboard index and level index pages lack breadcrumbs entirely.

### Implementation

#### 7a. SVG Chevron Separators (replace `›` text)
```html
<svg class="w-4 h-4 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
</svg>
```

#### 7b. Breadcrumb Link Styling
```html
<NuxtLink :to="crumb.to" class="text-primary-600 hover:text-primary-700 transition">
  {{ crumb.label }}
</NuxtLink>
<!-- Current page (last item) -->
<span class="text-stone-500">{{ crumb.label }}</span>
```

#### 7c. Add Breadcrumbs to Dashboard Pages

**`dashboard.vue`** — Add after page header:
```html
<nav class="px-4 md:px-6 pt-2 pb-1" aria-label="Breadcrumb" data-testid="breadcrumbs">
  <div class="max-w-7xl mx-auto">
    <ol class="flex items-center gap-2 text-sm text-stone-500">
      <li class="flex items-center gap-2">
        <NuxtLink to="/" class="text-primary-600 hover:text-primary-700 transition">Home</NuxtLink>
        <svg class="w-4 h-4 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
        <span class="text-stone-800 font-medium">Dashboard</span>
      </li>
    </ol>
  </div>
</nav>
```

**`[level]/index.vue`** — Add after page header:
```html
<nav class="px-4 md:px-6 pt-2 pb-1" aria-label="Breadcrumb" data-testid="breadcrumbs">
  <div class="max-w-7xl mx-auto">
    <ol class="flex items-center gap-2 text-sm text-stone-500">
      <li class="flex items-center gap-2">
        <NuxtLink to="/" class="text-primary-600 hover:text-primary-700 transition">Home</NuxtLink>
        <svg class="w-4 h-4 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
        <NuxtLink to="/dashboard" class="text-primary-600 hover:text-primary-700 transition">Dashboard</NuxtLink>
        <svg class="w-4 h-4 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
        <span class="text-stone-800 font-medium">Level {{ currentLevel }}</span>
      </li>
    </ol>
  </div>
</nav>
```

#### 7d. Update `[lesson].vue` breadcrumbs (lines 73–108)
Replace `›` text separator with SVG chevron. Change `hover:underline` → `hover:text-primary-700`.

### Acceptance Criteria
1. **SVG chevrons:** Replace `›` text with `<svg>` chevron (`M9 5l7 7-7 7`), `w-4 h-4`, `text-stone-400`.
2. **Breadcrumb links:** `text-primary-600 hover:text-primary-700` (not `hover:underline`).
3. **Current page:** Last breadcrumb = `text-stone-800 font-medium` (non-clickable).
4. **Container:** Breadcrumbs use `max-w-7xl` (change from `max-w-6xl`).
5. **Dashboard pages:** Breadcrumbs added to `dashboard.vue` and `[level]/index.vue`.
6. **Responsive:** Breadcrumbs wrap gracefully on mobile.
7. `./run-tests.sh` passes.

### Tests
- **SVG chevrons:** Verify breadcrumb separators render SVG chevron paths (not text `›`).
- **Link styling:** Verify breadcrumb links have `text-primary-600 hover:text-primary-700`.
- **Current page:** Verify last breadcrumb is non-clickable with `text-stone-800 font-medium`.
- **Dashboard pages:** Verify breadcrumbs appear on dashboard index and level index pages.

---

## 9. Issue #8 — Font Family Evaluation (Decision)

**Type:** Decision / Documentation (1–2h)

### Problem
Current production uses self-hosted fonts (Plus Jakarta Sans + Noto Sans Arabic + Cairo). The proto specifies Google Fonts (Inter + Amiri). The PRD explicitly states this is a decision, not a prescription.

### Decision Framework

**Option A (Recommended): Keep production fonts (Plus Jakarta Sans + Noto Sans Arabic + Cairo)**
- **Pros:** 100% offline, no CDN dependency, consistent rendering across all environments
- **Cons:** Doesn't match the proto's visual intent
- **Action:** Document in ADR. The fonts are self-hosted in `frontend/app/assets/fonts/`.

**Option B: Switch to proto fonts (Inter + Amiri)**
- **Pros:** Matches design proto exactly
- **Cons:** Requires CDN links (Google Fonts) or self-hosting font files
- **Action:** Add CDN `<link>` tags, update `uno.config.ts` and `main.css`.

### Recommendation
**Option A (keep production fonts) with documentation.** The production team chose self-hosted fonts for offline reliability. The visual difference between Plus Jakarta Sans and Inter is subtle (both geometric sans-serifs). The bigger gap is Noto Sans Arabic (sans) vs Amiri (serif) — that's a noticeable stylistic shift for Arabic text.

### Acceptance Criteria
1. **Decision documented:** An ADR in `docs/adr/NN-font-family-choice.md` explains the choice, referencing the proto's preference and the production rationale.
2. **If switching:** `uno.config.ts` → `Inter` + `Amiri`, `main.css` → corresponding `@font-face` declarations, CDN links added.
3. **If keeping:** `uno.config.ts` unchanged, but a comment in `uno.config.ts` references the proto's font choice and explains the deviation.
4. **Arabic text rendering:** Arabic text uses correct font family (`font-arabic` class) across all pages.
5. `./run-tests.sh` passes.

### Files
- `frontend/uno.config.ts` (possibly)
- `frontend/app/assets/css/main.css` (possibly)
- `docs/adr/NN-font-family-choice.md` (new — always)

---

## 10. Risk Assessment

| Risk | Mitigation |
|---|---|
| Home page (`/`) dark theme breaks | Isolate changes to dashboard pages only; run full `./run-tests.sh` after each issue |
| UnoCSS token naming conflicts | Proto tokens are well-defined; verify no existing hardcoded hex values reference the extended scale |
| LessonHero props don't match existing data model | The dashboard is placeholder content; props can be extended later when backend integration arrives |
| Font decision stalls other work | Font decision (Issue #8) is independent; all other issues can proceed with current fonts |
| `card` shortcut breaks existing components | Only dashboard pages use the card class; verify no other component depends on `rounded-lg border p-4` via the shortcut |
| GlobalNavbar `dark:` variants regress on `/` | Test the home page explicitly after every navbar change |

---

## 11. Implementation Checklist

For each issue, before marking complete:

- [ ] Test written BEFORE implementation (failing first, right failure reason)
- [ ] `./run-tests.sh` passes: backend tests, lint, typecheck, frontend tests
- [ ] Zero existing tests modified, weakened, or deleted
- [ ] New tests assert behavior, not implementation; mocks are not tautological
- [ ] Test files only in `frontend/tests/` or `backend/tests/`
- [ ] No new dependencies without explicit approval
- [ ] No unrelated files touched (check diff)
- [ ] Commit message is conventional and atomic (`feat:`, `fix:`, `test:`, `refactor:`)
- [ ] No tautological mocks (mock returns exactly what the test asserts)
- [ ] Home page (`/`) visual unchanged (dark studio theme preserved)
- [ ] RTL + Arabic text rendering verified

---

## 12. Proto Reference Summary

All hex values, class names, and structural patterns below come from `docs/proto/lesson-details.html`:

### Token Values (lines 19–39)
```
primary: 50:#f0fdfa, 100:#ccfbf1, 200:#99f6e4, 300:#5eead4, 400:#2dd4bf,
         500:#14b8a6, 600:#0d9488, 700:#0f766e, 800:#115e59, 900:#134e4a
gold:    50:#fffbeb, 100:#fef3c7, 200:#fde68a, 300:#fcd34d, 400:#fbbf24,
         500:#f59e0b, 600:#d97706
```

### Layout (lines 174–317)
- Body: `bg-stone-50 min-h-screen`
- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Hero heading: `text-3xl md:text-4xl font-bold`
- Card: `bg-white rounded-xl shadow-sm border border-stone-200`
- Navbar: `bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm`
- Tabs: `bg-stone-100 rounded-xl p-1.5 flex flex-wrap gap-1`
- Progress bar: `h-1 bg-stone-100`

### Hero Banner (lines 222–257)
- Outer: `bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden`
- Banner: `bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900`
- Arabic overlay: `opacity-10` decorative text
- Status pills: `bg-white/20 rounded-full`, `bg-gold-400/90 rounded-full`, `bg-green-400/90 rounded-full`
- Title: `text-3xl md:text-4xl font-bold text-white`

### Breadcrumbs (lines 211–218)
- Separator: SVG `<path d="M9 5l7 7-7 7"/>`
- Links: `hover:text-primary-700 transition`
- Current: `text-stone-800 font-medium`

### Status Indicators (lines 231–236)
- Level pill: `px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-semibold tracking-wide`
- Lesson badge: `px-3 py-1 bg-gold-400/90 rounded-full text-primary-900 text-xs font-semibold tracking-wide`
- Ready indicator: `px-3 py-1 bg-green-400/90 rounded-full text-green-900 text-xs font-semibold flex items-center gap-1.5`

---

*End of VISUAL_UNIFY implementation prompt.*
