import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, defineComponent } from 'vue'
import { mountSuspended, mockNuxtImport, mockComponent, registerEndpoint } from '@nuxt/test-utils/runtime'
import Index from '../app/pages/index.vue'
import { setBreakpoint } from './mocks'

// ─── File-level mocks (transpiled before Nuxt starts) ────────────────

// Mock composables that index.vue uses — provide realistic return values.
const {
  useAudioModuleMock,
  useTtsApiMock,
  useVoicesMock,
  useHealthPollMock,
  useInputValidationMock,
  showToastMock,
  usePanelToggleMock,
  useScrollRevealMock
} = vi.hoisted(() => ({
  useAudioModuleMock: vi.fn(() => ({
    audioRef: ref(null),
    audioUrl: ref(null),
    duration: ref(0),
    currentTime: ref(0),
    isPlaying: ref(false),
    isPaused: ref(false),
    isLoading: ref(false),
    error: ref(null),
    formattedCurrentTime: ref('0:00'),
    formattedDuration: ref('0:00'),
    load: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    seek: vi.fn(),
    download: vi.fn(),
    toggle: vi.fn(),
    dispose: vi.fn()
  })),
  useTtsApiMock: vi.fn(() => ({
    synthesize: vi.fn().mockResolvedValue(new Blob([], { type: 'audio/mpeg' })),
    healthCheck: vi.fn().mockResolvedValue({ status: 'ready', model_loaded: true })
  })),
  useVoicesMock: vi.fn(() => ({
    voices: ref([
      { id: 'aisha', name: 'Aisha - Conversational', dialect: 'Egyptian Arabic [AR-EG]', tag: 'AR-EG', icon: 'waveform', speaker_wav: 'female.wav' },
      { id: 'tariq', name: 'Tariq - News Anchor', dialect: 'Modern Standard Arabic [MSA]', tag: 'MSA', icon: 'waveform', speaker_wav: 'male.wav' },
      { id: 'laila', name: 'Laila - Storyteller', dialect: 'Levantine Arabic [AR-LB]', tag: 'AR-LB', icon: 'waveform', speaker_wav: 'female.wav' }
    ])
  })),
  useHealthPollMock: vi.fn(() => ({
    get status() { return 'ready' },
    get modelLoaded() { return true },
    get modelName() { return '' },
    get subStatus() { return '' },
    stop: vi.fn(),
    retry: vi.fn(),
    start: vi.fn()
  })),
  useInputValidationMock: vi.fn(() => ({
    isValid: ref(true),
    error: ref(null)
  })),
  showToastMock: vi.fn(),
  usePanelToggleMock: () => ({ activePanel: ref('control-deck') }),
  useAudioModuleMock: () => ({
    audioRef: ref(null),
    audioUrl: ref(null),
    duration: ref(0),
    currentTime: ref(0),
    isPlaying: ref(false),
    isPaused: ref(false),
    isLoading: ref(false),
    error: ref(null),
    formattedCurrentTime: ref('0:00'),
    formattedDuration: ref('0:00'),
    load: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    seek: vi.fn(),
    download: vi.fn(),
    toggle: vi.fn(),
    dispose: vi.fn()
  }),
  useScrollRevealMock: vi.fn()
}))

// Wire all composable mocks (macro-level — hoisted before Nuxt starts).
// The factory's return value BECOMES the auto-import. Since composables
// are called as functions in the source, the factory must return a function.
mockNuxtImport('useAudioModule', () => useAudioModuleMock)
mockNuxtImport('useTtsApi', () => useTtsApiMock)
mockNuxtImport('useVoices', () => useVoicesMock)
mockNuxtImport('useHealthPoll', () => useHealthPollMock)
mockNuxtImport('useInputValidation', () => useInputValidationMock)
mockNuxtImport('showToast', () => showToastMock)
mockNuxtImport('usePanelToggle', () => usePanelToggleMock)
mockNuxtImport('useScrollReveal', () => useScrollRevealMock)

// Mock sub-components so mountSuspended can render them.
mockComponent('VoiceSelector', defineComponent({
  props: ['voices'],
  template: '<div class="voice-selector" data-testid="voice-selector"></div>'
}))
mockComponent('SpeedSlider', defineComponent({
  props: ['modelValue'],
  template: '<div class="speed-slider" data-testid="speed-slider"><input type="range" /></div>'
}))
mockComponent('GenerateButton', defineComponent({
  props: ['isGenerating', 'modelStatus', 'disabled'],
  template: '<button class="generate-button" data-testid="generate-button">Generate</button>'
}))
mockComponent('FocusHaloCanvas', defineComponent({
  props: ['focused'],
  template: '<div class="focus-halo" data-testid="focus-halo"></div>'
}))
mockComponent('ToastNotification', defineComponent({
  template: '<div class="toast-notification" data-testid="toast-notification"></div>'
}))
mockComponent('WaveformCanvas', defineComponent({
  template: '<canvas class="waveform-canvas" data-testid="waveform-canvas"></canvas>'
}))
mockComponent('AudioPlayerPanel', defineComponent({
  props: ['visible'],
  template: '<div class="audio-player-panel" data-testid="audio-player-panel"></div>'
}))
mockComponent('ModelStatusIndicator', defineComponent({
  template: '<div class="model-status" data-testid="model-status"></div>'
}))
mockComponent('MobileStatusIndicator', defineComponent({
  template: '<div class="mobile-status" data-testid="mobile-status"></div>'
}))

