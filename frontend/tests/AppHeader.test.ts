import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

import AppHeader from '../app/components/AppHeader.vue'
import { useHealthPoll } from '../app/composables/useHealthPoll'

// Mock the composable before importing the component
vi.mock('../app/composables/useHealthPoll', () => ({
  useHealthPoll: vi.fn()
}))

describe('AppHeader', () => {
  // Use proper mock objects that match what the component expects.
  // The component accesses `status` directly in the template (Vue auto-unwraps real refs).
  // Since we mock ref() to return { value: init }, Vue doesn't auto-unwrap it,
  // so we need to make `status` itself be the string value for the === comparison.
  const mockStatus = { value: 'loading' }
  const mockLoadingStatus = 'loading'
  const mockReadyStatus = 'ready'
  const mockModelLoaded = { value: false }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('icon', () => {
    it('renders the volume icon', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: mockStatus,
        modelLoaded: mockModelLoaded
      })

      const wrapper = mount(AppHeader)

      // Lucide icon via UnoCSS preset
      const icon = wrapper.find('.i-lucide-audio-waveform')
      expect(icon.exists()).toBe(true)
    })
  })

  describe('title', () => {
    it('renders "LughatChat" as the title text', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: mockStatus,
        modelLoaded: mockModelLoaded
      })

      const wrapper = mount(AppHeader)

      expect(wrapper.text()).toContain('LughatChat')
    })

    it('renders "Chat" portion in magenta color (#DD2476)', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: mockStatus,
        modelLoaded: mockModelLoaded
      })

      const wrapper = mount(AppHeader)

      // jsdom normalizes hex colors to rgb() in inline styles,
      // so #DD2476 becomes rgb(221, 36, 118).
      const spans = wrapper.findAll('span[style*="rgb(221, 36, 118)"]')
      expect(spans.length).toBeGreaterThan(0)
      expect(spans[0].text()).toBe('Chat')
    })

    it('renders "Lughat" portion separately from "Chat"', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: mockStatus,
        modelLoaded: mockModelLoaded
      })

      const wrapper = mount(AppHeader)

      // The title text contains both "Lughat" and "Chat" (Chat is styled separately)
      expect(wrapper.text()).toContain('Lughat')
      expect(wrapper.text()).toContain('Chat')
    })
  })

  describe('subtitle', () => {
    it('renders "Premium Audio Studio" as the subtitle', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: mockStatus,
        modelLoaded: mockModelLoaded
      })

      const wrapper = mount(AppHeader)

      expect(wrapper.text()).toContain('Premium Audio Studio')
    })
  })

  describe('model status indicator', () => {
    it('shows loading text when model is loading', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: mockLoadingStatus,
        modelLoaded: mockModelLoaded
      })

      const wrapper = mount(AppHeader)

      // AppHeader inlines useHealthPoll — shows "Loading..." text
      expect(wrapper.text()).toContain('Loading...')
    })

    it('shows model status text based on health poll state', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: mockReadyStatus,
        modelLoaded: mockModelLoaded
      })

      const wrapper = mount(AppHeader)

      expect(wrapper.text()).toContain('Ready')
    })
  })

  describe('layout', () => {
    it('has a two-column header layout (title area + status indicator)', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: mockStatus,
        modelLoaded: mockModelLoaded
      })

      const wrapper = mount(AppHeader)

      // Root element should use flex layout
      const root = wrapper.find('[class*="flex"]')
      expect(root.exists()).toBe(true)
    })
  })
})
