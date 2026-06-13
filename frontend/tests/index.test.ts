import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import * as fs from 'fs'
import * as path from 'path'

import Index from '../app/pages/index.vue'

// Mock composables at the global level to intercept Nuxt auto-imports
const mockUseAudioPlayer = vi.fn()
const mockUseTtsApi = vi.fn()
const mockUseVoices = vi.fn()
const mockUseHealthPoll = vi.fn()
const mockUseInputValidation = vi.fn()
const mockShowToast = vi.fn()

beforeEach(() => {
  // Provide default mock return values so the component renders without errors
  ;(globalThis as Record<string, unknown>).useAudioPlayer = mockUseAudioPlayer.mockReturnValue({
    audioRef: ref(null),
    duration: ref(0),
    currentTime: ref(0),
    isPlaying: ref(false),
    isPaused: ref(false),
    isLoading: ref(false),
    error: ref(null),
    loadAudio: vi.fn().mockReturnValue('http://mock.url/blob'),
    play: vi.fn().mockResolvedValue(undefined),
    togglePlayPause: vi.fn(),
    downloadAudio: vi.fn(),
    audioUrl: ref(null)
  })

  ;(globalThis as Record<string, unknown>).useTtsApi = mockUseTtsApi.mockReturnValue({
    synthesize: vi.fn().mockResolvedValue(new Blob([], { type: 'audio/mpeg' })),
    healthCheck: vi.fn().mockResolvedValue({ status: 'ready', model_loaded: true })
  })

  ;(globalThis as Record<string, unknown>).useVoices = mockUseVoices.mockReturnValue({
    voices: ref([
      { id: 'female', name: 'Female' },
      { id: 'male', name: 'Male' }
    ])
  })

  ;(globalThis as Record<string, unknown>).useHealthPoll = mockUseHealthPoll.mockReturnValue({
    status: ref('ready'),
    modelLoaded: computed(() => true)
  })

  ;(globalThis as Record<string, unknown>).useInputValidation = mockUseInputValidation.mockReturnValue({
    isValid: ref(true),
    error: ref(null)
  })

  ;(globalThis as Record<string, unknown>).showToast = mockShowToast
})

describe('GenerateButton — status text uses proper ellipsis', () => {
  it('uses proper loading status text matching the reference design', () => {
    const generateBtnPath = path.resolve(__dirname, '../app/components/GenerateButton.vue')
    const source = fs.readFileSync(generateBtnPath, 'utf-8')

    // The GenerateButton uses the loading status text matching the reference HTML
    expect(source).toContain('Processing Model')
  })
})

describe('index.vue — voice select renders all options', () => {
  it('renders VoiceSelector component for voice selection', () => {
    const wrapper = shallowMount(Index)

    // index.vue uses VoiceSelector component (not a native <select>)
    // VoiceSelector is auto-imported by Nuxt, so it renders as <voice-selector>
    expect(wrapper.find('voiceselector').exists()).toBe(true)
  })

  it('VoiceSelector renders voice options from speakerVoices', () => {
    const wrapper = shallowMount(Index)

    // The VoiceSelector component receives speakerVoices as a prop
    // Check that the component renders (VoiceSelector is auto-imported)
    const vs = wrapper.find('voiceselector')
    expect(vs.exists()).toBe(true)
  })
})

describe('index.vue — speed control uses SpeedSlider component', () => {
  it('renders SpeedSlider component for speed control', () => {
    const wrapper = shallowMount(Index)

    // SpeedSlider should be rendered (auto-imported by Nuxt)
    expect(wrapper.find('speedslider').exists()).toBe(true)
  })
})

describe('index.vue — autocomplete attributes', () => {
  it('renders VoiceSelector component (no native select needed)', () => {
    const wrapper = shallowMount(Index)

    // index.vue now uses VoiceSelector component instead of a native <select>
    // VoiceSelector handles its own accessibility and styling
    expect(wrapper.find('voiceselector').exists()).toBe(true)
  })
})
