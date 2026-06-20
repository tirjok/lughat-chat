import { vi } from 'vitest'

// ─── Browser API Mocks ──────────────────────────────────────────────
// Shared across all component tests.

global.URL.createObjectURL = vi.fn(() => 'http://mock.url/blob')
global.URL.revokeObjectURL = vi.fn()
global.fetch = vi.fn()

// ─── Viewport / Responsive Mocks ──────────────────────────────────────
// Used by responsive UI tests to simulate different viewport sizes.
// Set `window.innerWidth` to the desired breakpoint width before mounting components.

global.window.innerWidth = 1024 // Default: desktop width
global.window.innerHeight = 768
global.window.resizeTo = vi.fn()
global.window.matchMedia = vi.fn((query: string) => {
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

// ─── Nuxt Auto-Import Mocks ─────────────────────────────────────────
// Vue composables that Nuxt auto-imports — needed when testing components
// that use ref/computed as auto-imports (not explicit imports).

Object.assign(globalThis, {
  onMounted: vi.fn((_: () => void) => {
    // Store callbacks for tests that need to trigger mount lifecycle
  }),
  onUnmounted: vi.fn((_: () => void) => {
    // Store callbacks for tests that need to trigger unmount lifecycle
  }),
  ref: vi.fn((init: unknown) => ({ value: init })),
  computed: vi.fn((fn: () => unknown) => ({ get value() { return fn() } }))
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
