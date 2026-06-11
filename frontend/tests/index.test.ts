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

describe('index.vue — loading text uses proper ellipsis', () => {
  it('uses Unicode ellipsis character in generating and loading status texts', () => {
    const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
    const source = fs.readFileSync(indexPath, 'utf-8')

    // Verify both status strings use Unicode escape sequences (\u2026), not literal three dots
    expect(source).toContain('Generating\\u2026')
    expect(source).toContain('Loading\\u2026')

    // Ensure no literal three-dot sequences in status text
    expect(source).not.toContain('Generating...')
    expect(source).not.toContain('Loading...')
  })
})

describe('index.vue — voice select renders all options', () => {
  it('renders both female and male speaker options in the dropdown', () => {
    const wrapper = shallowMount(Index)

    const select = wrapper.find('#speaker-select')
    expect(select.exists()).toBe(true)

    const options = select.findAll('option')
    expect(options.length).toBe(2)

    const optionValues = options.map(opt => opt.attributes('value'))
    expect(optionValues).toContain('female')
    expect(optionValues).toContain('male')
  })

  it('first option is female and second is male', () => {
    const wrapper = shallowMount(Index)

    const select = wrapper.find('#speaker-select')
    expect(select.exists()).toBe(true)

    const options = select.findAll('option')
    expect(options.length).toBe(2)

    // First option should be female (matching the initial selectedSpeaker value)
    expect(options[0].attributes('value')).toBe('female')
    // Second option should be male
    expect(options[1].attributes('value')).toBe('male')
  })
})

describe('index.vue — autocomplete attributes', () => {
  it('sets autocomplete="off" on the speaker select input', () => {
    const wrapper = shallowMount(Index)

    const select = wrapper.find('#speaker-select')
    expect(select.exists()).toBe(true)
    expect(select.attributes('autocomplete')).toBe('off')
  })

  it('sets autocomplete="off" on the speed range input', () => {
    const wrapper = shallowMount(Index)

    const rangeInput = wrapper.find('#speed-slider')
    expect(rangeInput.exists()).toBe(true)
    expect(rangeInput.attributes('autocomplete')).toBe('off')
  })
})
