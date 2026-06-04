import { vi } from 'vitest'

// ─── Browser API Mocks ──────────────────────────────────────────────
// These are shared across all tests (composable + component).

global.URL.createObjectURL = vi.fn(() => 'http://mock.url/blob') as unknown as typeof global.URL.createObjectURL
global.URL.revokeObjectURL = vi.fn()

// Track onMounted callbacks for testing composables that use lifecycle hooks
const mountedCallbacks: (() => void)[] = []
global.onMounted = vi.fn((cb: () => void) => mountedCallbacks.push(cb))

// Mock Nuxt auto-imported composables — return reactive-like objects with .value properties
global.ref = vi.fn((init: unknown) => ({ value: init })) as typeof global.ref
global.computed = vi.fn((fn: () => unknown) => ({ get value() { return fn() } })) as typeof global.computed

// ─── Re-export mock factories for component tests ───────────────────
export {
  createMockUseAudioPlayer,
  createMockUseTtsApi,
  createMockUseHealthPoll,
  createMockUseInputValidation,
  createMockUseToast
} from './mocks'

// Export for tests to trigger mount callbacks
export { mountedCallbacks }
