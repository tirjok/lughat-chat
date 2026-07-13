import { vi } from 'vitest'

// ─── Browser API Mocks ──────────────────────────────────────────────
// These are standard browser APIs that the Nuxt 'nuxt' test environment
// does NOT mock by default. They are safe to override on globalThis.

const g = globalThis as Record<string, unknown>
g.window ??= {} as Window
;(g.window as Window).devicePixelRatio = 1
;(g.URL as typeof URL).createObjectURL = vi.fn(() => 'http://mock.url/blob') as typeof URL.createObjectURL
;(g.URL as typeof URL).revokeObjectURL = vi.fn()
;(g.window as Window).matchMedia = vi.fn(() => ({ matches: false, media: '' })) as typeof window.matchMedia

// ─── Re-export mock factories for component tests ───────────────────
// These are used by mockNuxtImport in component tests (setup.component.ts).
// They are NOT used by unit tests (setup.ts) — unit tests use registerEndpoint
// for API mocking and real Vue composables for state.
export {
  createMockUseAudioModule,
  createMockUseTtsApi,
  createMockUseHealthPoll,
  createMockUseInputValidation,
  createMockUseToast
} from './mocks'
