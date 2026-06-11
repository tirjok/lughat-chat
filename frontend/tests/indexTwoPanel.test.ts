import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import { createMockUseAudioPlayer, createMockUseTtsApi, createMockUseHealthPoll, createMockUseInputValidation } from './mocks'

import Index from '../app/pages/index.vue'

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
  it('renders an aside element (sidebar panel)', () => {
    const wrapper = shallowMount(Index)

    const aside = wrapper.find('aside')
    expect(aside.exists()).toBe(true)
  })

  it('renders a main element (content panel)', () => {
    const wrapper = shallowMount(Index)

    const main = wrapper.find('main')
    expect(main.exists()).toBe(true)
  })

  it('aside appears before main in DOM order', () => {
    const wrapper = shallowMount(Index)

    const aside = wrapper.find('aside')
    const main = wrapper.find('main')

    // aside should come before main in the DOM (FOLLOWING = 4 means aside precedes main)
    expect(aside.element.compareDocumentPosition(main.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(4)
  })

  it('applies charcoal background color (#121212) to the page', () => {
    const wrapper = shallowMount(Index)

    const page = wrapper.find('[class*="min-h-screen"]')
    expect(page.exists()).toBe(true)
    // Check inline style — hex #121212 becomes rgb(18, 18, 18) in rendered HTML
    const html = wrapper.html()
    expect(html).toContain('rgb(18, 18, 18)')
  })

  it('has no dark: variant classes (fixed dark theme)', () => {
    const wrapper = shallowMount(Index)

    const html = wrapper.html()
    expect(html).not.toContain('dark:')
  })

  it('renders AppHeader component', () => {
    const wrapper = shallowMount(Index)

    expect(wrapper.find('appheader').exists()).toBe(true)
  })

  it('renders KeyboardHint component', () => {
    const wrapper = shallowMount(Index)

    // shallowMount stubs child components — check for the <keyboardhint> stub
    expect(wrapper.find('keyboardhint').exists()).toBe(true)
  })
})
