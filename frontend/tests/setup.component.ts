import { vi } from 'vitest'

// ─── Browser API Mocks ──────────────────────────────────────────────
// Shared across all component tests.

global.URL.createObjectURL = vi.fn(() => 'http://mock.url/blob')
global.URL.revokeObjectURL = vi.fn()
global.fetch = vi.fn()

// ─── Re-export mock factories for component tests ───────────────────
export {
  createMockUseAudioPlayer,
  createMockUseTtsApi,
  createMockUseHealthPoll,
  createMockUseInputValidation,
  createMockUseToast
} from './mocks'
