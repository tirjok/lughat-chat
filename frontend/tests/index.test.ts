import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import Index from '../app/pages/index.vue'
import { setBreakpoint } from './mocks'

// Mock composables at the global level to intercept Nuxt auto-imports
const mockUseAudioModule = vi.fn()
const mockUseTtsApi = vi.fn()
const mockUseVoices = vi.fn()
const mockUseHealthPoll = vi.fn()
const mockUseInputValidation = vi.fn()
const mockShowToast = vi.fn()

beforeEach(() => {
  // Provide default mock return values so the component renders without errors
  ;(globalThis as Record<string, unknown>).useAudioModule = mockUseAudioModule.mockReturnValue({
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
    dispose: vi.fn()
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
    get status() { return 'ready' },
    get modelLoaded() { return true },
    get modelName() { return '' },
    get subStatus() { return '' },
    stop: () => {},
    retry: () => {},
    start: () => {}
  })

  ;(globalThis as Record<string, unknown>).useInputValidation = mockUseInputValidation.mockReturnValue({
    isValid: ref(true),
    error: ref(null)
  })

  ;(globalThis as Record<string, unknown>).showToast = mockShowToast
})

// ─── Behavioral Tests (black-box: rendered component tree, emitted events) ──

describe('index.vue', () => {
  describe('component tree', () => {
    it('When rendered then VoiceSelector component exists', () => {
      // Arrange
      const wrapper = shallowMount(Index)
      // Act
      const component = wrapper.find('voiceselector')
      // Assert
      expect(component.exists()).toBe(true)
    })

    it('When rendered then SpeedSlider component exists', () => {
      // Arrange
      const wrapper = shallowMount(Index)
      // Act
      const component = wrapper.find('speedslider')
      // Assert
      expect(component.exists()).toBe(true)
    })

    it('When rendered then GenerateButton component exists', () => {
      // Arrange
      const wrapper = shallowMount(Index)
      // Act
      const component = wrapper.find('generatebutton')
      // Assert
      expect(component.exists()).toBe(true)
    })

    it('When rendered then FocusHaloCanvas exists behind textarea', () => {
      // Arrange
      const wrapper = shallowMount(Index)
      // Act
      const component = wrapper.find('focushalocanvas')
      // Assert
      expect(component.exists()).toBe(true)
    })

    it('When rendered then ToastNotification exists for global notifications', () => {
      // Arrange
      const wrapper = shallowMount(Index)
      // Act
      const component = wrapper.find('toastnotification')
      // Assert
      expect(component.exists()).toBe(true)
    })

    it('When rendered then textarea element exists for text input', () => {
      // Arrange
      const wrapper = shallowMount(Index)
      // Act
      const textarea = wrapper.find('textarea')
      // Assert
      expect(textarea.exists()).toBe(true)
      expect(textarea.attributes('dir')).toBe('rtl')
    })

    it('When rendered then hidden audio element exists', () => {
      // Arrange
      const wrapper = shallowMount(Index)
      // Act
      const audio = wrapper.find('audio')
      // Assert
      expect(audio.exists()).toBe(true)
    })
  })

  describe('branding and styling', () => {
    it('When rendered then header shows LughatChat branding', () => {
      // Arrange
      const wrapper = shallowMount(Index)
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('Lughat')
      expect(html).toContain('Chat')
    })

    it('When rendered then Sunrise color palette (orange + magenta) is applied', () => {
      // Arrange
      const wrapper = shallowMount(Index)
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('text-sunrise-orange')
      expect(html).toContain('text-sunrise-magenta')
      expect(html).toContain('rgb(255, 81, 47)')
    })

    it('When rendered then charcoal background (#121212) is applied', () => {
      // Arrange
      const wrapper = shallowMount(Index)
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('rgb(18, 18, 18)')
    })

    it('When rendered then shortcut hint shows keyboard shortcut text', () => {
      // Arrange
      const wrapper = shallowMount(Index)
      // Act
      const html = wrapper.html()
      // Assert
      expect(html).toContain('Ctrl')
      expect(html).toContain('Enter')
      expect(html).toContain('to generate')
    })
  })
})

// ─── Responsive Tests (black-box: breakpoint simulation) ─────────────────

describe('index.vue — responsive layout', () => {
  let originalInnerWidth: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth })
  })

  describe('shortcut hint visibility', () => {
    it('When viewport is 375px then shortcut hint is hidden (below md: breakpoint)', () => {
      // Arrange
      setBreakpoint(375)
      // Act
      const wrapper = shallowMount(Index)
      // Assert
      const html = wrapper.html()
      expect(html).toContain('Ctrl')
      expect(html).toContain('Enter')
    })

    it('When viewport is 768px then shortcut hint is visible (at md: breakpoint)', () => {
      // Arrange
      setBreakpoint(768)
      // Act
      const wrapper = shallowMount(Index)
      // Assert
      const html = wrapper.html()
      expect(html).toContain('Ctrl')
      expect(html).toContain('Enter')
    })
  })
})
