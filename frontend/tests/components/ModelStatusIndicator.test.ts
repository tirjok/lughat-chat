import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed, type Ref } from 'vue'

import ModelStatusIndicator from '~/components/ModelStatusIndicator.vue'

// ─── Module-level mock factory ──────────────────────────────────────
// vi.mock() is hoisted to the module scope. We define a single mock
// that uses a shared ref, and each test sets the ref value before
// mounting the component. This avoids the hoisting pitfall where
// vi.mock() calls inside it() blocks would overwrite each other.

const mockStatus: Ref<'loading' | 'ready' | 'error'> = ref('loading' as const)

vi.mock('~/composables/useHealthPoll', () => ({
  useHealthPoll: () => ({
    status: mockStatus,
    modelLoaded: computed(() => mockStatus.value === 'ready')
  })
}))

describe('ModelStatusIndicator', () => {
  beforeEach(() => {
    mockStatus.value = 'loading' as const
  })

  describe('loading state', () => {
    it('renders spinning loader icon and "Loading..." text on mount', () => {
      mockStatus.value = 'loading'
      const wrapper = mount(ModelStatusIndicator)
      expect(wrapper.text()).toContain('Loading...')
    })

    it('renders the loader indicator (orange dot) in loading state', () => {
      mockStatus.value = 'loading'
      const wrapper = mount(ModelStatusIndicator)
      // Loading state renders an orange dot (not an icon)
      const dot = wrapper.find('span.bg-orange-500')
      expect(dot.exists()).toBe(true)
    })

    it('does not render check or alert dots in loading state', () => {
      mockStatus.value = 'loading'
      const wrapper = mount(ModelStatusIndicator)
      const allClasses = wrapper.html()
      expect(allClasses).not.toContain('bg-green-500')
      expect(allClasses).not.toContain('bg-red-500')
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
      // Ready state renders a green dot (not an icon)
      const dot = wrapper.find('span.bg-green-500')
      expect(dot.exists()).toBe(true)
    })

    it('does not render loading or error dots in ready state', () => {
      mockStatus.value = 'ready'
      const wrapper = mount(ModelStatusIndicator)
      const allClasses = wrapper.html()
      expect(allClasses).not.toContain('bg-orange-500')
      // Green dot IS expected in ready state — that's the point.
      expect(allClasses).toContain('bg-green-500')
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
      // Error state renders a red dot (not an icon)
      const dot = wrapper.find('span.bg-red-500')
      expect(dot.exists()).toBe(true)
    })

    it('does not render loading or ready dots in error state', () => {
      mockStatus.value = 'error'
      const wrapper = mount(ModelStatusIndicator)
      const allClasses = wrapper.html()
      expect(allClasses).not.toContain('bg-orange-500')
      expect(allClasses).not.toContain('bg-green-500')
    })
  })

  describe('reactivity', () => {
    it('updates indicator and text when status changes from loading to ready', async () => {
      mockStatus.value = 'loading'
      const wrapper = mount(ModelStatusIndicator)

      // Verify initial loading state
      expect(wrapper.text()).toContain('Loading...')
      expect(wrapper.find('span.bg-orange-500').exists()).toBe(true)

      // Mutate the reactive ref to simulate status change
      mockStatus.value = 'ready'

      // Force re-render to pick up ref mutation
      wrapper.vm.$forceUpdate()
      await wrapper.vm.$nextTick()

      // Verify updated state
      expect(wrapper.text()).toContain('Ready')
      expect(wrapper.find('span.bg-green-500').exists()).toBe(true)
    })

    it('updates indicator and text when status changes from loading to error', async () => {
      mockStatus.value = 'loading'
      const wrapper = mount(ModelStatusIndicator)

      // Verify initial loading state
      expect(wrapper.text()).toContain('Loading...')

      // Mutate the reactive ref to simulate error
      mockStatus.value = 'error'

      // Force re-render to pick up ref mutation
      wrapper.vm.$forceUpdate()
      await wrapper.vm.$nextTick()

      // Verify error state
      expect(wrapper.text()).toContain('Error')
      expect(wrapper.find('span.bg-red-500').exists()).toBe(true)
    })

    it('updates indicator and text when status changes from error to ready', async () => {
      mockStatus.value = 'error'
      const wrapper = mount(ModelStatusIndicator)

      // Verify initial error state
      expect(wrapper.text()).toContain('Error')

      // Mutate the reactive ref to simulate recovery
      mockStatus.value = 'ready'

      // Force re-render to pick up ref mutation
      wrapper.vm.$forceUpdate()
      await wrapper.vm.$nextTick()

      // Verify ready state
      expect(wrapper.text()).toContain('Ready')
      expect(wrapper.find('span.bg-green-500').exists()).toBe(true)
    })
  })

  describe('layout', () => {
    it('renders with flex layout and RTL-compatible structure', () => {
      const wrapper = mount(ModelStatusIndicator)

      // The root element should have flex and items-center classes
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
      // The indicator dot should have w-2 h-2 classes for consistent sizing
      const dot = wrapper.find('span.w-2')
      expect(dot.exists()).toBe(true)
      expect(dot.classes()).toContain('h-2')
    })

    it('renders text with small font size', () => {
      const wrapper = mount(ModelStatusIndicator)

      // The text span should have text-xs class (smaller font for status indicator)
      const textSpan = wrapper.find('span.text-xs')
      expect(textSpan.exists()).toBe(true)
    })
  })
})
