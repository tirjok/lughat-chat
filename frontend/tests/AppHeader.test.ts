import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'

import AppHeader from '../app/components/AppHeader.vue'
import { useHealthPoll } from '../app/composables/useHealthPoll'

// Mock the composable before importing the component
vi.mock('../app/composables/useHealthPoll', () => ({
  useHealthPoll: vi.fn()
}))

describe('AppHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('icon', () => {
    it('renders the waves (volume-2) icon', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('loading'),
        modelLoaded: computed(() => false)
      })

      const wrapper = mount(AppHeader)

      // Lucide icon via UnoCSS preset
      const icon = wrapper.find('.i-lucide-volume-2')
      expect(icon.exists()).toBe(true)
    })
  })

  describe('title', () => {
    it('renders "LughatChat" as the title text', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('loading'),
        modelLoaded: computed(() => false)
      })

      const wrapper = mount(AppHeader)

      expect(wrapper.text()).toContain('LughatChat')
    })

    it('renders "Chat" portion in magenta color (#DD2476)', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('loading'),
        modelLoaded: computed(() => false)
      })

      const wrapper = mount(AppHeader)

      // Use CSS attribute selector — robust against nesting changes
      const chatSpan = wrapper.find('span[style*="#DD2476"]')
      expect(chatSpan.exists()).toBe(true)
      expect(chatSpan.text()).toBe('Chat')
    })

    it('renders "Lughat" portion separately from "Chat"', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('loading'),
        modelLoaded: computed(() => false)
      })

      const wrapper = mount(AppHeader)

      // "Lughat" should appear as the first text span in the title
      const spans = wrapper.findAll('span')
      const lughatSpan = spans.find(span => span.text() === 'Lughat')
      expect(lughatSpan).toBeDefined()
    })
  })

  describe('subtitle', () => {
    it('renders "Premium Audio Studio" as the subtitle', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('loading'),
        modelLoaded: computed(() => false)
      })

      const wrapper = mount(AppHeader)

      expect(wrapper.text()).toContain('Premium Audio Studio')
    })
  })

  describe('model status indicator', () => {
    it('shows loading text when model is loading', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('loading'),
        modelLoaded: computed(() => false)
      })

      const wrapper = mount(AppHeader)

      // AppHeader inlines useHealthPoll — shows "Loading..." text
      expect(wrapper.text()).toContain('Loading...')
    })

    it('shows model status text based on health poll state', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('ready'),
        modelLoaded: computed(() => true)
      })

      const wrapper = mount(AppHeader)

      expect(wrapper.text()).toContain('Model Ready')
    })
  })

  describe('layout', () => {
    it('has a two-column header layout (title area + status indicator)', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('loading'),
        modelLoaded: computed(() => false)
      })

      const wrapper = mount(AppHeader)

      // Root element should use flex layout
      const root = wrapper.find('[class*="flex"]')
      expect(root.exists()).toBe(true)
    })
  })
})
