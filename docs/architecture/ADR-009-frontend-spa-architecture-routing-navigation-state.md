# ADR-009: Frontend SPA Architecture (Routing, Navigation, State)

## Status

**Accepted — Option A: Composable-Based State** — 2026-07-10

This ADR addresses the question raised in the PRD: *How do we structure the Nuxt SPA with multiple pages (Dashboard, Lesson View, Playground), a collapsible roadmap sidebar, and a top navigation bar?* It evaluates routing strategies, state management approaches, and the trade-off between composable-based state vs. global stores.

---

## Context

The platform has **three pages** plus a navigation system:

| Page | Route | Description |
|------|-------|-------------|
| **Dashboard / Roadmap** | `/` | Hybrid layout: single-page activity view + collapsible roadmap sidebar. Shows level → lesson → activity progress. |
| **Lesson View** | `/lesson/:id` | Renders a lesson with variable sections (dialogue, vocabulary, grammar) followed by practice activities. One activity at a time. |
| **Playground** | `/playground` | The existing TTS Studio — free-form text input + audio output. Moved from `/` to `/playground`. |

Plus a **navigation bar** (visible on all pages):

```
┌─────────────────────────────────────────────────┐
│  ☰  LughatChat    Roadmap  |  Playground    🎧  │
└─────────────────────────────────────────────────┘
```

And a **collapsible roadmap sidebar** (visible when hamburger is clicked):

```
┌─────────────────────────────────────────────────┐
│ ☰ LughatChat  Roadmap  |  Playground    🎧     │
├─────────────────────────────────────────────────┤
│ A1 (30%) ─────────────────────────────────────  │
│   ✓ Lesson 1: The Salutations                   │
│   → Lesson 2: Greetings                         │
│   🔒 Lesson 3: Numbers                          │
│ A2 (0%) ─────────────────────────────────────  │
│   🔒 Lesson 4: At the Market                  │
│   🔒 Lesson 5: Family                         │
│ B1 (0%) ─────────────────────────────────────  │
│   🔒 Lesson 6: Travel                         │
│   ...                                         │
└─────────────────────────────────────────────────┘
```

The current app is a **single-page TTS Studio** with no routing, no navigation, no sidebar. The PRD adds:
- 3 pages with file-based routing
- A top navigation bar (shared across all pages)
- A collapsible roadmap sidebar (shared across Dashboard and Lesson pages)
- State management for: navigation state (current page, sidebar open/closed), lesson state (current lesson, current activity), progress state (completed lessons, current progress)

### Constraints (Inherited from ADR-001)

| Constraint | Implication |
|-----------|-------------|
| **Nuxt 4 file-based routing** | Pages go in `app/pages/`, auto-imported. Routes are file paths. |
| **No global store** — Current app uses composables with reactive refs | Must decide whether to introduce a store (Pinia) or keep composable-based state |
| **Composable-based frontend** — Current composables are pure functions | New composables should follow the same pattern unless a global store is justified |
| **Single user** — No auth, no user state | No authentication state to manage |
| **Responsive layout** — Mobile (stacked panels) vs. Desktop (side-by-side) | Navigation and sidebar must work on both mobile and desktop |
| **RTL support** — Arabic text handled via Cairo font + RTL direction | Navigation must support RTL (hamburger on right for Arabic UI) |
| **Solo developer** — Must minimize state management complexity | Prefer composables over Pinia unless a store is clearly justified |

---

## Decision

We evaluate three options for frontend SPA architecture.

---

### Option A: Composable-Based State (Recommended for MVP)

Keep the current pattern: **composables manage reactive state**. Each page has its own composable. Shared state (navigation, sidebar, TTS status) is managed by shared composables. No Pinia, no global store.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Nuxt SPA)                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  app/                                                 │   │
│  │  ├── pages/                                          │   │
│  │  │   ├── index.vue          ← Dashboard (roadmap)   │   │
│  │  │   ├── lesson/                                         │   │
│  │  │   │   └── [id].vue       ← Lesson view           │   │
│  │  │   └── playground.vue     ← TTS Studio            │   │
│  │  ├── components/                                       │   │
│  │  │   ├── NavBar.vue           ← Top navigation      │   │
│  │  │   ├── RoadmapSidebar.vue   ← Collapsible sidebar │   │
│  │  │   ├── SectionRenderer.vue  ← Variable sections   │   │
│  │  │   └── ActivityRenderer.vue ← Variable activities │   │
│  │  └── composables/                                      │   │
│  │      ├── useNavigation.ts     ← Navigation state    │   │
│  │      ├── useSidebar.ts        ← Sidebar state       │   │
│  │      ├── useLessons.ts        ← Lesson data         │   │
│  │      ├── useProgress.ts       ← Progress data       │   │
│  │      ├── useCurrentLesson.ts  ← Current lesson      │   │
│  │      └── useCurrentActivity.ts ← Current activity   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Key characteristics:**
- **No Pinia** — State is managed by Vue's `ref()` and `computed()` inside composables
- **File-based routing** — Nuxt auto-routes `app/pages/` files
- **Shared composables** — Navigation and sidebar state are shared across pages
- **Page-specific state** — Each page composable manages its own data
- **No global store** — State is scoped to the page that uses the composable

