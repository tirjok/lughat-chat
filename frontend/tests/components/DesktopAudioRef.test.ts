import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DesktopPanels from '~/components/studio/DesktopPanels.vue'

// Mock composables
vi.mock('~/composables/common/useScrollReveal', () => ({
  useScrollReveal: vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn()
  }))
}))

vi.mock('~/composables/common/useToast', () => ({ showToast: vi.fn() }))

// Stub fetch
vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })))

describe('DesktopPanels audioRef pipeline', () => {
  it('must emit setAudioRef with a valid HTMLAudioElement for audioModule.play() to work', async () => {
    const wrapper = mount(DesktopPanels, {
      props: {
        textInput: 'السلام عليكم',
        selectedSpeaker: 'aisha',
        speedValue: 1.0,
        playerVisible: true,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 0,
        isValid: true,
        isGenerating: false,
        audioUrl: null,
        modelStatus: 'ready',
        speakerVoices: [
          { id: 'aisha', name: 'Aisha', dialect: 'Egyptian', tag: 'AR-EG', icon: 'waveform', speaker_wav: 'female.wav' }
        ],
        selectedVoiceName: 'Aisha'
      }
    })

    await vi.waitFor(() => {
      const emitted = wrapper.emitted('setAudioRef')
      expect(emitted).toBeDefined()
    })

    const audioEl = wrapper.emitted('setAudioRef')![0]![0] as HTMLAudioElement | null
    expect(audioEl).not.toBeNull()
    expect(audioEl?.tagName).toBe('AUDIO')
  })
})
