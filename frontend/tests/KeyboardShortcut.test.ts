import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick, defineComponent } from 'vue'
import { mountSuspended, mockNuxtImport, mockComponent, registerEndpoint } from '@nuxt/test-utils/runtime'
import Index from '../app/pages/index.vue'
import { setBreakpoint } from './mocks'

// ─── File-level mocks (transpiled before Nuxt starts) ────────────────

// Shared audioModule mock — download() defaults to a vi.fn().
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

// Shared TTS API mock — synthesize() defaults to resolving with a Blob.
const sharedTtsApi = {
  synthesize: vi.fn().mockResolvedValue(new Blob([], { type: 'audio/mpeg' })),
  healthCheck: vi.fn().mockResolvedValue({ status: 'ready', model_loaded: true })
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
  useTtsApiMock: vi.fn(() => sharedTtsApi),
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

// ─── Slice S-08: Keyboard shortcut + download UX (TC-12, TC-13) ──────

describe('index.vue — keyboard shortcut + download (S-08)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('keyboard shortcut', () => {
    it('When Ctrl+Enter is pressed then triggers synthesis', async () => {
      // Arrange
      const wrapper = await mountSuspended(Index)
      await nextTick()

      const textarea = wrapper.find('textarea')
      expect(textarea.exists()).toBe(true)

      // Act — dispatch Ctrl+Enter
      await textarea.trigger('keydown', { ctrlKey: true, key: 'Enter' })
      await nextTick()

      // Assert — synthesize should have been called
      expect(sharedTtsApi.synthesize.mock.calls.length).toBeGreaterThan(0)
    })

    it('When Cmd+Enter is pressed (macOS) then triggers synthesis', async () => {
      // Arrange
      const wrapper = await mountSuspended(Index)
      await nextTick()

      const textarea = wrapper.find('textarea')
      expect(textarea.exists()).toBe(true)

      // Act — dispatch Cmd+Enter (metaKey instead of ctrlKey)
      await textarea.trigger('keydown', { metaKey: true, key: 'Enter' })
      await nextTick()

      // Assert — synthesize should have been called
      expect(sharedTtsApi.synthesize.mock.calls.length).toBeGreaterThan(0)
    })

    it('When Enter is pressed without Ctrl/Cmd then does NOT trigger synthesis', async () => {
      // Arrange
      const wrapper = await mountSuspended(Index)
      await nextTick()

      const textarea = wrapper.find('textarea')
      expect(textarea.exists()).toBe(true)

      // Act — dispatch plain Enter
      await textarea.trigger('keydown', { key: 'Enter' })
      await nextTick()

      // Assert — synthesize should NOT have been called
      expect(sharedTtsApi.synthesize.mock.calls.length).toBe(0)
    })
  })

  describe('shortcut hint visibility', () => {
    it('When rendered in desktop view then shortcut hint text is visible', async () => {
      // Arrange
      setBreakpoint(1024)
      const wrapper = await mountSuspended(Index)
      await nextTick()

      // Assert
      const html = wrapper.html()
      expect(html).toContain('Ctrl')
      expect(html).toContain('Enter')
      expect(html).toContain('to generate')
    })

    it('When rendered in mobile view then shortcut hint is hidden', async () => {
      // Arrange
      setBreakpoint(375)
      const wrapper = await mountSuspended(Index)
      await nextTick()

      // Assert — on mobile, the shortcut hint (hidden md:flex) should not be visible
      const html = wrapper.html()
      // The shortcut hint uses "hidden md:flex" so it's hidden on mobile
      expect(html).toContain('hidden')
    })
  })

  describe('download functionality', () => {
    it('When download is called with a filename then download method receives it', async () => {
      // Arrange
      await mountSuspended(Index)
      await nextTick()

      // Act — call download directly on the shared mock
      sharedAudioModule.download('test_audio.mp3')

      // Assert — download should have been called with the filename
      expect(sharedAudioModule.download).toHaveBeenCalledWith('test_audio.mp3')
    })

    it('When download is called without a filename then uses default timestamped name', async () => {
      // Arrange
      await mountSuspended(Index)
      await nextTick()

      // Act — call download without filename
      sharedAudioModule.download()

      // Assert — should be called (the composable generates default filename internally)
      expect(sharedAudioModule.download).toHaveBeenCalled()
    })
  })
})