**Composable structure:**

```typescript
// app/composables/useNavigation.ts
// Manages current page and navigation state (shared across all pages)
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

export function useNavigation() {
  const router = useRouter()
  const route = useRoute()

  const currentPage = computed(() => {
    const path = route.path
    if (path.startsWith('/lesson/')) return 'lesson'
    if (path === '/playground') return 'playground'
    return 'dashboard'  // default: /
  })

  const currentLessonId = computed(() => {
    const match = route.path.match(/\/lesson\/(\d+)/)
    return match ? parseInt(match[1]) : null
  })

  function navigateTo(page: string, lessonId?: number) {
    switch (page) {
      case 'dashboard':
        router.push('/')
        break
      case 'lesson':
        router.push(`/lesson/${lessonId}`)
        break
      case 'playground':
        router.push('/playground')
        break
    }
  }

  return { currentPage, currentLessonId, navigateTo }
}
```

```typescript
// app/composables/useSidebar.ts
// Manages roadmap sidebar state (shared across Dashboard and Lesson pages)
import { ref, computed } from 'vue'

export function useSidebar() {
  const isOpen = ref(false)
  const isMobile = ref(false)

  // On mobile, sidebar is a full-screen overlay
  // On desktop, sidebar is a 280px wide panel next to the content
  const sidebarWidth = computed(() => {
    return isMobile.value ? '100vw' : '280px'
  })

  function toggle() {
    isOpen.value = !isOpen.value
  }

  function close() {
    isOpen.value = false
  }

  function open() {
    isOpen.value = true
  }

  return { isOpen, isMobile, sidebarWidth, toggle, close, open }
}
```

```typescript
// app/composables/useCurrentLesson.ts
// Manages current lesson and activity state (shared across Dashboard and Lesson pages)
import { ref, computed } from 'vue'

export function useCurrentLesson() {
  const currentLessonId = ref<number | null>(null)
  const currentActivityIndex = ref(0)

  const currentLesson = computed(() => {
    // Loaded from useLessons — returns lesson data for currentLessonId
    // This is a placeholder; actual implementation uses useLessons
    return null  // TODO: integrate with useLessons
  })

  const currentActivity = computed(() => {
    if (!currentLesson.value?.activities) return null
    return currentLesson.value.activities[currentActivityIndex.value]
  })

  function selectLesson(lessonId: number) {
    currentLessonId.value = lessonId
    currentActivityIndex.value = 0
  }

  function nextActivity() {
    if (currentLesson.value?.activities) {
      currentActivityIndex.value = Math.min(
        currentActivityIndex.value + 1,
        currentLesson.value.activities.length - 1
      )
    }
  }

  function previousActivity() {
    currentActivityIndex.value = Math.max(
      currentActivityIndex.value - 1,
      0
    )
  }

  return {
    currentLessonId,
    currentActivityIndex,
    currentLesson,
    currentActivity,
    selectLesson,
    nextActivity,
    previousActivity
  }
}
```

**State classification (where each piece of state lives):**

| State Type | Location | Example |
|-----------|----------|---------|
| **URL state** | Router (vue-router) | Current route, query params |
| **Navigation state** | `useNavigation.ts` | Current page, current lesson ID |
| **UI state** | Page composables | Sidebar open/closed, panel toggle |
| **Data state** | Page composables | Lessons list, progress data |
| **Activity state** | `useCurrentLesson.ts` | Current lesson, current activity index |
| **TTS state** | `useHealthPoll.ts` (existing) | Model loading status |

**Note on URL state:** The current lesson ID is already in the URL (`/lesson/1`). This means:
- The browser back button works (navigates to previous lesson)
- The URL is shareable (bookmark a specific lesson)
- The URL is the source of truth for which lesson is active

The `useCurrentLesson` composable reads the lesson ID from the URL (via `useRoute`) and loads the lesson data from the API.

---

### Option B: Pinia Global Store