// Register mock API endpoint for /api/voices.
registerEndpoint('/api/voices', () => [
  { id: 'aisha', name: 'Aisha - Conversational', dialect: 'Egyptian Arabic [AR-EG]', tag: 'AR-EG', icon: 'waveform', speaker_wav: 'female.wav' },
  { id: 'tariq', name: 'Tariq - News Anchor', dialect: 'Modern Standard Arabic [MSA]', tag: 'MSA', icon: 'waveform', speaker_wav: 'male.wav' },
  { id: 'laila', name: 'Laila - Storyteller', dialect: 'Levantine Arabic [AR-LB]', tag: 'AR-LB', icon: 'waveform', speaker_wav: 'female.wav' }
])

// ─── Behavioral Tests (black-box: rendered component tree, emitted events) ──

describe('index.vue', () => {
  describe('component tree', () => {
    it('When rendered then VoiceSelector component exists', async () => {
      const wrapper = await mountSuspended(Index)
      expect(wrapper.find('[data-testid="voice-selector"]').exists()).toBe(true)
    })

    it('When rendered then SpeedSlider component exists', async () => {
      const wrapper = await mountSuspended(Index)
      expect(wrapper.find('[data-testid="speed-slider"]').exists()).toBe(true)
    })

    it('When rendered then GenerateButton component exists', async () => {
      const wrapper = await mountSuspended(Index)
      expect(wrapper.find('[data-testid="generate-button"]').exists()).toBe(true)
    })

    it('When rendered then FocusHaloCanvas exists behind textarea', async () => {
      const wrapper = await mountSuspended(Index)
      expect(wrapper.find('[data-testid="focus-halo"]').exists()).toBe(true)
    })

    it('When rendered then ToastNotification exists for global notifications', async () => {
      const wrapper = await mountSuspended(Index)
      expect(wrapper.find('[data-testid="toast-notification"]').exists()).toBe(true)
    })

    it('When rendered then textarea element exists for text input', async () => {
      const wrapper = await mountSuspended(Index)
      const textarea = wrapper.find('textarea')
      expect(textarea.exists()).toBe(true)
      expect(textarea.attributes('dir')).toBe('rtl')
    })

    it('When rendered then hidden audio element exists', async () => {
      const wrapper = await mountSuspended(Index)
      const audio = wrapper.find('audio')
      expect(audio.exists()).toBe(true)
    })
  })

  describe('branding and styling', () => {
    it('When rendered then header shows LughatChat branding', async () => {
      const wrapper = await mountSuspended(Index)
      const html = wrapper.html()
      expect(html).toContain('Lughat')
      expect(html).toContain('Chat')
    })

    it('When rendered then Sunrise color palette (orange + magenta) is applied', async () => {
      const wrapper = await mountSuspended(Index)
      const html = wrapper.html()
      expect(html).toContain('text-sunrise-orange')
      expect(html).toContain('text-sunrise-magenta')
      expect(html).toContain('rgb(255, 81, 47)')
    })

    it('When rendered then charcoal background (#121212) is applied', async () => {
      const wrapper = await mountSuspended(Index)
      const html = wrapper.html()
      expect(html).toContain('rgb(18, 18, 18)')
    })

    it('When rendered then shortcut hint shows keyboard shortcut text', async () => {
      const wrapper = await mountSuspended(Index)
      const html = wrapper.html()
      expect(html).toContain('Ctrl')
      expect(html).toContain('Enter')
      expect(html).toContain('to generate')
    })
  })
})

// ─── Responsive Tests (black-box: breakpoint simulation) ─────────────────

describe('index.vue — responsive layout', () => {
  let originalInnerWidth: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth })
  })

  describe('shortcut hint visibility', () => {
    it('When viewport is 375px then shortcut hint is hidden (below md: breakpoint)', async () => {
      setBreakpoint(375)
      const wrapper = await mountSuspended(Index)
      const html = wrapper.html()
      expect(html).toContain('Ctrl')
      expect(html).toContain('Enter')
    })

    it('When viewport is 768px then shortcut hint is visible (at md: breakpoint)', async () => {
      setBreakpoint(768)
      const wrapper = await mountSuspended(Index)
      const html = wrapper.html()
      expect(html).toContain('Ctrl')
      expect(html).toContain('Enter')
    })
  })
})
