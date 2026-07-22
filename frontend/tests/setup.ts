import { nextTick as _nextTick } from 'vue'

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
// ─── jsdom HTMLMediaElement workaround ───────────────────────────────
// jsdom does not implement HTMLMediaElement.load(). VueUse's
// useMediaControls calls el.load() which throws "Not implemented".
// Silence it so it does not leak as unhandled errors.
const AudioProto = HTMLMediaElement.prototype
Object.defineProperty(AudioProto, 'load', {
  value: vi.fn(),
  writable: true,
  configurable: true
})
// jsdom's HTMLMediaElement.play() returns undefined (not a Promise).
// VueUse's useMediaControls calls el.play().catch(...) which fails.
// Mock play() to return a resolved Promise.
Object.defineProperty(AudioProto, 'play', {
  value: vi.fn(() => Promise.resolve()),
  writable: true,
  configurable: true
})
export {
  createMockUseAudioModule,
  createMockUseTtsApi,
  createMockUseHealthPoll,
  createMockUseInputValidation,
  createMockUseToast
} from './mocks'