Use **Pinia** to manage global state (navigation, sidebar, current lesson). Each page reads from and writes to the store.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Nuxt SPA)                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  app/                                                 │   │
│  │  ├── stores/                                         │   │
│  │  │   ├── navigation.ts      ← Current page, route    │   │
│  │  │   ├── sidebar.ts         ← Sidebar open/closed    │   │
│  │  │   ├── lessons.ts         ← Lessons data + loading  │   │
│  │  │   ├── progress.ts        ← User progress          │   │
│  │  │   └── currentLesson.ts   ← Current lesson + activity│   │
│  │  ├── pages/                                            │   │
│  │  │   ├── index.vue          ← Dashboard              │   │
│  │  │   ├── lesson/[id].vue    ← Lesson view            │   │   │
│  │  │   └── playground.vue     ← TTS Studio             │   │
│  │  └── composables/                                      │   │
│  │      └── (thin wrappers around stores)                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Key characteristics:**
- **Global state** — All pages read from and write to the same store
- **Time-travel debugging** — Pinia supports devtools with state history
- **Persistence** — Store state can be persisted to localStorage (e.g., sidebar open/closed)
- **More boilerplate** — Each store requires actions, getters, and state definitions
- **Devtools** — Pinia devtools provide state inspection, time-travel, and actions log

**Example store:**

```typescript
// app/stores/navigation.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

export const useNavigationStore = defineStore('navigation', () => {
  const router = useRouter()
  const route = useRoute()

  const currentPage = computed(() => {
    const path = route.path
    if (path.startsWith('/lesson/')) return 'lesson'
    if (path === '/playground') return 'playground'
    return 'dashboard'
  })

  const currentLessonId = computed(() => {
    const match = route.path.match(/\/lesson\/(\d+)/)
    return match ? parseInt(match[1]) : null
  })

  function navigateTo(page: string, lessonId?: number) {
    switch (page) {
      case 'dashboard':
        router.push('/')
        break
      case 'lesson':
        router.push(`/lesson/${lessonId}`)
        break
      case 'playground':
        router.push('/playground')
        break
    }
  }

  return { currentPage, currentLessonId, navigateTo }
})
```

---

### Option C: Hybrid (URL State + Composables)

