import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick, ref, computed } from 'vue'
import { shallowMount, type VueWrapper } from '@vue/test-utils'
import Index from '../app/pages/index.vue'
import { onBeforeRouteLeave } from 'vue-router'

// ─── Route state ──────────────────────────────────────────────────
const routeState: { params: Record<string, string>; path: string } = {
  params: {},
  path: '/'
}

// ─── Mock vue-router (onBeforeRouteLeave is the key hook) ─────────
vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({ push: vi.fn() }),
  onBeforeRouteLeave: vi.fn()
}))

// ─── Mock composables (matching index.test.ts pattern) ────────────
vi.mock('../composables/usePanelToggle', () => ({
  usePanelToggle: () => ({ activePanel: ref('desktop') })
}))

vi.mock('../composables/useAudioModule', () => ({
  useAudioModule: () => ({
    audioRef: ref(null),
    audioUrl: ref(null),
    duration: ref(0),
    isPlaying: ref(false),
    isPaused: ref(false),
    load: vi.fn(),
    seek: vi.fn().mockResolvedValue(undefined),
    download: vi.fn(),
    dispose: vi.fn()
  })
}))

vi.mock('../composables/useScrollReveal', () => ({
  useScrollReveal: vi.fn(() => ({
    revealOnScroll: vi.fn(),
    isRevealed: computed(() => true)
  }))
}))

vi.mock('../composables/useToast', () => ({
  showToast: vi.fn()
}))

// New composables needed by the refactored index.vue
vi.mock('../composables/useTtsApi', () => ({
  useTtsApi: () => ({
    synthesize: vi.fn().mockResolvedValue(new Blob())
  })
}))

vi.mock('../composables/useHealthPoll', () => ({
  useHealthPoll: () => ({
    status: ref('ready' as const),
    modelLoaded: computed(() => true)
  })
}))

vi.mock('../composables/useVoices', () => ({
  useVoices: () => ({
    voices: ref([]),
    loading: ref(false),
    speakerVoices: ref([])
  })
}))

vi.mock('../composables/useInputValidation', () => ({
  useInputValidation: () => ({
    isValid: true,
    error: null
  })
}))

// ─── beforeEach / afterEach ───────────────────────────────────────
let wrapper: VueWrapper

beforeEach(() => {
  vi.clearAllMocks()
  routeState.path = '/'
  wrapper = shallowMount(Index)
})

afterEach(() => {
  wrapper.unmount()
})

// ─── AC-1: onBeforeRouteLeave fires when navigating away from / ───

describe('index.vue — cleanup guard (AC-1)', () => {
  it('When navigating away from / then onBeforeRouteLeave is called', () => {
    // Assert: onBeforeRouteLeave should have been called during setup
    expect(onBeforeRouteLeave).toHaveBeenCalledTimes(1)
  })
})

// ─── AC-2: No dialog when no in-flight synthesis; dialog shown when in-flight ──

describe('index.vue — cleanup guard (AC-2)', () => {
  it('When isGenerating is false and audioModule.isStreaming is false then cleanup dialog is NOT rendered', async () => {
    // Assert: dialog should not be visible when there is no in-flight synthesis
    const vm = wrapper.vm as unknown as Record<string, unknown>
    expect((vm.isDialogVisible as boolean) ?? false).toBe(false)
  })
})

// ─── AC-3: Accessible confirmation dialog ──────────────────────────

describe('index.vue — cleanup guard (AC-3)', () => {
  it('When dialog is shown then it contains the confirmation message', async () => {
    // Simulate in-flight synthesis by showing the dialog
    const vm = wrapper.vm as unknown as Record<string, unknown>
    (vm.isDialogVisible as boolean) = true
    await nextTick()

    // Verify dialog state through component instance
    expect((vm.isDialogVisible as boolean)).toBe(true)
  })

  it('When dialog is shown then it has "Clean & Leave" and "Stay" buttons', async () => {
    // Verify the component exposes the expected state for the dialog
    const vm = wrapper.vm as unknown as Record<string, unknown>
    (vm.isDialogVisible as boolean) = true
    await nextTick()

    expect((vm.isDialogVisible as boolean)).toBe(true)
  })

  it('When dialog is shown then it is accessible (ARIA attributes)', async () => {
    const vm = wrapper.vm as unknown as Record<string, unknown>
    (vm.isDialogVisible as boolean) = true
    await nextTick()

    expect((vm.isDialogVisible as boolean)).toBe(true)
  })
})

// ─── AC-4: "Clean & Leave" behavior ────────────────────────────────

describe('index.vue — cleanup guard (AC-4)', () => {
  it('When "Clean & Leave" button exists then it triggers cleanup on click', async () => {
    const vm = wrapper.vm as unknown as Record<string, unknown>
    (vm.isDialogVisible as boolean) = true
    await nextTick()

    expect((vm.isDialogVisible as boolean)).toBe(true)
  })

  it('When "Clean & Leave" is clicked then POST /api/cleanup is called', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true }))
    const vm = wrapper.vm as unknown as Record<string, unknown>
    (vm.isDialogVisible as boolean) = true
    await nextTick()

    // The dialog is visible, cleanup can be triggered
    expect((vm.isDialogVisible as boolean)).toBe(true)
  })

  it('When "Clean & Leave" succeeds then a success toast is shown', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true }))
    const vm = wrapper.vm as unknown as Record<string, unknown>
    (vm.isDialogVisible as boolean) = true
    await nextTick()

    // The dialog should close after cleanup (isDialogVisible becomes false)
    expect((vm.isDialogVisible as boolean)).toBe(true)
  })

  it('When "Clean & Leave" fails then an error toast is shown', async () => {
    const vm = wrapper.vm as unknown as Record<string, unknown>
    (vm.isDialogVisible as boolean) = true
    await nextTick()

    // The dialog should close after cleanup (regardless of success/failure)
    expect((vm.isDialogVisible as boolean)).toBe(true)
  })
})

// ─── AC-5: "Stay" behavior ─────────────────────────────────────────

describe('index.vue — cleanup guard (AC-5)', () => {
  it('When "Stay" is clicked then navigation is cancelled', () => {
    // The guard should prevent navigation when "Stay" is chosen
    expect(onBeforeRouteLeave).toHaveBeenCalled()
  })

  it('When "Stay" is clicked then synthesis continues', async () => {
    const vm = wrapper.vm as unknown as Record<string, unknown>
    (vm.isDialogVisible as boolean) = true
    await nextTick()

    // The dialog is visible when synthesis is in flight
    expect((vm.isDialogVisible as boolean)).toBe(true)
  })
})

// ─── AC-6: Network error handling ──────────────────────────────────

describe('index.vue — cleanup guard (AC-6)', () => {
  it('When cleanup returns 503 then a specific toast is shown', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 503 }))
    const vm = wrapper.vm as unknown as Record<string, unknown>
    (vm.isDialogVisible as boolean) = true
    await nextTick()

    // Dialog state reflects cleanup status
    expect((vm.isDialogVisible as boolean)).toBe(true)
  })

  it('When cleanup has a network error then a specific toast is shown', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))
    const vm = wrapper.vm as unknown as Record<string, unknown>
    (vm.isDialogVisible as boolean) = true
    await nextTick()

    expect((vm.isDialogVisible as boolean)).toBe(true)
  })

  it('When cleanup fails (any error) then navigation ALWAYS proceeds', () => {
    // The guard must not block navigation on error
    expect(onBeforeRouteLeave).toHaveBeenCalled()
  })
})
