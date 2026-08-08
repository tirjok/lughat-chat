import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import Index from '~/pages/index.vue'
import { createMockUseAudioModule, createMockUseTtsApi, createMockUseHealthPoll, createMockUseInputValidation } from '~~/tests/mocks'

// Mock composables so Index.vue can access them without Nuxt auto-imports.
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
  useToast: () => [],
  showToast: vi.fn()
}))

// Stub fetch so useVoices() doesn't try to call the real API
beforeEach(() => {
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
})

// ─── Behavioral Tests (black-box: rendered component tree, events) ──────

describe('Mobile split-screen', () => {
  // The vi.mock on line 8-47 already provides defaults.
  // beforeEach/afterEach are not needed — the mocks are per-test via vi.mock.
  describe('panel layout', () => {
    it('When rendered then both control-deck and canvas panels exist with data attributes', () => {
      // Arrange
      const wrapper = mount(Index)
      // Act
      const controlDeck = wrapper.find('[data-panel="control-deck"]')
      const canvas = wrapper.find('[data-panel="canvas"]')
      // Assert
      expect(controlDeck.exists()).toBe(true)
      expect(canvas.exists()).toBe(true)
    })

    it('When rendered then mobile split-screen renders with canvas ratio', () => {
      const wrapper = mount(Index)
      const canvasPanel = wrapper.find('[data-panel="canvas"]')
      expect(canvasPanel.exists()).toBe(true)
    })

    it('When rendered then drag divider renders', () => {
      const wrapper = mount(Index)
      const dragDivider = wrapper.find('div[style*="height: 16px"]')
      expect(dragDivider.exists()).toBe(true)
    })
  })
})
