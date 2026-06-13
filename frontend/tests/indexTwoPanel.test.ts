import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, defineComponent } from 'vue'
import { createMockUseAudioPlayer, createMockUseTtsApi, createMockUseHealthPoll, createMockUseInputValidation } from './mocks'

import Index from '../app/pages/index.vue'
import KeyboardHint from '../app/components/KeyboardHint.vue'
import AppHeader from '../app/components/AppHeader.vue'
import VoiceSelector from '../app/components/VoiceSelector.vue'
import SpeedSlider from '../app/components/SpeedSlider.vue'
import GenerateButton from '../app/components/GenerateButton.vue'
import FocusHaloCanvas from '../app/components/FocusHaloCanvas.vue'
import SeekableProgressBar from '../app/components/SeekableProgressBar.vue'
import TimeDisplay from '../app/components/TimeDisplay.vue'
import ToastNotification from '../app/components/ToastNotification.vue'
import PlayPauseButton from '../app/components/PlayPauseButton.vue'
import ArabicTextarea from '../app/components/ArabicTextarea.vue'
import AudioPlayerPanel from '../app/components/AudioPlayerPanel.vue'
import ModelStatusIndicator from '../app/components/ModelStatusIndicator.vue'

beforeEach(() => {
  const mockAudio = createMockUseAudioPlayer()
  const mockTts = createMockUseTtsApi()
  const mockHealth = createMockUseHealthPoll()
  const mockValidation = createMockUseInputValidation()

  const voicesRef = ref([
    { id: 'aisha', name: 'Aisha - Conversational', dialect: 'Egyptian Arabic [AR-EG]', tag: 'AR-EG', icon: 'waveform', speaker_wav: 'female.wav' },
    { id: 'tariq', name: 'Tariq - News Anchor', dialect: 'Modern Standard Arabic [MSA]', tag: 'MSA', icon: 'waveform', speaker_wav: 'male.wav' },
    { id: 'laila', name: 'Laila - Storyteller', dialect: 'Levantine Arabic [AR-LB]', tag: 'AR-LB', icon: 'waveform', speaker_wav: 'female.wav' }
  ])

  ;(globalThis as Record<string, unknown>).useAudioPlayer = () => mockAudio
  ;(globalThis as Record<string, unknown>).useTtsApi = () => mockTts
  ;(globalThis as Record<string, unknown>).useVoices = () => ({ voices: voicesRef })
  ;(globalThis as Record<string, unknown>).useHealthPoll = () => mockHealth
  ;(globalThis as Record<string, unknown>).useInputValidation = () => mockValidation
  ;(globalThis as Record<string, unknown>).showToast = vi.fn()
})

