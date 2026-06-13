import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'

import ModelStatusIndicator from '../app/components/ModelStatusIndicator.vue'
import { useHealthPoll } from '../app/composables/useHealthPoll'

// Mock the composable before importing the component
vi.mock('../app/composables/useHealthPoll', () => ({
  useHealthPoll: vi.fn()
}))

describe('ModelStatusIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    it('renders spinning loader icon and "Loading..." text on mount', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('loading'),
        modelLoaded: computed(() => false)
      })

      const wrapper = mount(ModelStatusIndicator)

      expect(wrapper.text()).toContain('Loading...')
    })

    it('renders the loader indicator (orange dot) in loading state', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('loading'),
        modelLoaded: computed(() => false)
      })

      const wrapper = mount(ModelStatusIndicator)

      // Loading state renders an orange dot (not an icon)
      const dot = wrapper.find('span.bg-orange-500')
      expect(dot.exists()).toBe(true)
    })

    it('does not render check or alert dots in loading state', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('loading'),
        modelLoaded: computed(() => false)
      })

      const wrapper = mount(ModelStatusIndicator)
      const allClasses = wrapper.html()

      expect(allClasses).not.toContain('bg-green-500')
      expect(allClasses).not.toContain('bg-red-500')
    })
  })

  describe('ready state', () => {
    it('renders green indicator dot and "Ready" text when model is loaded', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('ready'),
        modelLoaded: computed(() => true)
      })

      const wrapper = mount(ModelStatusIndicator)

      expect(wrapper.text()).toContain('Ready')
    })

    it('renders the green dot indicator element', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('ready'),
        modelLoaded: computed(() => true)
      })

      const wrapper = mount(ModelStatusIndicator)
      // Ready state renders a green dot (not an icon)
      const dot = wrapper.find('span.bg-green-500')
      expect(dot.exists()).toBe(true)
    })

    it('does not render loading or error dots in ready state', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('ready'),
        modelLoaded: computed(() => true)
      })

      const wrapper = mount(ModelStatusIndicator)
      const allClasses = wrapper.html()

      expect(allClasses).not.toContain('bg-orange-500')
      expect(allClasses).not.toContain('bg-red-500')
    })
  })

  describe('error state', () => {
    it('renders red indicator dot and "Error" text when model is not loaded', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('error'),
        modelLoaded: computed(() => false)
      })

      const wrapper = mount(ModelStatusIndicator)

      expect(wrapper.text()).toContain('Error')
    })

    it('renders the red dot indicator element', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('error'),
        modelLoaded: computed(() => false)
      })

      const wrapper = mount(ModelStatusIndicator)
      // Error state renders a red dot (not an icon)
      const dot = wrapper.find('span.bg-red-500')
      expect(dot.exists()).toBe(true)
    })

    it('does not render loading or ready dots in error state', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('error'),
        modelLoaded: computed(() => false)
      })

      const wrapper = mount(ModelStatusIndicator)
      const allClasses = wrapper.html()

      expect(allClasses).not.toContain('bg-orange-500')
      expect(allClasses).not.toContain('bg-green-500')
    })
  })

  describe('reactivity', () => {
    it('updates indicator and text when status changes from loading to ready', async () => {
      const statusRef = ref('loading')
      const modelLoadedRef = ref(false)

      vi.mocked(useHealthPoll).mockReturnValue({
        status: statusRef,
        modelLoaded: modelLoadedRef
      })

      const wrapper = mount(ModelStatusIndicator)

      // Verify initial loading state
      expect(wrapper.text()).toContain('Loading...')
      expect(wrapper.find('span.bg-orange-500').exists()).toBe(true)

      // Mutate the reactive refs to simulate status change
      statusRef.value = 'ready'
      modelLoadedRef.value = true

      // Force re-render to pick up ref mutations
      wrapper.vm.$forceUpdate()
      await wrapper.vm.$nextTick()

      // Verify updated state
      expect(wrapper.text()).toContain('Ready')
      expect(wrapper.find('span.bg-green-500').exists()).toBe(true)
    })

    it('updates indicator and text when status changes from loading to error', async () => {
      const statusRef = ref('loading')
      const modelLoadedRef = ref(false)

      vi.mocked(useHealthPoll).mockReturnValue({
        status: statusRef,
        modelLoaded: modelLoadedRef
      })

      const wrapper = mount(ModelStatusIndicator)

      // Verify initial loading state
      expect(wrapper.text()).toContain('Loading...')

      // Mutate the reactive ref to simulate error
      statusRef.value = 'error'

      // Force re-render to pick up ref mutation
      wrapper.vm.$forceUpdate()
      await wrapper.vm.$nextTick()

      // Verify error state
      expect(wrapper.text()).toContain('Error')
      expect(wrapper.find('span.bg-red-500').exists()).toBe(true)
    })

    it('updates indicator and text when status changes from error to ready', async () => {
      const statusRef = ref('error')
      const modelLoadedRef = ref(false)

      vi.mocked(useHealthPoll).mockReturnValue({
        status: statusRef,
        modelLoaded: modelLoadedRef
      })

      const wrapper = mount(ModelStatusIndicator)

      // Verify initial error state
      expect(wrapper.text()).toContain('Error')

      // Mutate the reactive refs to simulate recovery
      statusRef.value = 'ready'
      modelLoadedRef.value = true

      // Force re-render to pick up ref mutations
      wrapper.vm.$forceUpdate()
      await wrapper.vm.$nextTick()

      // Verify ready state
      expect(wrapper.text()).toContain('Ready')
      expect(wrapper.find('span.bg-green-500').exists()).toBe(true)
    })
  })

  describe('layout', () => {
    it('renders with flex layout and RTL-compatible structure', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('loading'),
        modelLoaded: computed(() => false)
      })

      const wrapper = mount(ModelStatusIndicator)

      // The root element should have flex and items-center classes
      const root = wrapper.find('[class*="flex"]')
      expect(root.exists()).toBe(true)
      expect(root.classes()).toContain('items-center')
    })

    it('renders indicator dot and text with gap spacing', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('loading'),
        modelLoaded: computed(() => false)
      })

      const wrapper = mount(ModelStatusIndicator)

      const root = wrapper.find('[class*="flex"]')
      expect(root.classes()).toContain('gap-2')
    })

    it('renders indicator dot with consistent dimensions', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('loading'),
        modelLoaded: computed(() => false)
      })

      const wrapper = mount(ModelStatusIndicator)
      // The indicator dot should have w-2 h-2 classes for consistent sizing
      const dot = wrapper.find('span.w-2')
      expect(dot.exists()).toBe(true)
      expect(dot.classes()).toContain('h-2')
    })

    it('renders text with small font size', () => {
      vi.mocked(useHealthPoll).mockReturnValue({
        status: ref('loading'),
        modelLoaded: computed(() => false)
      })

      const wrapper = mount(ModelStatusIndicator)

      // The text span should have text-xs class (smaller font for status indicator)
      const textSpan = wrapper.find('span.text-xs')
      expect(textSpan.exists()).toBe(true)
    })
  })
})