Use **URL state** (vue-router) for navigation and lesson selection. Use **composables** for UI state (sidebar, panel toggle). Use **Pinia** only for data that needs to be shared across pages and persisted (e.g., sidebar preference).

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Nuxt SPA)                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  URL State (vue-router)                              │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  / → Dashboard                                │    │   │
│  │  │  /lesson/1 → Lesson 1                         │    │   │
│  │  │  /playground → TTS Studio                     │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                     │   │
│  │  Composable State (Vue refs)                         │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  useSidebar.ts — sidebar open/closed         │    │   │
│  │  │  useCurrentLesson.ts — current lesson + act. │    │   │
│  │  │  useLessons.ts — lessons data                │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                     │   │
│  │  Pinia (only for persistence)                        │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  useSettings.ts — sidebar preference,        │    │   │
│  │  │  theme, language, etc. (persisted to         │    │   │
│  │  │  localStorage)                               │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Key characteristics:**
- **URL is the source of truth** for navigation — `window.history` manages the back/forward buttons
- **Composables manage transient UI state** — Sidebar open/closed is not in the URL (it's a UI preference)
- **Pinia for persistent settings** — Sidebar preference, theme, language are stored in localStorage via Pinia
- **Minimal Pinia usage** — Only one store (`useSettings`) for persistent settings
- **Most flexible** — Can migrate to full Pinia later if needed

---

## Trade-off Analysis

| Concern | A: Composables Only | B: Pinia Store | C: Hybrid (URL + Composables + Pinia) |
|---------|-------------------|---------------|-------------------------------------|
| **Setup complexity** | ✅ None — uses existing Vue patterns | ❌ Install Pinia, configure store, write stores | ⚠️ Install Pinia, one store for settings |
| **Boilerplate** | ✅ Minimal — one composable per concern | ❌ Each store requires state, actions, getters | ⚠️ One store for settings, composables for the rest |
| **Debugging** | ⚠️ State is scattered across composables | ✅ Pinia devtools — inspect state, time-travel | ✅ Pinia for settings, composables for the rest |
| **State sharing** | ⚠️ Must pass state via composable props | ✅ Global store — all pages read the same state | ✅ URL for navigation, composables for UI, Pinia for settings |
| **Browser back button** | ⚠️ Must manually sync with router | ✅ Router manages history; store reads from router | ✅ Router manages history (same as B) |
| **URL shareability** | ⚠️ Must manually construct URLs | ✅ Store reads from router (URL is source of truth) | ✅ Router manages history (same as B) |
| **Persistence** | ❌ Must manually save to localStorage | ✅ Pinia can persist to localStorage | ✅ Pinia persists settings to localStorage |
| **Team size** | ✅ 1 developer | ⚠️ 1–2 developers (store architecture) | ✅ 1 developer |
| **Learning curve** | ✅ Vue composables (known) | ❌ Pinia concepts (store, actions, getters) | ⚠️ Pinia (one store) + composables |
| **Migration path** | ✅ Can add Pinia later | ❌ Harder to remove Pinia | ✅ Can remove Pinia later if needed |

---

### When Option B (Pinia) Would Be Warranted

A full Pinia store makes sense when:

1. **Multiple pages share complex state** — More than 2–3 pages need to read and write the same state
2. **State persistence is important** — User preferences (sidebar open/closed, theme, language) must survive page reloads
3. **Time-travel debugging** — Developers need to inspect state history and replay actions
4. **Team grows** — Multiple developers need a shared state contract (store API)
5. **State is complex** — State has many interdependencies, computed properties, and actions

**Partial fit for Lughat Chat.** The platform has 3 pages (Dashboard, Lesson, Playground) that share navigation state and sidebar state. However, the state is not complex enough to justify a full store. A single settings store (Option C) is sufficient.

### When Option C (Hybrid) Would Be Warranted

A hybrid approach makes sense when:

1. **Navigation is URL-driven** — The current page and lesson are in the URL (`/lesson/1`)
2. **UI state is transient** — Sidebar open/closed is a UI preference, not a data concern
3. **Settings are persistent** — Theme, language, sidebar preference should survive page reloads
4. **Most state is composable** — Only a small subset of state needs Pinia
5. **Solo developer** — Minimal Pinia usage (one store) is easier to maintain than a full store system

**Good fit for Lughat Chat.** The platform's navigation is URL-driven (lesson ID is in the URL). Sidebar state is transient (UI preference). Settings (theme, language) are persistent. This is exactly what Option C handles.

---

## Consequences

### Choosing Option A (Composables Only)

#### What becomes easier

- **No new dependencies** — No Pinia to install, configure, or maintain
- **Familiar pattern** — Follows the existing composable-based architecture
- **Fast implementation** — ~200 lines of composable code for all 3 pages
- **No store boilerplate** — No actions, getters, state definitions
- **Easy to test** — Composables are pure functions; test them in isolation

#### What becomes harder

- **State is scattered** — Navigation state, sidebar state, lesson state are in different composables. No single source of truth.
- **No persistence** — Sidebar open/closed state is lost on page reload. No way to persist settings without manually saving to localStorage.
- **No devtools** — Cannot inspect state in browser devtools. No time-travel debugging.
- **Harder to share state across pages** — If a future page needs to read sidebar state, it must import the sidebar composable. This is fine for 3 pages but gets messy with 10+.

---

### Choosing Option B (Pinia)

#### What becomes easier

- **Single source of truth** — All pages read from the same store
- **Devtools** — Pinia devtools provide state inspection, time-travel, and actions log
- **Persistence** — Store state can be persisted to localStorage
- **Clear API** — Store actions and getters provide a clear contract between pages

#### What becomes harder

- **Boilerplate** — Each store requires state, actions, and getters. For 3 pages, this is ~300 lines of boilerplate.
- **Overhead for simple state** — Navigation and sidebar state are simple (current page, sidebar open/closed). Pinia adds complexity for what could be a ref.
- **Migration path** — Once Pinia is integrated, removing it later is harder than not having it.
- **Learning curve** — New developers must learn Pinia concepts (store, actions, getters, persist).

---

### Choosing Option C (Hybrid)

#### What becomes easier

- **URL is the source of truth** — Navigation is managed by vue-router; the URL is the single source of truth for which page is active
- **Composables for UI state** — Sidebar open/closed, panel toggle, etc. are managed by composables (simple, fast)
- **Pinia for settings** — One store for persistent settings (theme, language, sidebar preference)
- **Minimal Pinia** — Only one store (`useSettings`) is needed. The rest is composables.
- **Browser back button works** — Router manages history; no manual sync needed
- **URL is shareable** — Bookmarking `/lesson/1` takes you directly to Lesson 1

#### What becomes harder

- **Two state systems** — Must understand both composables and Pinia (even if Pinia is used minimally)
- **One extra dependency** — Pinia must be installed and configured (even for one store)

---

## Recommendation

**Adopt Option C: Hybrid (URL State + Composables + Pinia for Settings).**

### Rationale

1. **URL is the source of truth for navigation.** The current lesson ID is in the URL (`/lesson/1`). This means the browser back button works, URLs are shareable, and the URL is the single source of truth for which lesson is active. No composable or store needs to manage this — vue-router handles it.
2. **Composables are sufficient for UI state.** Sidebar open/closed, panel toggle, loading states — these are simple booleans and numbers. Composables with `ref()` handle them perfectly. No Pinia needed for UI state.
3. **Pinia for persistent settings.** The only thing that needs Pinia is persistent settings (sidebar preference, theme, language). These survive page reloads and must be stored in localStorage. One store (`useSettings`) is sufficient.
4. **Minimal Pinia usage.** Only one store for settings. The rest of the state is managed by composables. This is the sweet spot between Option A (no Pinia) and Option B (full Pinia).
5. **Solo developer friendly.** One Pinia store + ~5 composables is easy to maintain. No complex store architecture, no actions/getters boilerplate for simple state.

### State Architecture (After Adoption)

```
┌─────────────────────────────────────────────────────────────┐
│  URL State (vue-router) — Source of truth for navigation     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  / → Dashboard                                      │   │
│  │  /lesson/:id → Lesson view                          │   │
│  │  /playground → TTS Studio                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Composable State (Vue refs) — Transient UI state           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  useNavigation.ts — current page, lesson ID (from URL)│   │
│  │  useSidebar.ts — sidebar open/closed (UI toggle)     │   │
│  │  useCurrentLesson.ts — current lesson + activity     │   │
│  │  useLessons.ts — lessons data (from API)             │   │
│  │  useProgress.ts — progress data (from API)           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Pinia (one store) — Persistent settings                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  useSettings.ts — sidebar preference, theme,         │   │
│  │  language, etc. (persisted to localStorage)          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Page Structure (New)

| Route | Page Component | Composables |
|-------|---------------|-------------|
| `/` | `app/pages/index.vue` | `useNavigation`, `useSidebar`, `useLessons`, `useProgress` |
| `/lesson/:id` | `app/pages/lesson/[id].vue` | `useNavigation`, `useSidebar`, `useCurrentLesson`, `useLessons` |
| `/playground` | `app/pages/playground.vue` | `useNavigation`, `useHealthPoll` (existing) |

### New Components (Frontend)

| Component | Purpose |
|-----------|---------|
| `NavBar.vue` | Top navigation (hamburger, logo, links, TTS status) |
| `RoadmapSidebar.vue` | Collapsible roadmap (levels → lessons → progress) |
| `SectionRenderer.vue` | Renders variable sections (dialogue, vocabulary, grammar) |
| `ActivityRenderer.vue` | Renders variable activities (listen-translate, translate, etc.) |
| `ProgressBar.vue` | Top progress indicator (lesson + activity progress) |
| `InlineAudioPlayer.vue` | Simple play/pause/progress for lesson audio |

### New Composables (Frontend)

| Composable | Purpose |
|-----------|---------|
| `useNavigation.ts` | Current page, current lesson ID (from URL) |
| `useSidebar.ts` | Sidebar open/closed, toggle, close, open |
| `useCurrentLesson.ts` | Current lesson, current activity, select lesson, navigate activities |
| `useLessons.ts` | Fetch lessons from API, cache, loading state |
| `useProgress.ts` | Fetch progress from API, mark lesson completed |

### New Pinia Store (Frontend)

| Store | Purpose |
|-------|---------|
| `useSettings.ts` | Sidebar preference, theme, language (persisted to localStorage) |

### Open Questions for Future ADRs

1. **Route guards** — Since ADR-002 is superseded (no authentication), route guards are not needed. If multi-user support is added in the future, route guards would protect `/lesson` and `/playground`. (ADR-009b)
2. **Lazy loading** — Should pages be lazy-loaded (code-split) for faster initial load? (ADR-009c)
3. **Deep linking** — Should URLs encode activity state (e.g., `/lesson/1?activity=3`) for shareable links to specific activities? (ADR-009d)

---

## References

- [PRD: Pages (Dashboard, Lesson, Playground)](../PRD.md)
- [ADR-001: Language Learning Platform Architecture](./ADR-001-language-learning-platform-architecture.md)
- [Vue Router 4: File-based Routing](https://router.vuejs.org/guide/essentials/file-system-routing)
- [Pinia: The Vue Store](https://pinia.vuejs.org/)
- [Global State, Local State, and URL State In Vue Apps](https://www.nazarboyko.com/articles/global-state-local-state-and-url-state-in-vue-apps)
- [Nuxt 4: File-based Routing](https://nuxt.com/docs/guide/concepts/rendering#file-system-routing)
