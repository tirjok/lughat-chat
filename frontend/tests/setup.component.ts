import { vi } from 'vitest'

// ─── Browser API Mocks ──────────────────────────────────────────────

global.URL.createObjectURL = vi.fn(() => 'http://mock.url/blob')
global.URL.revokeObjectURL = vi.fn()

global.fetch = vi.fn()

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

// ─── Viewport / Responsive Mocks ─────────────────────────────────────

global.window.innerWidth = 1024
global.window.innerHeight = 768
global.window.resizeTo = vi.fn()
global.window.matchMedia = vi.fn((query: string) => {
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

// ─── Breakpoint Simulation Helper ─────────────────────────────────────

export function setBreakpoint(width: number): void {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: Math.max(600, width * 0.6), writable: true })
}

// ─── Re-export mock factories for component tests ───────────────────
export {
  createMockUseAudioModule,
  createMockUseTtsApi,
  createMockUseHealthPoll,
  createMockUseInputValidation,
  createMockUseToast
} from './mocks'
