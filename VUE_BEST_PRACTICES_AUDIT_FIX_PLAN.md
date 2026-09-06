# Vue Best Practices Audit Fix Plan

## Context

The frontend audit identified 4 high-severity and 5 medium/low violations of Vue 3 best practices across composables and page components. The violations fall into three categories: (1) module-level mutable state in composables that leaks across navigation, (2) plain `let` variables used in reactive contexts that never trigger UI updates, and (3) dead code (a composable called without its return value being consumed). The fix must convert all module-level singletons and plain variables to proper reactive state, ensure UI reactivity propagates, remove dead composable invocations, and make cleanup composable state internal.

## Approach

### Step 1: Fix `[level]/[lesson].vue` — Replace all module-level mutable state with reactive refs

**File:** `frontend/app/pages/dashboard/level/[level]/[lesson].vue` (lines 23, 106–108, 167–170)

**Changes:**
- Replace `let completedLines = 0` (line 23) with `const completedLines = shallowRef(0)`
- Replace `let fetchController: AbortController | null = null` (line 106) with `const fetchController = shallowRef<AbortController | null>(null)`
- Replace `let fetchTimeoutId: ReturnType<typeof setTimeout> | null = null` (line 107) with `const fetchTimeoutId = shallowRef<ReturnType<typeof setTimeout> | null>(null)`
- Replace `let cleanedUp = false` (line 108) with `const cleanedUp = shallowRef(false)`

**Effect in existing code (no signature changes needed — update field access only):**
- Line 113: `if (cleanedUp) return` → `if (cleanedUp.value) return`
- Line 119: `fetchController = null` → `fetchController.value = null`
- Line 120: `fetchTimeoutId = null` → `fetchTimeoutId.value = null`
- Line 137: `fetchController = new AbortController()` → `fetchController.value = new AbortController()`
- Line 138: `fetchTimeoutId = setTimeout(...)` → `fetchTimeoutId.value = setTimeout(...)`
- Line 145: `clearTimeout(fetchTimeoutId ?? undefined)` → `clearTimeout(fetchTimeoutId.value ?? undefined)`
- Line 146: `fetchTimeoutId = null` → `fetchTimeoutId.value = null`
- Line 151: `clearTimeout(fetchTimeoutId ?? undefined)` → `clearTimeout(fetchTimeoutId.value ?? undefined)`
- Line 152: `fetchTimeoutId = null` → `fetchTimeoutId.value = null`
- Line 168: `completedLines = newCompleted` → `completedLines.value = newCompleted`
- Line 229: Keep `next()` as-is (already typed correctly)

**Added cleanup reset:** In `abortAndCleanup()`, after setting refs to null, add `cleanedUp.value = false` at the end so that subsequent navigation away+back properly re-initializes the module-level state. This is critical — the old `let cleanedUp` never reset, meaning a second visit to the same lesson would skip cleanup.

**No callsite changes** — the page component itself is the only file referencing these variables.

### Step 2: Make `useLessonProgress` reactive

**File:** `frontend/app/composables/lesson/useLessonProgress.ts` (line 7)

**Change the `sharedProgress` module-level plain object to a `shallowRef`:**

```ts
// BEFORE (line 7):
const sharedProgress: Record<string, StoredProgress> = {}

// AFTER:
const sharedProgress = shallowRef<Record<string, StoredProgress>>({})
```

**Every read/write of `sharedProgress` must use `.value`:**
- Line 11: `const data = sharedProgress[lessonId]` → `const data = sharedProgress.value?.[lessonId]`
- Line 24: `if (!sharedProgress[lessonId])` → `if (!sharedProgress.value?.[lessonId])`
- Line 25: `sharedProgress[lessonId] = {` → `sharedProgress.value![lessonId] = {` (non-null because just checked)
- Line 32: `const entry = sharedProgress[lessonId]` → `const entry = sharedProgress.value![lessonId]`
- Line 33: `entry.pct = clamped` — unchanged (`.value` already accessed)
- Line 46–51: `sharedProgress[lessonId]` → `sharedProgress.value?.[lessonId]`
- Lines 55–63 (resetLessonProgress): `sharedProgress[key]` → `sharedProgress.value?.[key]`

**API signature unchanged** — returns `{ getLessonProgress, setLessonProgress, clearLessonProgress }`.

### Step 3: Fix `useToast` global state singleton — convert to Nuxt `useState`

**File:** `frontend/app/composables/common/useToast.ts` (lines 11–15, 38–48)

**Problem:** `let nextId`, `ref<ToastEntry[]>`, and `Map<string, setTimeout>` all live at module scope, creating a singleton that:
- Persists across route navigation (toasts survive page transitions)
- Is shared between every caller (toasts from one page appear on another)
- Cannot be properly cleaned up per-instance (single `onMounted` runs, but no `onUnmounted` cleanup for multi-mount scenarios)

