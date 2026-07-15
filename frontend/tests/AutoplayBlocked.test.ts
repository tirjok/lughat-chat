import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick, defineComponent } from 'vue'
import { mountSuspended, mockNuxtImport, mockComponent, registerEndpoint } from '@nuxt/test-utils/runtime'
import Index from '../app/pages/index.vue'

// ─── File-level mocks (transpiled before Nuxt starts) ────────────────

// Shared audioModule mock — play() defaults to resolving (autoplay succeeds).
// Tests can override play() to throw (autoplay blocked).
const sharedAudioModule = {
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
}

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
  useAudioModuleMock: vi.fn(() => sharedAudioModule),
  useTtsApiMock: vi.fn(() => ({
    synthesize: vi.fn().mockResolvedValue(new Blob([], { type: 'audio/mpeg' })),
    healthCheck: vi.fn().mockResolvedValue({ status: 'ready', model_loaded: true })
  })),
  useVoicesMock: vi.fn(() => ({
    voices: ref([
      { id: 'aisha', name: 'Aisha - Conversational', dialect: 'Egyptian Arabic [AR-EG]', tag: 'AR-EG', icon: 'waveform', speaker_wav: 'female.wav' }
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
  useScrollRevealMock: vi.fn()
}))

mockNuxtImport('useAudioModule', () => useAudioModuleMock)
mockNuxtImport('useTtsApi', () => useTtsApiMock)
mockNuxtImport('useVoices', () => useVoicesMock)
mockNuxtImport('useHealthPoll', () => useHealthPollMock)
mockNuxtImport('useInputValidation', () => useInputValidationMock)
mockNuxtImport('showToast', () => showToastMock)
mockNuxtImport('usePanelToggle', () => usePanelToggleMock)
mockNuxtImport('useScrollReveal', () => useScrollRevealMock)

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

registerEndpoint('/api/voices', () => [
  { id: 'aisha', name: 'Aisha - Conversational', dialect: 'Egyptian Arabic [AR-EG]', tag: 'AR-EG', icon: 'waveform', speaker_wav: 'female.wav' }
])

// ─── Slice S-07: Frontend — handle browser autoplay blocking (TC-11) ──

describe('index.vue — autoplay handling (S-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when synthesis succeeds but autoplay is blocked', () => {
    it('When play() throws then panel still slides up (playerVisible set to true)', async () => {
      // Arrange — override the shared audioModule mock's play to throw (autoplay blocked)
      ;(sharedAudioModule.play as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('NotAllowedError'))

      // Act — trigger Ctrl+Enter via the textarea
      const wrapper = await mountSuspended(Index)
      await nextTick()

      const textarea = wrapper.find('textarea')
      expect(textarea.exists()).toBe(true)

      // Dispatch Ctrl+Enter keydown
      await textarea.trigger('keydown', { ctrlKey: true, key: 'Enter' })
      await nextTick()

      // Assert — the AudioPlayerPanel should exist (panel slides up even on autoplay failure)
      const audioPanel = wrapper.find('[data-testid="audio-player-panel"]')
      expect(audioPanel.exists()).toBe(true)
    })
  })

  describe('when synthesis succeeds and autoplay works', () => {
    it('When play() succeeds then playerVisible is set to true', async () => {
      // Arrange
      const wrapper = await mountSuspended(Index)
      await nextTick()

      const textarea = wrapper.find('textarea')
      expect(textarea.exists()).toBe(true)

      // Act — dispatch Ctrl+Enter
      await textarea.trigger('keydown', { ctrlKey: true, key: 'Enter' })
      await nextTick()

      // Assert
      const audioPanel = wrapper.find('[data-testid="audio-player-panel"]')
      expect(audioPanel.exists()).toBe(true)
    })
  })
})
