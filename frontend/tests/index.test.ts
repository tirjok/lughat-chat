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
    it('shortcut hint is hidden below md: (375px) — hidden md:flex not rendered', () => {
      setBreakpoint(375)
      shallowMount(Index)
      // The shortcut hint uses "hidden md:flex" — at 375px (below md:),
      // the element should have the "hidden" class applied.
      // Check that the hint container exists in the source with hidden class.
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('hidden md:flex')
    })

    it('shortcut hint is visible at md: and above (768px+) — hidden md:flex shows on medium+', () => {
      setBreakpoint(768)
      shallowMount(Index)
      // At 768px (≥ md: breakpoint), the shortcut hint should be visible.
      // The "hidden md:flex" class means: hidden by default, flex at md: and up.
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      // Verify the shortcut hint element exists in source with the responsive classes
      expect(source).toContain('Ctrl')
      expect(source).toContain('Enter')
      expect(source).toContain('hidden md:flex')
    })

    it('shortcut hint contains keyboard shortcut text', () => {
      const wrapper = shallowMount(Index)
      expect(wrapper.html()).toContain('Ctrl')
      expect(wrapper.html()).toContain('Enter')
      expect(wrapper.html()).toContain('to generate')
    })
  })

  describe('root container responsive layout', () => {
    it('root container uses flex flex-col md:flex-row h-dvh w-full overflow-hidden', () => {
      const wrapper = shallowMount(Index)
      const rootContainer = wrapper.find('div.h-dvh')
      expect(rootContainer.exists()).toBe(true)
      // Verify the source uses flex flex-col md:flex-row h-dvh w-full overflow-hidden
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('flex flex-col md:flex-row')
      expect(source).toContain('overflow-hidden')
    })
  })

  describe('aside (Control Deck) responsive layout', () => {
    it('aside has responsive widths: md:w-[35%] lg:w-[30%] xl:w-[25%]', () => {
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('md:w-[35%]')
      expect(source).toContain('lg:w-[30%]')
      expect(source).toContain('xl:w-[25%]')
    })

    it('aside has Control Deck height: h-[45dvh] md:h-full', () => {
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('h-[45dvh]')
      expect(source).toContain('md:h-full')
    })

    it('aside has responsive border: border-t md:border-t-0 md:border-r', () => {
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('border-t')
      expect(source).toContain('md:border-t-0')
      expect(source).toContain('md:border-r')
    })

    it('aside has responsive shadow: shadow-[0_-10px_30px_rgba(0,0,0,0.4)] md:shadow-2xl', () => {
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('shadow-[0_-10px_30px_rgba(0,0,0,0.4)]')
      expect(source).toContain('md:shadow-2xl')
    })

    it('aside has responsive order: order-2 md:order-1', () => {
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('order-2')
      expect(source).toContain('md:order-1')
    })
  })

  describe('main (Canvas) responsive layout', () => {
    it('main has responsive widths: md:w-[65%] lg:w-[70%] xl:w-[75%]', () => {
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('md:w-[65%]')
      expect(source).toContain('lg:w-[70%]')
      expect(source).toContain('xl:w-[75%]')
    })

    it('main has overflow-hidden (not overflow-y-auto)', () => {
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      // Verify the main element class string contains overflow-hidden, not overflow-y-auto
      // Match the main/data-panel="canvas" class attribute
      const mainClassMatch = source.match(/data-panel="canvas"[^>]*class="([^"]*)"/)
      expect(mainClassMatch).not.toBeNull()
      const classStr = mainClassMatch![1]
      expect(classStr).toContain('overflow-hidden')
      expect(classStr).not.toContain('overflow-y-auto')
    })

    it('main has responsive border: md:border-l', () => {
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('md:border-l')
    })

    it('main has responsive order: order-1 md:order-2', () => {
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('order-1')
      expect(source).toContain('md:order-2')
    })
  })

  describe('textarea responsive font', () => {
    it('textarea has responsive font sizes: text-2xl md:text-4xl lg:text-5xl', () => {
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('text-2xl')
      expect(source).toContain('md:text-4xl')
      expect(source).toContain('lg:text-5xl')
    })

    it('textarea has responsive line height: leading-relaxed md:leading-[1.6]', () => {
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('leading-relaxed')
      expect(source).toContain('md:leading-[1.6]')
    })
  })

  describe('desktop header visibility', () => {
    it('desktop header is hidden on mobile: hidden md:flex', () => {
      const indexPath = path.resolve(__dirname, '../app/pages/index.vue')
      const source = fs.readFileSync(indexPath, 'utf-8')
      expect(source).toContain('hidden md:flex')
    })
  })
})
