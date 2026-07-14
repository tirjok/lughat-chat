# Test Patterns — Lughat Chat

> **Purpose:** Authoritative reference for writing Vitest 4 tests in this Nuxt 4 project.
> **Stack:** Vitest 4.1+ · @nuxt/test-utils v4 · Nuxt 4.4+ · Vue 3.5+
> **Location:** `frontend/tests/PATTERNS.md`
> **Last updated:** 2026-07-14

---

## How to Use This File

When asked to write a test:
1. **Read the source file** the test targets (composable, component, or page).
2. **Find the matching pattern** below.
3. **Copy the template**, fill in the blanks with the real source's names.
4. **Run the test** — if it fails for the wrong reason (type error, missing import), fix that first.

> **Rule:** Never write a test for code you haven't read. The template is a scaffold — the source is the spec.

---

## Decision Tree — Pick Your Pattern

```
What am I testing?
│
├─ A composable (app/composables/*.ts)
│  │
│  ├─ Does it call fetch/$fetch/useFetch (or any HTTP request)?
│  │  ├─ YES → Does it use onMounted (or other lifecycle hooks)?
│  │  │  ├─ YES → Pattern 1: registerEndpoint + direct method call
│  │  │  └─ NO  → Pattern 2: global.fetch stub (pure method test)
│  │  └─ NO  → Does it use onMounted?
│  │     ├─ YES → Pattern 3b: Direct call (setup.ts mocks ref/computed)
│  │     └─ NO  → Pattern 3: Direct call (pure logic)
│  │
│  └─ Does it use onMounted but NO HTTP?
│     └─ Pattern 3b: Direct call (setup.ts mocks ref/computed)
│
├─ A component (app/components/*.vue)
│  │
│  ├─ Uses 1–3 composables (simple)?
│  │  └─ Pattern 4: vi.mock + mount (or mountSuspended for Nuxt features)
│  │
│  └─ Uses 4+ composables (page-level)?
│     └─ Pattern 5: vi.hoisted + mockNuxtImport + mountSuspended
│
└─ A page (app/pages/*.vue)
   │
   └─ Uses 4+ composables?
      └─ Pattern 5 (same as above — pages are just components with more deps)
```

---

## Naming Convention (AAA)

Every test name follows: **`(unit) | (scenario) | (result)`**

```ts
// ✅ Good — clear, searchable, descriptive
it('When text is empty then returns error message', () => { ... })
it('When API returns 503 then throws server unavailable error', async () => { ... })
it('When viewport is 375px then mobile panel is visible', () => { ... })

// ❌ Bad — vague, not searchable
it('handles empty text')
it('fetches voices')
it('works on mobile')
```

---

## Anti-Patterns (DO NOT USE)

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| `mount()` or `shallowMount()` for pages | Doesn't resolve Nuxt auto-imports, plugins, or suspense | `mountSuspended()` from `@nuxt/test-utils/runtime` |
| `Object.defineProperty(window, 'fetch', ...)` | Nuxt test env resolves fetch at Nitro/h3 level, not window | `registerEndpoint()` |
| `global.fetch = vi.fn(...)` on composables with `onMounted` | `onMounted` callbacks bypass the mock and hit the real network | `registerEndpoint()` + call public methods directly |
| Calling composables at the top of a `describe()` block | `[nuxt] instance unavailable` — Nuxt runtime not initialized yet | Defer inside `beforeEach()` or `it()` |
| Using `setup.ts` global mocks for API composables | Nuxt resolves auto-imports from `vue` directly, bypassing `globalThis` | `registerEndpoint` + direct method calls |
| Multiple `mockNuxtImport` for the same import | Hoisting prevents duplicate mocks per file | Use `vi.hoisted()` to manage mock state between tests |
| Testing private/internal implementation details | Tests break on refactors that don't change behavior | Test public contract: props, emitted events, rendered output, returned refs |

---

## Pattern 1: Composable with API Calls + Lifecycle Hooks

**Use when:** The composable calls `fetch`/`$fetch`/`useFetch` **and** uses `onMounted`.

**Key rules:**
- Use `registerEndpoint()` to mock the API — not `global.fetch`.
- Call the composable's **public methods directly** — never try to trigger `onMounted`.
- Defer composable calls inside `it()` or `beforeEach()` (not at `describe` top level).

**Working reference:** `frontend/tests/useVoices.test.ts`

---

## Pattern 2: Composable with API Calls (No Lifecycle Hooks)

