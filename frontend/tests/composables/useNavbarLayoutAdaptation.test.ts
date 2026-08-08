import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import Index from '~/pages/index.vue'
import MobileSplitScreen from '~/components/MobileSplitScreen.vue'
import { createMockUseAudioModule, createMockUseTtsApi, createMockUseHealthPoll, createMockUseInputValidation } from '~~/tests/mocks'

// Composables required for Index.vue to render without errors.
vi.mock('~/composables/useAudioModule', () => ({
  useAudioModule: vi.fn(() => createMockUseAudioModule())
}))

vi.mock('~/composables/useTtsApi', () => ({
  useTtsApi: vi.fn(() => createMockUseTtsApi())
}))

vi.mock('~/composables/useVoices', () => ({
  useVoices: vi.fn(() => ({
    voices: ref([
      { id: 'aisha', name: 'Aisha - Conversational', dialect: 'Egyptian Arabic [AR-EG]', tag: 'AR-EG', icon: 'waveform', speaker_wav: 'female.wav' },
      { id: 'tariq', name: 'Tariq - News Anchor', dialect: 'Modern Standard Arabic [MSA]', tag: 'MSA', icon: 'waveform', speaker_wav: 'male.wav' },
      { id: 'laila', name: 'Laila - Storyteller', dialect: 'Levantine Arabic [AR-LB]', tag: 'AR-LB', icon: 'waveform', speaker_wav: 'female.wav' }
    ])
  }))
}))

vi.mock('~/composables/useHealthPoll', () => ({
  useHealthPoll: () => createMockUseHealthPoll()
}))

vi.mock('~/composables/useInputValidation', () => ({
  useInputValidation: () => createMockUseInputValidation()
}))

vi.mock('~/composables/usePanelToggle', () => ({
  usePanelToggle: () => ({ activePanel: ref('desktop') })
}))

vi.mock('~/composables/useScrollReveal', () => ({
  useScrollReveal: vi.fn(() => ({
    revealOnScroll: vi.fn(),
    isRevealed: ref(true)
  }))
}))

vi.mock('~/composables/useToast', () => ({
  showToast: vi.fn()
}))

beforeEach(() => {
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
})

// ─── ISSUE-003: TTS Studio Layout Adaptation for Navbar Height ──────

describe('ISSUE-003 — Navbar height adaptation', () => {
  describe('AC-1: Panel height calculations', () => {
    it('When desktop (>=768px) then outer wrapper uses calc(100vh - 60px) not 100dvh', () => {
      // Arrange — desktop viewport
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })

      const wrapper = shallowMount(Index)

      // Act
      const outerDiv = wrapper.find('[data-test-id="main-wrapper"]')

      // Assert
      expect(outerDiv.classes()).toContain('h-[calc(100vh-60px)]')
    })

    it('When desktop (>=768px) then outer wrapper does not use 100dvh or h-[100dvh]', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })

      const wrapper = shallowMount(Index)

      // Act
      const outerDiv = wrapper.find('[data-test-id="main-wrapper"]')

      // Assert
      const classes = outerDiv.classes()
      expect(classes).not.toContain('h-dvh')
      expect(classes).not.toContain('h-[100dvh]')
    })

    it('When mobile (<768px) then mobile split-screen uses calc(100vh - 64px - safe-area)', () => {
      // Arrange — mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })

      const wrapper = shallowMount(MobileSplitScreen, {
        props: {
          textInput: '',
          selectedSpeaker: '',
          speedValue: 1,
          isGenerating: false,
          playerVisible: false,
          audioUrl: null,
          isPlaying: false,
          isPaused: false,
          currentTime: 0,
          duration: 0,
          modelStatus: 'loading',
          isValid: true,
          speakerVoices: [],
          selectedVoiceName: ''
        }
      })

      // Act
      const mobileContainer = wrapper.find('[data-test-id="mobile-split-screen"]')

      // Assert
      expect(mobileContainer.classes()).toContain(
        'h-[calc(100vh-64px-env(safe-area-inset-top)-env(safe-area-inset-bottom))]'
      )
    })

    it('When mobile (<768px) then mobile split-screen does not use 100dvh or h-[100dvh]', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })

      const wrapper = shallowMount(MobileSplitScreen, {
        props: {
          textInput: '',
          selectedSpeaker: '',
          speedValue: 1,
          isGenerating: false,
          playerVisible: false,
          audioUrl: null,
          isPlaying: false,
          isPaused: false,
          currentTime: 0,
          duration: 0,
          modelStatus: 'loading',
          isValid: true,
          speakerVoices: [],
          selectedVoiceName: ''
        }
      })

      // Act
      const mobileContainer = wrapper.find('[data-test-id="mobile-split-screen"]')

      // Assert
      const classes = mobileContainer.classes()
      expect(classes).not.toContain('h-dvh')
      expect(classes).not.toContain('h-[100dvh]')
    })
  })
})
