import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { mountSuspended, mockNuxtImport, mockComponent } from '@nuxt/test-utils/runtime'
import Playground from '../app/pages/playground.vue'

// ─── Composable Mocks (module-level, hoisted by Vitest) ───────────────

const mockHealthStatus = ref<'loading' | 'ready' | 'error' | 'retrying'>('ready')
const mockModelName = ref('')
const mockSubStatus = ref('')
const mockStopHealth = vi.fn()
const mockRetryHealth = vi.fn()
const mockStartHealth = vi.fn()

vi.mock('../app/composables/useHealthPoll', () => ({
  useHealthPoll: () => ({
    get status() { return mockHealthStatus.value },
    get modelLoaded() { return mockHealthStatus.value === 'ready' },
    get modelName() { return mockModelName.value },
    get subStatus() { return mockSubStatus.value },
    stop: mockStopHealth,
    retry: mockRetryHealth,
    start: mockStartHealth
  })
}))

const mockVoices = ref<Array<{ id: string, name: string, dialect: string, tag: string, icon: string, speaker_wav: string }>>([])
const mockSelectedVoice = ref('KSA Zariyah - Female')
const mockLoadVoices = vi.fn().mockResolvedValue([])

vi.mock('../app/composables/useVoices', () => ({
  useVoices: () => ({
    voices: mockVoices,
    selectedVoice: mockSelectedVoice,
    loadVoices: mockLoadVoices
  })
}))

const mockSynthesize = vi.fn().mockResolvedValue(new Blob([], { type: 'audio/mpeg' }))

vi.mock('../app/composables/useTtsApi', () => ({
  useTtsApi: () => ({
    synthesize: mockSynthesize
  })
}))

const mockActivePanel = ref<'control-deck' | 'canvas'>('control-deck')
const mockTogglePanel = vi.fn()

vi.mock('../app/composables/usePanelToggle', () => ({
  usePanelToggle: () => ({
    activePanel: mockActivePanel,
    togglePanel: mockTogglePanel
  })
}))

vi.mock('../app/composables/useScrollReveal', () => ({
  useScrollReveal: vi.fn()
}))

mockComponent('NavBar', {
  props: ['compact'],
  template: '<nav class="navbar" data-testid="navbar"></nav>'
})

mockComponent('WaveformCanvas', {
  template: '<div class="waveform-canvas" data-testid="waveform"></div>'
})
mockComponent('AudioPlayerPanel', {
  template: '<div class="audio-player-panel" data-testid="audio-player"></div>'
})
mockComponent('MobileStatusIndicator', {
  template: '<div class="mobile-status-indicator" data-testid="mobile-status"></div>'
})
mockComponent('SpeedSlider', {
  template: '<div class="speed-slider" data-testid="speed-slider"></div>'
})
mockComponent('GenerateButton', {
  props: ['disabled'],
  template: '<button :disabled="disabled" class="generate-btn" data-testid="generate-btn">Generate</button>'
})
mockComponent('VoiceSelector', {
  props: ['voices', 'selectedVoiceName', 'onSelect'],
  template: '<div class="voice-selector" data-testid="voice-selector"></div>'
})
mockComponent('FocusHaloCanvas', {
  template: '<div class="focus-halo" data-testid="focus-halo"></div>'
})

mockNuxtImport('useRoute', () => () => ({ path: '/playground' }))

const mockLessonsState = ref<Array<{ id: number, level: string, sequence: number, title: string, competency_count: number, section_count: number, status: string }>>([])
const mockLessonsLoading = ref(false)
const mockLessonsError = ref(null)
const mockFetchLessons = vi.fn().mockResolvedValue([])

vi.mock('../app/composables/useLessons', () => ({
  useLessons: () => ({
    get lessons() { return mockLessonsState.value },
    get loading() { return mockLessonsLoading.value },
    get error() { return mockLessonsError.value },
    fetchLessons: mockFetchLessons
  })
}))

const mockSidebarState = ref(false)
const mockToggleSidebar = vi.fn()

vi.mock('../app/composables/useSidebar', () => ({
  useSidebar: () => ({
    get visible() { return mockSidebarState.value },
    toggle: mockToggleSidebar
  })
}))

// ─── Integration tests ────────────────────────────────────────────────

describe('Playground — audioRef binding integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHealthStatus.value = 'ready'
    mockSynthesize.mockResolvedValue(new Blob([], { type: 'audio/mpeg' }))
    mockActivePanel.value = 'control-deck'
    mockTogglePanel.mockClear()
  })

  it('When rendered then the hidden <audio> element exists in the DOM', async () => {
    const wrapper = await mountSuspended(Playground)
    const audioEl = wrapper.element.querySelector('audio')
    expect(audioEl).not.toBeNull()
    expect(audioEl?.tagName).toBe('AUDIO')
  })

  it('When rendered then the <audio> element has ref="audioRef" binding', async () => {
    const wrapper = await mountSuspended(Playground)
    const audioEl = wrapper.element.querySelector('audio')
    expect(audioEl).not.toBeNull()
    expect(audioEl?.getAttribute('class')).toContain('hidden')
  })

  it('When canvas area is clicked then togglePanel is called', async () => {
    const wrapper = await mountSuspended(Playground)
    const canvas = wrapper.element.querySelector('[data-panel="canvas"]')
    expect(canvas).not.toBeNull()

    // Simulate clicking the canvas area
    canvas?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    // Assert — togglePanel should have been called
    expect(mockTogglePanel).toHaveBeenCalled()
  })

  it('When canvas area is clicked then togglePanel is called (mobile layout)', async () => {
    const wrapper = await mountSuspended(Playground)
    const mobileCanvas = wrapper.element.querySelector('.canvas-mobile')
    expect(mobileCanvas).not.toBeNull()

    // Simulate clicking the mobile canvas area
    mobileCanvas?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    // Assert — togglePanel should have been called
    expect(mockTogglePanel).toHaveBeenCalled()
  })
})
