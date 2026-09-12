import { vi, beforeEach } from 'vitest'
import { type App as VueApp, createApp, ref } from 'vue'

// ─── Vue Lifecycle Warning Suppression ──────────────────────────────
// Unit tests call composables that use onMounted/onUnmounted without
// a real component instance. Create a hidden app to absorb these
// calls so Vue doesn't emit "lifecycle injection APIs can only be
// used during execution of setup()" warnings.
let __testApp: VueApp | null = null

beforeEach(() => {
  try {
    __testApp?.unmount()
  } catch { /* jsdom may not support unmount */ }
  __testApp = null
  __testApp = createApp({}).mount(
    Object.assign(document.createElement('div'), { id: '__test-lifecycle-suppressor' })
  )
})

// ─── Browser API Mocks ──────────────────────────────────────────────
// These are shared across all tests (composable + component).
// When running in the Nuxt test environment (@nuxt/test-utils/module),
// Nuxt auto-imports (ref, computed, useRoute, etc.) are provided natively.
// We only need to mock browser APIs that don't exist in jsdom.

global.URL.createObjectURL = vi.fn(() => 'http://mock.url/blob') as unknown as typeof global.URL.createObjectURL

global.URL.revokeObjectURL = vi.fn()

// matchMedia mock for useScrollReveal (prefers-reduced-motion check)
global.window.matchMedia = vi.fn((query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof global.window.matchMedia

// IntersectionObserver mock for useScrollReveal
const mockIntersectionObserver = vi.fn()
const mockElements: Element[] = []
global.IntersectionObserver = class IntersectionObserver extends EventTarget {
  private callback_: IntersectionObserverCallback
  private options_?: IntersectionObserverInit
  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) {
    super()
    this.callback_ = callback
    this.options_ = options
    mockIntersectionObserver(this, options)
  }

  observe(el: Element) {
    mockElements.push(el)
  }

  unobserve(_el: Element) {}

  disconnect() {
    mockElements.length = 0
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  rootEl: Element | null = null

  rootMarginEl: string = '0px'

  get options() {
    return this.options_
  }
} as unknown as typeof IntersectionObserver

beforeEach(() => {
  mockElements.length = 0
})

// ─── useState mock for unit tests ──────────────────────────────────
// useState requires a Nuxt app instance; in unit tests we substitute
// with a per-key ref registry so composables can be exercised without
// a mounted Nuxt app.
const useStateRegistry = new Map<string, ReturnType<typeof ref>>()

vi.mock('#app', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useState<T>(key: string, _default?: () => T): ReturnType<typeof ref<T>> {
      if (!useStateRegistry.has(key)) {
        useStateRegistry.set(key, ref<T>(_default?.() as T))
      }
      return useStateRegistry.get(key) as ReturnType<typeof ref<T>>
    }
  }
})

// ─── Re-export mock factories for component tests ───────────────────
export {
  createMockUseAudioPlayer,
  createMockUseTtsApi,
  createMockUseHealthPoll,
  createMockUseInputValidation,
  createMockUseToast
} from './mocks'

// ─── Expose useState registry for test cleanup ───────────────────
export const clearUseStateRegistry = () => {
  useStateRegistry.clear()
}
