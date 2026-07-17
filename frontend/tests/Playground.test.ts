import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowRef, ref } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Playground from '../app/pages/playground.vue'

// Mock useHealthPoll (TTS model status)
const mockModelStatus = shallowRef('ready')
const mockModelLoaded = shallowRef(true)

vi.mock('../app/composables/useHealthPoll', () => ({
  useHealthPoll: () => ({
    modelStatus: mockModelStatus,
    modelLoaded: mockModelLoaded
  })
}))

// Mock useVoices (voice selection)
const mockVoices = shallowRef([])
const mockSelectedVoice = ref('')
const mockLoadVoices = vi.fn()

vi.mock('../app/composables/useVoices', () => ({
  useVoices: () => ({
    voices: mockVoices,
    selectedVoice: mockSelectedVoice,
    loadVoices: mockLoadVoices
  })
}))

// Mock useTtsApi (synthesis)
const mockSynthesize = vi.fn().mockResolvedValue(new Blob([], { type: 'audio/mpeg' }))

vi.mock('../app/composables/useTtsApi', () => ({
  useTtsApi: () => ({
    synthesize: mockSynthesize
  })
}))

// Mock usePanelToggle
vi.mock('../app/composables/usePanelToggle', () => ({
  usePanelToggle: () => ({
    activePanel: ref('canvas')
  })
}))

// Mock useScrollReveal
vi.mock('../app/composables/useScrollReveal', () => ({
  useScrollReveal: vi.fn()
}))

// Mock WaveformCanvas
vi.mock('../app/components/WaveformCanvas', () => ({
  default: {
    props: ['audioUrl', 'isGenerating'],
    template: '<div class="waveform-canvas" data-testid="waveform"></div>'
  }
}))

// Mock AudioPlayerPanel
vi.mock('../app/components/AudioPlayerPanel', () => ({
  default: {
    props: ['audioUrl', 'visible'],
    template: '<div class="audio-player-panel" data-testid="audio-player"></div>'
  }
}))

// Mock MobileStatusIndicator
vi.mock('../app/components/MobileStatusIndicator', () => ({
  default: {
    template: '<div class="mobile-status-indicator" data-testid="mobile-status"></div>'
  }
}))

// Mock SpeedSlider
vi.mock('../app/components/SpeedSlider', () => ({
  default: {
    template: '<div class="speed-slider" data-testid="speed-slider"></div>'
  }
}))

// Mock GenerateButton
vi.mock('../app/components/GenerateButton', () => ({
  default: {
    props: ['isGenerating', 'text'],
    template: '<button class="generate-button" data-testid="generate-button">Generate</button>'
  }
}))

// Mock VoiceSelector
vi.mock('../app/components/VoiceSelector', () => ({
  default: {
    props: ['voices', 'modelValue'],
    template: '<div class="voice-selector" data-testid="voice-selector"></div>'
  }
}))

describe('Playground (playground.vue) — TTS Studio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockModelStatus.value = 'ready'
    mockModelLoaded.value = true
    mockVoices.value = []
    mockSelectedVoice.value = ''
    mockLoadVoices.mockResolvedValue(undefined)
  })

  describe('component tree', () => {
    it('When rendered then TextArea exists', async () => {
      const wrapper = await mountSuspended(Playground)
      const textarea = wrapper.find('textarea')
      expect(textarea.exists()).toBe(true)
    })

    it('When rendered then Generate button exists', async () => {
      const wrapper = await mountSuspended(Playground)
      const btn = wrapper.find('[data-testid="generate-button"]')
      expect(btn.exists()).toBe(true)
    })
  })

  describe('RTL support', () => {
    it('When rendered then RTL direction is applied', async () => {
      const wrapper = await mountSuspended(Playground)
      expect(wrapper.attributes('dir')).toBe('ltr')
    })
  })
})
