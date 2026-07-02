import { vi } from 'vitest'

// Reset the health poll singleton before each test file
import { _resetHealthPoll } from '../app/composables/useHealthPoll'

_resetHealthPoll()

// ─── Browser API Mocks ──────────────────────────────────────────────
// These are shared across all tests (composable + component).

global.window.devicePixelRatio = 1

global.URL.createObjectURL = vi.fn(() => 'http://mock.url/blob') as unknown as typeof global.URL.createObjectURL
global.URL.revokeObjectURL = vi.fn()

// Track onMounted callbacks for testing composables that use lifecycle hooks
const mountedCallbacks: (() => void)[] = []

// Mock Nuxt auto-imported composables — return reactive-like objects with .value properties
Object.assign(globalThis, {
  onMounted: vi.fn((cb: () => void) => mountedCallbacks.push(cb)),
  ref: vi.fn((init: unknown) => ({ value: init })),
  computed: vi.fn((fn: () => unknown) => ({ get value() { return fn() } }))
})

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
