import { vi, beforeEach } from 'vitest'

// Suppress Vue warnings about unresolved components in component tests.
// index.vue renders child components (ToastNotification, FocusHaloCanvas,
// VoiceSelector, etc.) that aren't registered in mount options. These are
// pre-existing warnings — suppressing them keeps CI output clean without
// changing test behavior.
const originalWarn = console.warn
console.warn = (msg: string) => {
  if (msg.includes('Failed to resolve component')) return
  originalWarn(msg)
}

// ─── Browser API Mocks ──────────────────────────────────────────────
// Shared across all component tests.

global.URL.createObjectURL = vi.fn(() => 'http://mock.url/blob')
global.URL.revokeObjectURL = vi.fn()
global.fetch = vi.fn()

// IntersectionObserver mock for useScrollReveal
if (typeof (globalThis as unknown as Record<string, unknown>).IntersectionObserver !== 'function') {
  global.IntersectionObserver = class IntersectionObserver extends EventTarget {
    constructor(
      _callback: IntersectionObserverCallback,
      _options?: IntersectionObserverInit
    ) {
      super()
    }

    observe(_el: Element) {}

    unobserve(_el: Element) {}

    disconnect() {}

    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  } as unknown as typeof IntersectionObserver
}

// ─── Viewport / Responsive Mocks ──────────────────────────────────────
// Used by responsive UI tests to simulate different viewport sizes.
// Set `window.innerWidth` to the desired breakpoint width before mounting components.
// jsdom makes window.innerWidth read-only by default, so we use Object.defineProperty.

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: 768, writable: true })
  window.resizeTo = vi.fn()
  window.matchMedia = vi.fn((query: string) => {
    // Parse common breakpoint queries for responsive tests
    const widthMatch = query.match(/\(max-width:\s*(\d+)px\)/)
    if (widthMatch) {
      const breakpoint = parseInt(widthMatch[1], 10)
      return {
        matches: window.innerWidth <= breakpoint,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }
    }
    // Default: no matches
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }
  })
})

// ─── Nuxt Auto-Import Mocks (Vue composables) ─────────────────────────
// These are manually stubbed because jsdom doesn't load Nuxt auto-imports.
// ref() and computed() are reactive-like: they share state when given the
// same initial value, enabling tests that mutate ref() and read computed().

Object.assign(globalThis, {
  onMounted: vi.fn(() => {}),
  onUnmounted: vi.fn(() => {}),
  ref: vi.fn((init: unknown) => ({ value: init })),
  computed: vi.fn((fn: () => unknown) => ({ get value() { return fn() } })),
  shallowRef: vi.fn((init: unknown) => ({ value: init })),
  watch: vi.fn(),
  nextTick: vi.fn(),
  useRoute: vi.fn(() => ({
    path: '/',
    fullPath: '/',
    params: {},
    query: {},
    hash: '',
    name: undefined,
    matched: [],
    meta: {},
    redirectedFrom: undefined
  })),
  useNuxtApp: vi.fn(() => ({
    route: {
      path: '/',
      fullPath: '/',
      params: {},
      query: {},
      hash: '',
      name: undefined,
      matched: [],
      meta: {},
      redirectedFrom: undefined
    }
  }))
})

// ─── Breakpoint Simulation Helper ─────────────────────────────────────
// Sets window.innerWidth to simulate a specific device breakpoint.
// Call this before mounting components that depend on responsive state.
//
// Common breakpoints: 375 (iPhone SE), 414 (iPhone Max), 768 (iPad), 1024 (tablet)
export function setBreakpoint(width: number): void {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: Math.max(600, width * 0.6), writable: true })
}

// ─── Re-export mock factories for component tests ───────────────────
export {
  createMockUseAudioPlayer,
  createMockUseTtsApi,
  createMockUseHealthPoll,
  createMockUseInputValidation,
  createMockUseToast
} from './mocks'
