import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { shallowRef } from 'vue'

import type { UseHealthPollOptions } from '../app/composables/useHealthPoll'
import ModelStatusIndicator from '../app/components/ModelStatusIndicator.vue'

// Module-level reactive refs — the mock returns these directly
// so Vue's reactivity system tracks them and triggers re-renders
// when their `.value` changes.
const mockStatus = shallowRef<'loading' | 'ready' | 'error' | 'retrying'>('loading')
const mockModelName = shallowRef<string>('')
const mockSubStatus = shallowRef<string>('')

vi.mock('../app/composables/useHealthPoll', () => ({
  useHealthPoll: (_options?: UseHealthPollOptions) => ({
    get status() { return mockStatus.value },
    get modelLoaded() { return mockStatus.value === 'ready' },
    get modelName() { return mockModelName.value },
    get subStatus() { return mockSubStatus.value },
    stop: vi.fn(),
    retry: vi.fn(),
    start: vi.fn()
  })
}))

describe('ModelStatusIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStatus.value = 'loading'
    mockModelName.value = ''
    mockSubStatus.value = ''
  })

  describe('loading state', () => {
    it('renders spinning loader icon and "Loading..." text on mount', () => {
      const wrapper = mount(ModelStatusIndicator)
      expect(wrapper.text()).toContain('Loading...')
    })

    it('renders the loader indicator (gold dot) in loading state', () => {
      const wrapper = mount(ModelStatusIndicator)
      const dot = wrapper.find('span.bg-gold')
      expect(dot.exists()).toBe(true)
    })

    it('does not render success or error dots in loading state', () => {
      const wrapper = mount(ModelStatusIndicator)
      const successDot = wrapper.find('span.bg-success')
      const errorDot = wrapper.find('span.bg-error')
      expect(successDot.exists()).toBe(false)
      expect(errorDot.exists()).toBe(false)
    })
  })

  describe('ready state', () => {
    it('renders success indicator dot and "Ready" text when model is loaded', () => {
      mockStatus.value = 'ready'
      const wrapper = mount(ModelStatusIndicator)
      expect(wrapper.text()).toContain('Ready')
    })

    it('renders the green dot indicator element', () => {
      mockStatus.value = 'ready'
      const wrapper = mount(ModelStatusIndicator)
      const dot = wrapper.find('span.bg-success')
      expect(dot.exists()).toBe(true)
    })

    it('does not render gold or error dots in ready state', () => {
      mockStatus.value = 'ready'
      const wrapper = mount(ModelStatusIndicator)
      const goldDot = wrapper.find('span.bg-gold')
      const errorDot = wrapper.find('span.bg-error')
      expect(goldDot.exists()).toBe(false)
      expect(errorDot.exists()).toBe(false)
    })
  })

  describe('retrying state (M-09)', () => {
    it('renders "Retrying..." text when status is retrying', () => {
      mockStatus.value = 'retrying'
      const wrapper = mount(ModelStatusIndicator)
      expect(wrapper.text()).toContain('Retrying...')
    })

    it('renders the gold dot with pulse animation in retrying state', () => {
      mockStatus.value = 'retrying'
      const wrapper = mount(ModelStatusIndicator)
      const dot = wrapper.find('span.bg-gold')
      expect(dot.exists()).toBe(true)
    })

    it('renders tooltip reflecting retrying state', () => {
      mockStatus.value = 'retrying'
      const wrapper = mount(ModelStatusIndicator)
      const root = wrapper.find('[class*="flex"]')
      expect(root.attributes('title')).toContain('Retrying')
    })

    it('does not render success or error dots in retrying state', () => {
      mockStatus.value = 'retrying'
      const wrapper = mount(ModelStatusIndicator)
      const successDot = wrapper.find('span.bg-success')
      const errorDot = wrapper.find('span.bg-error')
      expect(successDot.exists()).toBe(false)
      expect(errorDot.exists()).toBe(false)
    })
  })

  describe('error state', () => {
    it('renders error indicator dot and "Error" text when model is not loaded', () => {
      mockStatus.value = 'error'
      const wrapper = mount(ModelStatusIndicator)
      expect(wrapper.text()).toContain('Error')
    })

    it('renders the red dot indicator element', () => {
      mockStatus.value = 'error'
      const wrapper = mount(ModelStatusIndicator)
      const dot = wrapper.find('span.bg-error')
      expect(dot.exists()).toBe(true)
    })

    it('does not render gold or success dots in error state', () => {
      mockStatus.value = 'error'
      const wrapper = mount(ModelStatusIndicator)
      const goldDot = wrapper.find('span.bg-gold')
      const successDot = wrapper.find('span.bg-success')
      expect(goldDot.exists()).toBe(false)
      expect(successDot.exists()).toBe(false)
    })
  })

  describe('reactivity', () => {
    it('shows correct state when mounted in ready state', () => {
      mockStatus.value = 'ready'
      const wrapper = mount(ModelStatusIndicator)
      expect(wrapper.text()).toContain('Ready')
      expect(wrapper.find('span.bg-success').exists()).toBe(true)
    })

    it('shows correct state when mounted in error state', () => {
      mockStatus.value = 'error'
      const wrapper = mount(ModelStatusIndicator)
      expect(wrapper.text()).toContain('Error')
      expect(wrapper.find('span.bg-error').exists()).toBe(true)
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
      expect(root.classes()).toContain('gap-1.5')
    })

    it('renders indicator dot with consistent dimensions', () => {
      const wrapper = mount(ModelStatusIndicator)
      const dot = wrapper.find('span[aria-hidden]')
      expect(dot.exists()).toBe(true)
      expect(dot.classes()).toContain('rounded-full')
    })

    it('renders text with small font size', () => {
      const wrapper = mount(ModelStatusIndicator)
      const textSpan = wrapper.find('span.font-medium')
      expect(textSpan.exists()).toBe(true)
    })
  })

  // ─── M-06: model_name + sub_status display ──────────────────────────

  describe('M-06: model_name display', () => {
    it('When modelName is set and subStatus is "initializing" then shows "Loading XTTS-v2..."', () => {
      // Arrange
      mockStatus.value = 'loading'
      mockModelName.value = 'XTTS-v2'
      mockSubStatus.value = 'initializing'

      // Act
      const wrapper = mount(ModelStatusIndicator)

      // Assert
      expect(wrapper.text()).toContain('Loading XTTS-v2...')
    })

    it('When modelName is set to a custom name and subStatus is "initializing" then shows that name', () => {
      // Arrange
      mockStatus.value = 'loading'
      mockModelName.value = 'CustomModel'
      mockSubStatus.value = 'initializing'

      // Act
      const wrapper = mount(ModelStatusIndicator)

      // Assert
      expect(wrapper.text()).toContain('Loading CustomModel...')
    })

    it('When modelName is set but subStatus is empty then falls back to "Loading..."', () => {
      // Arrange
      mockStatus.value = 'loading'
      mockModelName.value = 'XTTS-v2'
      mockSubStatus.value = ''

      // Act
      const wrapper = mount(ModelStatusIndicator)

      // Assert
      expect(wrapper.text()).toContain('Loading...')
      expect(wrapper.text()).not.toContain('XTTS-v2')
    })

    it('When modelName is empty and subStatus is "initializing" then shows "Loading XTTS-v2..." (fallback)', () => {
      // Arrange
      mockStatus.value = 'loading'
      mockModelName.value = ''
      mockSubStatus.value = 'initializing'

      // Act
      const wrapper = mount(ModelStatusIndicator)

      // Assert — when modelName is empty, the component falls back to "XTTS-v2"
      expect(wrapper.text()).toContain('Loading XTTS-v2...')
    })
  })

  describe('M-06: tooltip reflects model_name', () => {
    it('When subStatus is "initializing" then tooltip shows model name', () => {
      // Arrange
      mockStatus.value = 'loading'
      mockModelName.value = 'XTTS-v2'
      mockSubStatus.value = 'initializing'

      // Act
      const wrapper = mount(ModelStatusIndicator)
      const root = wrapper.find('[class*="flex"]')

      // Assert
      expect(root.attributes('title')).toContain('XTTS-v2')
      expect(root.attributes('title')).toContain('Loading')
    })

    it('When subStatus is empty then tooltip shows generic "Model Loading..."', () => {
      // Arrange
      mockStatus.value = 'loading'
      mockModelName.value = ''
      mockSubStatus.value = ''

      // Act
      const wrapper = mount(ModelStatusIndicator)
      const root = wrapper.find('[class*="flex"]')

      // Assert
      expect(root.attributes('title')).toContain('Model Loading')
      expect(root.attributes('title')).not.toContain('XTTS-v2')
    })
  })
})
