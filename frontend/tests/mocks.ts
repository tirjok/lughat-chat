import { vi } from 'vitest'
import { ref, computed, type Ref } from 'vue'

// ─── Audio Player Mock Factory ───────────────────────────────────────
// Returns reactive refs + mock methods matching useAudioPlayer's real interface.
// Use this in vi.mock() callbacks for component tests that depend on useAudioPlayer.

export const createMockUseAudioPlayer = () => {
  const audioRef: Ref<HTMLAudioElement | null> = ref(null)
  const audioUrl: Ref<string | null> = ref(null)
  const blobRef: Ref<Blob | null> = ref(null)
  const duration: Ref<number> = ref(0)
  const currentTime: Ref<number> = ref(0)
  const isPlaying: Ref<boolean> = ref(false)
  const isPaused: Ref<boolean> = ref(false)
  const isLoading: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)

  return {
    audioRef,
    audioUrl,
    blobRef,
    duration,
    currentTime,
    isPlaying,
    isPaused,
    isLoading,
    error,
    loadAudio: vi.fn().mockReturnValue('blob:http://test'),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    togglePlayPause: vi.fn(),
    getDownloadUrl: vi.fn().mockReturnValue(null),
    downloadAudio: vi.fn(),
    cleanup: vi.fn()
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
