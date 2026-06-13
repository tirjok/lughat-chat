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

beforeEach(() => {
  const mockAudio = createMockUseAudioPlayer()
  const mockTts = createMockUseTtsApi()
  const mockHealth = createMockUseHealthPoll()
  const mockValidation = createMockUseInputValidation()

  const voicesRef = ref([
    { id: 'female', name: 'Female' },
    { id: 'male', name: 'Male' }
  ])

  ;(globalThis as Record<string, unknown>).useAudioPlayer = () => mockAudio
  ;(globalThis as Record<string, unknown>).useTtsApi = () => mockTts
  ;(globalThis as Record<string, unknown>).useVoices = () => ({ voices: voicesRef })
  ;(globalThis as Record<string, unknown>).useHealthPoll = () => mockHealth
  ;(globalThis as Record<string, unknown>).useInputValidation = () => mockValidation
  ;(globalThis as Record<string, unknown>).showToast = vi.fn()
})

describe('index.vue — two-panel layout', () => {
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
        NuxtPage: defineComponent({ template: '<div />' })
      },
      ...options
    })
  }

  it('renders an aside element (sidebar panel)', () => {
    const wrapper = mountIndex()

    const aside = wrapper.find('aside')
    expect(aside.exists()).toBe(true)
  })

  it('renders a main element (content panel)', () => {
    const wrapper = mountIndex()

    const main = wrapper.find('main')
    expect(main.exists()).toBe(true)
  })

  it('aside appears before main in DOM order', () => {
    const wrapper = mountIndex()

    const aside = wrapper.find('aside')
    const main = wrapper.find('main')

    // aside should come before main in the DOM (FOLLOWING = 4 means aside precedes main)
    expect(aside.element.compareDocumentPosition(main.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(4)
  })

  it('applies charcoal background color (#121212) to the page', () => {
    const wrapper = mountIndex()

    const page = wrapper.find('[class*="h-screen"]')
    expect(page.exists()).toBe(true)
    // Check inline style — hex #121212 becomes rgb(18, 18, 18) in rendered HTML
    const html = wrapper.html()
    expect(html).toContain('rgb(18, 18, 18)')
  })

  it('has no dark: variant classes (fixed dark theme)', () => {
    const wrapper = mountIndex()

    const html = wrapper.html()
    expect(html).not.toContain('dark:')
  })

  it('renders AppHeader component', () => {
    const wrapper = mountIndex()

    // Full mount (not shallowMount) so child components are rendered, not stubbed
    expect(wrapper.find('header').exists()).toBe(true)
  })

  it('renders KeyboardHint component', () => {
    const wrapper = mountIndex()

    // Full mount (not shallowMount) so child components are rendered, not stubbed
    // The KeyboardHint is rendered inside a wrapper div in the page template
    const html = wrapper.html()
    expect(html).toContain('Ctrl')
    expect(html).toContain('Enter')
    expect(html).toContain('to generate')
  })
})
