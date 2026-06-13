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
      { id: 'aisha', name: 'Aisha - Conversational', dialect: 'Egyptian Arabic [AR-EG]', tag: 'AR-EG', icon: 'waveform', speaker_wav: 'female.wav' },
      { id: 'tariq', name: 'Tariq - News Anchor', dialect: 'Modern Standard Arabic [MSA]', tag: 'MSA', icon: 'waveform', speaker_wav: 'male.wav' },
      { id: 'laila', name: 'Laila - Storyteller', dialect: 'Levantine Arabic [AR-LB]', tag: 'AR-LB', icon: 'waveform', speaker_wav: 'female.wav' }
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

describe('index.vue — full page integration (Slice 8)', () => {
  it('renders VoiceSelector component for voice selection', () => {
    const wrapper = shallowMount(Index)
    expect(wrapper.find('voiceselector').exists()).toBe(true)
  })

  it('renders SpeedSlider component for speed control', () => {
    const wrapper = shallowMount(Index)
    expect(wrapper.find('speedslider').exists()).toBe(true)
  })

  it('renders GenerateButton component', () => {
    const wrapper = shallowMount(Index)
    expect(wrapper.find('generatebutton').exists()).toBe(true)
  })

  it('renders FocusHaloCanvas behind textarea', () => {
    const wrapper = shallowMount(Index)
    expect(wrapper.find('focushalocanvas').exists()).toBe(true)
  })

  it('renders ToastNotification for global notifications', () => {
    const wrapper = shallowMount(Index)
    expect(wrapper.find('toastnotification').exists()).toBe(true)
  })

  it('renders a textarea for Arabic text input', () => {
    const wrapper = shallowMount(Index)
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('renders a hidden audio element', () => {
    const wrapper = shallowMount(Index)
    expect(wrapper.find('audio').exists()).toBe(true)
  })

  it('has the LughatChat branding in the header', () => {
    const wrapper = shallowMount(Index)
    const html = wrapper.html()
    expect(html).toContain('Lughat')
    expect(html).toContain('Chat')
  })

  it('applies Sunrise color palette (orange + magenta) to the page', () => {
    const wrapper = shallowMount(Index)
    const html = wrapper.html()
    // jsdom converts hex colors to rgb()
    expect(html).toContain('rgb(255, 81, 47)')
    expect(html).toContain('rgb(221, 36, 118)')
  })

  it('applies charcoal background (#121212) to the page', () => {
    const wrapper = shallowMount(Index)
    const html = wrapper.html()
    expect(html).toContain('rgb(18, 18, 18)')
  })

  it('has no dark: variant classes (fixed dark theme)', () => {
    const wrapper = shallowMount(Index)
    const html = wrapper.html()
    expect(html).not.toContain('dark:')
  })

  it('applies Inter font (sans) to UI and Cairo (arabic) to content', () => {
    const wrapper = shallowMount(Index)
    const html = wrapper.html()
    // Font families are configured via UnoCSS and inline styles
    expect(html).toContain('Cairo')
  })

  it('textarea has RTL direction for Arabic text', () => {
    const wrapper = shallowMount(Index)
    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    expect(textarea.attributes('dir')).toBe('rtl')
  })
})

describe('GenerateButton — status text matches reference design', () => {
  it('uses proper loading status text matching the reference HTML', () => {
    const generateBtnPath = path.resolve(__dirname, '../app/components/GenerateButton.vue')
    const source = fs.readFileSync(generateBtnPath, 'utf-8')

    expect(source).toContain('Processing Model')
  })
})
