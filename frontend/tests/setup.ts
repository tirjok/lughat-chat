import { vi, beforeEach } from 'vitest'

// ─── Browser API Mocks ──────────────────────────────────────────────
// These are shared across all tests (composable + component).
// When running in the Nuxt test environment (@nuxt/test-utils/module),
// Nuxt auto-imports (ref, computed, useRoute, etc.) are provided natively.
// We only need to mock browser APIs that don't exist in jsdom.

global.URL.createObjectURL = vi.fn(() => 'http://mock.url/blob') as unknown as typeof global.URL.createObjectURL

global.URL.revokeObjectURL = vi.fn()

// matchMedia mock for useScrollReveal (prefers-reduced-motion check)
global.window.matchMedia = vi.fn(() => ({ matches: false, media: '' })) as unknown as typeof global.window.matchMedia

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

// ─── Re-export mock factories for component tests ───────────────────
export {
  createMockUseAudioPlayer,
  createMockUseTtsApi,
  createMockUseHealthPoll,
  createMockUseInputValidation,
  createMockUseToast
} from './mocks'
