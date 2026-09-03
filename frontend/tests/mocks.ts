import { vi } from 'vitest'
import { ref, computed, type Ref } from 'vue'
// ─── Breakpoint Simulation Helper ─────────────────────────────────────
// Sets window.innerWidth and matchMedia to simulate a specific device breakpoint.
// Call this before mounting components or calling composables that depend on responsive state.
//
// Common breakpoints: 375 (iPhone SE), 414 (iPhone Max), 768 (iPad), 1024 (tablet)
export function setBreakpoint(width: number): void {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: Math.max(600, width * 0.6), writable: true })
  const listeners = new Map<string, Set<EventListener>>()
  function fireChange() {
    for (const [_type, cbs] of listeners) {
      for (const cb of cbs) {
        cb({} as Event)
      }
    }
  }
  Object.defineProperty(window, 'matchMedia', {
    value: (query: string) => {
      const widthMatch = query.match(/\(max-width:\s*(\d+)px\)/)
      const matches = widthMatch ? width <= parseInt(widthMatch[1], 10) : false
      return {
        matches,
        media: query,
        addEventListener: (type: string, cb: EventListener) => {
          if (!listeners.has(type)) listeners.set(type, new Set())
          listeners.get(type)!.add(cb)
        },
        removeEventListener: (type: string, cb: EventListener) => {
          listeners.get(type)?.delete(cb)
        }
      } as MediaQueryList
    },
    writable: true,
    configurable: true
  })
  fireChange()
}

// ─── Audio Module Mock Factory ───────────────────────────────────────
// Returns reactive refs + mock methods matching useAudioModule's real interface.
// Use this in vi.mock() callbacks for component tests that depend on useAudioModule.

export const createMockUseAudioModule = (options?: { isGenerating?: boolean }) => {
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
  const isGenerating = ref(options?.isGenerating ?? false)

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
    isGenerating,
    load: vi.fn(),
    pause: vi.fn().mockImplementation(() => { isPaused.value = true }),
    play: vi.fn().mockResolvedValue(undefined).mockImplementation(async () => {
      isPlaying.value = true
      isPaused.value = false
    }),
    seek: vi.fn(),
    toggle: vi.fn().mockImplementation(async () => {
      if (isPlaying.value && !isPaused.value) isPaused.value = true
      isPlaying.value = true
      isPaused.value = false
    }),
    download: vi.fn(),
    dispose: vi.fn()
  }
}

// ─── Audio Player Mock Factory (legacy alias for createMockUseAudioModule) ─
// This is re-exported by setup.ts and setup.component.ts for backward compatibility.
export const createMockUseAudioPlayer = createMockUseAudioModule
// ─── TTS API Mock Factory ────────────────────────────────────────────
// Returns mock methods matching useTtsApi's real interface.
// Use createMockUseTtsApi({ fail: true }) to test error paths.
export const createMockUseTtsApi = (options?: { fail?: boolean }) => {
  const synthesize = vi.fn().mockResolvedValue(new Blob([], { type: 'audio/mpeg' }))
  const healthCheck = vi.fn().mockResolvedValue({ status: 'ready' as const, model_loaded: true })

  if (options?.fail) {
    synthesize.mockRejectedValue(new Error('TTS synthesis failed'))
    healthCheck.mockRejectedValue(new Error('Health check failed'))
  }

  return { synthesize, healthCheck }
}

// ─── Health Poll Mock Factory ────────────────────────────────────────
// Returns reactive refs matching useHealthPoll's real interface.
// modelLoaded derives from status (status === 'ready' → true).
// Use createMockUseHealthPoll({ status: 'error' }) to test error paths.
export const createMockUseHealthPoll = (options?: { status?: 'loading' | 'ready' | 'error' }) => {
  const status = ref((options?.status ?? 'loading') as 'loading' | 'ready' | 'error')
  const modelLoaded = computed(() => status.value === 'ready')

  return { status, modelLoaded }
}

// ─── Input Validation Mock Factory ───────────────────────────────────
// Returns reactive refs matching useInputValidation's real interface.
// Use createMockUseInputValidation({ isValid: false }) to test error paths.
export const createMockUseInputValidation = (options?: { isValid?: boolean, errorMessage?: string }) => ({
  isValid: ref(options?.isValid ?? true),
  error: ref((options?.errorMessage ?? null) as string | null),
  handleKeyDown: vi.fn()
})

// ─── Toast Mock Factory ──────────────────────────────────────────────
export const createMockUseToast = () => ({
  message: ref(''),
  visible: ref(false)
})

// ─── Voices Mock Factory ─────────────────────────────────────────────
// Returns reactive refs matching useVoices's real interface.
// Use createMockUseVoices() for tests that need voice data,
// or createMockUseVoices({ error: 'msg' }) to test failure paths.
export const createMockUseVoices = (
  options?: {
    voices?: Array<{ id: string, name: string, dialect: string, tag: string, icon: string, speaker_wav: string }>
    error?: string
  }
) => ({
  voices: ref(options?.voices ?? []),
  loading: ref(false),
  error: ref((options?.error ?? null) as string | null),
  loadVoices: vi.fn().mockResolvedValue(options?.voices ?? [])
})
// ─── Nuxt App Mock Factory ───────────────────────────────────────────
// Returns a useNuxtApp-compatible stub with a controllable route.
// Use createMockUseNuxtApp('/dashboard') to test navigation highlighting.
// Use createMockUseNuxtApp('/dashboard/level/a1/5') to test lesson routes.
export const createMockUseNuxtApp = (path: string) => {
  const name = path === '/' ? undefined : (path.slice(1).split('/')[0] || undefined) as string | undefined
  return () => ({
    $router: {},
    route: {
      path,
      fullPath: path,
      params: {},
      query: {},
      hash: '',
      name,
      matched: [],
      meta: {}
    },
    isHydrating: () => false,
    payload: { state: {} },
    runWithContext: (fn: () => unknown) => fn(),
    ssrContext: {}
  })
}