**Change:** Replace module-scope state with Nuxt's `useState` so each page/navigational context gets its own toast state, while `onMounted` cleanup is moved to an `onUnmounted` lifecycle that actually fires per-instance:

```ts
// Remove these module-scope declarations:
// let nextId = 0
// const toastState = ref<ToastEntry[]>([])
// const dismissTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()

// Replace useToast() body:
export function useToast() {
  const toastState = useState<ToastEntry[]>('toasts', () => [])
  const dismissTimers = useState<Map<string, ReturnType<typeof setTimeout>>>('toast-timers', () => new Map())

  onUnmounted(() => {
    for (const timer of dismissTimers.value.values()) {
      clearTimeout(timer)
    }
    dismissTimers.value.clear()
  })

  return toastState
}
```

- `nextId` becomes a closure variable per-instance: `let nextId = 0`
- `toastState` and `dismissTimers` are per-page via `useState` with unique keys
- Cleanup moves to `onUnmounted` (fires when the composable's host component unmounts)

**`showToast` unchanged** — still the global action function that mutates the reactive toast state.

### Step 4: Fix `useCleanupNavigation` — expose internal state as readonly

**File:** `frontend/app/composables/studio/useCleanupNavigation.ts` (lines 5, 31–34)

**Problem:** The composable exposes `dialogVisible: Ref<boolean>` directly, allowing the index page to bypass the composable's contract and set `cleanup.dialogVisible.value = true` directly. Per best practices, state should be `readonly` with explicit actions.

**Change:**
- Wrap `dialogVisible` in `readonly()`:
  ```ts
  const _dialogVisible = shallowRef(false)
  const dialogVisible = readonly(_dialogVisible)
  ```
- Remove direct `.value` assignment in `handleCleanupAndLeave()`:
  ```ts
  // BEFORE: dialogVisible.value = false
  // AFTER: (no change needed — _dialogVisible.value = false works internally)
  ```

**Update the index page** (`frontend/app/pages/index.vue`, line 85) to use the composable's explicit action:

```ts
// BEFORE (line 85):
cleanup.dialogVisible.value = true

// AFTER (add a show() method to the composable):
// Call a new public method: cleanup.showDialog()
```

Add `showDialog()` to the composable's return:
```ts
function showDialog(): void {
  _dialogVisible.value = true
}

// Return:
return {
  dialogVisible,  // readonly
  showDialog,     // explicit action
  handleCleanupAndLeave,
  handleStay
}
```

### Step 5: Fix `DesktopPanels.vue` — consume `useScrollReveal` return value

**File:** `frontend/app/components/studio/DesktopPanels.vue` (line 43)

**Problem:** `useScrollReveal(canvasHeaderRef)` is called but its return value `{ observe, disconnect }` is discarded. The composable's `observe()` is never invoked, so scroll-reveal animations never fire.

**Change:** Consume the return value and call `observe()`:

```ts
// BEFORE (line 43):
useScrollReveal(canvasHeaderRef as import('vue').Ref<HTMLElement | null>)

// AFTER:
const { observe, disconnect } = useScrollReveal(canvasHeaderRef as import('vue').Ref<HTMLElement | null>)
onMounted(() => observe())
onUnmounted(() => disconnect())
```

### Step 6: De-duplicate `useHealthPoll` across pages/components

**Files:** `frontend/app/pages/index.vue` (line 35), `frontend/app/components/common/GlobalNavbar.vue` (line 76)

**Problem:** Both call `useHealthPoll()` independently, creating two separate polling cycles (each 2 seconds) with separate retry counters and separate state. The health status values are not synced between them.

**Change:** Move health polling to a Nuxt-level composable that both pages/components share:

```ts
// Create: frontend/app/composables/common/useBackendHealth.ts
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTimeoutPoll } from '@vueuse/core'

export const backendHealthKey = Symbol('backendHealth')

export function useBackendHealth() {
  const status = ref<'loading' | 'ready' | 'error'>('loading')
  const modelLoaded = computed(() => status.value === 'ready')
  let retryCount = 0
  const maxRetries = 10

  async function checkHealth() {
    try {
      const response = await fetch('/health')
      if (!response.ok) {
        status.value = 'error'
        retryCount = maxRetries
        return
      }
      const data = await (await response.json()).status || 'ready'
      status.value = data
      if (status.value === 'ready') {
        retryCount = maxRetries
        pause()
      }
    } catch {
      retryCount++
      if (retryCount >= maxRetries) {
        status.value = 'error'
        pause()
      }
    }
  }

  const { pause, resume } = useTimeoutPoll(checkHealth, 2000)
  resume()

  onUnmounted(() => {
    pause()
  })

  return { status, modelLoaded }
}

export const resetBackendHealth = () => {}
```

**Wire up:**
- Replace `useHealthPoll()` call in `pages/index.vue` (line 35): `const { status: modelStatus } = useBackendHealth()`
- Replace `useHealthPoll()` call in `GlobalNavbar.vue` (line 76): `const { status, modelLoaded } = useBackendHealth()`

Note: The existing `useHealthPoll.ts` is kept but deprecated (empty `resetHealthPoll()` remains). New code uses `useBackendHealth` instead.

### Step 7: De-duplicate `useVoices` across pages/components

**File:** `frontend/app/composables/studio/useVoices.ts` (lines 34–36)

**Problem:** `onMounted(() => { loadVoices() })` means every invocation creates a new API call. Both the index page and GlobalNavbar independently call their own `useVoices()`, creating duplicate `/api/voices` calls.

**Change:** Convert to use Nuxt `useState` for caching, so the API is called exactly once per page navigation:

```ts
// BEFORE:
const voices = ref<Voice[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
onMounted(() => { loadVoices() })

// AFTER:
const cachedVoices = useState<Voice[]>('voices', () => [])
const cachedLoading = useState<boolean>('voices-loading', () => false)
const cachedError = useState<string | null>('voices-error', () => null)
```

The `loadVoices` function checks the cache first:
```ts
async function loadVoices(): Promise<Voice[]> {
  if (cachedVoices.value.length > 0) return cachedVoices.value
  cachedLoading.value = true
  try {
    const response = await fetch('/api/voices')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    cachedVoices.value = await response.json()
    return cachedVoices.value
  } catch (e) {
    cachedError.value = e instanceof Error ? e.message : 'Failed to load voices'
    return []
  } finally {
    cachedLoading.value = false
  }
}
```

Remove the `onMounted` call — `loadVoices()` is called explicitly where needed (index page already calls it implicitly via the watcher, so no change needed there).

**No API signature change** — returns `{ voices, loading, error, loadVoices }`.

## Critical files & anchors

1. `frontend/app/pages/dashboard/level/[level]/[lesson].vue` — Lines 23, 106–108, 167–170: Module-level mutable state and non-reactive `completedLines`
2. `frontend/app/composables/lesson/useLessonProgress.ts` — Line 7: Global plain `sharedProgress` object (needs `shallowRef`)
3. `frontend/app/composables/common/useToast.ts` — Lines 11–15: Module-scope singleton state (needs per-instance `useState`)
4. `frontend/app/composables/studio/useCleanupNavigation.ts` — Lines 5, 31–34: Exposed mutable state (needs `readonly` + explicit action)
5. `frontend/app/components/studio/DesktopPanels.vue` — Line 43: Dead `useScrollReveal` call (needs `observe()` invocation)

## Verification

**Command:** `cd frontend && pnpm typecheck` (from project root: `pnpm typecheck`)

**Verification steps:**

1. **Run `pnpm typecheck`** — All TypeScript files must compile with zero errors. This confirms:
   - `shallowRef` field access (`.value`) is correct throughout `[level]/[lesson].vue`
   - `sharedProgress.value` is correct throughout `useLessonProgress.ts`
   - `readonly` wrapping is correct in `useCleanupNavigation.ts`

2. **Run `pnpm test`** — All existing unit tests pass. No new tests should break.

3. **Manual UI verification:**
   - Navigate to any lesson page (`/dashboard/level/A1/1`) — the lesson should display correctly with all sections (Dialogue, Vocabulary, etc.)
   - Click "Generate Speech" in the text area — audio should synthesize and play via the waveform canvas
   - Navigate away from the lesson (to dashboard), then back — the lesson should re-initialize cleanly with no stale state (no in-flight synthesis from previous visit, `cleanedUp` resets)
   - Type text in the text area and watch the progress indicator update in the navbar as lines are completed (previously broken: `completedLines` was `let`, now `shallowRef` → UI updates)
   - Open the Voice Selector dropdown — voices should load (from cache after first visit) without duplicate `/api/voices` calls in the Network tab
   - Navigate between pages — toast notifications should clear on page change (previously: global singleton persisted toasts across navigation)
   - Scroll down on the dashboard and lesson pages — sections should fade-up on scroll (previously dead: `useScrollReveal` return value was discarded)

## Assumptions & contingencies

1. **Nuxt `useState` is available** — Nuxt 4's `useState` wraps a reactive store that is scoped to the current page/navigational context, not a global module singleton. If `useState` does not provide per-page scoping (i.e., still a global singleton), the `useToast` fix must instead use a Nuxt `provide/inject` pattern with a dedicated toast provider component in `app.vue`.

2. **`useTimeoutPoll` from `@vueuse/core` is available** — Already a project dependency (used in `useHealthPoll.ts`).

3. **`useState` keys collide across modules** — Each composable uses a distinct string key (`'toasts'`, `'toast-timers'`, `'voices'`, `'voices-loading'`, `'voices-error'`) to avoid cross-composable collisions.

4. **`readonly` wrapping prevents all direct `.value` assignment** — If the build system does not enforce readonly reactivity, the index page's `cleanup.dialogVisible.value = true` will be a TypeScript error (which is the desired behavior, since the composable must now call `cleanup.showDialog()` instead).
