import { vi } from 'vitest'
import { ref, computed, type Ref } from 'vue'

// ─── Breakpoint Simulation Helper ─────────────────────────────────────
// Sets window.innerWidth to simulate a specific device breakpoint.
// Call this before mounting components that depend on responsive state.
//
// Common breakpoints: 375 (iPhone SE), 414 (iPhone Max), 768 (iPad), 1024 (tablet)
export function setBreakpoint(width: number): void {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: Math.max(600, width * 0.6), writable: true })
}

// ─── Audio Module Mock Factory ───────────────────────────────────────
// Returns reactive refs + mock methods matching useAudioModule's real interface.
// Use this in vi.mock() callbacks for component tests that depend on useAudioModule.

export const createMockUseAudioModule = () => {
  const audioRef: Ref<HTMLAudioElement | null> = ref(null)
  const audioUrl: Ref<string | null> = ref(null)
  const duration: Ref<number> = ref(0)
  const currentTime: Ref<number> = ref(0)
  const isPlaying: Ref<boolean> = ref(false)
  const isPaused: Ref<boolean> = ref(false)
  const isLoading: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)
  const formattedCurrentTime: Ref<string> = ref('0:00')
  const formattedDuration: Ref<string> = ref('0:00')

  return {
    audioRef,
    audioUrl,
    duration,
    currentTime,
    isPlaying,
    isPaused,
    isLoading,
    error,
    formattedCurrentTime,
    formattedDuration,
    load: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    seek: vi.fn(),
    download: vi.fn(),
    dispose: vi.fn()
  }
}

// ─── TTS API Mock Factory ────────────────────────────────────────────
export const createMockUseTtsApi = () => ({
  synthesize: vi.fn().mockResolvedValue(new Blob([], { type: 'audio/mpeg' })),
  healthCheck: vi.fn().mockResolvedValue({ status: 'ready' as const, model_loaded: true })
})

// ─── Health Poll Mock Factory ────────────────────────────────────────
export const createMockUseHealthPoll = () => ({
  status: ref('loading' as const),
  modelLoaded: computed(() => true)
})

// ─── Input Validation Mock Factory ───────────────────────────────────
export const createMockUseInputValidation = () => ({
  isValid: ref(true),
  error: ref(null as string | null),
  handleKeyDown: vi.fn()
})

// ─── Toast Mock Factory ──────────────────────────────────────────────
export const createMockUseToast = () => ({
  message: ref(''),
  visible: ref(false)
})