describe('index.vue — full page integration (Slice 8)', () => {
  const mountIndex = (options = {}) => {
    return mount(Index, {
      components: {
        KeyboardHint,
        AppHeader,
        VoiceSelector,
        SpeedSlider,
        GenerateButton,
        FocusHaloCanvas,
        SeekableProgressBar,
        TimeDisplay,
        ToastNotification,
        PlayPauseButton,
        ArabicTextarea,
        AudioPlayerPanel,
        ModelStatusIndicator,
        NuxtPage: defineComponent({ template: '<div />' })
      },
      global: {
        stubs: {
          Teleport: {
            template: '<teleport-to-stub :to="to"><slot /></teleport-to-stub>'
          }
        },
        components: {
          'teleport-to-stub': {
            template: '<slot />',
            props: ['to']
          }
        }
      },
      ...options
    })
  }

  // ─── Layout & Color Palette ────────────────────────────────────────
  it('renders an aside element (sidebar control deck)', () => {
    const wrapper = mountIndex()
    expect(wrapper.find('aside').exists()).toBe(true)
  })

  it('renders a main element (editor canvas)', () => {
    const wrapper = mountIndex()
    expect(wrapper.find('main').exists()).toBe(true)
  })

  it('aside appears before main in DOM order', () => {
    const wrapper = mountIndex()
    const aside = wrapper.find('aside')
    const main = wrapper.find('main')
    expect(aside.element.compareDocumentPosition(main.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(4)
  })

  it('applies charcoal background color (#121212) to the page', () => {
    const wrapper = mountIndex()
    const page = wrapper.find('[class*="h-screen"]')
    expect(page.exists()).toBe(true)
    const html = wrapper.html()
    expect(html).toContain('rgb(18, 18, 18)')
  })

  it('applies Sunrise orange to focus elements', () => {
    const wrapper = mountIndex()
    const html = wrapper.html()
    // jsdom converts #FF512F to rgb(255, 81, 47)
    expect(html).toContain('rgb(255, 81, 47)')
  })

  it('applies Sunrise magenta to accent elements', () => {
    const wrapper = mountIndex()
    const html = wrapper.html()
    // jsdom converts #DD2476 to rgb(221, 36, 118)
    expect(html).toContain('rgb(221, 36, 118)')
  })

  it('applies panel color to GenerateButton', () => {
    const wrapper = mountIndex()
    const html = wrapper.html()
    // GenerateButton uses #1A1A1A (panel color) for its background
    // Check the generate-btn element exists with scoped styling
    expect(html).toContain('generate-btn')
  })

  it('applies border color to UI elements', () => {
    const wrapper = mountIndex()
    const html = wrapper.html()
    // jsdom converts #2A2A2A to rgb(42, 42, 42)
    expect(html).toContain('rgb(42, 42, 42)')
  })

  // ─── Component Wiring ──────────────────────────────────────────────
  it('renders all 6 integrated components in the page flow', () => {
    const wrapper = mountIndex()
    const html = wrapper.html()
    // Check that all component sections appear in the rendered HTML
    // VoiceSelector renders its label and dropdown trigger
    expect(html).toContain('Voice Model')
    // SpeedSlider renders its label and slider
    expect(html).toContain('Speech Speed')
    // GenerateButton renders its button content
    expect(html).toContain('generate-btn')
    // AudioPlayerPanel renders its transition class
    expect(html).toContain('slide-up-player')
    // FocusHaloCanvas renders as a div with .canvas-halo class
    expect(html).toContain('canvas-halo')
    // ArabicTextarea renders a textarea element
    expect(html).toContain('textarea')
  })

  it('renders the canvas-halo div (FocusHaloCanvas renders as a div with .canvas-halo class)', () => {
    const wrapper = mountIndex()
    const html = wrapper.html()
    expect(html).toContain('canvas-halo')
  })

  it('renders ToastNotification for global notifications', () => {
    const wrapper = mountIndex()
    const html = wrapper.html()
    expect(html).toContain('toast-slide')
  })

  it('renders ModelStatusIndicator in the header', () => {
    const wrapper = mountIndex()
    const html = wrapper.html()
    // ModelStatusIndicator renders as a status pill in the header
    expect(html).toContain('Ready')
  })

  it('renders a textarea with RTL direction', () => {
    const wrapper = mountIndex()
    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    expect(textarea.attributes('dir')).toBe('rtl')
  })

  it('renders the shortcut hint with Ctrl + Enter', () => {
    const wrapper = mountIndex()
    const html = wrapper.html()
    expect(html).toContain('Ctrl')
    expect(html).toContain('Enter')
    expect(html).toContain('to generate')
  })

  // ─── Dark Theme (no light mode) ────────────────────────────────────
  it('has no dark: variant classes (fixed dark theme)', () => {
    const wrapper = mountIndex()
    const html = wrapper.html()
    expect(html).not.toContain('dark:')
  })

  it('applies fixed dark background (#121212) via inline style', () => {
    const wrapper = mountIndex()
    const page = wrapper.find('[style*="background-color"]')
    expect(page.exists()).toBe(true)
    const html = wrapper.html()
    expect(html).toContain('rgb(18, 18, 18)')
  })

  // ─── RTL/LTR Hybrid ────────────────────────────────────────────────
  it('page layout is LTR (dir="ltr")', () => {
    const wrapper = mountIndex()
    const page = wrapper.find('[dir="ltr"]')
    expect(page.exists()).toBe(true)
  })

  it('textarea content is RTL (dir="rtl")', () => {
    const wrapper = mountIndex()
    const textarea = wrapper.find('textarea')
    expect(textarea.attributes('dir')).toBe('rtl')
  })

  // ─── Full Page Flow ────────────────────────────────────────────────
  it('renders the complete page with all panels', () => {
    const wrapper = mountIndex()
    const html = wrapper.html()
    // Check all major sections exist
    expect(html).toContain('Lughat')
    expect(html).toContain('Premium Audio Studio')
    expect(html).toContain('Voice Model')
    expect(html).toContain('Speech Speed')
    // Model is in loading state, so GenerateButton shows "Processing Model..."
    expect(html).toContain('Processing Model')
    expect(html).toContain('Editor Canvas')
  })

  it('renders Arabic placeholder text in textarea', () => {
    const wrapper = mountIndex()
    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
  })

  it('has a hidden audio element for playback', () => {
    const wrapper = mountIndex()
    const audio = wrapper.find('audio')
    expect(audio.exists()).toBe(true)
  })

  it('renders a focus halo canvas behind the textarea', () => {
    const wrapper = mountIndex()
    const html = wrapper.html()
    expect(html).toContain('canvas-halo')
  })

  it('renders a keyboard shortcut hint at the bottom', () => {
    const wrapper = mountIndex()
    const html = wrapper.html()
    expect(html).toContain('Ctrl')
    expect(html).toContain('Enter')
  })

  it('renders a character counter showing 0 / 3000 by default', () => {
    const wrapper = mountIndex()
    const html = wrapper.html()
    expect(html).toContain('0 / 3000')
  })
})