**Use when:** The composable calls `fetch`/`$fetch` but does **NOT** use `onMounted` or other lifecycle hooks.

**Key rules:**
- Use `global.fetch = vi.fn(...)` — this works because there's no `onMounted` callback to bypass it.
- Call the composable's methods directly.
- Assert on the fetch call arguments (headers, body, URL) to verify the request shape.
- This is the **simplest pattern** — use it for pure method tests.

**Working reference:** `frontend/tests/useTtsApi.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMyComposable } from '../app/composables/useMyComposable'

describe('useMyComposable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('When valid parameters are provided then sends correct POST body', async () => {
    // Arrange
    const mockBlob = new Blob(['dummy'], { type: 'audio/mpeg' })
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      blob: () => Promise.resolve(mockBlob)
    }))

    const { method } = useMyComposable()

    // Act
    await method({ text: 'Hello', speed: 1.2 })

    // Assert
    expect(fetch).toHaveBeenCalledWith(
      '/api/endpoint',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Hello', speed: 1.2 })
      })
    )
  })

  it('When API returns non-OK then throws expected error', async () => {
    // Arrange
    global.fetch = vi.fn(() => Promise.resolve({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ detail: 'Model not ready' })
    }))

    const { method } = useMyComposable()

    // Act + Assert
    await expect(method({ text: 'Hello' })).rejects.toThrow(
      'Expected error message from the composable'
    )
  })

  it('When network fails then throws connection error', async () => {
    // Arrange
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

    const { method } = useMyComposable()

    // Act + Assert
    await expect(method({ text: 'Hello' })).rejects.toThrow(
      'Expected connection error from the composable'
    )
  })
})
```

**Notes:**
- `global.fetch` works here because there's no `onMounted` — the composable's methods are called directly.
- Always mock `blob()` and `json()` on the response — the composable will call these.
- For error tests, always mock `json()` even on success responses (some composables call `.json()` in catch blocks).

---

## Pattern 3: Pure Logic Composable (No API, No Lifecycle)

**Use when:** The composable only manages reactive state (refs, computed, watch) and has **no** HTTP calls and **no** lifecycle hooks.

**Key rules:**
- Call the composable directly — no mocking needed.
- `setup.ts` provides global mocks for `ref`, `computed`, `watch`, `onMounted` — these are safe for pure-logic composables.
- For composables that use timers, use `vi.useFakeTimers()` / `vi.advanceTimersByTime()`.
- Test the composable's **public interface**: return values, state changes, method side-effects.

**Working reference:** `frontend/tests/useInputValidation.test.ts`, `frontend/tests/useToast.test.ts`, `frontend/tests/usePanelToggle.test.ts`

**Note — Pattern 3b (onMounted + no HTTP):** If a composable uses `onMounted` but makes **no** HTTP calls, it still uses Pattern 3's approach: call the composable directly. The `setup.ts` mocks for `onMounted` are sufficient because there are no network calls to intercept. The lifecycle hook runs synchronously during the composable call — no need to defer or trigger it.

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useMyComposable } from '../app/composables/useMyComposable'

describe('useMyComposable', () => {
  it('When no input is provided then returns default state', () => {
    // Act
    const { count, isValid } = useMyComposable()

    // Assert
    expect(count.value).toBe(0)
    expect(isValid.value).toBe(true)
  })

  it('When method() is called then updates state correctly', () => {
    // Act
    const { count, increment } = useMyComposable()
    increment()

    // Assert
    expect(count.value).toBe(1)
  })
})
```

**Timer example (for composables using setTimeout/setInterval):**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useToast } from '../app/composables/useToast'

describe('useToast auto-dismiss', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('When shown then auto-dismisses after 5 seconds', () => {
    // Act
    showToast('Error message')
    expect(useToast().value.length).toBe(1)

    vi.advanceTimersByTime(5000)

    // Assert
    expect(useToast().value.length).toBe(0)
  })
})
```

**Notes:**
- Pure-logic composables (no HTTP, no lifecycle) can be called directly in `it()` blocks.
- If the composable uses `setTimeout`/`setInterval`, wrap with `vi.useFakeTimers()` / `vi.advanceTimersByTime()`.
- `setup.ts` mocks `ref`, `computed`, `watch`, `onMounted` — these only work for composables that don't make network calls.

---

## Pattern 4: Component with `vi.mock()` — Simple Components (1–3 Dependencies)

**Use when:** A component uses 1–3 composables or dependencies. The component is **not** a page (no 4+ deps).

