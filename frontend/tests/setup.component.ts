import { vi } from 'vitest'

// ─── Browser API Mocks ──────────────────────────────────────────────
// Shared across all component tests.

global.URL.createObjectURL = vi.fn(() => 'http://mock.url/blob')
global.URL.revokeObjectURL = vi.fn()
global.fetch = vi.fn()

// ─── Nuxt Auto-Import Mocks ─────────────────────────────────────────
// Vue composables that Nuxt auto-imports — needed when testing components
// that use ref/computed as auto-imports (not explicit imports).

Object.assign(globalThis, {
  onMounted: vi.fn((_: () => void) => {
    // Store callbacks for tests that need to trigger mount lifecycle
  }),
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
