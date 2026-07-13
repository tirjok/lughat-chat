import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { shallowRef } from 'vue'

import ModelStatusIndicator from '../app/components/ModelStatusIndicator.vue'

// Module-level reactive ref — the mock returns this directly
// so Vue's reactivity system tracks it and triggers re-renders
// when its `.value` changes.
const mockStatus = shallowRef<'loading' | 'ready' | 'error' | 'retrying'>('loading')

vi.mock('../app/composables/useHealthPoll', () => ({
  useHealthPoll: () => ({
    get status() { return mockStatus.value },
    get modelLoaded() { return mockStatus.value === 'ready' },
    get modelName() { return '' },
    get subStatus() { return '' },
    stop: vi.fn(),
    retry: vi.fn(),
    start: vi.fn()
  })
}))

describe('ModelStatusIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStatus.value = 'loading'
  })

  describe('loading state', () => {
    it('renders spinning loader icon and "Loading..." text on mount', () => {
      const wrapper = mount(ModelStatusIndicator)
      expect(wrapper.text()).toContain('Loading...')
    })

    it('renders the loader indicator (orange dot) in loading state', () => {
      const wrapper = mount(ModelStatusIndicator)
      const dot = wrapper.find('span.bg-orange-500')
      expect(dot.exists()).toBe(true)
    })

    it('does not render green or red dots in loading state', () => {
      const wrapper = mount(ModelStatusIndicator)
      const greenDot = wrapper.find('span.bg-green-500')
      const redDot = wrapper.find('span.bg-red-500')
      expect(greenDot.exists()).toBe(false)
      expect(redDot.exists()).toBe(false)
    })
  })

  describe('ready state', () => {
    it('renders green indicator dot and "Ready" text when model is loaded', () => {
      mockStatus.value = 'ready'
      const wrapper = mount(ModelStatusIndicator)
      expect(wrapper.text()).toContain('Ready')
    })

    it('renders the green dot indicator element', () => {
      mockStatus.value = 'ready'
      const wrapper = mount(ModelStatusIndicator)
      const dot = wrapper.find('span.bg-green-500')
      expect(dot.exists()).toBe(true)
    })

    it('does not render orange or red dots in ready state', () => {
      mockStatus.value = 'ready'
      const wrapper = mount(ModelStatusIndicator)
      const orangeDot = wrapper.find('span.bg-orange-500')
      const redDot = wrapper.find('span.bg-red-500')
      expect(orangeDot.exists()).toBe(false)
      expect(redDot.exists()).toBe(false)
    })
  })

  describe('retrying state (M-09)', () => {
    it('renders "Retrying..." text when status is retrying', () => {
      mockStatus.value = 'retrying'
      const wrapper = mount(ModelStatusIndicator)
      expect(wrapper.text()).toContain('Retrying...')
    })

    it('renders the orange dot with pulse animation in retrying state', () => {
      mockStatus.value = 'retrying'
      const wrapper = mount(ModelStatusIndicator)
      const dot = wrapper.find('span.bg-orange-500')
      expect(dot.exists()).toBe(true)
    })

    it('renders tooltip reflecting retrying state', () => {
      mockStatus.value = 'retrying'
      const wrapper = mount(ModelStatusIndicator)
      const root = wrapper.find('[class*="flex"]')
      expect(root.attributes('title')).toContain('Retrying')
    })

    it('does not render green or red dots in retrying state', () => {
      mockStatus.value = 'retrying'
      const wrapper = mount(ModelStatusIndicator)
      const greenDot = wrapper.find('span.bg-green-500')
      const redDot = wrapper.find('span.bg-red-500')
      expect(greenDot.exists()).toBe(false)
      expect(redDot.exists()).toBe(false)
    })
  })

  describe('error state', () => {
    it('renders red indicator dot and "Error" text when model is not loaded', () => {
      mockStatus.value = 'error'
      const wrapper = mount(ModelStatusIndicator)
      expect(wrapper.text()).toContain('Error')
    })

    it('renders the red dot indicator element', () => {
      mockStatus.value = 'error'
      const wrapper = mount(ModelStatusIndicator)
      const dot = wrapper.find('span.bg-red-500')
      expect(dot.exists()).toBe(true)
    })

    it('does not render orange or green dots in error state', () => {
      mockStatus.value = 'error'
      const wrapper = mount(ModelStatusIndicator)
      const orangeDot = wrapper.find('span.bg-orange-500')
      const greenDot = wrapper.find('span.bg-green-500')
      expect(orangeDot.exists()).toBe(false)
      expect(greenDot.exists()).toBe(false)
    })
  })

  describe('reactivity', () => {
    it('shows correct state when mounted in ready state', () => {
      mockStatus.value = 'ready'
      const wrapper = mount(ModelStatusIndicator)
      expect(wrapper.text()).toContain('Ready')
      expect(wrapper.find('span.bg-green-500').exists()).toBe(true)
    })

    it('shows correct state when mounted in error state', () => {
      mockStatus.value = 'error'
      const wrapper = mount(ModelStatusIndicator)
      expect(wrapper.text()).toContain('Error')
      expect(wrapper.find('span.bg-red-500').exists()).toBe(true)
    })
  })

  describe('retry button (M-10)', () => {
    it('does not render retry button in loading state', () => {
      const wrapper = mount(ModelStatusIndicator)
      expect(wrapper.find('button').exists()).toBe(false)
    })

    it('does not render retry button in ready state', () => {
      mockStatus.value = 'ready'
      const wrapper = mount(ModelStatusIndicator)
      expect(wrapper.find('button').exists()).toBe(false)
    })

    it('renders retry button in retrying state', () => {
      mockStatus.value = 'retrying'
      const wrapper = mount(ModelStatusIndicator)
      expect(wrapper.find('button').exists()).toBe(true)
    })

    it('renders retry button in error state', () => {
      mockStatus.value = 'error'
      const wrapper = mount(ModelStatusIndicator)
      expect(wrapper.find('button').exists()).toBe(true)
    })

    it('calls retry() when retry button is clicked', async () => {
      mockStatus.value = 'error'
      const wrapper = mount(ModelStatusIndicator)
      const retryBtn = wrapper.find('button')
      expect(retryBtn.exists()).toBe(true)
      await retryBtn.trigger('click')
      expect(retryBtn.attributes('aria-label')).toBe('Retry health check')
    })

    it('does not render retry button when mounted in ready state', () => {
      mockStatus.value = 'ready'
      const wrapper = mount(ModelStatusIndicator)
      expect(wrapper.find('button').exists()).toBe(false)
    })
  })

  describe('layout', () => {
    it('renders with flex layout and RTL-compatible structure', () => {
      const wrapper = mount(ModelStatusIndicator)
      const root = wrapper.find('[class*="flex"]')
      expect(root.exists()).toBe(true)
      expect(root.classes()).toContain('items-center')
    })

    it('renders indicator dot and text with gap spacing', () => {
      const wrapper = mount(ModelStatusIndicator)
      const root = wrapper.find('[class*="flex"]')
      expect(root.classes()).toContain('gap-2')
    })

    it('renders indicator dot with consistent dimensions', () => {
      const wrapper = mount(ModelStatusIndicator)
      const dot = wrapper.find('span.w-2')
      expect(dot.exists()).toBe(true)
      expect(dot.classes()).toContain('h-2')
    })

    it('renders text with small font size', () => {
      const wrapper = mount(ModelStatusIndicator)
      const textSpan = wrapper.find('span.text-xs')
      expect(textSpan.exists()).toBe(true)
    })
  })
})