**Key rules:**
- Use `vi.mock()` at the **top of the file** (it is hoisted automatically by Vitest).
- Use `shallowRef` for module-level reactive state that drives re-renders when `.value` changes.
- For simple UI-only components (no Nuxt features), `mount()` from `@vue/test-utils` is acceptable.
- For components that need Nuxt features (auto-imports, routing), use `mountSuspended()` instead.
- Test the component's **public contract**: rendered text, data attributes, emitted events, props.

**Working reference:** `frontend/tests/ModelStatusIndicator.test.ts`, `frontend/tests/LoadingBanner.test.ts`, `frontend/tests/SpeedSlider.test.ts`, `frontend/tests/VoiceSelector.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { shallowRef } from 'vue'
import MyComponent from '../app/components/MyComponent.vue'

// Module-level reactive ref — the mock composable reads this at mount time.
// Changing .value triggers re-renders across all mounted wrappers.
const mockStatus = shallowRef<'loading' | 'ready'>('loading')

// vi.mock is hoisted to the top of the file by Vitest.
// The factory returns the mock composable interface.
vi.mock('../app/composables/useMyComposable', () => ({
  useMyComposable: () => ({
    get status() { return mockStatus.value },
    doSomething: vi.fn()
  })
}))

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStatus.value = 'loading'
  })

  it('When status is loading then renders loading indicator', () => {
    // Act
    const wrapper = mount(MyComponent)

    // Assert
    expect(wrapper.find('[data-test-id="loading"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading')
  })

  it('When status is ready then renders ready indicator', () => {
    // Arrange
    mockStatus.value = 'ready'

    // Act
    const wrapper = mount(MyComponent)

    // Assert
    expect(wrapper.find('[data-test-id="ready"]').exists()).toBe(true)
  })
})
```

**Notes:**
- `vi.mock()` is **hoisted** — it runs before any code in the file executes. This is why the mock must be at file scope, not inside a function.
- Use `shallowRef` (not `ref`) for the module-level state — it avoids deep reactivity overhead and is the pattern used in all working component tests.
- For components that use Nuxt features (routing, auto-imports, plugins), replace `mount()` with `mountSuspended()` from `@nuxt/test-utils/runtime`.
- For responsive testing, use `setBreakpoint()` from `frontend/tests/mocks.ts` (sets `window.innerWidth` and `matchMedia`).

---

## Pattern 5: Page with 4+ Composables — The Working Pattern

**Use when:** A page (or component) uses **4 or more** composables. This is the **only correct pattern** for page-level tests in this project.

**Key rules:**
- Use `vi.hoisted()` to define mock factories at file scope (outside the `vi.mock` hoisted zone).
- Use `mockNuxtImport()` to wire each mock composable to the Nuxt auto-import system.
- Use `mockComponent()` to stub sub-components so `mountSuspended` can render them.
- Use `registerEndpoint()` for any API calls the page's composables make.
- Use `mountSuspended()` — **never** `shallowMount()` or `mount()` for pages.
- Defer composable calls inside `it()` blocks (not at `describe` top level).

**Working reference:** `frontend/tests/index.test.ts` (the **only** page test that passes cleanly)
**Broken reference:** `frontend/tests/PanelSliding.test.ts` (uses `shallowMount` + `Object.assign(globalThis)` — produces unhandled rejection errors)

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, defineComponent } from 'vue'
import { mountSuspended, mockNuxtImport, mockComponent, registerEndpoint } from '@nuxt/test-utils/runtime'
import MyPage from '../app/pages/MyPage.vue'

// ─── File-level mock factories (vi.hoisted = before Nuxt starts) ──────
const {
  useAudioModuleMock,
  useTtsApiMock,
  useVoicesMock,
  useHealthPollMock
} = vi.hoisted(() => ({
  useAudioModuleMock: vi.fn(() => ({
    audioRef: ref(null),
    audioUrl: ref(null),
    isPlaying: ref(false),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    toggle: vi.fn(),
    dispose: vi.fn()
  })),
  useTtsApiMock: vi.fn(() => ({
    synthesize: vi.fn().mockResolvedValue(new Blob([], { type: 'audio/mpeg' })),
    healthCheck: vi.fn().mockResolvedValue({ status: 'ready', model_loaded: true })
  })),
  useVoicesMock: vi.fn(() => ({
    voices: ref([{ id: 'a', name: 'A' }])
  })),
  useHealthPollMock: vi.fn(() => ({
    status: 'ready',
    modelLoaded: true,
    modelName: '',
    subStatus: '',
    stop: vi.fn(),
    retry: vi.fn(),
    start: vi.fn()
  }))
}))

