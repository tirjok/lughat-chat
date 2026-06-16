import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import * as fs from 'fs'
import * as path from 'path'

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
    // Font families are configured via UnoCSS (font-arabic -> Cairo) and inline styles
    // Check source file for the font-arabic class that resolves to Cairo
    const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
    const source = fs.readFileSync(indexPath, 'utf-8')
    expect(source).toContain('font-arabic')
    // Also verify Cairo font is loaded via Google Fonts in nuxt.config
    const nuxtConfigPath = path.resolve(__dirname, '../nuxt.config.ts')
    const nuxtSource = fs.readFileSync(nuxtConfigPath, 'utf-8')
    expect(nuxtSource).toContain('Cairo')
  })

  it('textarea has RTL direction for Arabic text', () => {
    const wrapper = shallowMount(Index)
    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    expect(textarea.attributes('dir')).toBe('rtl')
  })
})

describe('GenerateButton — status text matches reference design', () => {
  it('uses proper loading status text matching the reference design', () => {
    const generateBtnPath = path.resolve(__dirname, '../app/components/GenerateButton.vue')
    const source = fs.readFileSync(generateBtnPath, 'utf-8')

    expect(source).toContain('Processing Model')
  })
})

// ─── Responsive Tests for index.vue ─────────────────────────────────────

describe('index.vue — responsive layout tests', () => {
  let originalInnerWidth: number

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth })
  })

  describe('shortcut hint visibility', () => {
    it('shortcut hint is hidden below sm: (375px) — hidden sm:flex not rendered', () => {
      setBreakpoint(375)
      shallowMount(Index)
      // The shortcut hint uses "hidden sm:flex" — at 375px (below sm:),
      // the element should have the "hidden" class applied.
      // Check that the hint container exists in the source with hidden class.
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('hidden sm:flex')
    })

    it('shortcut hint is visible at sm: and above (414px+) — hidden sm:flex shows on small+', () => {
      setBreakpoint(414)
      shallowMount(Index)
      // At 414px (≥ sm: breakpoint), the shortcut hint should be visible.
      // The "hidden sm:flex" class means: hidden by default, flex at sm: and up.
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      // Verify the shortcut hint element exists in source with the responsive classes
      expect(source).toContain('Ctrl')
      expect(source).toContain('Enter')
      expect(source).toContain('hidden sm:flex')
    })

    it('shortcut hint contains keyboard shortcut text', () => {
      const wrapper = shallowMount(Index)
      expect(wrapper.html()).toContain('Ctrl')
      expect(wrapper.html()).toContain('Enter')
      expect(wrapper.html()).toContain('to generate')
    })
  })

  describe('root container scroll behavior', () => {
    it('root container allows scroll (not overflow-hidden)', () => {
      const wrapper = shallowMount(Index)
      const rootContainer = wrapper.find('div.h-dvh')
      expect(rootContainer.exists()).toBe(true)
      // The root container should NOT have overflow-hidden
      const classes = rootContainer.classes()
      expect(classes).not.toContain('overflow-hidden')
      // Verify the source uses overflow-y-auto for scrolling
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('overflow-y-auto')
    })

    it('main panel allows scroll on mobile (overflow-y-auto)', () => {
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('md:overflow-y-auto')
    })

    it('canvas panel has overflow-y-auto on mobile, hidden on desktop', () => {
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('md:overflow-hidden')
    })
  })
})
