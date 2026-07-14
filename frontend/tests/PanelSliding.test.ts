import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import Index from '../app/pages/index.vue'
import { createMockUseAudioModule, createMockUseTtsApi, createMockUseHealthPoll, createMockUseInputValidation, createMockUseToast } from './mocks'

// ─── Behavioral Tests (black-box: rendered component tree, events) ──────

describe('Mobile split-screen', () => {
  const mockAudio = createMockUseAudioModule()
  const mockTts = createMockUseTtsApi()
  const mockHealth = createMockUseHealthPoll('ready')
  const mockValidation = createMockUseInputValidation()
  const mockToast = createMockUseToast()
  const mockVoices = {
    voices: [
      { id: 'aisha', name: 'Aisha - Conversational', dialect: 'Egyptian Arabic [AR-EG]', tag: 'AR-EG', icon: 'waveform', speaker_wav: 'female.wav' },
      { id: 'tariq', name: 'Tariq - News Anchor', dialect: 'Modern Standard Arabic [MSA]', tag: 'MSA', icon: 'waveform', speaker_wav: 'male.wav' },
      { id: 'laila', name: 'Laila - Storyteller', dialect: 'Levantine Arabic [AR-LB]', tag: 'AR-LB', icon: 'waveform', speaker_wav: 'female.wav' }
    ],
    loading: false,
    error: null,
    loadVoices: vi.fn().mockResolvedValue([])
  }

  beforeEach(() => {
    registerEndpoint('/api/voices', () => mockVoices.voices)
    Object.assign(globalThis, {
      useAudioModule: vi.fn(() => mockAudio),
      useTtsApi: vi.fn(() => mockTts),
      useVoices: vi.fn(() => mockVoices),
      useHealthPoll: vi.fn(() => mockHealth),
      useInputValidation: vi.fn(() => mockValidation),
      showToast: mockToast.showToast ?? (() => {})
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('panel layout', () => {
    it('When rendered then both control-deck and canvas panels exist with data attributes', () => {
      // Arrange
      const wrapper = shallowMount(Index)
      // Act
      const controlDeck = wrapper.find('[data-panel="control-deck"]')
      const canvas = wrapper.find('[data-panel="canvas"]')
      // Assert
      expect(controlDeck.exists()).toBe(true)
      expect(canvas.exists()).toBe(true)
    })

    it('When rendered then mobile split-screen wrapper renders (md:hidden)', () => {
      // Arrange
      const wrapper = shallowMount(Index)
      // Act
      const mobileWrapper = wrapper.find('.md\\:hidden.flex-col')
      // Assert
      expect(mobileWrapper.exists()).toBe(true)
    })

    it('When rendered then drag divider renders', () => {
      // Arrange
      const wrapper = shallowMount(Index)
      // Act
      const divider = wrapper.find('[style*="height: 16px"]')
      // Assert
      expect(divider.exists()).toBe(true)
    })
  })
})