// Wire each mock to the Nuxt auto-import system
mockNuxtImport('useAudioModule', () => useAudioModuleMock)
mockNuxtImport('useTtsApi', () => useTtsApiMock)
mockNuxtImport('useVoices', () => useVoicesMock)
mockNuxtImport('useHealthPoll', () => useHealthPollMock)

// Stub sub-components so mountSuspended can render them
mockComponent('SubComponent', defineComponent({
  props: ['data'],
  template: '<div class="sub-component" data-testid="sub-component"></div>'
}))

// Mock API endpoints the page's composables call
registerEndpoint('/api/voices', () => [{ id: 'a', name: 'A' }])

// ─── Tests ─────────────────────────────────────────────────────────────

describe('MyPage', () => {
  it('When rendered then renders all expected sub-components', async () => {
    // Act
    const wrapper = await mountSuspended(MyPage)

    // Assert
    expect(wrapper.find('[data-testid="sub-component"]').exists()).toBe(true)
  })
})
```

**Notes:**
- `vi.hoisted()` runs **before** Nuxt starts (in Vitest 4, Nuxt initialization moved to `beforeAll`). This is critical — mocks must be available before Nuxt bootstrap.
- `mockNuxtImport` is a **macro** (rewritten at build time). It is hoisted automatically. You can only mock each import **once per file**.
- `mockComponent` stubs sub-components so `mountSuspended` doesn't try to render them (and hit their own dependencies).
- `registerEndpoint` handles API calls made by composables — the endpoint must match the URL the composable calls.
- Always use `await mountSuspended()` — it handles async setup and suspense contexts.
- **Do NOT** use `shallowMount()` + `Object.assign(globalThis)` — this is the broken `PanelSliding` pattern that produces unhandled rejection errors.

---

## Pattern 6: Responsive / Breakpoint Testing

**Use when:** Testing responsive layout changes (mobile vs desktop breakpoints).

**Key rules:**
- Use `setBreakpoint()` from `frontend/tests/mocks.ts` — it sets `window.innerWidth` and `matchMedia`.
- Save and restore `window.innerWidth` in `beforeEach` / `afterEach`.
- Combine with Pattern 4 (for simple components) or Pattern 5 (for pages).

**Working reference:** `frontend/tests/usePanelToggle.test.ts`, `frontend/tests/index.test.ts` (responsive section)

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setBreakpoint } from './mocks'
import { useMyComposable } from '../app/composables/useMyComposable'

describe('useMyComposable responsive', () => {
  let originalInnerWidth: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      value: originalInnerWidth,
      writable: true
    })
  })

  it('When viewport is 375px then isMobile is true', () => {
    // Act
    setBreakpoint(375)
    const { isMobile } = useMyComposable()

    // Assert
    expect(isMobile.value).toBe(true)
  })

  it('When viewport is 768px then isMobile is false', () => {
    // Act
    setBreakpoint(768)
    const { isMobile } = useMyComposable()

    // Assert
    expect(isMobile.value).toBe(false)
  })
})
```

**Notes:**
- `setBreakpoint()` also updates `matchMedia` so VueUse's `useMediaQuery` works in tests.
- Always restore `window.innerWidth` in `afterEach` to avoid test pollution.

---

## Pattern 7: Error Handling (API Composables, No Lifecycle)

**Use when:** Testing error paths of composables that do NOT use `onMounted` (use Pattern 2 as the base).

**Key rules:**
- Use `global.fetch = vi.fn(...)` (Pattern 2's approach).
- Always mock `json()` on the response — composables often call `.json()` in catch blocks.
- Use `expect(fn).rejects.toThrow()` — never `try/catch` in tests.

**Working reference:** `frontend/tests/useTtsApi.test.ts`

```ts
import { describe, it, expect, vi } from 'vitest'
import { useMyComposable } from '../app/composables/useMyComposable'

describe('useMyComposable error handling', () => {
  it('When API returns 503 then throws server unavailable error', async () => {
    // Arrange
    global.fetch = vi.fn(() => Promise.resolve({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ detail: 'Model not ready' })
    }))

    const { method } = useMyComposable()

    // Act + Assert
    await expect(method({ text: 'Hello' })).rejects.toThrow(
      'Expected error message from the composable'
    )
  })

  it('When network fails then throws connection error', async () => {
    // Arrange
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))

    const { method } = useMyComposable()

    // Act + Assert
    await expect(method({ text: 'Hello' })).rejects.toThrow(
      'Expected connection error from the composable'
    )
  })
})
```

**Notes:**
- Always mock `.json()` even on success responses — some composables call `.json()` in `.catch()` blocks.
- Use `expect(fn).rejects.toThrow()` — this is the Goldberg best practice (Section 1, point 10).
- For `global.fetch` stubbing: only use this when the composable does NOT use `onMounted` (see Pattern 2).

---

## Quick Decision Flowchart

```
What am I testing?
│
├─ A composable (app/composables/*.ts)
│  │
│  ├─ Does it call fetch/$fetch/useFetch?
│  │  ├─ YES → Does it use onMounted?
│  │  │  ├─ YES → Pattern 1: registerEndpoint + direct call
│  │  │  └─ NO  → Pattern 2: global.fetch stub
│  │  └─ NO  → Does it use onMounted?
│  │     ├─ YES → Pattern 3b: Direct call (setup.ts mocks)
│  │     └─ NO  → Pattern 3: Direct call (pure logic)
│  │
│  └─ Does it use onMounted but NO HTTP?
│     └─ Pattern 3b: Direct call (setup.ts mocks)
│
├─ A component (app/components/*.vue)
│  │
│  ├─ Uses 1–3 dependencies?
│  │  └─ Pattern 4: vi.mock + mount (or mountSuspended)
│  │
│  └─ Uses 4+ dependencies?
│     └─ Pattern 5: vi.hoisted + mockNuxtImport + mountSuspended
│
└─ A page (app/pages/*.vue)
   │
   └─ Uses 4+ composables?
      └─ Pattern 5 (same as component with 4+ deps)
```

> **Note — Pattern 3b:** A composable that uses `onMounted` but makes **no** HTTP calls is still tested directly (Pattern 3's approach). The `setup.ts` mocks for `onMounted` are sufficient — there are no network calls to intercept. This resolves the ambiguity where the decision tree suggested Pattern 3 but Pattern 3's description said "no lifecycle hooks."

---

## Anti-Patterns (DO NOT USE)

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| `mount()` or `shallowMount()` for pages | Doesn't resolve Nuxt auto-imports, plugins, or suspense | `mountSuspended()` from `@nuxt/test-utils/runtime` |
| `Object.defineProperty(window, 'fetch', ...)` | Nuxt test env resolves fetch at Nitro/h3 level, not window | `registerEndpoint()` |
| `global.fetch = vi.fn(...)` on composables with `onMounted` | `onMounted` callbacks bypass the mock and hit the real network | `registerEndpoint()` + call public methods directly |
| Calling composables at the top of a `describe()` block | `[nuxt] instance unavailable` — Nuxt runtime not initialized yet | Defer inside `beforeEach()` or `it()` |
| Using `setup.ts` global mocks for API composables | Nuxt resolves auto-imports from `vue` directly, bypassing `globalThis` | `registerEndpoint` + direct method calls |
| Multiple `mockNuxtImport` for the same import | Hoisting prevents duplicate mocks per file | Use `vi.hoisted()` to manage mock state between tests |
| Testing private/internal implementation details | Tests break on refactors that don't change behavior | Test public contract: props, emitted events, rendered output, returned refs |
| `shallowMount()` + `Object.assign(globalThis)` for pages | Produces unhandled rejection errors (see PanelSlading) | Use `vi.hoisted()` + `mockNuxtImport()` + `mountSuspended()` (see Pattern 5) |

---

## Related

- **ADR-013** — `docs/architecture/ADR-013-testing-strategy-and-llm-test-generation.md` — Four-pillar strategy decision record
- **AGENTS.md** — Project context, testing anti-patterns table, pre-test checklist (authority document)
- `frontend/tests/setup.ts` — Global mock setup for unit tests (ref, computed, watch, onMounted)
- `frontend/tests/setup.component.ts` — Global mock setup for component tests (URL APIs, fetch)
- `frontend/tests/mocks.ts` — Mock factory functions for component tests (used by Pattern 4)
- `frontend/tests/index.test.ts` — Working Pattern 5 page test (single reference)
- `frontend/tests/PanelSlading.test.ts` — **BROKEN** — uses `shallowMount` + `Object.assign(globalThis)` (documented as cautionary example)
- `vitest.config.ts` — Vitest configuration (environment: 'nuxt', domEnvironment: 'jsdom')
- `vitest.component.config.ts` — Component test configuration
